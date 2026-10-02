import { test, expect, type Page, type Route } from "@playwright/test";

const USER_ID = "00000000-0000-4000-8000-0000000000p2";
const ROTATION_ID = "00000000-0000-4000-8000-0000000000p3";
const PATIENT_ID = "00000000-0000-4000-8000-0000000000p4";
const FOLLOW_UP_ID_1 = "00000000-0000-4000-8000-0000000000p5";
const STARTER_ID = "00000000-0000-0000-0000-000000000201";
const CLONED_TEMPLATE_ID = "00000000-0000-4000-8000-0000000000p6";
const CUSTOM_TEMPLATE_ID = "00000000-0000-4000-8000-0000000000p7";

type MockState = {
  templates: Record<string, Record<string, unknown>>;
  templateVersions: Record<string, Record<string, unknown>[]>;
  rotation: Record<string, unknown> | null;
  rotationPayload: Record<string, unknown> | null;
  patient: Record<string, unknown> | null;
  followUps: Record<string, Record<string, unknown>>;
};

const STARTER_VERSION_ROW = {
  id: "00000000-0000-0000-0000-000000000202",
  user_id: null,
  template_id: STARTER_ID,
  version: 1,
  schema_version: 1,
  definition: {
    schema_version: 1,
    sections: [
      {
        id: "vitals",
        title: "Vital Signs",
        fields: [
          { id: "bp", label: "Blood Pressure", type: "text", required: false, unit: "mmHg" },
          { id: "rr", label: "Respiratory Rate", type: "number", required: false, unit: "x/min" },
        ],
      },
    ],
  },
  created_at: "2026-10-01T00:00:00.000Z",
};

const CUSTOM_TEMPLATE_DEFINITION_V1 = {
  schema_version: 1,
  sections: [
    {
      id: "assessment",
      title: "Clinical Assessment",
      fields: [
        { id: "bp_systolic", label: "BP Systolic", type: "number", required: false, unit: "mmHg" },
        { id: "bp_diastolic", label: "BP Diastolic", type: "number", required: false, unit: "mmHg" },
        { id: "rr", label: "Respiratory Rate", type: "number", required: false, unit: "breaths/min" },
        { id: "edema", label: "Edema", type: "select", required: false, options: ["None", "Mild", "Moderate", "Severe"] },
      ],
    },
  ],
};

const CUSTOM_TEMPLATE_DEFINITION_V2 = {
  schema_version: 1,
  sections: [
    {
      id: "assessment",
      title: "Clinical Assessment",
      fields: [
        { id: "bp_systolic", label: "BP Systolic", type: "number", required: false, unit: "mmHg" },
        { id: "bp_diastolic", label: "BP Diastolic", type: "number", required: false, unit: "mmHg" },
        { id: "rr", label: "Respiratory Rate", type: "number", required: false, unit: "breaths/min" },
        { id: "edema", label: "Edema", type: "select", required: false, options: ["None", "Mild", "Moderate", "Severe"] },
        { id: "notes", label: "Additional Notes", type: "textarea", required: false },
      ],
    },
  ],
};

function nowIso() {
  return new Date().toISOString();
}

function json(route: Route, status: number, body: unknown) {
  return route.fulfill({
    status,
    contentType: "application/json",
    headers: { "cache-control": "no-store" },
    body: JSON.stringify(body),
  });
}

function parseTemplateIdFilter(param: string | null): string[] {
  if (!param) return [];
  if (param.startsWith("in.(") && param.endsWith(")")) {
    return param.slice(4, -1).split(",");
  }
  if (param.startsWith("eq.")) {
    return [param.slice(3)];
  }
  return [];
}

async function installPhase2MockSupabase(page: Page, state: MockState) {
  await page.route("https://mock.supabase.local/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    if (path === "/auth/v1/token") {
      return json(route, 200, {
        access_token: "e2e-phase2-token",
        refresh_token: "e2e-phase2-refresh",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user: {
          id: USER_ID,
          aud: "authenticated",
          role: "authenticated",
          email: "phase2@example.test",
          app_metadata: { provider: "email" },
          user_metadata: {},
          created_at: nowIso(),
        },
      });
    }

    if (path === "/auth/v1/user") {
      return json(route, 200, {
        id: USER_ID,
        aud: "authenticated",
        role: "authenticated",
        email: "phase2@example.test",
        app_metadata: { provider: "email" },
        user_metadata: {},
        created_at: nowIso(),
      });
    }

    if (path === "/rest/v1/slaberan_locations" && method === "GET") {
      return json(route, 200, []);
    }

    if (path === "/rest/v1/slaberan_templates" && method === "GET") {
      return json(route, 200, []);
    }

    if (path === "/rest/v1/profiles" && method === "GET") {
      return json(route, 200, [{
        id: USER_ID,
        name: "E2E Phase2 User",
        created_at: nowIso(),
        updated_at: nowIso(),
      }]);
    }

    if (path === "/rest/v1/templates" && method === "GET") {
      const isSystem = url.searchParams.get("is_system_owned") === "eq.true";
      const templateId = url.searchParams.get("id")?.replace(/^eq\./, "");
      let rows = Object.values(state.templates);
      if (templateId) {
        rows = rows.filter((row) => row.id === templateId);
      } else if (isSystem) {
        rows = rows.filter((row) => row.is_system_owned === true && row.type === "follow_up");
      } else {
        rows = rows.filter((row) => row.user_id === USER_ID && row.type === "follow_up" && row.is_archived === false);
      }
      return json(route, 200, rows);
    }

    if (path === "/rest/v1/template_versions" && method === "GET") {
      const templateIdFilter = url.searchParams.get("template_id");
      const userIdFilter = url.searchParams.get("user_id");
      const versionFilter = url.searchParams.get("version");
      
      let rows = Object.values(state.templateVersions).flat();
      
      if (templateIdFilter) {
        const ids = parseTemplateIdFilter(templateIdFilter);
        if (ids.length > 0) {
          rows = rows.filter((row) => ids.includes(String(row.template_id)));
        }
      }

      if (userIdFilter?.startsWith("eq.")) {
        const userId = userIdFilter.slice(3);
        rows = rows.filter((row) => row.user_id === userId);
      }
      
      if (versionFilter?.startsWith("eq.")) {
        rows = rows.filter((row) => Number(row.version) === Number(versionFilter.slice(3)));
      }

      return json(route, 200, rows.sort((a, b) => Number(b.version) - Number(a.version)));
    }

    if (path === "/rest/v1/rotations" && method === "GET") {
      return json(route, 200, state.rotation ? [state.rotation] : []);
    }

    if (path === "/rest/v1/patients" && method === "GET") {
      return json(route, 200, state.patient ? [state.patient] : []);
    }

    if (path === "/rest/v1/follow_ups" && method === "GET") {
      return json(route, 200, Object.values(state.followUps));
    }

    if (path === "/rest/v1/supporting_exams" && method === "GET") {
      return json(route, 200, []);
    }

    if (path === "/rest/v1/patients" && method === "POST") {
      const payload = request.postDataJSON() as Record<string, unknown>;
      state.patient = {
        id: PATIENT_ID,
        user_id: USER_ID,
        rotation_id: state.rotation?.id ?? ROTATION_ID,
        name: String(payload.name ?? ""),
        age: Number(payload.age ?? 0),
        gender: String(payload.gender ?? "Laki-laki"),
        rm: String(payload.rm ?? ""),
        room: String(payload.room ?? ""),
        bed: String(payload.bed ?? ""),
        doctor: String(payload.doctor ?? ""),
        current_location_id: null,
        current_location_type: String(payload.current_location_type ?? "ward"),
        current_location_name: String(payload.current_location_name ?? payload.room ?? ""),
        admission_location_id: null,
        admission_location_type: null,
        admission_location_name: null,
        created_at: String(payload.created_at ?? nowIso()),
        updated_at: nowIso(),
        admission_date: payload.admission_date ?? null,
        admission_complaint: payload.admission_complaint ?? null,
        status: String(payload.status ?? "Aktif"),
        follow_ups: [],
      };
      return json(route, 201, state.patient);
    }

    if (path.endsWith("/rpc/clone_system_follow_up_template") && method === "POST") {
      const payload = request.postDataJSON() as Record<string, unknown>;
      state.templates[CLONED_TEMPLATE_ID] = {
        id: CLONED_TEMPLATE_ID,
        user_id: USER_ID,
        type: "follow_up",
        name: String(payload.p_name ?? "Starter follow-up"),
        description: "Cloned from system starter",
        metadata: {},
        is_archived: false,
        is_system_owned: false,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      state.templateVersions[CLONED_TEMPLATE_ID] = [{
        id: "00000000-0000-4000-8000-0000000000p8",
        user_id: USER_ID,
        template_id: CLONED_TEMPLATE_ID,
        version: 1,
        schema_version: 1,
        definition: STARTER_VERSION_ROW.definition,
        created_at: nowIso(),
      }];
      return json(route, 200, { templateId: CLONED_TEMPLATE_ID, version: 1, schemaVersion: 1 });
    }

    if (path.endsWith("/rpc/upsert_rotation_with_activation") && method === "POST") {
      const payload = request.postDataJSON() as Record<string, unknown>;
      state.rotationPayload = payload;
      state.rotation = {
        id: ROTATION_ID,
        user_id: USER_ID,
        name: String(payload.p_name ?? "E2E Rotation"),
        specialty: String(payload.p_specialty ?? "Lainnya"),
        start_date: String(payload.p_start_date ?? "2026-10-01"),
        end_date: String(payload.p_end_date ?? "2026-10-31"),
        status: String(payload.p_status ?? "Aktif"),
        follow_up_template_id: payload.p_follow_up_template_id,
        follow_up_template_version: payload.p_follow_up_template_version,
        report_template_id: null,
        report_template_version: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      return json(route, 200, [state.rotation]);
    }

    if (path.endsWith("/rpc/save_follow_up_with_exams") && method === "POST") {
      const payload = request.postDataJSON() as Record<string, unknown>;
      const followUp = (payload.p_follow_up ?? {}) as Record<string, unknown>;
      const followUpId = String(followUp.id ?? FOLLOW_UP_ID_1);
      const templateId = String(followUp.template_id ?? state.rotation?.follow_up_template_id ?? "");
      const templateVersion = Number(followUp.template_version ?? state.rotation?.follow_up_template_version ?? 1);

      const versionRows = state.templateVersions[templateId] ?? [];
      const versionRow = versionRows.find((v) => v.version === templateVersion) ?? versionRows[0];
      const templateSnapshot = versionRow?.definition ?? CUSTOM_TEMPLATE_DEFINITION_V1;

      state.followUps[followUpId] = {
        id: followUpId,
        user_id: USER_ID,
        patient_id: String(followUp.patient_id),
        number: Number(followUp.number ?? 1),
        date: String(followUp.date ?? "2026-10-01"),
        iso_date: String(followUp.iso_date ?? "2026-10-01"),
        time: String(followUp.time ?? "08:00:00"),
        status: String(followUp.status ?? "Tersimpan"),
        template_type: String(followUp.template_type ?? ""),
        template_id: templateId,
        template_version: templateVersion,
        template_schema_version: 1,
        template_snapshot: templateSnapshot,
        answers: followUp.answers ?? {},
        assessment_codes: Array.isArray(followUp.assessment_codes) ? followUp.assessment_codes : [],
        planning: followUp.planning ?? null,
        instruction: followUp.instruction ?? null,
        subjective: String(followUp.subjective ?? ""),
        objective: String(followUp.objective ?? ""),
        assessment: String(followUp.assessment ?? ""),
        plan: String(followUp.plan ?? ""),
        summary: String(followUp.summary ?? ""),
        created_at: nowIso(),
        updated_at: nowIso(),
      };

      if (state.patient) {
        state.patient.follow_ups = Object.values(state.followUps).map((fu) => ({
          number: fu.number,
          iso_date: fu.iso_date,
          time: fu.time,
          status: fu.status,
        }));
      }

      return json(route, 200, {
        followUpId: followUpId,
        supportingExamIds: {},
      });
    }

    if (path.endsWith("/rpc/") || path.includes("/rpc/")) {
      return json(route, 200, {});
    }

    return json(route, 200, []);
  });
}

test("Phase 2: Starter clone returns id and auto-selects in rotation form", async ({ page }) => {
  const state: MockState = {
    templates: {
      [STARTER_ID]: {
        id: STARTER_ID,
        user_id: null,
        type: "follow_up",
        name: "Starter follow-up",
        description: "System starter",
        metadata: { source: "system" },
        is_archived: false,
        is_system_owned: true,
        created_at: nowIso(),
        updated_at: nowIso(),
      },
    },
    templateVersions: {
      [STARTER_ID]: [STARTER_VERSION_ROW],
    },
    rotation: null,
    rotationPayload: null,
    patient: null,
    followUps: {},
  };

  await installPhase2MockSupabase(page, state);
  await page.goto("/");

  await page.locator("#login-email").fill("phase2@example.test");
  await page.locator("#login-password").fill("e2e-phase2");
  await page.getByRole("button", { name: "Masuk" }).click();

  await expect(page.getByRole("heading", { name: "Stase Saya" })).toBeVisible();
  await page.getByRole("button", { name: "Tambah Stase" }).first().click();
  await page.getByLabel("Nama stase").fill("E2E Clone Test");
  await page.getByLabel("Specialty").selectOption({ label: "Lainnya" });
  await page.getByLabel("Start date").fill("2026-10-01");
  await page.getByLabel("End date").fill("2026-10-31");

  await expect(page.getByRole("button", { name: "Salin" })).toBeVisible();
  await page.getByRole("button", { name: "Salin" }).click();

  const personalTemplateSelect = page.locator("select").filter({
    has: page.locator(`option[value="${CLONED_TEMPLATE_ID}"]`),
  });
  await expect(personalTemplateSelect).toBeVisible();
  await expect(personalTemplateSelect).toHaveValue(CLONED_TEMPLATE_ID);

  await page.getByLabel("Status").selectOption({ label: "Aktif" });
  await page.getByRole("button", { name: "Simpan Stase" }).click();

  await expect.poll(() => state.rotationPayload?.p_follow_up_template_id).toBe(CLONED_TEMPLATE_ID);
  expect(state.rotationPayload?.p_follow_up_template_version).toBe(1);
});

test("Phase 2: Custom non-Neurology template renders, fills, saves answers", async ({ page }) => {
  const state: MockState = {
    templates: {
      [STARTER_ID]: {
        id: STARTER_ID,
        user_id: null,
        type: "follow_up",
        name: "Starter follow-up",
        description: "System starter",
        metadata: { source: "system" },
        is_archived: false,
        is_system_owned: true,
        created_at: nowIso(),
        updated_at: nowIso(),
      },
      [CUSTOM_TEMPLATE_ID]: {
        id: CUSTOM_TEMPLATE_ID,
        user_id: USER_ID,
        type: "follow_up",
        name: "Custom Clinical",
        description: "BP, RR, Edema",
        metadata: {},
        is_archived: false,
        is_system_owned: false,
        created_at: nowIso(),
        updated_at: nowIso(),
      },
    },
    templateVersions: {
      [STARTER_ID]: [STARTER_VERSION_ROW],
      [CUSTOM_TEMPLATE_ID]: [{
        id: "custom-v1",
        user_id: USER_ID,
        template_id: CUSTOM_TEMPLATE_ID,
        version: 1,
        schema_version: 1,
        definition: CUSTOM_TEMPLATE_DEFINITION_V1,
        created_at: nowIso(),
      }],
    },
    rotation: null,
    rotationPayload: null,
    patient: null,
    followUps: {},
  };

  await installPhase2MockSupabase(page, state);
  await page.goto("/");

  await page.locator("#login-email").fill("phase2@example.test");
  await page.locator("#login-password").fill("e2e-phase2");
  await page.getByRole("button", { name: "Masuk" }).click();

  await expect(page.getByRole("heading", { name: "Stase Saya" })).toBeVisible();
  await page.getByRole("button", { name: "Tambah Stase" }).first().click();
  await page.getByLabel("Nama stase").fill("E2E Custom");
  await page.getByLabel("Specialty").selectOption({ label: "Lainnya" });
  await page.getByLabel("Start date").fill("2026-10-01");
  await page.getByLabel("End date").fill("2026-10-31");

  const personalTemplateSelect = page.locator("select").filter({ has: page.locator("option", { hasText: "Pilih template saya" }) }).first();
  await expect(personalTemplateSelect).toBeVisible();
  await personalTemplateSelect.selectOption({ value: CUSTOM_TEMPLATE_ID });

  await page.getByLabel("Status").selectOption({ label: "Aktif" });
  await page.getByRole("button", { name: "Simpan Stase" }).click();

  await expect(page.getByRole("heading", { name: "Stase Saya" })).toBeVisible();
  expect(state.rotation?.follow_up_template_id).toBe(CUSTOM_TEMPLATE_ID);
  expect(state.rotation?.follow_up_template_version).toBe(1);

  await page.getByRole("button", { name: "Daftar Pasien" }).click();
  await page.getByRole("button", { name: "Tambah Pasien" }).click();
  await page.getByLabel("Nama Lengkap Pasien").fill("Patient Custom");
  await page.getByLabel("No. Rekam Medis (RM)").fill("CUST-001");
  await page.getByLabel("Usia (Tahun)").fill("45");
  await page.getByLabel("Jenis Kelamin").selectOption({ label: "Laki-laki" });
  await page.getByLabel("DPJP (Dokter Spesialis)").fill("dr. Custom");
  await page.getByLabel("Tanggal Masuk").fill("2026-10-01");
  await page.getByLabel("Nama Bangsal / Ruangan").fill("Ward E2E");
  await page.getByLabel("Nomor Bed").fill("10");
  await page.getByRole("button", { name: "Simpan Pasien" }).click();

  await page.getByRole("button", { name: "Buka Profil Pasien" }).click();
  await page.getByRole("button", { name: "Follow-Up Baru" }).click();

  await expect(page.getByText("Clinical Assessment")).toBeVisible();
  await expect(page.getByLabel("BP Systolic")).toBeVisible();
  await expect(page.getByLabel("BP Diastolic")).toBeVisible();
  await expect(page.getByLabel("Respiratory Rate")).toBeVisible();
  await expect(page.getByLabel("Edema")).toBeVisible();

  await page.getByLabel("BP Systolic").fill("140");
  await page.getByLabel("BP Diastolic").fill("90");
  await page.getByLabel("Respiratory Rate").fill("18");
  await page.getByLabel("Edema").selectOption({ label: "Mild" });

  await page.getByRole("button", { name: "Simpan Follow-Up" }).click();
  await expect(page.getByText("✓ Follow-up berhasil disimpan.")).toBeVisible();

  const savedFollowUp = Object.values(state.followUps)[0];
  expect(savedFollowUp.answers.bp_systolic).toBe("140");
  expect(savedFollowUp.answers.bp_diastolic).toBe("90");
  expect(savedFollowUp.answers.rr).toBe(18);
  expect(savedFollowUp.answers.edema).toBe("Mild");
  expect(savedFollowUp.template_snapshot.sections[0].fields).toHaveLength(4);
});

test("Phase 2: Snapshot v1 persists when template version advances", async ({ page }) => {
  const state: MockState = {
    templates: {
      [STARTER_ID]: {
        id: STARTER_ID,
        user_id: null,
        type: "follow_up",
        name: "Starter follow-up",
        description: "System starter",
        metadata: { source: "system" },
        is_archived: false,
        is_system_owned: true,
        created_at: nowIso(),
        updated_at: nowIso(),
      },
      [CUSTOM_TEMPLATE_ID]: {
        id: CUSTOM_TEMPLATE_ID,
        user_id: USER_ID,
        type: "follow_up",
        name: "Version Test",
        description: "Template versioning",
        metadata: {},
        is_archived: false,
        is_system_owned: false,
        created_at: nowIso(),
        updated_at: nowIso(),
      },
    },
    templateVersions: {
      [STARTER_ID]: [STARTER_VERSION_ROW],
      [CUSTOM_TEMPLATE_ID]: [{
        id: "custom-v1",
        user_id: USER_ID,
        template_id: CUSTOM_TEMPLATE_ID,
        version: 1,
        schema_version: 1,
        definition: CUSTOM_TEMPLATE_DEFINITION_V1,
        created_at: nowIso(),
      }],
    },
    rotation: null,
    rotationPayload: null,
    patient: null,
    followUps: {},
  };

  await installPhase2MockSupabase(page, state);
  await page.goto("/");

  await page.locator("#login-email").fill("phase2@example.test");
  await page.locator("#login-password").fill("e2e-phase2");
  await page.getByRole("button", { name: "Masuk" }).click();

  await expect(page.getByRole("heading", { name: "Stase Saya" })).toBeVisible();
  await page.getByRole("button", { name: "Tambah Stase" }).first().click();
  await page.getByLabel("Nama stase").fill("E2E Version");
  await page.getByLabel("Specialty").selectOption({ label: "Lainnya" });
  await page.getByLabel("Start date").fill("2026-10-01");
  await page.getByLabel("End date").fill("2026-10-31");

  const personalTemplateSelect = page.locator("select").filter({ has: page.locator("option", { hasText: "Pilih template saya" }) }).first();
  await expect(personalTemplateSelect).toBeVisible();
  await personalTemplateSelect.selectOption({ value: CUSTOM_TEMPLATE_ID });

  await page.getByLabel("Status").selectOption({ label: "Aktif" });
  await page.getByRole("button", { name: "Simpan Stase" }).click();

  await page.getByRole("button", { name: "Daftar Pasien" }).click();
  await page.getByRole("button", { name: "Tambah Pasien" }).click();
  await page.getByLabel("Nama Lengkap Pasien").fill("Patient Version");
  await page.getByLabel("No. Rekam Medis (RM)").fill("VER-001");
  await page.getByLabel("Usia (Tahun)").fill("50");
  await page.getByLabel("Jenis Kelamin").selectOption({ label: "Perempuan" });
  await page.getByLabel("DPJP (Dokter Spesialis)").fill("dr. Version");
  await page.getByLabel("Tanggal Masuk").fill("2026-10-01");
  await page.getByLabel("Nama Bangsal / Ruangan").fill("Ward Version");
  await page.getByLabel("Nomor Bed").fill("05");
  await page.getByRole("button", { name: "Simpan Pasien" }).click();

  await page.getByRole("button", { name: "Buka Profil Pasien" }).click();
  await page.getByRole("button", { name: "Follow-Up Baru" }).click();

  await page.getByLabel("BP Systolic").fill("130");
  await page.getByLabel("BP Diastolic").fill("85");
  await page.getByLabel("Respiratory Rate").fill("16");
  await page.getByLabel("Edema").selectOption({ label: "None" });
  await page.getByRole("button", { name: "Simpan Follow-Up" }).click();

  await expect(page.getByText("✓ Follow-up berhasil disimpan.")).toBeVisible();

  const fu = Object.values(state.followUps)[0];
  expect(fu.template_version).toBe(1);
  expect(fu.template_snapshot.sections[0].fields).toHaveLength(4);
  expect(fu.template_snapshot.sections[0].fields.map((f: any) => f.id)).not.toContain("notes");

  state.templateVersions[CUSTOM_TEMPLATE_ID].push({
    id: "custom-v2",
    user_id: USER_ID,
    template_id: CUSTOM_TEMPLATE_ID,
    version: 2,
    schema_version: 1,
    definition: CUSTOM_TEMPLATE_DEFINITION_V2,
    created_at: nowIso(),
  });

  const savedFu = Object.values(state.followUps)[0];
  expect(savedFu.template_version).toBe(1);
  expect(savedFu.template_snapshot.sections[0].fields).toHaveLength(4);
});

test("Phase 2: Legacy Neurology flow without template remains functional", async ({ page }) => {
  const state: MockState = {
    templates: {
      [STARTER_ID]: {
        id: STARTER_ID,
        user_id: null,
        type: "follow_up",
        name: "Starter follow-up",
        description: "System starter",
        metadata: { source: "system" },
        is_archived: false,
        is_system_owned: true,
        created_at: nowIso(),
        updated_at: nowIso(),
      },
    },
    templateVersions: {
      [STARTER_ID]: [STARTER_VERSION_ROW],
    },
    rotation: null,
    rotationPayload: null,
    patient: null,
    followUps: {},
  };

  await installPhase2MockSupabase(page, state);
  await page.goto("/");

  await page.locator("#login-email").fill("phase2@example.test");
  await page.locator("#login-password").fill("e2e-phase2");
  await page.getByRole("button", { name: "Masuk" }).click();

  await expect(page.getByRole("heading", { name: "Stase Saya" })).toBeVisible();
  await page.getByRole("button", { name: "Tambah Stase" }).first().click();
  await page.getByLabel("Nama stase").fill("E2E Neurology Legacy");
  await page.getByLabel("Specialty").selectOption({ label: "Neurologi" });
  await page.getByLabel("Start date").fill("2026-10-01");
  await page.getByLabel("End date").fill("2026-10-31");
  await page.getByLabel("Status").selectOption({ label: "Mendatang" });
  await page.getByRole("button", { name: "Simpan Stase" }).click();

  expect(state.rotation?.specialty).toBe("Neurologi");
});
