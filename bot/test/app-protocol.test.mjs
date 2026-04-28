import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  APP_WINDOW_URL,
  buildAppWindowUrl,
  isTrustedAppUrl,
  resolveAppAssetFilePath,
} from "../desktop/app-protocol.mjs";

test("app protocol trusts only the packaged app origin", () => {
  assert.equal(isTrustedAppUrl(APP_WINDOW_URL), true);
  assert.equal(isTrustedAppUrl("app://-/styles.css"), true);
  assert.equal(isTrustedAppUrl(buildAppWindowUrl("/ops/index.html")), true);
  assert.equal(isTrustedAppUrl("file:///tmp/index.html"), false);
  assert.equal(isTrustedAppUrl("https://minibia.com/play"), false);
});

test("app protocol resolves local assets inside the desktop directory", () => {
  const assetDir = "/tmp/Minibot/desktop";

  assert.equal(
    resolveAppAssetFilePath("app://-/assets/favicon.png", { assetDir }),
    path.join(assetDir, "assets", "favicon.png"),
  );
  assert.equal(
    resolveAppAssetFilePath("app://-/", { assetDir }),
    path.join(assetDir, "index.html"),
  );
  assert.equal(
    resolveAppAssetFilePath("app://-/assets/favicon.png?v=20260411-root-recovered", { assetDir }),
    path.join(assetDir, "assets", "favicon.png"),
  );
  assert.equal(
    resolveAppAssetFilePath(buildAppWindowUrl("/ops/index.html"), { assetDir }),
    path.join(assetDir, "ops", "index.html"),
  );
});

test("app protocol blocks directory traversal and malformed paths", () => {
  const assetDir = "/tmp/Minibot/desktop";

  assert.equal(resolveAppAssetFilePath("app://-/../package.json", { assetDir }), null);
  assert.equal(resolveAppAssetFilePath("app://-/%E0%A4%A", { assetDir }), null);
});
