import { test, expect } from "@playwright/test";

const USER_A = "00000000-0000-4000-8000-0000000000a1";
const USER_B = "00000000-0000-4000-8000-0000000000b2";

async function cleanupAttachmentDatabases(page: import("@playwright/test").Page) {
  await page.evaluate(async () => {
    const databases = await indexedDB.databases();

    await Promise.all(
      databases
        .filter((database) =>
          database.name?.startsWith("rekammedisku:attachments:user:"),
        )
        .map(
          (database) =>
            new Promise<void>((resolve) => {
              if (!database.name) {
                resolve();
                return;
              }

              const request = indexedDB.deleteDatabase(database.name);
              request.onsuccess = () => resolve();
              request.onerror = () => resolve();
              request.onblocked = () => resolve();
            }),
        ),
    );

    for (const key of Object.keys(localStorage)) {
      if (key.includes(":attachments-legacy-migration-v1")) {
        localStorage.removeItem(key);
      }
    }
  });
}

test("MU-002: attachment IndexedDB terisolasi antar user", async ({ page }) => {
  await page.goto("/");

  const result = await page.evaluate(
    async ({ userA, userB }) => {
      const { setWorkspaceUserId } = await import(
        "/src/data/workspaceStorage.ts"
      );
      const {
        deleteAttachment,
        getAttachment,
        loadAllAttachments,
        replaceAllAttachments,
        saveAttachment,
      } = await import("/src/data/localAttachments.ts");

      setWorkspaceUserId(userA);

      const attachmentA = await saveAttachment(
        new File(["attachment-A"], "attachment-a.pdf", {
          type: "application/pdf",
        }),
      );

      const userAStoreBeforeSwitch = await loadAllAttachments();
      const userAContent = await getAttachment(attachmentA);

      setWorkspaceUserId(userB);

      const userBStoreBeforeInsert = await loadAllAttachments();
      const userBCannotReadA = await getAttachment(attachmentA);

      const attachmentB = await saveAttachment(
        new File(["attachment-B"], "attachment-b.pdf", {
          type: "application/pdf",
        }),
      );

      const userBStoreAfterInsert = await loadAllAttachments();

      await replaceAllAttachments([
        {
          id: attachmentB,
          name: "replacement-b.pdf",
          type: "application/pdf",
          size: 13,
          blob: new Blob(["replacement-B"], {
            type: "application/pdf",
          }),
        },
      ]);

      setWorkspaceUserId(userA);
      const userAStoreAfterBSideReplace = await loadAllAttachments();
      const userAContentAfterSwitch = await getAttachment(attachmentA);

      setWorkspaceUserId(userB);
      await deleteAttachment(attachmentB);
      const userBStoreAfterDelete = await loadAllAttachments();

      return {
        attachmentA,
        attachmentB,
        userAStoreBeforeSwitch: userAStoreBeforeSwitch.map((item) => item.id),
        userAContent: userAContent?.text ? await userAContent.text() : null,
        userBStoreBeforeInsert: userBStoreBeforeInsert.map((item) => item.id),
        userBCannotReadA: userBCannotReadA === null,
        userBStoreAfterInsert: userBStoreAfterInsert.map((item) => item.id),
        userAStoreAfterBSideReplace: userAStoreAfterBSideReplace.map(
          (item) => item.id,
        ),
        userAContentAfterSwitch: userAContentAfterSwitch?.text
          ? await userAContentAfterSwitch.text()
          : null,
        userBStoreAfterDelete: userBStoreAfterDelete.map((item) => item.id),
      };
    },
    { userA: USER_A, userB: USER_B },
  );

  expect(result.userAStoreBeforeSwitch).toHaveLength(1);
  expect(result.userAStoreBeforeSwitch).toContain(result.attachmentA);
  expect(result.userAContent).toBe("attachment-A");

  expect(result.userBStoreBeforeInsert).toEqual([]);
  expect(result.userBCannotReadA).toBe(true);

  expect(result.userBStoreAfterInsert).toEqual([result.attachmentB]);

  expect(result.userAStoreAfterBSideReplace).toEqual([result.attachmentA]);
  expect(result.userAContentAfterSwitch).toBe("attachment-A");

  expect(result.userBStoreAfterDelete).toEqual([]);

  await cleanupAttachmentDatabases(page);
});

test("MU-002: attachment API menolak akses tanpa workspace user aktif", async ({
  page,
}) => {
  await page.goto("/");

  const result = await page.evaluate(async () => {
    const { setWorkspaceUserId } = await import(
      "/src/data/workspaceStorage.ts"
    );
    const { getAttachment, loadAllAttachments } = await import(
      "/src/data/localAttachments.ts"
    );

    setWorkspaceUserId(null);

    const errors: string[] = [];

    await loadAllAttachments().catch((error) => {
      errors.push(error instanceof Error ? error.message : String(error));
    });

    await getAttachment("att-without-user").catch((error) => {
      errors.push(error instanceof Error ? error.message : String(error));
    });

    return errors;
  });

  expect(result).toHaveLength(2);
  expect(result.every((message) => /workspace pengguna aktif/i.test(message))).toBe(
    true,
  );
});
