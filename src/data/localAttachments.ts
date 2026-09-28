import {
  loadFollowUpDraft,
  loadSavedFollowUps,
} from "./localFollowUps";
import { getWorkspaceUserId, workspaceStorageKey } from "./workspaceStorage";

const LEGACY_DB_NAME = "rekammedisku:attachments";
const USER_DB_PREFIX = "rekammedisku:attachments:user:";
const DB_VERSION = 1;
const STORE_NAME = "files";
const LEGACY_MIGRATION_KEY = "attachments-legacy-migration-v1";

export type StoredAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  blob: Blob;
};

function createAttachmentId() {
  const randomId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);

  return "att-" + randomId;
}

function getActiveUserId(): string {
  const userId = getWorkspaceUserId();

  if (!userId) {
    throw new Error(
      "Workspace pengguna aktif tidak tersedia. Lampiran tidak dapat diakses sebelum sesi pengguna siap.",
    );
  }

  return userId;
}

function getUserDatabaseName(userId: string) {
  return USER_DB_PREFIX + userId;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB tidak tersedia di browser ini."));
      return;
    }

    const userId = getActiveUserId();
    const request = window.indexedDB.open(
      getUserDatabaseName(userId),
      DB_VERSION,
    );

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Gagal membuka penyimpanan lampiran."));
  });
}

function getCurrentWorkspaceAttachmentIds(): Set<string> {
  const ids = new Set<string>();

  for (const entries of Object.values(loadSavedFollowUps())) {
    for (const entry of entries) {
      for (const exam of entry.supportingExams ?? []) {
        if (exam.attachmentId) {
          ids.add(exam.attachmentId);
        }
      }
    }
  }

  const draftPrefix = workspaceStorageKey("follow-up-draft:");

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);

    if (!key || !key.startsWith(draftPrefix)) {
      continue;
    }

    const patientId = key.slice(draftPrefix.length);
    const draft = loadFollowUpDraft(patientId);

    for (const exam of draft?.supportingExams ?? []) {
      if (exam.attachmentId) {
        ids.add(exam.attachmentId);
      }
    }
  }

  return ids;
}

function openLegacyDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB tidak tersedia di browser ini."));
      return;
    }

    const databases = window.indexedDB.databases;

    if (typeof databases === "function") {
      void databases
        .call(window.indexedDB)
        .then((entries) => {
          if (!entries.some((entry) => entry.name === LEGACY_DB_NAME)) {
            resolve(null);
            return;
          }

          openExistingLegacyDatabase(resolve, reject);
        })
        .catch(reject);

      return;
    }

    openExistingLegacyDatabase(resolve, reject);
  });
}

function openExistingLegacyDatabase(
  resolve: (database: IDBDatabase | null) => void,
  reject: (error: unknown) => void,
) {
  const request = window.indexedDB.open(LEGACY_DB_NAME, DB_VERSION);
  let createdNewDatabase = false;

  request.onupgradeneeded = () => {
    createdNewDatabase = request.result.version === DB_VERSION &&
      request.transaction?.db.version === DB_VERSION &&
      request.transaction?.mode === "versionchange" &&
      request.result.objectStoreNames.length === 0;
    request.transaction?.abort();
  };

  request.onsuccess = () => {
    if (createdNewDatabase) {
      request.result.close();
      resolve(null);
      return;
    }

    resolve(request.result);
  };

  request.onerror = () => {
    const error = request.error;

    if (createdNewDatabase) {
      resolve(null);
      return;
    }

    reject(error ?? new Error("Penyimpanan lampiran lama gagal dibaca."));
  };
}

async function migrateLegacyAttachments(): Promise<void> {
  const migrationKey = workspaceStorageKey(LEGACY_MIGRATION_KEY);

  if (window.localStorage.getItem(migrationKey) === "done") {
    return;
  }

  const attachmentIds = getCurrentWorkspaceAttachmentIds();

  if (attachmentIds.size === 0) {
    window.localStorage.setItem(migrationKey, "done");
    return;
  }

  const legacyDatabase = await openLegacyDatabase();

  if (!legacyDatabase) {
    window.localStorage.setItem(migrationKey, "done");
    return;
  }

  const userDatabase = await openUserDatabaseOnly();

  try {
    await new Promise<void>((resolve, reject) => {
      const legacyTransaction = legacyDatabase.transaction(
        STORE_NAME,
        "readonly",
      );
      const legacyStore = legacyTransaction.objectStore(STORE_NAME);
      const userTransaction = userDatabase.transaction(
        STORE_NAME,
        "readwrite",
      );
      const userStore = userTransaction.objectStore(STORE_NAME);

      let remaining = attachmentIds.size;

      if (remaining === 0) {
        resolve();
        return;
      }

      const finishOne = () => {
        remaining -= 1;

        if (remaining === 0) {
          resolve();
        }
      };

      for (const id of attachmentIds) {
        const request = legacyStore.get(id) as IDBRequest<
          StoredAttachment | undefined
        >;

        request.onsuccess = () => {
          const attachment = request.result;

          if (attachment) {
            try {
              userStore.put(attachment);
            } catch (error) {
              reject(error);
              return;
            }
          }

          finishOne();
        };

        request.onerror = () => {
          reject(
            request.error ??
              new Error("Lampiran lama gagal dibaca untuk migrasi."),
          );
        };
      }

      userTransaction.onabort = () => {
        reject(
          userTransaction.error ??
            new Error("Migrasi lampiran lama dibatalkan."),
        );
      };

      userTransaction.onerror = () => {
        reject(
          userTransaction.error ??
            new Error("Migrasi lampiran lama gagal disimpan."),
        );
      };
    });
  } finally {
    legacyDatabase.close();
    userDatabase.close();
  }

  window.localStorage.setItem(migrationKey, "done");
}

function openUserDatabaseOnly(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(
      getUserDatabaseName(getActiveUserId()),
      DB_VERSION,
    );

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        request.error ??
          new Error("Gagal membuka penyimpanan lampiran pengguna."),
      );
  });
}

async function openDatabaseWithLegacyMigration(): Promise<IDBDatabase> {
  const database = await openDatabase();

  try {
    await migrateLegacyAttachments();
  } catch (error) {
    database.close();
    throw error;
  }

  return database;
}

export async function saveAttachment(file: File): Promise<string> {
  const database = await openDatabaseWithLegacyMigration();
  const id = createAttachmentId();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    store.put({
      id,
      name: file.name,
      type: file.type,
      size: file.size,
      blob: file,
    } satisfies StoredAttachment);

    transaction.oncomplete = () => {
      database.close();
      resolve(id);
    };

    transaction.onerror = () => {
      database.close();
      reject(
        transaction.error ??
          new Error("Lampiran gagal disimpan ke penyimpanan browser."),
      );
    };

    transaction.onabort = () => {
      database.close();
      reject(
        transaction.error ??
          new Error("Penyimpanan lampiran dibatalkan oleh browser."),
      );
    };
  });
}

export async function saveStoredAttachment(
  attachment: StoredAttachment,
): Promise<void> {
  const database = await openDatabaseWithLegacyMigration();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(attachment);

    transaction.oncomplete = () => {
      database.close();
      resolve();
    };

    transaction.onerror = () => {
      database.close();
      reject(
        transaction.error ??
          new Error("Lampiran gagal disimpan ke penyimpanan browser."),
      );
    };

    transaction.onabort = () => {
      database.close();
      reject(
        transaction.error ??
          new Error("Penyimpanan lampiran dibatalkan oleh browser."),
      );
    };
  });
}

export async function getAttachment(id: string): Promise<Blob | null> {
  const database = await openDatabaseWithLegacyMigration();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id) as IDBRequest<StoredAttachment | undefined>;

    request.onsuccess = () => {
      database.close();
      resolve(request.result?.blob ?? null);
    };

    request.onerror = () => {
      database.close();
      reject(
        request.error ??
          new Error("Lampiran gagal dibaca dari penyimpanan browser."),
      );
    };
  });
}

export async function getStoredAttachment(
  id: string,
): Promise<StoredAttachment | null> {
  const database = await openDatabaseWithLegacyMigration();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id) as IDBRequest<StoredAttachment | undefined>;

    request.onsuccess = () => {
      database.close();
      resolve(request.result ?? null);
    };

    request.onerror = () => {
      database.close();
      reject(
        request.error ??
          new Error("Metadata lampiran gagal dibaca dari penyimpanan browser."),
      );
    };
  });
}

export async function loadAllAttachments(): Promise<StoredAttachment[]> {
  const database = await openDatabaseWithLegacyMigration();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll() as IDBRequest<
      StoredAttachment[]
    >;

    request.onsuccess = () => {
      database.close();
      resolve(request.result);
    };

    request.onerror = () => {
      database.close();
      reject(
        request.error ??
          new Error("Lampiran gagal dibaca dari penyimpanan browser."),
      );
    };
  });
}

export async function replaceAllAttachments(
  attachments: StoredAttachment[],
): Promise<void> {
  const database = await openDatabaseWithLegacyMigration();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    try {
      store.clear();

      for (const attachment of attachments) {
        store.put(attachment);
      }
    } catch (error) {
      transaction.abort();
      database.close();
      reject(
        error instanceof Error
          ? error
          : new Error("Lampiran gagal dipulihkan ke penyimpanan browser."),
      );
      return;
    }

    transaction.oncomplete = () => {
      database.close();
      resolve();
    };

    transaction.onerror = () => {
      database.close();
      reject(
        transaction.error ??
          new Error("Lampiran gagal dipulihkan ke penyimpanan browser."),
      );
    };

    transaction.onabort = () => {
      database.close();
      reject(
        transaction.error ??
          new Error("Pemulihan lampiran dibatalkan oleh browser."),
      );
    };
  });
}

export async function deleteAttachments(ids: string[]): Promise<void> {
  const uniqueIds = [...new Set(ids)];

  if (uniqueIds.length === 0) return;

  const database = await openDatabaseWithLegacyMigration();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");

    try {
      const store = transaction.objectStore(STORE_NAME);

      for (const id of uniqueIds) {
        store.delete(id);
      }
    } catch (error) {
      transaction.abort();
      database.close();
      reject(
        error instanceof Error
          ? error
          : new Error("Lampiran gagal disiapkan untuk penghapusan."),
      );
      return;
    }

    transaction.oncomplete = () => {
      database.close();
      resolve();
    };

    transaction.onerror = () => {
      database.close();
      reject(
        transaction.error ??
          new Error("Lampiran gagal dihapus dari penyimpanan browser."),
      );
    };

    transaction.onabort = () => {
      database.close();
      reject(
        transaction.error ??
          new Error("Penghapusan lampiran dibatalkan oleh browser."),
      );
    };
  });
}

export async function deleteAttachment(id: string): Promise<void> {
  const database = await openDatabaseWithLegacyMigration();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);

    transaction.oncomplete = () => {
      database.close();
      resolve();
    };

    transaction.onerror = () => {
      database.close();
      reject(
        transaction.error ??
          new Error("Lampiran gagal dihapus dari penyimpanan browser."),
      );
    };

    transaction.onabort = () => {
      database.close();
      reject(
        transaction.error ??
          new Error("Penghapusan lampiran dibatalkan oleh browser."),
      );
    };
  });
}
