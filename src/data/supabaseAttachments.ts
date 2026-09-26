import type { BackupAttachment } from "../types/backup";
import { supabase } from "../utils/supabase";

export const ATTACHMENT_BUCKET = "rekammedisku-attachments";

async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) {
    throw new Error("Sesi RekamMedisku tidak ditemukan.");
  }

  return user.id;
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

export async function deleteAttachmentWithSupabase(
  attachmentId: string,
): Promise<void> {
  const userId = await getCurrentUserId();
  const path = objectPath(userId, attachmentId);

  const { error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .remove([path]);

  if (error) {
    throw new Error("Lampiran cloud gagal dihapus: " + error.message);
  }
}

export async function uploadBackupAttachmentsWithSupabase(
  attachments: BackupAttachment[] | undefined,
): Promise<string[]> {
  if (!attachments?.length) return [];

  const newlyUploadedIds: string[] = [];

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

      // Attachment IDs are stable logical IDs. Reuse an existing cloud object
      // with the same size instead of overwriting it during a restore; this also
      // lets us safely remove only objects created by this restore attempt.
      if (existing) {
        if (existing.size !== attachment.size) {
          throw new Error(
            "Lampiran " +
              attachment.name +
              " sudah ada di cloud dengan ukuran berbeda.",
          );
        }
        continue;
      }

      await uploadAttachmentWithSupabase(
        attachment.id,
        blob,
        attachment.type,
      );
      newlyUploadedIds.push(attachment.id);
    }

    return newlyUploadedIds;
  } catch (error) {
    await rollbackBackupAttachmentUploadsWithSupabase(newlyUploadedIds);
    throw error;
  }
}

export async function rollbackBackupAttachmentUploadsWithSupabase(
  attachmentIds: string[],
): Promise<void> {
  for (const attachmentId of attachmentIds) {
    try {
      await deleteAttachmentWithSupabase(attachmentId);
    } catch (rollbackError) {
      console.warn(
        "Gagal membersihkan lampiran backup yang ter-upload setelah restore gagal.",
        rollbackError,
      );
    }
  }
}
