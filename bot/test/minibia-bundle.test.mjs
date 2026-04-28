import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  buildBundleManifest,
  buildBundleReadme,
  buildMinibiaDesktopLauncher,
  buildPortableClientMeta,
  listPortableProfileLocks,
  resolveBundleSourceLayout,
  sanitizePortableAccountSecrets,
  shouldCopyBotRepoPath,
  shouldCopyPortableBotConfigPath,
  shouldCopyPortableElectronUserDataPath,
} from "../scripts/create-minibia-bundle.mjs";

test("portable bundle readme and manifest advertise the Minibia launch flow", () => {
  const readme = buildBundleReadme({
    outputDir: "/tmp/minibia",
  });
  assert.match(readme, /`\.\/Minibia\.desktop`/);
  assert.match(readme, /`\.\/start-bot\.sh` or `start-bot\.cmd`/);
  assert.match(readme, /`\.\/start-client\.sh` or `start-client\.cmd`/);
  assert.match(readme, /`bot\/storage\/home\/`: copied bot config and cavebots/);
  assert.match(readme, /`bot\/storage\/runtime\/`: generated browser and Electron profile state/);
  assert.match(readme, /Bundle path:\n\n- `\/tmp\/minibia`/);

  const manifest = JSON.parse(buildBundleManifest({
    outputDir: "/tmp/minibia",
    clientTargetDir: "/tmp/minibia/client",
  }));
  assert.equal(manifest.outputDir, "/tmp/minibia");
  assert.equal(manifest.clientTargetDir, "/tmp/minibia/client");
});

test("portable bundle client metadata always launches Minibia as a PWA app URL", () => {
  const meta = buildPortableClientMeta({
    appId: "portable-app-id",
    profileDirectory: "Default",
    pageUrl: "https://minibia.com/play",
    sourceDesktopEntryPath: "/home/hinoki/.local/share/applications/minibia.desktop",
  });

  assert.equal(meta.appId, "portable-app-id");
  assert.equal(meta.launchMode, "app-url");
  assert.equal(meta.profileDirectory, "Default");
  assert.equal(meta.pageUrl, "https://minibia.com/play?pwa=1");
  assert.equal(meta.sourceDesktopEntryPath, null);
  assert.match(meta.createdAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("portable bundle exposes dedicated Minibia desktop launchers", () => {
  const topLevelDesktop = buildMinibiaDesktopLauncher();
  assert.match(topLevelDesktop, /\nName=Minibia\n/);
  assert.match(topLevelDesktop, /exec "\$DIR\/start-client\.sh"/);

  const clientDesktop = buildMinibiaDesktopLauncher({
    commandPath: "../start-client.sh",
  });
  assert.match(clientDesktop, /exec "\$DIR\/\.\.\/start-client\.sh"/);
});

test("portable bundle source layout follows an existing minibia/bot bundle", () => {
  const layout = resolveBundleSourceLayout({
    appBaseDir: "/tmp/minibia/bot",
    existsImpl: (candidate) => (
      candidate === "/tmp/minibia/bot/package.json"
      || candidate === "/tmp/minibia/client"
    ),
  });

  assert.equal(layout.portable, true);
  assert.equal(layout.botConfigDir, "/tmp/minibia/bot/storage/home/.config/minibot");
  assert.equal(layout.routeProfileDir, "/tmp/minibia/bot/storage/home/Minibot/cavebots");
  assert.equal(layout.electronUserDataDir, "/tmp/minibia/bot/storage/runtime/electron/Minibot");
  assert.equal(layout.clientProfileDir, "/tmp/minibia/client/chrome-profile");
});

test("portable bundle skips generated browser state when copying Electron user data", () => {
  const userDataRoot = "/home/hinoki/.config/Minibot";
  assert.equal(shouldCopyPortableElectronUserDataPath(userDataRoot, userDataRoot), true);
  assert.equal(shouldCopyPortableElectronUserDataPath("/home/hinoki/.config/Minibot/Preferences", userDataRoot), true);
  assert.equal(shouldCopyPortableElectronUserDataPath("/home/hinoki/.config/Minibot/Cache", userDataRoot), false);
  assert.equal(shouldCopyPortableElectronUserDataPath("/home/hinoki/.config/Minibot/managed-chrome-profile", userDataRoot), false);
  assert.equal(shouldCopyPortableElectronUserDataPath("/home/hinoki/.config/Minibot/managed-chrome-profile.pre-state-trim-20260416-022029", userDataRoot), false);
  assert.equal(shouldCopyPortableElectronUserDataPath("/home/hinoki/.config/Minibot/managed-chrome-profile/Default/Cookies", userDataRoot), false);
  assert.equal(shouldCopyPortableElectronUserDataPath("/home/hinoki/.config/Minibot/managed-chrome-profile/Default/History", userDataRoot), false);
});

test("portable bundle skips local logs, generated state, and stale leases", () => {
  const repoRoot = "/home/hinoki/minibia/bot";
  assert.equal(shouldCopyBotRepoPath(repoRoot, repoRoot), true);
  assert.equal(shouldCopyBotRepoPath(`${repoRoot}/lib/bot-core.mjs`, repoRoot), true);
  assert.equal(shouldCopyBotRepoPath(`${repoRoot}/artifacts/live-stack-analysis/lord-larva-01.json`, repoRoot), false);
  assert.equal(shouldCopyBotRepoPath(`${repoRoot}/storage/home/.config/Minibot/Default/History`, repoRoot), false);
  assert.equal(shouldCopyBotRepoPath(`${repoRoot}/storage/home/.config/minibot/session.log`, repoRoot), false);
  assert.equal(shouldCopyBotRepoPath(`${repoRoot}/storage/home/.config/minibot/session-state.json`, repoRoot), false);
  assert.equal(shouldCopyBotRepoPath(`${repoRoot}/storage/home/.config/minibot/accounts/trainer.json`, repoRoot), false);
  assert.equal(shouldCopyBotRepoPath(`${repoRoot}/storage/home/.config/minibot/claims/holy-rat.json`, repoRoot), false);
  assert.equal(shouldCopyBotRepoPath(`${repoRoot}/storage/home/.config/minibot/characters/holy-rat.json`, repoRoot), true);
  assert.equal(shouldCopyBotRepoPath(`${repoRoot}/storage/home/.config/minibot/characters/page-062645fe2056428cfb02e46e1ff3a944.json`, repoRoot), false);

  const configRoot = "/home/hinoki/.config/minibot";
  assert.equal(shouldCopyPortableBotConfigPath(`${configRoot}/config.json`, configRoot), true);
  assert.equal(shouldCopyPortableBotConfigPath(`${configRoot}/characters/holy-rat.json`, configRoot), true);
  assert.equal(shouldCopyPortableBotConfigPath(`${configRoot}/characters/page-062645fe2056428cfb02e46e1ff3a944.json`, configRoot), false);
  assert.equal(shouldCopyPortableBotConfigPath(`${configRoot}/characters/page-1.json`, configRoot), true);
  assert.equal(shouldCopyPortableBotConfigPath(`${configRoot}/claims/holy-rat.json`, configRoot), false);
  assert.equal(shouldCopyPortableBotConfigPath(`${configRoot}/route-spacing/larvas/session.json`, configRoot), false);
  assert.equal(shouldCopyPortableBotConfigPath(`${configRoot}/session.log`, configRoot), false);
});

test("portable bundle strips machine-local account passwords but keeps portable secrets", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "minibia-account-sanitize-"));
  const accountDir = path.join(tempRoot, "accounts");
  await fs.mkdir(accountDir, { recursive: true });
  await fs.writeFile(path.join(accountDir, "local.json"), JSON.stringify({
    id: "local",
    loginMethod: "account-password",
    loginName: "local@example.com",
    password: "local-secret",
    secretStorage: "local-file",
  }, null, 2));
  await fs.writeFile(path.join(accountDir, "portable.json"), JSON.stringify({
    id: "portable",
    loginMethod: "account-password",
    loginName: "portable@example.com",
    password: "portable-secret",
    secretStorage: "portable-file",
  }, null, 2));

  try {
    const result = await sanitizePortableAccountSecrets(tempRoot);
    const local = JSON.parse(await fs.readFile(path.join(accountDir, "local.json"), "utf8"));
    const portable = JSON.parse(await fs.readFile(path.join(accountDir, "portable.json"), "utf8"));

    assert.equal(result.sanitized, 1);
    assert.equal(result.retainedPortable, 1);
    assert.equal(local.password, "");
    assert.equal(portable.password, "portable-secret");
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("portable bundle builder detects active source-profile lock files", async () => {
  const locks = await listPortableProfileLocks("/tmp/minibia/chrome-profile", {
    pathExistsImpl: async (candidatePath) => (
      candidatePath === "/tmp/minibia/chrome-profile/SingletonLock"
      || candidatePath === "/tmp/minibia/chrome-profile/Default/LOCK"
    ),
  });

  assert.deepEqual(locks, [
    "/tmp/minibia/chrome-profile/SingletonLock",
    "/tmp/minibia/chrome-profile/Default/LOCK",
  ]);
});
