import {
  REPORT_TEMPLATE_BLOCK_TYPES,
  REPORT_TEMPLATE_SCHEMA_VERSION,
  REPORT_TEMPLATE_SOURCES,
  type ReportTemplateBlock,
  type ReportTemplateBlockType,
  type ReportTemplateDefinition,
  type ReportTemplateMetadata,
  type ReportTemplateSection,
  type ReportTemplateSource,
} from "../types/reportTemplate";

const ID_PATTERN = /^[a-z][a-z0-9_-]{1,63}$/;
const MAX_SECTIONS = 30;
const MAX_BLOCKS = 150;

function fail(message: string): never {
  throw new Error("Template laporan tidak valid: " + message);
}

function readNonEmptyString(value: unknown, fieldName: string, maxLength = 200) {
  if (typeof value !== "string" || !value.trim()) {
    fail(fieldName + " wajib diisi.");
  }

  const normalized = value.trim();

  if (normalized.length > maxLength) {
    fail(fieldName + " terlalu panjang.");
  }

  return normalized;
}

function readOptionalString(
  value: unknown,
  fieldName: string,
  maxLength = 500,
) {
  if (value === undefined || value === null) return undefined;

  if (typeof value !== "string") {
    fail(fieldName + " harus berupa teks.");
  }

  const normalized = value.trim();

  if (!normalized) return undefined;

  if (normalized.length > maxLength) {
    fail(fieldName + " terlalu panjang.");
  }

  return normalized;
}

function readId(value: unknown, fieldName: string) {
  const id = readNonEmptyString(value, fieldName, 64);

  if (!ID_PATTERN.test(id)) {
    fail(
      fieldName +
        " harus berupa ID stabil: huruf kecil, angka, '-' atau '_'.",
    );
  }

  return id;
}

function normalizeBlock(
  value: unknown,
  blockIndex: number,
  sectionId: string,
): ReportTemplateBlock {
  const fieldName = "sections[" + sectionId + "].blocks[" + blockIndex + "]";

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(fieldName + " harus berupa object.");
  }

  const block = value as Record<string, unknown>;
  const id = readId(block.id, fieldName + ".id");
  const type = block.type;

  if (
    typeof type !== "string" ||
    !REPORT_TEMPLATE_BLOCK_TYPES.includes(
      type as ReportTemplateBlockType,
    )
  ) {
    fail(
      fieldName +
        ".type harus salah satu dari: " +
        REPORT_TEMPLATE_BLOCK_TYPES.join(", "),
    );
  }

  if (type === "text") {
    return {
      id,
      type: "text",
      text: readNonEmptyString(block.text, fieldName + ".text", 2000),
    };
  }

  if (type === "value") {
    const source = block.source;

    if (
      typeof source !== "string" ||
      !REPORT_TEMPLATE_SOURCES.includes(source as ReportTemplateSource) ||
      source === "follow_up.template_answers" ||
      source === "follow_up.supporting_exams"
    ) {
      fail(
        fieldName +
          ".source harus merupakan sumber value laporan yang didukung.",
      );
    }

    const label = readOptionalString(block.label, fieldName + ".label", 160);
    const emptyText = readOptionalString(
      block.emptyText,
      fieldName + ".emptyText",
      240,
    );

    return {
      id,
      type: "value",
      source: source as ReportTemplateSource,
      ...(label ? { label } : {}),
      ...(emptyText ? { emptyText } : {}),
    };
  }

  if (type === "template_answers") {
    const title = readOptionalString(block.title, fieldName + ".title", 160);
    const emptyText = readOptionalString(
      block.emptyText,
      fieldName + ".emptyText",
      240,
    );

    return {
      id,
      type: "template_answers",
      ...(title ? { title } : {}),
      ...(emptyText ? { emptyText } : {}),
    };
  }

  const title = readOptionalString(block.title, fieldName + ".title", 160);
  const emptyText = readOptionalString(
    block.emptyText,
    fieldName + ".emptyText",
    240,
  );

  if (
    block.includeAttachments !== undefined &&
    typeof block.includeAttachments !== "boolean"
  ) {
    fail(fieldName + ".includeAttachments harus berupa boolean.");
  }

  return {
    id,
    type: "supporting_exams",
    ...(title ? { title } : {}),
    ...(emptyText ? { emptyText } : {}),
    ...(block.includeAttachments === undefined
      ? {}
      : { includeAttachments: block.includeAttachments }),
  };
}

function normalizeSection(
  value: unknown,
  sectionIndex: number,
): ReportTemplateSection {
  const fieldName = "sections[" + sectionIndex + "]";

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(fieldName + " harus berupa object.");
  }

  const section = value as Record<string, unknown>;
  const id = readId(section.id, fieldName + ".id");
  const title = readOptionalString(
    section.title,
    fieldName + ".title",
    160,
  ) ?? "";
  const description = readOptionalString(
    section.description,
    fieldName + ".description",
    400,
  );

  if (!Array.isArray(section.blocks)) {
    fail(fieldName + ".blocks wajib berupa array.");
  }

  if (section.blocks.length === 0) {
    fail(fieldName + ".blocks tidak boleh kosong.");
  }

  const blocks = section.blocks.map((block, blockIndex) =>
    normalizeBlock(block, blockIndex, id),
  );

  const blockIds = new Set<string>();

  for (const block of blocks) {
    if (blockIds.has(block.id)) {
      fail("block ID harus unik dalam satu section: " + block.id);
    }

    blockIds.add(block.id);
  }

  return {
    id,
    title,
    ...(description ? { description } : {}),
    blocks,
  };
}

export function validateReportTemplateDefinition(
  value: unknown,
): ReportTemplateDefinition {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("root harus berupa object.");
  }

  const definition = value as Record<string, unknown>;
  const schemaVersion = definition.schema_version;

  if (
    typeof schemaVersion !== "number" ||
    !Number.isInteger(schemaVersion) ||
    schemaVersion < 1
  ) {
    fail("schema_version harus berupa integer positif.");
  }

  if (schemaVersion > REPORT_TEMPLATE_SCHEMA_VERSION) {
    fail(
      "schema_version " +
        schemaVersion +
        " belum didukung aplikasi ini (maksimal " +
        REPORT_TEMPLATE_SCHEMA_VERSION +
        ").",
    );
  }

  if (!Array.isArray(definition.sections)) {
    fail("sections wajib berupa array.");
  }

  if (
    definition.sections.length === 0 ||
    definition.sections.length > MAX_SECTIONS
  ) {
    fail("template harus memiliki 1-" + MAX_SECTIONS + " section.");
  }

  const sections = definition.sections.map((section, index) =>
    normalizeSection(section, index),
  );

  const sectionIds = new Set<string>();
  let blockCount = 0;

  for (const section of sections) {
    if (sectionIds.has(section.id)) {
      fail("section ID duplikat: " + section.id);
    }

    sectionIds.add(section.id);
    blockCount += section.blocks.length;
  }

  if (blockCount > MAX_BLOCKS) {
    fail("jumlah block melebihi batas " + MAX_BLOCKS + ".");
  }

  return {
    schema_version: schemaVersion,
    sections,
  };
}

export function validateReportTemplateMetadata(
  value: unknown,
): ReportTemplateMetadata {
  if (value === undefined || value === null) return {};

  if (typeof value !== "object" || Array.isArray(value)) {
    fail("metadata harus berupa object JSON.");
  }

  return value as ReportTemplateMetadata;
}

export function cloneReportTemplateDefinition(
  definition: ReportTemplateDefinition,
) {
  return JSON.parse(JSON.stringify(definition)) as ReportTemplateDefinition;
}
