import { test, expect, type Page, type Route } from "@playwright/test";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const ROTATION_ID = "00000000-0000-4000-8000-000000000002";
const PATIENT_ID = "00000000-0000-4000-8000-000000000003";
const FOLLOW_UP_ID = "00000000-0000-4000-8000-000000000004";
const TEMPLATE_ID = "00000000-0000-4000-8000-000000000005";

type MockState = {
  rotation: Record<string, unknown> | null;
  patient: Record<string, unknown> | null;
  followUp: Record<string, unknown> | null;
};

const TEMPLATE_ROW = {
  id: TEMPLATE_ID,
  user_id: USER_ID,
  type: "follow_up",
  name: "E2E Follow-Up Template",
  description: "Template untuk alur E2E",
  metadata: {},
  is_archived: false,
  created_at: "2026-09-27T00:00:00.000Z",
  updated_at: "2026-09-27T00:00:00.000Z",
};

const TEMPLATE_VERSION_ROW = {
  id: "00000000-0000-4000-8000-000000000006",
  user_id: USER_ID,
  template_id: TEMPLATE_ID,
  version: 1,
  schema_version: 1,
  definition: {
    schema_version: 1,
    sections: [
      {
        id: "clinical-note",
        title: "Catatan Klinis",
        fields: [
          { id: "progress", label: "Perkembangan", type: "textarea", required: false },
        ],
      },
    ],
  },
  created_at: "2026-09-27T00:00:00.000Z",
};

function nowIso() {
  return new Date().toISOString();
}

function json(route: Route, status: number, body: unknown) {
  return route.fulfill({
    status,
    contentType: "application/json",
    headers: {
      "cache-control": "no-store",
    },
    body: JSON.stringify(body),
  });
}

function rowPatient(state: MockState) {
  return state.patient
    ? {
        ...state.patient,
        follow_ups: state.followUp
          ? [
              {
                number: state.followUp.number,
                iso_date: state.followUp.iso_date,
                time: state.followUp.time,
                status: state.followUp.status,
              },
            ]
          : [],
      }
    : null;
}

async function installMockSupabase(page: Page, state: MockState) {
  await page.route("https://mock.supabase.local/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === "/auth/v1/token") {
      return json(route, 200, {
        access_token: "e2e-access-token",
        refresh_token: "e2e-refresh-token",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user: {
          id: USER_ID,
          aud: "authenticated",
          role: "authenticated",
          email: "e2e@example.test",
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
        email: "e2e@example.test",
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

    if (path === "/rest/v1/templates" && method === "GET") {
      return json(route, 200, [TEMPLATE_ROW]);
    }

    if (path === "/rest/v1/template_versions" && method === "GET") {
      return json(route, 200, [TEMPLATE_VERSION_ROW]);
    }

    if (path === "/rest/v1/rotations" && method === "GET") {
      return json(route, 200, state.rotation ? [state.rotation] : []);
    }

    if (path === "/rest/v1/patients" && method === "GET") {
      return json(route, 200, rowPatient(state) ? [rowPatient(state)] : []);
    }

    if (path === "/rest/v1/follow_ups" && method === "GET") {
      return json(route, 200, state.followUp ? [state.followUp] : []);
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
      };

      return json(route, 201, state.patient);
    }

    if (path.endsWith("/rpc/upsert_rotation_with_activation") && method === "POST") {
      const payload = request.postDataJSON() as Record<string, unknown>;
      state.rotation = {
        id: ROTATION_ID,
        user_id: USER_ID,
        name: String(payload.p_name ?? "E2E Neurologi"),
        specialty: String(payload.p_specialty ?? "Neurologi"),
        start_date: String(payload.p_start_date ?? "2026-09-27"),
        end_date: String(payload.p_end_date ?? "2026-10-27"),
        status: String(payload.p_status ?? "Aktif"),
        follow_up_template_id: TEMPLATE_ID,
        follow_up_template_version: 1,
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

      state.followUp = {
        id: FOLLOW_UP_ID,
        user_id: USER_ID,
        patient_id: String(followUp.patient_id),
        number: Number(followUp.number ?? 1),
        date: String(followUp.date ?? "2026-09-27"),
        iso_date: String(followUp.iso_date ?? "2026-09-27"),
        time: String(followUp.time ?? "08:00:00"),
        status: String(followUp.status ?? "Tersimpan"),
        template_type: String(followUp.template_type ?? "E2E Follow-Up Template"),
        template_id: TEMPLATE_ID,
        template_version: 1,
        template_schema_version: 1,
        template_snapshot: TEMPLATE_VERSION_ROW.definition,
        answers: followUp.answers ?? {},
        assessment_codes: Array.isArray(followUp.assessment_codes)
          ? followUp.assessment_codes
          : [],
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

      return json(route, 200, {
        followUpId: FOLLOW_UP_ID,
        supportingExamIds: {},
      });
    }

    if (path.endsWith("/rpc/") || path.includes("/rpc/")) {
      return json(route, 200, {});
    }

    return json(route, 200, []);
  });
}

test("alur browser utama: login → stase → pasien → follow-up → backup", async ({
  page,
}) => {
  const state: MockState = {
    rotation: null,
    patient: null,
    followUp: null,
  };

  await installMockSupabase(page, state);
  await page.goto("/");

  await expect(page).toHaveTitle("RekamMedisku");
  await expect(
    page.getByRole("heading", { name: "Masuk ke RekamMedisku" }),
  ).toBeVisible();

  await page.locator("#login-email").fill("e2e@example.test");
  await page.locator("#login-password").fill("E2E-password-only-for-test");
  await page.getByRole("button", { name: "Masuk" }).click();

  await expect(
    page.getByRole("heading", { name: "Stase Saya" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Tambah Stase" }).first().click();
  await page.getByLabel("Nama stase").fill("E2E Neurologi");
  await page.getByLabel("Specialty").selectOption({ label: "Neurologi" });
  await page.getByLabel("Start date").fill("2026-09-27");
  await page.getByLabel("End date").fill("2026-10-27");
  await page.getByLabel("Template Follow-Up").waitFor({ state: "visible" });
  await page.getByLabel("Template Follow-Up").selectOption({ label: "E2E Follow-Up Template · v1" });
  await page.getByLabel("Status").selectOption({ label: "Aktif" });
  await page.getByRole("button", { name: "Simpan Stase" }).click();

  await expect(page.getByText("E2E Neurologi", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Daftar Pasien" }).click();
  await expect(
    page.getByRole("heading", { name: "Daftar Pasien" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Tambah Pasien" }).click();
  await page.getByLabel("Nama Lengkap Pasien").fill("Pasien E2E");
  await page.getByLabel("No. Rekam Medis (RM)").fill("E2E-001");
  await page.getByLabel("Usia (Tahun)").fill("30");
  await page.getByLabel("Jenis Kelamin").selectOption({ label: "Laki-laki" });
  await page.getByLabel("DPJP (Dokter Spesialis)").fill("dr. E2E");
  await page.getByLabel("Tanggal Masuk").fill("2026-09-27");
  await page
    .getByLabel("Nama Bangsal / Ruangan")
    .fill("Bangsal E2E");
  await page.getByLabel("Nomor Bed").fill("01");
  await page.getByRole("button", { name: "Simpan Pasien" }).click();

  await expect(page.getByText("Pasien E2E", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Buka Profil Pasien" }).click();

  await expect(
    page.getByRole("heading", { name: "Pasien E2E" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Follow-Up Baru" }).click();

  await expect(
    page.getByRole("heading", { name: "Follow-Up Baru" }),
  ).toBeVisible();
  await page
    .getByLabel("Keluhan / Perkembangan Hari Ini", { exact: true })
    .fill("Keluhan hari ini membaik.");

  await page.getByRole("button", { name: "Simpan Follow-Up" }).click();

  await expect(page.getByText("✓ Follow-up berhasil disimpan.")).toBeVisible();
  await page.waitForTimeout(800);

  await expect(
    page.getByRole("heading", { name: "Pasien E2E" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Cadangan & Data" }).click();
  await expect(
    page.getByRole("heading", { name: "Cadangan & Data" }),
  ).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^rekammedisku-backup-\d{4}-\d{2}-\d{2}\.json$/);
  await expect(
    page.getByText(/Data berhasil diekspor/),
  ).toBeVisible();
});
