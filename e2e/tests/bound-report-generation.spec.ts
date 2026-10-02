import { test, expect, type Page, type Route } from "@playwright/test";

const USER_ID = "00000000-0000-4000-8000-0000000000r1";
const ROTATION_ID = "00000000-0000-4000-8000-0000000000r2";
const PATIENT_ID = "00000000-0000-4000-8000-0000000000r3";
const FOLLOW_UP_ID = "00000000-0000-4000-8000-0000000000r4";
const REPORT_TEMPLATE_ID = "00000000-0000-4000-8000-0000000000r5";
const REPORT_VERSION_ID = "00000000-0000-4000-8000-0000000000r6";

function json(route: Route, status: number, body: unknown) {
  return route.fulfill({
    status,
    contentType: "application/json",
    headers: { "cache-control": "no-store" },
    body: JSON.stringify(body),
  });
}

function nowIso() {
  return new Date().toISOString();
}

const BOUND_REPORT_DEFINITION = {
  schema_version: 1,
  greeting: "Laporan Follow-Up Pasien {{patient.name}}",
  sections: [
    {
      id: "identity",
      label: "Identitas",
      enabled: true,
      body: "Nama: {{patient.name}}\nUsia: {{patient.age}} tahun\nNo. RM: {{patient.rm}}",
    },
    {
      id: "vitals",
      label: "Vital Signs",
      enabled: true,
      body: "GCS: {{core.gcsEye}}/{{core.gcsVerbal}}/{{core.gcsMotor}}\nTD: {{core.systolic}}/{{core.diastolic}} mmHg",
    },
    {
      id: "template_data",
      label: "Template Fields",
      enabled: true,
      body: "BP Reading: {{template.field.bp_reading}}\nNotes: {{template.field.clinical_notes}}",
    },
  ],
  closing: "Terima kasih",
};

const FOLLOW_UP_TEMPLATE_DEFINITION = {
  schema_version: 1,
  sections: [
    {
      id: "vitals",
      title: "Vital Signs",
      fields: [
        { id: "bp_reading", label: "BP Reading", type: "text" },
        { id: "clinical_notes", label: "Clinical Notes", type: "textarea" },
      ],
    },
  ],
};

async function installMockSupabase(page: Page) {
  await page.route("https://mock.supabase.local/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === "/auth/v1/token" && method === "POST") {
      return json(route, 200, {
        access_token: "e2e-bound-report-token",
        refresh_token: "e2e-bound-report-refresh",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user: {
          id: USER_ID,
          aud: "authenticated",
          role: "authenticated",
          email: "report@example.test",
          app_metadata: { provider: "email" },
          user_metadata: {},
          created_at: nowIso(),
        },
      });
    }

    if (path === "/auth/v1/user" && method === "GET") {
      return json(route, 200, {
        id: USER_ID,
        aud: "authenticated",
        role: "authenticated",
        email: "report@example.test",
        app_metadata: { provider: "email" },
        user_metadata: {},
        created_at: nowIso(),
      });
    }

    if (path === "/rest/v1/profiles" && method === "GET") {
      return json(route, 200, [
        {
          id: USER_ID,
          name: "Dr. E2E Report",
          username: "e2ereport",
          student_id: "STB-E2E",
          program: "MPPD",
          institution: "E2E University",
        },
      ]);
    }

    if (path === "/rest/v1/slaberan_locations" && method === "GET") {
      return json(route, 200, []);
    }

    if (path === "/rest/v1/slaberan_templates" && method === "GET") {
      return json(route, 200, []);
    }

    if (path === "/rest/v1/rotations" && method === "GET") {
      return json(route, 200, [
        {
          id: ROTATION_ID,
          user_id: USER_ID,
          name: "Neurologi Bound",
          specialty: "Neurologi",
          start_date: "2026-09-01",
          end_date: "2026-10-31",
          status: "Aktif",
          report_template_id: REPORT_TEMPLATE_ID,
          report_template_version: 1,
          created_at: nowIso(),
          updated_at: nowIso(),
        },
      ]);
    }

    if (path === "/rest/v1/patients" && method === "GET") {
      return json(route, 200, [
        {
          id: PATIENT_ID,
          user_id: USER_ID,
          rotation_id: ROTATION_ID,
          name: "Budi Santoso",
          age: 45,
          gender: "Laki-laki",
          rm: "RM-2026-001",
          room: "Melati",
          bed: "05",
          doctor: "dr. Wijaya",
          current_location_id: null,
          current_location_type: "ward",
          current_location_name: "Melati",
          admission_location_id: null,
          admission_location_type: "ward",
          admission_location_name: "Melati",
          created_at: nowIso(),
          updated_at: nowIso(),
          admission_date: "2026-09-28",
          admission_complaint: "Nyeri kepala 3 hari.",
          status: "Aktif",
          follow_ups: [
            {
              number: 1,
              iso_date: "2026-09-29",
              time: "10:00:00",
              status: "Tersimpan",
            },
          ],
        },
      ]);
    }

    if (path === "/rest/v1/follow_ups" && method === "GET") {
      return json(route, 200, [
        {
          id: FOLLOW_UP_ID,
          user_id: USER_ID,
          patient_id: PATIENT_ID,
          number: 1,
          date: "29 September 2026",
          iso_date: "2026-09-29",
          time: "10.00",
          status: "Tersimpan",
          template_type: "Neurologi",
          template_id: "dummy-follow-up-template",
          template_version: 1,
          template_schema_version: 1,
          template_snapshot: FOLLOW_UP_TEMPLATE_DEFINITION,
          template_answers: {
            bp_reading: "120/80",
            clinical_notes: "Kondisi stabil",
          },
          assessment_codes: [],
          planning: "Lanjut observasi.",
          instruction: "Kontrol bila memburuk.",
          subjective: "Nyeri kepala berkurang.",
          objective: "Kesadaran: Compos mentis\nGCS E/M/V: 4/5/6",
          assessment: "Cephalgia membaik.",
          plan: "Observasi lanjut.",
          summary: "Kondisi membaik.",
          core_objective: {
            generalCondition: "Baik",
            consciousness: "Compos mentis",
            gcsEye: "4",
            gcsVerbal: "5",
            gcsMotor: "6",
            systolic: "120",
            diastolic: "80",
            pulse: "80",
            respiratoryRate: "18",
            temperature: "36.5",
            spo2: "98",
          },
          created_at: nowIso(),
          updated_at: nowIso(),
        },
      ]);
    }

    if (path === "/rest/v1/supporting_exams" && method === "GET") {
      return json(route, 200, []);
    }

    if (path === "/rest/v1/templates" && method === "GET") {
      const templateId = url.searchParams.get("id");
      if (templateId?.includes(REPORT_TEMPLATE_ID)) {
        return json(route, 200, [
          {
            id: REPORT_TEMPLATE_ID,
            user_id: USER_ID,
            name: "Neurologi Bound Template",
            type: "report",
            is_system_owned: false,
            is_archived: false,
            latest_version: 1,
            created_at: nowIso(),
            updated_at: nowIso(),
          },
        ]);
      }
      return json(route, 200, []);
    }

    if (path === "/rest/v1/template_versions" && method === "GET") {
      const templateId = url.searchParams.get("template_id");
      if (templateId?.includes(REPORT_TEMPLATE_ID)) {
        return json(route, 200, [
          {
            id: REPORT_VERSION_ID,
            user_id: USER_ID,
            template_id: REPORT_TEMPLATE_ID,
            version: 1,
            schema_version: 1,
            definition: BOUND_REPORT_DEFINITION,
            created_at: nowIso(),
          },
        ]);
      }
      return json(route, 200, []);
    }

    if (path.includes("/rpc/")) {
      return json(route, 200, []);
    }

    return json(route, 200, []);
  });
}

test("bound report template resolves patient, core, and template.field tags in preview", async ({
  page,
}) => {
  await installMockSupabase(page);
  await page.goto("/");

  await page.locator("#login-email").fill("report@example.test");
  await page.locator("#login-password").fill("e2e-password");
  await page.getByRole("button", { name: "Masuk" }).click();

  await expect(page.getByText("Budi Santoso")).toBeVisible({ timeout: 10000 });
  
  await page.getByRole("button", { name: "Budi Santoso" }).click();
  await expect(page.getByText("Nyeri kepala berkurang")).toBeVisible({ timeout: 5000 });

  const reportButton = page.getByRole("button", { name: /Lihat Laporan|Report|Preview/i }).first();
  await reportButton.click({ timeout: 5000 });

  await expect(page.getByText("Budi Santoso", { exact: false })).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("120/80")).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("4/5/6")).toBeVisible({ timeout: 5000 });
});

