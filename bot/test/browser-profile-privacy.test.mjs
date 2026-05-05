import test from "node:test";
import assert from "node:assert/strict";
import {
  matchesBrowserProfileExcludedName,
  shouldCopyBrowserProfilePath,
} from "../lib/browser-profile-privacy.mjs";

test("browser profile privacy strips saved-password databases by default", () => {
  assert.equal(matchesBrowserProfileExcludedName("Login Data"), true);
  assert.equal(shouldCopyBrowserProfilePath("/tmp/profile/Default/Login Data", "/tmp/profile"), false);
});

test("browser profile privacy can preserve saved-password databases for managed profiles", () => {
  assert.equal(matchesBrowserProfileExcludedName("Login Data", { preserveSavedPasswords: true }), false);
  assert.equal(
    shouldCopyBrowserProfilePath("/tmp/profile/Default/Login Data", "/tmp/profile", {
      preserveSavedPasswords: true,
    }),
    true,
  );
  assert.equal(
    shouldCopyBrowserProfilePath("/tmp/profile/Default/Cache/data.bin", "/tmp/profile", {
      preserveSavedPasswords: true,
    }),
    false,
  );
});
