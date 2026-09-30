import { supabase } from "../utils/supabase";
import { getWorkspaceUserId } from "./workspaceStorage";
import type {
  FollowUpTemplate,
  FollowUpTemplateDefinition,
  FollowUpTemplateMetadata,
  FollowUpTemplateSummary,
} from "../types/followUpTemplate";
import {
  validateFollowUpTemplateDefinition,
  validateFollowUpTemplateMetadata,
} from "../utils/followUpTemplate";

type TemplateRow = {
  id: string;
  user_id: string;
  type: "follow_up";
  name: string;
  description: string;
  metadata: FollowUpTemplateMetadata;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

type TemplateVersionRow = {
  id: string;
  user_id: string;
  template_id: string;
  version: number;
  schema_version: number;
  definition: unknown;
  created_at: string;
};

type CreateTemplateRpcResult = {
  templateId: string;
  version: number;
  schemaVersion: number;
};

type AppendTemplateVersionRpcResult = {
  templateId: string;
  version: number;
  schemaVersion: number;
};

function assertWorkspaceUser() {
  const userId = getWorkspaceUserId();

  if (!userId) {
    throw new Error("Workspace pengguna aktif tidak ditemukan.");
  }

  return userId;
}

async function getCurrentUserId() {
  const workspaceUserId = assertWorkspaceUser();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user || user.id !== workspaceUserId) {
    throw new Error(
      "Sesi pengguna berubah. Operasi template follow-up dibatalkan.",
    );
  }

  return user.id;
}

function toSummary(row: TemplateRow, latestVersion: TemplateVersionRow | null) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    metadata: row.metadata ?? {},
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    latestVersion: latestVersion?.version ?? 0,
    latestSchemaVersion: latestVersion?.schema_version ?? 0,
  } satisfies FollowUpTemplateSummary;
}

export async function listFollowUpTemplates(options?: {
  includeArchived?: boolean;
}): Promise<FollowUpTemplateSummary[]> {
  const userId = await getCurrentUserId();

  let query = supabase
    .from("templates")
    .select(
      "id,user_id,type,name,description,metadata,is_archived,created_at,updated_at",
    )
    .eq("user_id", userId)
    .eq("type", "follow_up")
    .order("updated_at", { ascending: false });

  if (!options?.includeArchived) {
    query = query.eq("is_archived", false);
  }

  const { data: rows, error } = await query.returns<TemplateRow[]>();

  if (error) throw error;

  const templateRows = rows ?? [];
  if (!templateRows.length) return [];

  const templateIds = templateRows.map((row) => row.id);
  const { data: versionRows, error: versionError } = await supabase
    .from("template_versions")
    .select(
      "id,user_id,template_id,version,schema_version,definition,created_at",
    )
    .eq("user_id", userId)
    .in("template_id", templateIds)
    .order("version", { ascending: false })
    .returns<TemplateVersionRow[]>();

  if (versionError) throw versionError;

  const latestByTemplate = new Map<string, TemplateVersionRow>();

  for (const row of versionRows ?? []) {
    if (!latestByTemplate.has(row.template_id)) {
      latestByTemplate.set(row.template_id, row);
    }
  }

  return templateRows.map((row) =>
    toSummary(row, latestByTemplate.get(row.id) ?? null),
  );
}

export async function getFollowUpTemplate(
  templateId: string,
): Promise<FollowUpTemplate | null> {
  const userId = await getCurrentUserId();

  const { data: row, error } = await supabase
    .from("templates")
    .select(
      "id,user_id,type,name,description,metadata,is_archived,created_at,updated_at",
    )
    .eq("id", templateId)
    .eq("user_id", userId)
    .eq("type", "follow_up")
    .maybeSingle<TemplateRow>();

  if (error) throw error;
  if (!row) return null;

  const { data: versionRows, error: versionError } = await supabase
    .from("template_versions")
    .select(
      "id,user_id,template_id,version,schema_version,definition,created_at",
    )
    .eq("template_id", templateId)
    .eq("user_id", userId)
    .order("version", { ascending: false })
    .limit(1)
    .returns<TemplateVersionRow[]>();

  if (versionError) throw versionError;

  const latest = versionRows?.[0];
  if (!latest) {
    throw new Error("Template follow-up tidak memiliki versi aktif.");
  }

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    metadata: row.metadata ?? {},
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    latestVersion: latest.version,
    latestSchemaVersion: latest.schema_version,
    latestDefinition: validateFollowUpTemplateDefinition(latest.definition),
  };
}


export async function getFollowUpTemplateVersion(
  templateId: string,
  version: number,
): Promise<FollowUpTemplate | null> {
  const userId = await getCurrentUserId();

  if (!Number.isInteger(version) || version < 1) {
    throw new Error("Versi template follow-up tidak valid.");
  }

  const { data: row, error } = await supabase
    .from("templates")
    .select(
      "id,user_id,type,name,description,metadata,is_archived,created_at,updated_at",
    )
    .eq("id", templateId)
    .eq("user_id", userId)
    .eq("type", "follow_up")
    .maybeSingle<TemplateRow>();

  if (error) throw error;
  if (!row) return null;

  const { data: versionRow, error: versionError } = await supabase
    .from("template_versions")
    .select(
      "id,user_id,template_id,version,schema_version,definition,created_at",
    )
    .eq("template_id", templateId)
    .eq("user_id", userId)
    .eq("version", version)
    .maybeSingle<TemplateVersionRow>();

  if (versionError) throw versionError;
  if (!versionRow) return null;

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    metadata: row.metadata ?? {},
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    latestVersion: versionRow.version,
    latestSchemaVersion: versionRow.schema_version,
    latestDefinition: validateFollowUpTemplateDefinition(versionRow.definition),
  };
}

export async function createFollowUpTemplate(input: {
  name: string;
  description?: string;
  metadata?: FollowUpTemplateMetadata;
  definition: FollowUpTemplateDefinition;
}) {
  await getCurrentUserId();

  const definition = validateFollowUpTemplateDefinition(input.definition);
  const metadata = validateFollowUpTemplateMetadata(input.metadata);

  const { data, error } = await supabase.rpc("create_follow_up_template", {
    p_name: input.name.trim(),
    p_description: input.description?.trim() ?? "",
    p_metadata: metadata,
    p_schema_version: definition.schema_version,
    p_definition: definition,
  });

  if (error) throw error;

  const result = data as CreateTemplateRpcResult;

  if (!result?.templateId || result.version !== 1) {
    throw new Error("Respons pembuatan template follow-up tidak valid.");
  }

  return result;
}

export async function appendFollowUpTemplateVersion(input: {
  templateId: string;
  expectedVersion: number;
  definition: FollowUpTemplateDefinition;
}) {
  await getCurrentUserId();

  const definition = validateFollowUpTemplateDefinition(input.definition);

  const { data, error } = await supabase.rpc(
    "append_follow_up_template_version",
    {
      p_template_id: input.templateId,
      p_expected_version: input.expectedVersion,
      p_schema_version: definition.schema_version,
      p_definition: definition,
    },
  );

  if (error) throw error;

  const result = data as AppendTemplateVersionRpcResult;

  if (
    !result?.templateId ||
    result.templateId !== input.templateId ||
    result.version !== input.expectedVersion + 1
  ) {
    throw new Error("Respons versi template follow-up tidak valid.");
  }

  return result;
}

export async function setFollowUpTemplateArchived(
  templateId: string,
  archived: boolean,
) {
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from("templates")
    .update({ is_archived: archived })
    .eq("id", templateId)
    .eq("user_id", userId)
    .eq("type", "follow_up");

  if (error) throw error;
}


export async function duplicateFollowUpTemplate(input: {
  templateId: string;
  name?: string;
  description?: string;
}) {
  const source = await getFollowUpTemplate(input.templateId);

  if (!source) {
    throw new Error("Template follow-up yang akan diduplikasi tidak ditemukan.");
  }

  if (source.isArchived) {
    throw new Error("Template yang sudah diarsipkan tidak dapat diduplikasi.");
  }

  return createFollowUpTemplate({
    name: input.name?.trim() || source.name + " — Salinan",
    description:
      input.description?.trim() ||
      source.description ||
      "Salinan template follow-up pribadi.",
    metadata: source.metadata,
    definition: source.latestDefinition,
  });
}

export async function getLatestFollowUpTemplateForSpecialty(
  specialty: string,
) {
  const templates = await listFollowUpTemplates();
  return (
    templates.find(
      (template) => template.metadata.specialty === specialty,
    ) ?? null
  );
}
