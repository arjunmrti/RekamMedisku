import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const TEST_EMAIL = "e2e-smoke@test.local";
const TEST_PASSWORD = "test-password-123";

test("smoke login against Supabase", async ({ page }) => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (users.error) throw new Error(`Failed to list smoke users: ${JSON.stringify(users.error)}`);
  const existing = users.data.users.find((user) => user.email === TEST_EMAIL);
  if (existing) {
    const deleted = await admin.auth.admin.deleteUser(existing.id);
    if (deleted.error) throw new Error(`Failed to delete smoke user: ${JSON.stringify(deleted.error)}`);
  }

  const created = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    throw new Error(`Failed to create smoke user: ${JSON.stringify(created.error)}`);
  }
  const profile = await admin.from("profiles").upsert(
    { id: created.data.user.id, name: "E2E Smoke User" },
    { onConflict: "id" },
  );
  if (profile.error) throw new Error(`Failed to seed smoke profile: ${JSON.stringify(profile.error)}`);

  const consoleLogs: string[] = [];
  const networkErrors: string[] = [];
  const authResponses: string[] = [];
  page.on("console", (message) => consoleLogs.push(`[${message.type()}] ${message.text()}`));
  page.on("requestfailed", (request) =>
    networkErrors.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? "unknown"}`),
  );
  page.on("response", async (response) => {
    if (response.url().includes("/auth/v1/token")) {
      let body = "<unreadable>";
      try {
        body = await response.text();
      } catch {
        // Response bodies can be unavailable after the page closes.
      }
      authResponses.push(`${response.status()} ${response.url()} :: ${body}`);
    }
  });

  await page.goto("/");
  await page.locator("#login-email").fill(TEST_EMAIL);
  await page.locator("#login-password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();

  try {
    await expect(
      page.getByRole("button", { name: /Beranda|Daftar Pasien|Stase Saya/ }).first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(page.locator("#login-email")).toHaveCount(0);
    await expect(page.locator("#login-password")).toHaveCount(0);
  } catch (error) {
    throw new Error(
      [
        `Smoke login workspace assertion failed: ${error instanceof Error ? error.message : String(error)}`,
        `Exact URL: ${page.url()}`,
        `Login form count: ${await page.locator("#login-email, #login-password").count()}`,
        `Console logs: ${JSON.stringify(consoleLogs)}`,
        `Network errors: ${JSON.stringify(networkErrors)}`,
        `Auth responses: ${JSON.stringify(authResponses)}`,
      ].join("\n"),
    );
  }
});
