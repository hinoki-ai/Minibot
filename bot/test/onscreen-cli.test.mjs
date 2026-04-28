import test from "node:test";
import assert from "node:assert/strict";
import { CLI_HELP_TEXT } from "../onscreen_monster_bot.mjs";

test("onscreen CLI help advertises the current supported flags", () => {
  assert.match(CLI_HELP_TEXT, /--url https:\/\/minibia\.com\/play/);
  assert.match(CLI_HELP_TEXT, /--autowalk/);
  assert.match(CLI_HELP_TEXT, /--once/);
  assert.match(CLI_HELP_TEXT, /--dry-run/);
});
