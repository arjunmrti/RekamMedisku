import { supabase } from "../utils/supabase";
import { getWorkspaceUserId } from "./workspaceStorage";
import type {
  RotationTemplateBinding,
  RotationTemplateBindingDocumentType,
  RotationTemplateBindingInput,
} from "../types/rotationTemplateBinding";

type RotationTemplateBindingRow = {
  id: string;
  user_id: string;
  rotation_id: string;
  template_id: string;
  template_version: number;
  document_type: RotationTemplateBindingDocumentType;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function getWorkspaceUser() {
  const userId = getWorkspaceUserId();

  if (!userId) {
    throw new Error("Workspace pengguna aktif tidak ditemukan.");
  }

  return userId;
}

async function getCurrentUserId() {
  const workspaceUserId = getWorkspaceUser();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user || user.id !== workspaceUserId) {
    throw new Error(
      "Sesi pengguna berubah. Operasi template stase dibatalkan.",
    );
  }

  return user.id;
}

function toBinding(row: RotationTemplateBindingRow): RotationTemplateBinding {
  return {
    id: row.id,
    userId: row.user_id,
    rotationId: row.rotation_id,
    templateId: row.template_id,
    templateVersion: row.template_version,
    documentType: row.document_type,
    isDefault: row.is_default,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listRotationTemplateBindings(
  rotationId: string,
  documentType?: RotationTemplateBindingDocumentType,
) {
  const userId = await getCurrentUserId();

  let query = supabase
    .from("rotation_template_bindings")
    .select(
      "id,user_id,rotation_id,template_id,template_version,document_type,is_default,sort_order,created_at,updated_at",
    )
    .eq("user_id", userId)
    .eq("rotation_id", rotationId)
    .order("document_type", { ascending: true })
    .order("is_default", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (documentType) {
    query = query.eq("document_type", documentType);
  }

  const { data, error } = await query.returns<RotationTemplateBindingRow[]>();

  if (error) throw error;

  return (data ?? []).map(toBinding);
}

export async function upsertRotationTemplateBinding(
  input: RotationTemplateBindingInput,
) {
  await getCurrentUserId();

  const { data, error } = await supabase.rpc(
    "upsert_rotation_template_binding",
    {
      p_binding_id: input.id ?? null,
      p_rotation_id: input.rotationId,
      p_document_type: input.documentType,
      p_template_id: input.templateId,
      p_template_version: input.templateVersion,
      p_is_default: input.isDefault ?? false,
      p_sort_order: input.sortOrder ?? 0,
      p_expected_updated_at: input.expectedUpdatedAt ?? null,
    },
  );

  if (error) throw error;

  const rows = (data ?? []) as RotationTemplateBindingRow[];
  const row = rows[0];

  if (!row) {
    throw new Error("Supabase tidak mengembalikan binding template stase.");
  }

  return toBinding(row);
}

export async function deleteRotationTemplateBinding(
  bindingId: string,
  expectedUpdatedAt: string,
) {
  await getCurrentUserId();

  const { error } = await supabase.rpc(
    "delete_rotation_template_binding",
    {
      p_binding_id: bindingId,
      p_expected_updated_at: expectedUpdatedAt,
    },
  );

  if (error) throw error;
}
