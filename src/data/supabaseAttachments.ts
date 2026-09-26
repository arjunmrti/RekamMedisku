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
): Promise<void> {
  if (!attachments?.length) return;

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

    await uploadAttachmentWithSupabase(
      attachment.id,
      blob,
      attachment.type,
    );
  }
}
