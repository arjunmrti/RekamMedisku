import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const TEST_EMAIL = "phase3-real@e2e.test";
const TEST_PASSWORD = "phase3-test-password-123";

test.describe.configure({ mode: "serial" });

test.describe("Phase 3: Real Supabase E2E", () => {
  test("step 1: login -> authenticated workspace", async ({ page }) => {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (users.error) throw new Error(`Failed to list users: ${JSON.stringify(users.error)}`);
    const existing = users.data.users.find((u) => u.email === TEST_EMAIL);
    if (existing) {
      const deleted = await admin.auth.admin.deleteUser(existing.id);
      if (deleted.error) throw new Error(`Failed to delete existing user: ${JSON.stringify(deleted.error)}`);
    }

    const created = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (created.error || !created.data.user) throw new Error(`Failed to create user: ${JSON.stringify(created.error)}`);

    const userId = created.data.user.id;
    const profile = await admin.from("profiles").upsert({ id: userId, name: "Phase3 E2E User" }, { onConflict: "id" });
    if (profile.error) throw new Error(`Failed to upsert profile: ${JSON.stringify(profile.error)}`);

    const consoleLogs: string[] = [];
    const networkErrors: string[] = [];
    page.on("console", (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
    page.on("requestfailed", (req) => networkErrors.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText}`));

    await page.goto("/");
    await page.locator("#login-email").fill(TEST_EMAIL);
    await page.locator("#login-password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Masuk" }).click();

    try {
      await expect(page.getByRole("button", { name: /Beranda|Daftar Pasien|Stase Saya/ }).first()).toBeVisible({ timeout: 15000 });
      await expect(page.locator("#login-email")).toHaveCount(0);
    } catch (error) {
      throw new Error(
        [
          `Step 1 failed: ${error instanceof Error ? error.message : String(error)}`,
          `URL: ${page.url()}`,
          `Console: ${JSON.stringify(consoleLogs)}`,
          `Network errors: ${JSON.stringify(networkErrors)}`,
        ].join("\n"),
      );
    }
  });

  test("step 2-3: create rotation via UI and assert visible", async ({ page }) => {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (users.error) throw new Error(`Failed to list users: ${JSON.stringify(users.error)}`);
    const existing = users.data.users.find((u) => u.email === TEST_EMAIL);
    if (!existing) throw new Error("Test user does not exist; run step 1 first or check beforeEach");

    const userId = existing.id;
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { error: signInError } = await userClient.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD });
    if (signInError) throw new Error(`Failed to sign in: ${JSON.stringify(signInError)}`);

    const customTemplate = await admin.from("templates").insert({
      user_id: userId,
      name: "Custom Cardio Template",
      type: "follow_up",
      is_archived: false,
      is_system_owned: false,
    }).select("id").single();
    if (customTemplate.error || !customTemplate.data) throw new Error(`Failed to create template: ${JSON.stringify(customTemplate.error)}`);

    const customTemplateId = customTemplate.data.id;
    const versionInsert = await admin.from("template_versions").insert({
      user_id: userId,
      template_id: customTemplateId,
      version: 1,
      schema_version: 1,
      definition: {
        schema_version: 1,
        sections: [
          {
            id: "cardio",
            title: "Cardiovascular Assessment",
            fields: [
              { id: "bp_sys", label: "BP Systolic", type: "number", required: false, unit: "mmHg" },
              { id: "bp_dia", label: "BP Diastolic", type: "number", required: false, unit: "mmHg" },
              { id: "hr", label: "Heart Rate", type: "number", required: false, unit: "bpm" },
            ],
          },
        ],
      },
    });
    if (versionInsert.error) throw new Error(`Failed to create template version: ${JSON.stringify(versionInsert.error)}`);

    const rotation = await userClient.rpc("upsert_rotation_with_activation", {
      p_rotation_id: null,
      p_expected_updated_at: null,
      p_name: "Cardiology Phase3",
      p_specialty: "Ilmu Penyakit Dalam",
      p_institution: "RSUP Phase3",
      p_start_date: "2026-10-01",
      p_end_date: "2026-11-30",
      p_status: "Aktif",
      p_follow_up_template_id: customTemplateId,
      p_follow_up_template_version: 1,
      p_report_template_id: null,
      p_report_template_version: null,
      p_slaberan_template_id: null,
    });
    if (rotation.error) throw new Error(`RPC failed: ${JSON.stringify(rotation.error)}`);
    if (!rotation.data || !Array.isArray(rotation.data) || rotation.data.length === 0) throw new Error(`No rotation rows returned`);

    const rotationId = rotation.data[0].id;
    
    const rotationMapBefore = await userClient.from("rotations").select("id").eq("id", rotationId).single();
    if (rotationMapBefore.error || !rotationMapBefore.data) throw new Error(`Rotation not visible to authenticated client after RPC`);

    await page.goto("/");
    await page.locator("#login-email").fill(TEST_EMAIL);
    await page.locator("#login-password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Masuk" }).click();

    await expect(page.getByRole("button", { name: /Beranda|Daftar Pasien|Stase Saya/ }).first()).toBeVisible({ timeout: 15000 });

    await page.goto("/rotations");
    await expect(page.getByRole("heading", { name: "Cardiology Phase3", exact: true })).toBeVisible({ timeout: 10000 });
  });

  test("step 4: custom template binding -> renderer shows fields", async ({ page }) => {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });    const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (users.error) throw new Error(`Failed to list users: ${JSON.stringify(users.error)}`);
    const existing = users.data.users.find((u) => u.email === TEST_EMAIL);
    if (!existing) throw new Error("Test user does not exist");

    const userId = existing.id;
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { error: signInError } = await userClient.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD });
    if (signInError) throw new Error(`Failed to sign in: ${JSON.stringify(signInError)}`);

    const rotations = await userClient.from("rotations").select("id, follow_up_template_id, follow_up_template_version").eq("status", "Aktif").limit(1);
    if (rotations.error || !rotations.data?.[0]) throw new Error(`Failed to fetch active rotation: ${JSON.stringify(rotations.error)}`);
    const rotationId = rotations.data[0].id;
    const templateId = rotations.data[0].follow_up_template_id;

    const patients = await admin.from("patients").insert({
      user_id: userId,
      rotation_id: rotationId,
      name: "E2E Test Patient",
      age: 45,
      gender: "Perempuan",
      rm: "RM-E2E-001",
      room: "Ward B",
      bed: "2",
      doctor: "Dr. Test",
      status: "Aktif",
      current_location_type: "ward",
      current_location_name: "Ward B",
    }).select("id").single();
    if (patients.error || !patients.data) throw new Error(`Failed to create patient: ${JSON.stringify(patients.error)}`);

    const patientId = patients.data.id;
    const visiblePatients = await userClient.from("patients").select("id,name,rotation_id,user_id").eq("id", patientId);
    if (visiblePatients.error || !visiblePatients.data?.[0]) throw new Error(`Seeded patient not visible: ${JSON.stringify(visiblePatients.error)}`);
    const visibleRotations = await userClient.from("rotations").select("id,name,status").eq("id", rotationId);
    if (visibleRotations.error || !visibleRotations.data?.[0]) throw new Error(`Seeded rotation not visible: ${JSON.stringify(visibleRotations.error)}`);

    const consoleLogs: string[] = [];
    const networkErrors: string[] = [];
    page.on("console", (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
    page.on("requestfailed", (req) => networkErrors.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText}`));

    await page.goto("/");
    await page.locator("#login-email").fill(TEST_EMAIL);
    await page.locator("#login-password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Masuk" }).click();

    await expect(page.getByRole("button", { name: /Beranda|Daftar Pasien|Stase Saya/ }).first()).toBeVisible({ timeout: 15000 });

    const workspaceLoading = page.getByText("Menyiapkan workspace RekamMedisku...", { exact: true });
    await expect(workspaceLoading).toHaveCount(0, { timeout: 15000 });
    
    const sidebarPatientsButton = page.getByRole("button", { name: "Daftar Pasien", exact: true }).first();
    await expect(sidebarPatientsButton).toBeVisible({ timeout: 10000 });
    await sidebarPatientsButton.click();
    
    await expect(page.getByRole("heading", { name: "Daftar Pasien", exact: true })).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator("p").filter({ hasText: /Menampilkan\s+[1-9]\d*\s+dari\s+[1-9]\d*\s+pasien/ }).first(),
    ).toBeVisible({ timeout: 15000 });
    
    const patientRow = page.locator("tr").filter({ hasText: "E2E Test Patient" }).first();
    await expect(patientRow).toBeVisible({ timeout: 10000 });
    await patientRow.click();

    await expect(page.getByRole("heading", { name: "E2E Test Patient", exact: true })).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "Buka Profil Pasien", exact: true }).click();
    await expect(page.getByRole("button", { name: /Follow-Up Baru/, exact: false })).toBeVisible({ timeout: 10000 });

    const addFollowUpButton = page.getByRole("button", { name: /Follow-Up Baru/, exact: false });
    await addFollowUpButton.click();

    try {
      await expect(page.getByText("Custom Cardio Template", { exact: false }).first()).toBeVisible({ timeout: 8000 });
      await expect(page.getByText("BP Systolic", { exact: false })).toBeVisible({ timeout: 5000 });
      await expect(page.getByText("BP Diastolic", { exact: false })).toBeVisible({ timeout: 5000 });
      await expect(page.getByText("Heart Rate", { exact: false })).toBeVisible({ timeout: 5000 });
      const systolicInput = page.locator("div.block").filter({ hasText: "BP Systolic" }).locator("input").first();
      await systolicInput.fill("120");
      await page.getByLabel("Keluhan / Perkembangan Hari Ini").fill("Keluhan membaik setelah terapi.");
      await page.getByRole("button", { name: "Simpan Follow-Up", exact: true }).click();
      await expect(page.getByText("✓ Follow-up berhasil disimpan.", { exact: true })).toBeVisible({ timeout: 20000 });
      await expect(page.getByRole("heading", { name: "E2E Test Patient", exact: true }).first()).toBeVisible({ timeout: 15000 });
      await page.getByRole("button", { name: "Riwayat Follow-Up", exact: true }).click();
      const historySection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Riwayat Follow-Up", exact: true }) }).first();
      await expect(historySection.getByRole("heading", { name: "Riwayat Follow-Up", exact: true })).toBeVisible({ timeout: 10000 });
      const savedFollowUp = historySection.getByRole("button").filter({ hasText: "Keluhan membaik setelah terapi." }).first();
      await expect(savedFollowUp).toBeVisible({ timeout: 10000 });
      await expect(savedFollowUp.getByText("Follow-up #1", { exact: true })).toBeVisible();

      await page.getByRole("button", { name: "Buat Laporan", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Pilih jenis laporan", exact: true })).toBeVisible({ timeout: 10000 });
      await page.getByRole("button", { name: "Buat Laporan Follow-Up", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Buat Laporan Follow-Up", exact: true })).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("Memuat profil...", { exact: true })).toHaveCount(0, { timeout: 20000 });
      const generateButton = page.getByRole("button", { name: "Generate Laporan", exact: true }).first();
      await expect(generateButton).toBeEnabled({ timeout: 20000 });
      await generateButton.click();
      await expect(page.getByText("Preview belum dibuat", { exact: true })).toHaveCount(0, { timeout: 20000 });
      const previewSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Preview Laporan", exact: true }) }).first();
      await expect(previewSection.getByText("E2E Test Patient", { exact: false }).first()).toBeVisible({ timeout: 10000 });
      await expect(previewSection.getByText("Keluhan membaik setelah terapi", { exact: false }).first()).toBeVisible({ timeout: 10000 });
      await expect(previewSection.getByText("BP Systolic", { exact: false }).first()).toBeVisible({ timeout: 10000 });
    } catch (error) {
      throw new Error(
        [
          `Template fields not visible: ${error instanceof Error ? error.message : String(error)}`,
          `URL: ${page.url()}`,
        ].join("\n"),
      );
    }
  });

  test("step 5: publish template v2 -> saved follow-up keeps snapshot v1", async ({ page }) => {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (users.error) throw new Error(`Failed to list users: ${JSON.stringify(users.error)}`);
    const existing = users.data.users.find((u) => u.email === TEST_EMAIL);
    if (!existing) throw new Error("Test user does not exist");
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { error: signInError } = await userClient.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD });
    if (signInError) throw new Error(`Failed to sign in: ${JSON.stringify(signInError)}`);

    const templateRow = await userClient.from("templates").select("id").eq("name", "Custom Cardio Template").eq("type", "follow_up").single();
    if (templateRow.error || !templateRow.data) throw new Error(`Custom template missing: ${JSON.stringify(templateRow.error)}`);
    const templateId = templateRow.data.id as string;
    const latestVersionRow = await userClient.from("template_versions").select("version,definition").eq("template_id", templateId).order("version", { ascending: false }).limit(1).single();
    if (latestVersionRow.error || !latestVersionRow.data) throw new Error(`Template version missing: ${JSON.stringify(latestVersionRow.error)}`);
    const latestVersion = latestVersionRow.data.version as number;
    const baseVersion = latestVersion;

    const v2Definition = {
      schema_version: 1,
      sections: [
        {
          id: "cardio",
          title: "Cardiovascular Assessment",
          fields: [
            { id: "bp_sys", label: "BP Systolic Renamed V2", type: "number", required: false, unit: "mmHg" },
            { id: "bp_dia", label: "BP Diastolic", type: "number", required: false, unit: "mmHg" },
            { id: "hr", label: "Heart Rate", type: "number", required: false, unit: "bpm" },
          ],
        },
      ],
    };
    const appended = await userClient.rpc("append_follow_up_template_version", {
      p_template_id: templateId,
      p_expected_version: baseVersion,
      p_schema_version: 1,
      p_definition: v2Definition,
    });
    if (appended.error) throw new Error(`Failed to publish v2: ${JSON.stringify(appended.error)}`);

    const savedFollowUps = await userClient.from("follow_ups").select("id,template_version,template_snapshot,answers").order("created_at", { ascending: false }).limit(1);
    if (savedFollowUps.error || !savedFollowUps.data?.[0]) throw new Error(`Saved follow-up missing: ${JSON.stringify(savedFollowUps.error)}`);
    if ((savedFollowUps.data[0].template_version as number) !== baseVersion) throw new Error(`Saved follow-up lost v${baseVersion} snapshot`);
    const snapshotText = JSON.stringify(savedFollowUps.data[0].template_snapshot ?? {});
    if (!snapshotText.includes("BP Systolic")) throw new Error(`Snapshot v${baseVersion} label missing`);
    if (snapshotText.includes("BP Systolic Renamed V2")) throw new Error(`Snapshot incorrectly contains v2 label`);
    const savedAnswers = (savedFollowUps.data[0].answers ?? {}) as Record<string, unknown>;
    if (String(savedAnswers["bp_sys"] ?? "") !== "120") throw new Error(`Saved answer bp_sys=120 missing`);

    await page.goto("/");
    await page.locator("#login-email").fill(TEST_EMAIL);
    await page.locator("#login-password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page.getByRole("button", { name: /Beranda|Daftar Pasien|Stase Saya/ }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Menyiapkan workspace RekamMedisku...", { exact: true })).toHaveCount(0, { timeout: 15000 });
    await page.getByRole("button", { name: "Daftar Pasien", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "Daftar Pasien", exact: true })).toBeVisible({ timeout: 10000 });
    await page.locator("tr").filter({ hasText: "E2E Test Patient" }).first().click();
    await expect(page.getByRole("heading", { name: "E2E Test Patient", exact: true }).first()).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "Buka Profil Pasien", exact: true }).click();
    await page.getByRole("button", { name: "Riwayat Follow-Up", exact: true }).click();
    const historySection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Riwayat Follow-Up", exact: true }) }).first();
    const savedEntry = historySection.getByRole("button").filter({ hasText: "Keluhan membaik setelah terapi." }).first();
    await expect(savedEntry).toBeVisible({ timeout: 10000 });
    await savedEntry.click();
    await expect(page.getByText("BP Systolic", { exact: false }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("BP Systolic Renamed V2", { exact: true })).toHaveCount(0);
  });
});
