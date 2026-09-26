const DB_NAME = "rekammedisku:attachments";
const DB_VERSION = 1;
const STORE_NAME = "files";

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

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB tidak tersedia di browser ini."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

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

export async function saveAttachment(file: File): Promise<string> {
  const database = await openDatabase();
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
  const database = await openDatabase();

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
  const database = await openDatabase();

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
  const database = await openDatabase();

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
  const database = await openDatabase();

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
  const database = await openDatabase();

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

  const database = await openDatabase();

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
  const database = await openDatabase();

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
