import test from "node:test";
import assert from "node:assert/strict";
import {
  getWorkspaceUserId,
  setWorkspaceUserId,
  workspaceStorageKey,
} from "../src/data/workspaceStorage";

test("workspace storage key is scoped by authenticated user", () => {
  setWorkspaceUserId("user-a");

  assert.equal(workspaceStorageKey("patients"), "rekammedisku:user:user-a:patients");
  assert.equal(workspaceStorageKey("rekammedisku:rotations"), "rekammedisku:user:user-a:rotations");
  assert.equal(getWorkspaceUserId(), "user-a");

  setWorkspaceUserId("user-b");

  assert.equal(workspaceStorageKey("patients"), "rekammedisku:user:user-b:patients");
  assert.notEqual(
    workspaceStorageKey("patients"),
    "rekammedisku:user:user-a:patients",
  );
});

test("workspace storage falls back to isolated anonymous scope without a session", () => {
  setWorkspaceUserId(null);

  assert.equal(
    workspaceStorageKey("patients"),
    "rekammedisku:user:anonymous:patients",
  );
  assert.equal(getWorkspaceUserId(), null);
});
