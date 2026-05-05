import test from "node:test";
import assert from "node:assert/strict";
import {
  buildVocationProfile,
  loadVocationProfile,
  resolveManaTrainerSpell,
} from "../lib/vocation-pack.mjs";

test("buildVocationProfile derives sustain defaults and spell priorities from the spell pack", () => {
  const profile = buildVocationProfile({
    vocation: "paladin",
    generatedAt: "2026-04-12T20:27:24.288Z",
    spells: [
      { id: 2, name: "Light Healing", words: "exura", level: 1, mana: 25 },
      { id: 10, name: "Intense Healing", words: "exura gran", level: 2, mana: 40 },
      { id: 11, name: "Ultimate Healing", words: "exura vita", level: 8, mana: 80 },
      { id: 18, name: "Magic Shield", words: "utamo vita", level: 4, mana: 50 },
      { id: 24, name: "Food", words: "exevo pan", level: 1, mana: 30 },
      { id: 19, name: "Great Light", words: "utevo gran lux", level: 3, mana: 60 },
    ],
  });

  assert.equal(profile.vocation, "paladin");
  assert.equal(profile.sustain.healSpells[0].words, "exura vita");
  assert.equal(profile.sustain.healSpells[1].words, "exura gran");
  assert.equal(profile.sustain.supportSpells.magicShield.words, "utamo vita");
  assert.equal(profile.sustain.supportSpells.conjureFood.words, "exevo pan");
  assert.equal(profile.sustain.ammoPolicy.enabled, true);
  assert.equal(profile.sustain.defaults.chaseMode, "stand");
});

test("loadVocationProfile reads the vendored druid pack and exposes support-only spells", async () => {
  const profile = await loadVocationProfile("druid");

  assert.equal(profile.vocation, "druid");
  assert.ok(profile.spellCount > 0);
  assert.equal(profile.sustain.supportSpells.healFriend?.words, "exura sio");
  assert.equal(profile.pvpSafety.safeMode, true);
});

test("resolveManaTrainerSpell does not replace explicit custom spells with light", () => {
  const profile = buildVocationProfile({
    vocation: "paladin",
    spells: [
      { id: 5, name: "Light", words: "utevo lux", level: 1, mana: 20 },
    ],
  });

  assert.equal(resolveManaTrainerSpell(profile, "adori vita vis"), null);
  assert.equal(resolveManaTrainerSpell(profile, "utevo res ina")?.words, "utevo lux");
});
