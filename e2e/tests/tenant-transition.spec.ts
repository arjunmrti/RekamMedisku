import { test, expect, type Page, type Route } from "@playwright/test";

const USER_A = "00000000-0000-4000-8000-0000000000a1";
const USER_B = "00000000-0000-4000-8000-0000000000b2";
const ROTATION_A = "00000000-0000-4000-8000-0000000000a3";
const PATIENT_A = "00000000-0000-4000-8000-0000000000a4";

type TenantState = {
  rotation: Record<string, unknown> | null;
  patient: Record<string, unknown> | null;
};

const tenantStates = new Map<string, TenantState>([
  [
    USER_A,
    {
      rotation: {
        id: ROTATION_A,
        user_id: USER_A,
        name: "Neurologi A",
        specialty: "Neurologi",
        start_date: "2026-09-28",
        end_date: "2026-10-28",
        status: "Aktif",
        created_at: "2026-09-28T08:00:00.000Z",
        updated_at: "2026-09-28T08:00:00.000Z",
      },
      patient: {
        id: PATIENT_A,
        user_id: USER_A,
        rotation_id: ROTATION_A,
        name: "Pasien Milik A",
        age: 28,
        gender: "Perempuan",
        rm: "A-001",
        room: "Bangsal A",
        bed: "01",
        doctor: "dr. A",
        current_location_id: null,
        current_location_type: "ward",
        current_location_name: "Bangsal A",
        admission_location_id: null,
        admission_location_type: "ward",
        admission_location_name: "Bangsal A",
        created_at: "2026-09-28T08:00:00.000Z",
        updated_at: "2026-09-28T08:00:00.000Z",
        admission_date: "2026-09-28",
        admission_complaint: null,
        status: "Aktif",
      },
    },
  ],
  [USER_B, { rotation: null, patient: null }],
]);

let currentUserId: string | null = null;

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

function empty(route: Route, status = 204) {
  return route.fulfill({
    status,
    headers: { "cache-control": "no-store" },
  });
}

function currentTenant() {
  return currentUserId ? tenantStates.get(currentUserId) ?? null : null;
}

function userPayload(userId: string) {
  const email = userId === USER_A ? "e2e-a@example.test" : "e2e-b@example.test";

  return {
    id: userId,
    aud: "authenticated",
    role: "authenticated",
    email,
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: nowIso(),
  };
}

async function installMockSupabase(page: Page) {
  await page.route("https://mock.supabase.local/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === "/auth/v1/token" && method === "POST") {
      const payload = request.postDataJSON() as Record<string, unknown>;
      const email = String(payload.email ?? "").trim().toLowerCase();

      currentUserId =
        email === "e2e-a@example.test"
          ? USER_A
          : email === "e2e-b@example.test"
            ? USER_B
            : null;

      if (!currentUserId) {
        return json(route, 400, {
          error: "invalid_grant",
          error_description: "Invalid login credentials",
        });
      }

      return json(route, 200, {
        access_token: "e2e-access-token-" + currentUserId,
        refresh_token: "e2e-refresh-token-" + currentUserId,
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user: userPayload(currentUserId),
      });
    }

    if (path === "/auth/v1/user" && method === "GET") {
      if (!currentUserId) {
        return json(route, 401, {
          error: "not_authenticated",
          message: "No active session",
        });
      }

      return json(route, 200, userPayload(currentUserId));
    }

    if (path === "/auth/v1/logout" && method === "POST") {
      currentUserId = null;
      return empty(route);
    }

    const tenant = currentTenant();

    if (path === "/rest/v1/slaberan_locations" && method === "GET") {
      return json(route, 200, []);
    }

    if (path === "/rest/v1/slaberan_templates" && method === "GET") {
      return json(route, 200, []);
    }

    if (path === "/rest/v1/rotations" && method === "GET") {
      return json(
        route,
        200,
        tenant?.rotation ? [tenant.rotation] : [],
      );
    }

    if (path === "/rest/v1/patients" && method === "GET") {
      return json(
        route,
        200,
        tenant?.patient ? [tenant.patient] : [],
      );
    }

    if (path === "/rest/v1/follow_ups" && method === "GET") {
      return json(route, 200, []);
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

async function signIn(page: Page, email: string) {
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill("e2e-password");
  await page.getByRole("button", { name: "Masuk" }).click();
}

async function signOut(page: Page, emailLocalPart: string) {
  await page
    .getByRole("button", { name: new RegExp(emailLocalPart, "i") })
    .click();
  await page.getByRole("menuitem", { name: "Keluar dari Akun" }).click();
  await expect(
    page.getByRole("heading", { name: "Masuk ke RekamMedisku" }),
  ).toBeVisible();
}

test("MU-003: logout → user B → user A mereset workspace dan mempertahankan data per akun", async ({
  page,
}) => {
  await installMockSupabase(page);
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Masuk ke RekamMedisku" }),
  ).toBeVisible();

  await signIn(page, "e2e-a@example.test");

  await expect(
    page.getByRole("heading", { name: "Neurologi A" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Daftar Pasien" }).click();
  await expect(
    page.getByRole("heading", { name: "Daftar Pasien" }),
  ).toBeVisible();
  await expect(page.getByText("Pasien Milik A", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Buka Profil Pasien" }).click();
  await expect(
    page.getByRole("heading", { name: "Pasien Milik A" }),
  ).toBeVisible();

  const attachmentId = await page.evaluate(async () => {
    const { saveAttachment } = await import(
      "/src/data/localAttachments.ts"
    );
    const { saveFollowUpDraft } = await import(
      "/src/data/localFollowUps.ts"
    );

    saveFollowUpDraft(
      "00000000-0000-4000-8000-0000000000a4",
      {
        subjective: "Draft milik A",
        supportingExams: [],
      } as never,
    );

    return saveAttachment(
      new File(["A attachment"], "a.pdf", {
        type: "application/pdf",
      }),
    );
  });

  const userABeforeLogout = await page.evaluate(async ({ attachmentId }) => {
    const { getWorkspaceUserId } = await import(
      "/src/data/workspaceStorage.ts"
    );
    const { loadFollowUpDraft } = await import(
      "/src/data/localFollowUps.ts"
    );
    const { getAttachment } = await import(
      "/src/data/localAttachments.ts"
    );

    const attachment = await getAttachment(attachmentId);

    return {
      workspaceUserId: getWorkspaceUserId(),
      draft: loadFollowUpDraft(
        "00000000-0000-4000-8000-0000000000a4",
      )?.subjective ?? null,
      attachmentText: attachment?.text
        ? await attachment.text()
        : null,
    };
  }, { attachmentId });

  expect(userABeforeLogout.workspaceUserId).toBe(USER_A);
  expect(userABeforeLogout.draft).toBe("Draft milik A");
  expect(userABeforeLogout.attachmentText).toBe("A attachment");

  await signOut(page, "e2e-a");

  await signIn(page, "e2e-b@example.test");

  await expect(
    page.getByRole("heading", { name: "Stase Saya" }),
  ).toBeVisible();
  await expect(page.getByText("Pasien Milik A", { exact: true })).toHaveCount(0);

  const userBWorkspace = await page.evaluate(async ({ attachmentId }) => {
    const { getWorkspaceUserId } = await import(
      "/src/data/workspaceStorage.ts"
    );
    const { loadFollowUpDraft } = await import(
      "/src/data/localFollowUps.ts"
    );
    const { getAttachment, loadAllAttachments } = await import(
      "/src/data/localAttachments.ts"
    );

    const attachment = await getAttachment(attachmentId);

    return {
      workspaceUserId: getWorkspaceUserId(),
      draft: loadFollowUpDraft(
        "00000000-0000-4000-8000-0000000000a4",
      ),
      attachment: attachment === null,
      attachmentIds: (await loadAllAttachments()).map((item) => item.id),
      storageKeys: Object.keys(localStorage).filter((key) =>
        key.startsWith("rekammedisku:user:"),
      ),
    };
  }, { attachmentId });

  expect(userBWorkspace.workspaceUserId).toBe(USER_B);
  expect(userBWorkspace.draft).toBeNull();
  expect(userBWorkspace.attachment).toBe(true);
  expect(userBWorkspace.attachmentIds).toEqual([]);

  await signOut(page, "e2e-b");

  await signIn(page, "e2e-a@example.test");

  await expect(
    page.getByRole("button", { name: "Daftar Pasien" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Daftar Pasien" }).click();
  await expect(
    page.getByText("Pasien Milik A", { exact: true }).first(),
  ).toBeVisible();

  const userAAfterRelogin = await page.evaluate(async ({ attachmentId }) => {
    const { getWorkspaceUserId } = await import(
      "/src/data/workspaceStorage.ts"
    );
    const { loadFollowUpDraft } = await import(
      "/src/data/localFollowUps.ts"
    );
    const { getAttachment } = await import(
      "/src/data/localAttachments.ts"
    );

    const attachment = await getAttachment(attachmentId);

    return {
      workspaceUserId: getWorkspaceUserId(),
      draft: loadFollowUpDraft(
        "00000000-0000-4000-8000-0000000000a4",
      )?.subjective ?? null,
      attachmentText: attachment?.text
        ? await attachment.text()
        : null,
    };
  }, { attachmentId });

  expect(userAAfterRelogin.workspaceUserId).toBe(USER_A);
  expect(userAAfterRelogin.draft).toBe("Draft milik A");
  expect(userAAfterRelogin.attachmentText).toBe("A attachment");
});
