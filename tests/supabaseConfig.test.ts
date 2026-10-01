import test from "node:test";
import assert from "node:assert/strict";
import { isValidSupabaseConfiguration } from "../src/utils/supabaseConfig";

test("Supabase config validation rejects missing or unsafe values", () => {
  assert.equal(isValidSupabaseConfiguration(undefined, "key"), false);
  assert.equal(isValidSupabaseConfiguration("not a url", "key"), false);
  assert.equal(isValidSupabaseConfiguration("http://example.supabase.co", "key"), false);
  assert.equal(isValidSupabaseConfiguration("https://example.supabase.co", ""), false);
  assert.equal(isValidSupabaseConfiguration("https://example.supabase.co", "publishable"), true);
});
