import type { BackupAttachment } from "../types/backup";
import { supabase } from "../utils/supabase";
import { getAuthenticatedUserId } from "../utils/authenticatedUser";

export const ATTACHMENT_BUCKET = "rekammedisku-attachments";

async function getCurrentUserId() {
  return getAuthenticatedUserId();
}

function objectPath(userId: string, attachmentId: string) {
  return userId + "/" + attachmentId;
}

export async function uploadAttachmentWithSupabase(
  attachmentId: string,
  blob: Blob,
  contentType: string,
): Promise<void> {
  const userId = await getCurrentUserId();
  const path = objectPath(userId, attachmentId);

  const { error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(path, blob, {
      upsert: true,
      contentType: contentType || blob.type || "application/octet-stream",
      cacheControl: "3600",
    });

  if (error) {
    throw new Error("Lampiran gagal disinkronkan ke penyimpanan cloud: " + error.message);
  }
}

export async function downloadAttachmentWithSupabase(
  attachmentId: string,
): Promise<Blob | null> {
  const userId = await getCurrentUserId();
  const path = objectPath(userId, attachmentId);

  const { data, error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .download(path);

  if (error) {
    if (/not found|object not found/i.test(error.message)) {
      return null;
    }

    throw new Error("Lampiran cloud gagal diunduh: " + error.message);
  }

  return data;
}

export async function deleteAttachmentsWithSupabase(
  attachmentIds: string[],
): Promise<void> {
  const uniqueIds = [...new Set(attachmentIds.filter(Boolean))];

  if (uniqueIds.length === 0) return;

  const userId = await getCurrentUserId();

  // Supabase Storage accepts multiple paths per remove call. Keep batches
  // bounded so a large patient history does not produce an oversized request.
  for (let index = 0; index < uniqueIds.length; index += 100) {
    const paths = uniqueIds
      .slice(index, index + 100)
      .map((attachmentId) => objectPath(userId, attachmentId));

    const { error } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .remove(paths);

    if (error) {
      throw new Error("Lampiran cloud gagal dihapus: " + error.message);
    }
  }
}

export async function deleteAttachmentWithSupabase(
  attachmentId: string,
): Promise<void> {
  await deleteAttachmentsWithSupabase([attachmentId]);
}



export async function flushPendingAttachmentCleanupWithSupabase(): Promise<number> {
  const { data, error } = await supabase.rpc(
    "list_pending_attachment_cleanup",
  );

  if (error) {
    throw new Error(
      "Antrean cleanup lampiran cloud gagal dibaca: " + error.message,
    );
  }

  const attachmentIds = Array.isArray(data)
    ? data.filter(
        (row): row is { attachment_id: string } =>
          typeof row === "object" &&
          row !== null &&
          typeof (row as { attachment_id?: unknown }).attachment_id ===
            "string" &&
          (row as { attachment_id: string }).attachment_id.length > 0,
      ).map((row) => row.attachment_id)
    : [];

  if (!attachmentIds.length) return 0;

  await deleteAttachmentsWithSupabase(attachmentIds);

  const { error: acknowledgeError } = await supabase.rpc(
    "acknowledge_attachment_cleanup",
    { p_attachment_ids: attachmentIds },
  );

  if (acknowledgeError) {
    throw new Error(
      "Antrean cleanup lampiran cloud gagal dikonfirmasi: " +
        acknowledgeError.message,
    );
  }

  return attachmentIds.length;
}

export type BackupAttachmentUploadState = {
  newlyUploadedIds: string[];
  replacedAttachments: Array<{
    id: string;
    blob: Blob;
    contentType: string;
  }>;
};

async function blobsHaveSameBytes(first: Blob, second: Blob): Promise<boolean> {
  if (first.size !== second.size) return false;

  const [firstBuffer, secondBuffer] = await Promise.all([
    first.arrayBuffer(),
    second.arrayBuffer(),
  ]);

  const firstBytes = new Uint8Array(firstBuffer);
  const secondBytes = new Uint8Array(secondBuffer);

  for (let index = 0; index < firstBytes.length; index += 1) {
    if (firstBytes[index] !== secondBytes[index]) {
      return false;
    }
  }

  return true;
}

export async function uploadBackupAttachmentsWithSupabase(
  attachments: BackupAttachment[] | undefined,
): Promise<BackupAttachmentUploadState> {
  if (!attachments?.length) {
    return {
      newlyUploadedIds: [],
      replacedAttachments: [],
    };
  }

  const state: BackupAttachmentUploadState = {
    newlyUploadedIds: [],
    replacedAttachments: [],
  };

  try {
    for (const attachment of attachments) {
    const binary = atob(attachment.dataBase64);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    const blob = new Blob([bytes], {
      type: attachment.type || "application/octet-stream",
    });

    if (blob.size !== attachment.size) {
      throw new Error(
        "Ukuran lampiran " + attachment.name + " tidak cocok dengan backup.",
      );
    }

      const existing = await downloadAttachmentWithSupabase(attachment.id);

      if (existing) {
        const sameContent = await blobsHaveSameBytes(existing, blob);

        if (sameContent) {
          continue;
        }

        // Same logical ID but different binary: preserve the current cloud
        // object so a failed DB restore can restore it exactly.
        await uploadAttachmentWithSupabase(
          attachment.id,
          blob,
          attachment.type,
        );
        state.replacedAttachments.push({
          id: attachment.id,
          blob: existing,
          contentType: existing.type || "application/octet-stream",
        });
        continue;
      }

      await uploadAttachmentWithSupabase(
        attachment.id,
        blob,
        attachment.type,
      );
      state.newlyUploadedIds.push(attachment.id);
    }

    return state;
  } catch (error) {
    await rollbackBackupAttachmentUploadsWithSupabase(state);
    throw error;
  }
}

export async function rollbackBackupAttachmentUploadsWithSupabase(
  state: BackupAttachmentUploadState | string[],
): Promise<void> {
  const normalizedState: BackupAttachmentUploadState = Array.isArray(state)
    ? {
        newlyUploadedIds: state,
        replacedAttachments: [],
      }
    : state;

  for (const attachmentId of normalizedState.newlyUploadedIds) {
    try {
      await deleteAttachmentWithSupabase(attachmentId);
    } catch (rollbackError) {
      console.warn(
        "Gagal membersihkan lampiran backup yang ter-upload setelah restore gagal.",
        rollbackError,
      );
    }
  }

  for (const attachment of normalizedState.replacedAttachments) {
    try {
      await uploadAttachmentWithSupabase(
        attachment.id,
        attachment.blob,
        attachment.contentType,
      );
    } catch (rollbackError) {
      console.warn(
        "Gagal memulihkan lampiran cloud yang tertimpa saat restore gagal.",
        rollbackError,
      );
    }
  }
}
