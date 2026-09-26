import test from "node:test";
import assert from "node:assert/strict";
import {
  loadActiveRotation,
  loadActiveRotationId,
  loadRotations,
  upsertRotation,
} from "../src/data/localRotations";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, String(value));
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

const storage = new MemoryStorage();

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: storage,
  },
});

function rotation(
  id: string,
  name: string,
  status: "Aktif" | "Selesai" | "Mendatang" = "Aktif",
) {
  return {
    id,
    name,
    specialty: "Neurologi" as const,
    startDate: "2026-09-01",
    endDate: "2026-09-30",
    status,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-26T00:00:00.000Z",
  };
}

test("menghapus rotation demo lama dari localStorage", () => {
  storage.clear();
  storage.setItem(
    "rekammedisku:rotations",
    JSON.stringify([
      rotation("rotation-neurologi", "Neurologi"),
      rotation("rotation-interna", "Ilmu Penyakit Dalam"),
      rotation("rotation-bedah", "Bedah"),
      rotation("rotation-pediatri", "Pediatri"),
      rotation("rotation-obgyn", "Obgyn"),
      rotation("rotation-custom", "Stase Buatan User"),
    ]),
  );

  const rotations = loadRotations();

  assert.deepEqual(
    rotations.map((item) => item.id),
    ["rotation-custom"],
  );
  assert.equal(
    JSON.parse(storage.getItem("rekammedisku:rotations") ?? "[]").length,
    1,
  );
});

test("menghapus seluruh data demo lama tanpa membuat default baru", () => {
  storage.clear();
  storage.setItem(
    "rekammedisku:rotations",
    JSON.stringify([
      rotation("rotation-interna", "Ilmu Penyakit Dalam"),
      rotation("rotation-bedah", "Bedah"),
      rotation("rotation-pediatri", "Pediatri"),
      rotation("rotation-obgyn", "Obgyn"),
    ]),
  );

  const rotations = loadRotations();

  assert.deepEqual(rotations, []);
  assert.deepEqual(
    JSON.parse(storage.getItem("rekammedisku:rotations") ?? "null"),
    [],
  );
});

test("mempertahankan rotation yang bukan data demo", () => {
  storage.clear();
  const customRotation = rotation("rotation-custom", "Stase Buatan User");
  storage.setItem(
    "rekammedisku:rotations",
    JSON.stringify([customRotation]),
  );

  assert.deepEqual(loadRotations(), [customRotation]);
});

test("workspace baru tidak membuat stase otomatis", () => {
  storage.clear();

  assert.deepEqual(loadRotations(), []);
  assert.equal(storage.getItem("rekammedisku:rotations"), null);
});

test("workspace tanpa stase aktif tidak memilih stase secara otomatis", () => {
  storage.clear();
  storage.setItem(
    "rekammedisku:rotations",
    JSON.stringify([
      rotation("rotation-future", "Stase Mendatang", "Mendatang"),
      rotation("rotation-done", "Stase Selesai", "Selesai"),
    ]),
  );

  assert.equal(loadActiveRotationId(), "");
  assert.equal(loadActiveRotation().id, "");
  assert.equal(loadActiveRotation().name, "Belum ada stase");
});


test("mengubah stase aktif menjadi Selesai mengosongkan konteks aktif", () => {
  storage.clear();
  storage.setItem(
    "rekammedisku:rotations",
    JSON.stringify([rotation("rotation-test", "Neurologi")]),
  );
  storage.setItem("rekammedisku:active-rotation", "rotation-test");

  const result = upsertRotation({
    id: "rotation-test",
    name: "Neurologi",
    specialty: "Neurologi",
    startDate: "2026-09-01",
    endDate: "2026-09-30",
    status: "Selesai",
  });

  assert.equal(result[0]?.status, "Selesai");
  assert.equal(loadActiveRotationId(), "");
});
