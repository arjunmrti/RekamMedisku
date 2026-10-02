import { test, expect, type Page, type Route } from "@playwright/test";

const USER_ID = "00000000-0000-4000-8000-0000000000p2";
const STARTER_ID = "00000000-0000-0000-0000-000000000201";
const CLONED_TEMPLATE_ID = "00000000-0000-4000-8000-0000000000p6";

type MockState = {
  clonedTemplate: Record<string, unknown> | null;
};

const STARTER_ROW = {
  id: STARTER_ID,
  user_id: null,
  type: "follow_up",
  name: "Starter follow-up",
  description: "System starter",
  metadata: {},
  is_archived: false,
  is_system_owned: true,
  created_at: "2026-10-01T00:00:00.000Z",
  updated_at: "2026-10-01T00:00:00.000Z",
};

const STARTER_VERSION_ROW = {
  id: "00000000-0000-0000-0000-000000000202",
  user_id: null,
  template_id: STARTER_ID,
  version: 1,
  schema_version: 1,
  definition: {
    schema_version: 1,
    sections: [{ id: "general", title: "General", fields: [{ id: "notes", label: "Notes", type: "textarea", required: false }] }],
  },
  created_at: "2026-10-01T00:00:00.000Z",
};

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

async function installMock(page: Page, state: MockState) {
  await page.route("https://mock.supabase.local/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === "/auth/v1/token") {
      return json(route, 200, {
        access_token: "e2e-token",
        refresh_token: "e2e-refresh",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user: { id: USER_ID, aud: "authenticated", role: "authenticated", email: "phase2@example.test", app_metadata: {}, user_metadata: {}, created_at: nowIso() },
      });
    }

    if (path === "/auth/v1/user") {
      return json(route, 200, { id: USER_ID, aud: "authenticated", role: "authenticated", email: "phase2@example.test", app_metadata: {}, user_metadata: {}, created_at: nowIso() });
    }

    if (path === "/rest/v1/templates" && method === "GET") {
      const isSystem = url.searchParams.get("is_system_owned") === "eq.true";
      const rows = isSystem ? [STARTER_ROW] : state.clonedTemplate ? [state.clonedTemplate] : [];
      return json(route, 200, rows);
    }

    if (path === "/rest/v1/template_versions" && method === "GET") {
      const templateId = url.searchParams.get("template_id");
      if (templateId === `eq.${STARTER_ID}`) return json(route, 200, [STARTER_VERSION_ROW]);
      if (templateId?.includes(CLONED_TEMPLATE_ID)) {
        return json(route, 200, [{
          id: "00000000-0000-4000-8000-0000000000p8",
          user_id: USER_ID,
          template_id: CLONED_TEMPLATE_ID,
          version: 1,
          schema_version: 1,
          definition: STARTER_VERSION_ROW.definition,
          created_at: nowIso(),
        }]);
      }
      return json(route, 200, []);
    }

    if (path === "/rest/v1/rotations" && method === "GET") return json(route, 200, []);
    if (path === "/rest/v1/slaberan_locations" && method === "GET") return json(route, 200, []);
    if (path === "/rest/v1/slaberan_templates" && method === "GET") return json(route, 200, []);

    if (path.endsWith("/rpc/clone_system_follow_up_template") && method === "POST") {
      state.clonedTemplate = {
        id: CLONED_TEMPLATE_ID,
        user_id: USER_ID,
        type: "follow_up",
        name: "Starter follow-up",
        description: "Cloned from system",
        metadata: {},
        is_archived: false,
        is_system_owned: false,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      return json(route, 200, { templateId: CLONED_TEMPLATE_ID, version: 1, schemaVersion: 1 });
    }

    return json(route, 200, []);
  });
}

test("Phase 2 clone regression: RPC result triggers template list reload and auto-select", async ({ page }) => {
  const state: MockState = { clonedTemplate: null };

  await installMock(page, state);
  await page.goto("/");

  await page.locator("#login-email").fill("phase2@example.test");
  await page.locator("#login-password").fill("e2e-phase2");
  await page.getByRole("button", { name: "Masuk" }).click();

  await expect(page.getByRole("heading", { name: "Stase Saya" })).toBeVisible();
  await page.getByRole("button", { name: "Tambah Stase" }).first().click();

  await expect(page.getByRole("button", { name: "Salin" })).toBeVisible({ timeout: 5000 });
  await page.getByRole("button", { name: "Salin" }).click();

  // After clone callback returns, application calls setFollowUpTemplates(await listFollowUpTemplates())
  // Mock will return [clonedTemplate] on next GET /rest/v1/templates
  // RotationFormModal receives updated followUpTemplates prop and renders the cloned option
  await expect.poll(async () => {
    const opts = await templateSelect.locator("option").allTextContents();
    return opts.some((opt) => opt.includes("Starter follow-up · v1"));
  }).toBe(true);

  const templateSelect = page.locator("select").filter({ has: page.locator('option[value="' + CLONED_TEMPLATE_ID + '"]') });
  await templateSelect.waitFor({ state: "visible", timeout: 5000 });

  const options = await templateSelect.locator("option").allTextContents();
  const hasClonedOption = options.some((opt) => opt.includes("Starter follow-up · v1"));
  expect(hasClonedOption).toBe(true);

  const selectedValue = await templateSelect.inputValue();
  expect(selectedValue).toBe(CLONED_TEMPLATE_ID);
});
