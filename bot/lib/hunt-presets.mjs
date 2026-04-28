function compareStrings(left, right) {
  return String(left || "").localeCompare(String(right || ""), "en", {
    sensitivity: "base",
    numeric: true,
  });
}

function normalizeName(value = "") {
  return String(value || "").trim();
}

function normalizeAttackName(value = "") {
  return normalizeName(value).toLowerCase();
}

function buildId(value = "") {
  return normalizeName(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "preset";
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function deriveDangerLevel(monster = {}) {
  let score = 0;
  const experience = Number(monster.experience) || 0;
  const health = Number(monster.health) || 0;
  const maxAttack = getMaxAttackDamage(monster.attacks);
  const speed = Number(monster.speed) || 0;

  if (experience >= 75) score += 1;
  if (experience >= 150) score += 1;
  if (experience >= 300) score += 1;
  if (experience >= 600) score += 1;
  if (experience >= 1_000) score += 1;
  if (experience >= 2_000) score += 1;

  if (health >= 300) score += 1;
  if (health >= 700) score += 1;
  if (health >= 1_500) score += 1;

  if (maxAttack >= 80) score += 1;
  if (maxAttack >= 180) score += 1;

  if (speed >= 100) score += 1;
  if (speed >= 160) score += 1;

  return clamp(score, 0, 10);
}

function getMaxAttackDamage(attacks = []) {
  return (Array.isArray(attacks) ? attacks : []).reduce((maximum, attack) => {
    const max = Number(attack?.max);
    if (!Number.isFinite(max)) {
      return maximum;
    }
    return Math.max(maximum, Math.max(0, max));
  }, 0);
}

function hasAttackPattern(attacks = [], pattern) {
  const source = Array.isArray(attacks) ? attacks : [];
  return source.some((attack) => pattern.test(normalizeAttackName(attack?.name)));
}

function hasRangedAttack(attacks = []) {
  const source = Array.isArray(attacks) ? attacks : [];
  return source.some((attack) => {
    const name = normalizeAttackName(attack?.name);
    const max = Number(attack?.max);
    const element = normalizeAttackName(attack?.element);
    if (!Number.isFinite(max) || max <= 0) {
      return false;
    }

    if (name === "melee") {
      return false;
    }

    return (
      /beam|wave|bolt|arrow|distance|shot|throw|strike|missile|spell|mana|fire|ice|energy|earth|holy|death|poison|curse/.test(name)
      || (element && element !== "physical")
    );
  });
}

function summarizeLoot(entries = []) {
  return (Array.isArray(entries) ? entries : [])
    .slice(0, 3)
    .map((entry) => normalizeName(entry?.name))
    .filter(Boolean);
}

function buildSearchText({
  monsterName = "",
  taskName = "",
  lootHighlights = [],
  tags = [],
} = {}) {
  return [
    monsterName,
    taskName,
    ...(Array.isArray(lootHighlights) ? lootHighlights : []),
    ...(Array.isArray(tags) ? tags : []),
  ]
    .map((value) => normalizeName(value).toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function buildAchievementMap(achievements = []) {
  const mapped = new Map();

  for (const achievement of Array.isArray(achievements) ? achievements : []) {
    const monsterName = normalizeName(achievement?.monster);
    if (!monsterName || monsterName.toLowerCase() === "unknown") {
      continue;
    }

    const key = monsterName.toLowerCase();
    if (mapped.has(key)) {
      continue;
    }

    mapped.set(key, achievement);
  }

  return mapped;
}

function buildTags(monster = {}, achievement = null) {
  const tags = [];
  const attacks = Array.isArray(monster.attacks) ? monster.attacks : [];
  const speed = Number(monster.speed) || 0;
  const danger = deriveDangerLevel(monster);

  if (achievement) {
    tags.push("task");
  }
  if (hasRangedAttack(attacks)) {
    tags.push("ranged");
  }
  if (hasAttackPattern(attacks, /beam/)) {
    tags.push("beam");
  }
  if (hasAttackPattern(attacks, /wave/)) {
    tags.push("wave");
  }
  if (speed >= 100) {
    tags.push("fast");
  }
  if (danger >= 7) {
    tags.push("danger");
  }

  return tags;
}

function buildTargetProfile(monster = {}) {
  const attacks = Array.isArray(monster.attacks) ? monster.attacks : [];
  const dangerLevel = deriveDangerLevel(monster);
  const ranged = hasRangedAttack(attacks);
  const beam = hasAttackPattern(attacks, /beam/);
  const wave = hasAttackPattern(attacks, /wave/);
  const fast = Number(monster.speed) >= 100;

  return {
    enabled: true,
    priority: 100 + (dangerLevel * 4),
    dangerLevel,
    keepDistanceMin: ranged || beam || wave ? 1 : 0,
    keepDistanceMax: ranged || fast ? 2 : 1,
    finishBelowPercent: dangerLevel >= 7 ? 30 : dangerLevel >= 4 ? 20 : 10,
    killMode: dangerLevel >= 8 ? "asap" : "normal",
    behavior: ranged || beam || wave ? "kite" : "hold",
    preferShootable: true,
    stickToTarget: true,
    avoidBeam: beam,
    avoidWave: wave,
  };
}

function sortPresets(left, right) {
  return (
    Number(right?.targetProfile?.priority || 0) - Number(left?.targetProfile?.priority || 0)
    || compareStrings(left?.monsterName, right?.monsterName)
  );
}

export function buildHuntPresetCatalog({
  monsters = [],
  achievements = [],
} = {}) {
  const achievementMap = buildAchievementMap(achievements);
  const presets = [];

  for (const monster of Array.isArray(monsters) ? monsters : []) {
    const monsterName = normalizeName(monster?.name);
    if (!monsterName) {
      continue;
    }

    const achievement = achievementMap.get(monsterName.toLowerCase()) || null;
    const taskName = normalizeName(achievement?.name);
    const requiredKills = Number.isFinite(Number(achievement?.required))
      ? Math.max(0, Math.trunc(Number(achievement.required)))
      : null;
    const lootHighlights = summarizeLoot(monster?.loot);
    const tags = buildTags(monster, achievement);
    const targetProfile = buildTargetProfile(monster);

    presets.push({
      id: buildId(monsterName),
      monsterName,
      taskName,
      requiredKills,
      experience: Number.isFinite(Number(monster?.experience)) ? Number(monster.experience) : null,
      health: Number.isFinite(Number(monster?.health)) ? Number(monster.health) : null,
      speed: Number.isFinite(Number(monster?.speed)) ? Number(monster.speed) : null,
      lootHighlights,
      tags,
      targetProfile,
      searchText: buildSearchText({
        monsterName,
        taskName,
        lootHighlights,
        tags,
      }),
    });
  }

  return presets.sort(sortPresets);
}
