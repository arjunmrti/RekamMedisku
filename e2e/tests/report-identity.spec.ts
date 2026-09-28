import { test, expect, type Page, type Route } from "@playwright/test";

const USER_ID = "00000000-0000-4000-8000-0000000000c1";
const ROTATION_ID = "00000000-0000-4000-8000-0000000000c2";
const PATIENT_ID = "00000000-0000-4000-8000-0000000000c3";
const FOLLOW_UP_ID = "00000000-0000-4000-8000-0000000000c4";

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

async function installMockSupabase(page: Page) {
  await page.route("https://mock.supabase.local/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === "/auth/v1/token" && method === "POST") {
      return json(route, 200, {
        access_token: "e2e-profile-token",
        refresh_token: "e2e-profile-refresh",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user: {
          id: USER_ID,
          aud: "authenticated",
          role: "authenticated",
          email: "profile@example.test",
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
        email: "profile@example.test",
        app_metadata: { provider: "email" },
        user_metadata: {},
        created_at: nowIso(),
      });
    }

    if (path === "/rest/v1/profiles" && method === "GET") {
      return json(route, 200, [
        {
          id: USER_ID,
          name: "Dr. Profil Uji",
          username: "profil_uji",
          student_id: "STB-9988",
          program: "MPPD",
          institution: "Universitas Test",
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
          name: "Neurologi Test",
          specialty: "Neurologi",
          start_date: "2026-09-28",
          end_date: "2026-10-28",
          status: "Aktif",
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
          name: "Pasien Profile",
          age: 40,
          gender: "Laki-laki",
          rm: "P-001",
          room: "Melati",
          bed: "02",
          doctor: "dr. Uji",
          current_location_id: null,
          current_location_type: "ward",
          current_location_name: "Melati",
          admission_location_id: null,
          admission_location_type: "ward",
          admission_location_name: "Melati",
          created_at: nowIso(),
          updated_at: nowIso(),
          admission_date: "2026-09-27",
          admission_complaint: "Keluhan uji.",
          status: "Aktif",
          follow_ups: [
            {
              number: 1,
              iso_date: "2026-09-28",
              time: "08:00:00",
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
          date: "28 September 2026",
          iso_date: "2026-09-28",
          time: "08.00",
          status: "Tersimpan",
          template_type: "Neurologi",
          assessment_codes: [],
          planning: "Observasi.",
          instruction: "Kontrol bila memburuk.",
          subjective: "Keluhan membaik.",
          objective: "Kesadaran: Compos mentis",
          assessment: "Membaik.",
          plan: "Lanjut observasi.",
          summary: "Keluhan membaik.",
          created_at: nowIso(),
          updated_at: nowIso(),
        },
      ]);
    }

    if (path === "/rest/v1/supporting_exams" && method === "GET") {
      return json(route, 200, []);
    }

    if (path.includes("/rpc/")) {
      return json(route, 200, []);
    }

    return json(route, 200, []);
  });
}

test("MU-004: report memakai identitas dari application profile, bukan identitas hardcoded", async ({
  page,
}) => {
  await installMockSupabase(page);
  await page.goto("/");

  await page.locator("#login-email").fill("profile@example.test");
  await page.locator("#login-password").fill("e2e-password");
  await page.getByRole("button", { name: "Masuk" }).click();

  await expect(page.getByRole("button", { name: "Semua Laporan" })).toBeVisible();
  await page.getByRole("button", { name: "Semua Laporan" }).click();

  await expect(
    page.getByRole("heading", { name: "Semua Laporan" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Buat Laporan Follow-Up" }).click();

  await expect(
    page.getByRole("heading", { name: "Buat Laporan Follow-Up" }),
  ).toBeVisible();

  await expect(page.getByRole("button", { name: "Generate Laporan" })).toBeEnabled();
  await page.getByRole("button", { name: "Generate Laporan" }).click();

  await expect(
    page.getByText(
      /Perkenalkan saya Dr\. Profil Uji dengan Stambuk STB-9988 MPPD dari Universitas Test Stase Neurologi/,
    ),
  ).toBeVisible();

  await expect(page.getByText(/Muh\. Fadel|11120252020/)).toHaveCount(0);
});
