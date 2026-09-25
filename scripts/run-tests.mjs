import { execFileSync } from "node:child_process";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const outputDir = path.join(rootDir, ".test-dist");
const tscPath = path.join(rootDir, "node_modules", "typescript", "bin", "tsc");
const testFile = path.join(outputDir, "tests", "reportGenerator.test.js");

function run(command, args, env = {}) {
  execFileSync(command, args, {
    cwd: rootDir,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

rmSync(outputDir, { recursive: true, force: true });

try {
  if (!existsSync(tscPath)) {
    throw new Error("TypeScript CLI tidak ditemukan. Jalankan npm ci atau npm install terlebih dahulu.");
  }

  run(process.execPath, [tscPath, "-p", "tsconfig.tests.json"]);

  writeFileSync(
    path.join(outputDir, "package.json"),
    JSON.stringify({ type: "commonjs" }) + "\n",
    "utf8",
  );

  run(process.execPath, ["--test", testFile], {
    TZ: "Asia/Makassar",
  });
} catch (error) {
  process.exitCode = error?.status ?? 1;
} finally {
  if (!process.env.KEEP_TEST_OUTPUT) {
    rmSync(outputDir, { recursive: true, force: true });
  }
}
