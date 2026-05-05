import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  CANONICAL_BOT_MARKDOWN,
  CANONICAL_ROOT_MARKDOWN,
  REQUIRED_BOT_DIRECTORIES,
  REQUIRED_BUNDLE_PATHS,
  createRepoStructureReport,
} from "../scripts/check-repo-structure.mjs";

const repoRoot = path.resolve(new URL("../..", import.meta.url).pathname);

async function writeFile(rootDir, relativePath, contents = "") {
  const filePath = path.join(rootDir, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, contents, "utf8");
}

async function createMinimalStructuredRepo() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "minibot-structure-"));

  for (const file of CANONICAL_ROOT_MARKDOWN) {
    await writeFile(rootDir, file, "# Root\n");
  }

  for (const file of CANONICAL_BOT_MARKDOWN) {
    await writeFile(rootDir, path.join("bot", file), `# ${path.basename(file)}\n`);
  }

  for (const directory of REQUIRED_BOT_DIRECTORIES) {
    await fs.mkdir(path.join(rootDir, directory), { recursive: true });
  }

  for (const requiredPath of REQUIRED_BUNDLE_PATHS) {
    if (requiredPath === "bot/package.json") {
      continue;
    }
    await writeFile(rootDir, requiredPath, "{}\n");
  }

  await writeFile(rootDir, "bot/package.json", JSON.stringify({
    name: "minibot",
    main: "desktop/main.mjs",
    files: ["scripts/**/*"],
    scripts: {
      "check:structure": "node scripts/check-repo-structure.mjs",
      test: "node scripts/run-live-tests.mjs --all-sessions --allow-skip --then smoke",
      "test:all": "node scripts/run-tests.mjs all",
      "test:live": "node scripts/run-live-tests.mjs --all-sessions",
    },
    build: {
      directories: {
        output: "dist",
      },
    },
  }, null, 2));

  return rootDir;
}

test("current repo structure matches the canonical bundle contract", () => {
  const report = createRepoStructureReport({ bundleRootDir: repoRoot });
  assert.deepEqual(report.issues, []);
  assert.equal(report.ok, true);
});

test("repo structure check rejects duplicate durable docs and tracked generated state", async () => {
  const rootDir = await createMinimalStructuredRepo();

  try {
    await writeFile(rootDir, "bot/docs/HANDOFF.md", "# stale handoff\n");
    await writeFile(rootDir, "bot/storage/runtime/electron/Preferences", "{}\n");

    const report = createRepoStructureReport({ bundleRootDir: rootDir });
    assert.equal(report.ok, false);
    assert.ok(report.issues.includes("bot canonical markdown contains unexpected docs/HANDOFF.md"));
    assert.ok(report.issues.includes("generated or machine-local path is tracked: bot/storage/runtime/electron/Preferences"));
  } finally {
    await fs.rm(rootDir, { recursive: true, force: true });
  }
});

test("repo structure check enforces temporal note shape", async () => {
  const rootDir = await createMinimalStructuredRepo();

  try {
    await writeFile(rootDir, "bot/temporals/Bad Note.md", [
      "created_at: 2026-04-29T00:00:00Z",
      "expires_at: 2026-05-01T00:00:00Z",
      "timezone: America/Santiago",
      "reason: test",
      "",
      "# Bad Note",
      "",
    ].join("\n"));

    const report = createRepoStructureReport({ bundleRootDir: rootDir });
    assert.equal(report.ok, false);
    assert.ok(report.issues.includes("temporal note bot/temporals/Bad Note.md must use lowercase kebab-case"));
    assert.ok(report.issues.includes("temporal note bot/temporals/Bad Note.md must expire within 24 hours of created_at"));
  } finally {
    await fs.rm(rootDir, { recursive: true, force: true });
  }
});
