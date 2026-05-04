import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const MINIBIA_HOTBAR_STORAGE_KEY = "hotbar";
export const MINIBIA_HOTBAR_KEYBINDS_STORAGE_KEY = "hotbarKeybinds";
export const MINIBIA_HOTBAR_STORAGE_KEYS = Object.freeze([
  MINIBIA_HOTBAR_STORAGE_KEY,
  MINIBIA_HOTBAR_KEYBINDS_STORAGE_KEY,
]);

const PROFILE_DIRECTORY_NAME_PATTERN = /^(?:Default|Profile \d+)$/i;

function normalizeString(value = "") {
  return String(value || "").trim();
}

function safeParseJson(value) {
  if (value && typeof value === "object") {
    return value;
  }

  const text = normalizeString(value);
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function countPresetEntries(presets) {
  if (!Array.isArray(presets)) {
    return 0;
  }

  return presets.reduce((total, preset) => {
    if (!Array.isArray(preset)) {
      return total;
    }

    return total + preset.filter((entry) => entry && typeof entry === "object").length;
  }, 0);
}

export function countHotbarStorageSlots(value) {
  const hotbar = safeParseJson(value);
  return countPresetEntries(hotbar?.presets);
}

function extractJsonAt(text, startIndex) {
  const source = String(text || "");
  const first = source[startIndex];
  const closing = first === "{" ? "}" : first === "[" ? "]" : "";
  if (!closing) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const character = source[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === "\"") {
        inString = false;
      }
      continue;
    }

    if (character === "\"") {
      inString = true;
      continue;
    }

    if (character === first) {
      depth += 1;
      continue;
    }

    if (character === closing) {
      depth -= 1;
      if (depth === 0) {
        const json = source.slice(startIndex, index + 1);
        return safeParseJson(json) ? json : null;
      }
    }
  }

  return null;
}

function collectJsonValuesAfterKey(text, key) {
  const source = String(text || "");
  const normalizedKey = normalizeString(key);
  if (!source || !normalizedKey) {
    return [];
  }

  const values = [];
  let searchIndex = 0;

  while (searchIndex < source.length) {
    const keyIndex = source.indexOf(normalizedKey, searchIndex);
    if (keyIndex < 0) {
      break;
    }

    const scanEnd = Math.min(source.length, keyIndex + normalizedKey.length + 512);
    for (let index = keyIndex + normalizedKey.length; index < scanEnd; index += 1) {
      const character = source[index];
      if (character !== "{" && character !== "[") {
        continue;
      }

      const json = extractJsonAt(source, index);
      if (json) {
        values.push({
          value: json,
          offset: index,
        });
        break;
      }
    }

    searchIndex = keyIndex + normalizedKey.length;
  }

  return values;
}

function localStorageLevelDbDir(userDataDir, profileDirectory = "Default") {
  const resolvedUserDataDir = normalizeString(userDataDir);
  const resolvedProfileDirectory = normalizeString(profileDirectory) || "Default";
  return path.join(resolvedUserDataDir, resolvedProfileDirectory, "Local Storage", "leveldb");
}

function shouldReadLevelDbFile(name = "") {
  return /\.(?:log|ldb)$/i.test(String(name || ""));
}

export function readMinibiaLocalStorageValuesFromProfile({
  userDataDir,
  profileDirectory = "Default",
  keys = MINIBIA_HOTBAR_STORAGE_KEYS,
  existsImpl = fs.existsSync,
  readdirImpl = fs.readdirSync,
  readFileImpl = fs.readFileSync,
  statImpl = fs.statSync,
} = {}) {
  const resolvedUserDataDir = normalizeString(userDataDir);
  if (!resolvedUserDataDir) {
    return null;
  }

  const resolvedProfileDirectory = normalizeString(profileDirectory) || "Default";
  const levelDbDir = localStorageLevelDbDir(resolvedUserDataDir, resolvedProfileDirectory);
  if (!existsImpl(levelDbDir)) {
    return null;
  }

  let entries = [];
  try {
    entries = readdirImpl(levelDbDir, { withFileTypes: true });
  } catch {
    return null;
  }

  const selected = {};
  const selectedMeta = {};
  for (const entry of entries) {
    if (typeof entry.isFile === "function" && !entry.isFile()) {
      continue;
    }

    if (!shouldReadLevelDbFile(entry.name)) {
      continue;
    }

    const filePath = path.join(levelDbDir, entry.name);
    let text = "";
    let mtimeMs = 0;
    try {
      text = readFileImpl(filePath).toString("utf8");
      mtimeMs = Number(statImpl(filePath)?.mtimeMs) || 0;
    } catch {
      continue;
    }

    for (const key of keys) {
      for (const candidate of collectJsonValuesAfterKey(text, key)) {
        const score = key === MINIBIA_HOTBAR_STORAGE_KEY
          ? countHotbarStorageSlots(candidate.value)
          : 1;
        const previous = selectedMeta[key] || null;
        const better = !previous
          || score > previous.score
          || (score === previous.score && mtimeMs > previous.mtimeMs)
          || (score === previous.score && mtimeMs === previous.mtimeMs && candidate.offset > previous.offset);

        if (better) {
          selected[key] = candidate.value;
          selectedMeta[key] = {
            filePath,
            mtimeMs,
            offset: candidate.offset,
            score,
          };
        }
      }
    }
  }

  if (!Object.keys(selected).length) {
    return null;
  }

  return {
    userDataDir: resolvedUserDataDir,
    profileDirectory: resolvedProfileDirectory,
    values: selected,
    meta: selectedMeta,
  };
}

function addUniqueCandidate(candidates, seen, candidate = {}) {
  const userDataDir = normalizeString(candidate.userDataDir);
  if (!userDataDir) {
    return;
  }

  const profileDirectory = normalizeString(candidate.profileDirectory) || "Default";
  const key = `${path.resolve(userDataDir)}\0${profileDirectory.toLowerCase()}`;
  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  candidates.push({
    userDataDir,
    profileDirectory,
    label: normalizeString(candidate.label),
  });
}

function defaultBrowserUserDataDirs({
  env = process.env,
  homeDir = os.homedir(),
  platform = process.platform,
} = {}) {
  const home = normalizeString(homeDir || env.HOME || env.USERPROFILE);
  if (!home) {
    return [];
  }

  if (platform === "win32") {
    const localAppData = normalizeString(env.LOCALAPPDATA);
    return [
      localAppData && path.join(localAppData, "Google", "Chrome", "User Data"),
      localAppData && path.join(localAppData, "Chromium", "User Data"),
      localAppData && path.join(localAppData, "BraveSoftware", "Brave-Browser", "User Data"),
      localAppData && path.join(localAppData, "Microsoft", "Edge", "User Data"),
    ].filter(Boolean);
  }

  if (platform === "darwin") {
    return [
      path.join(home, "Library", "Application Support", "Google", "Chrome"),
      path.join(home, "Library", "Application Support", "Chromium"),
      path.join(home, "Library", "Application Support", "BraveSoftware", "Brave-Browser"),
      path.join(home, "Library", "Application Support", "Microsoft Edge"),
    ];
  }

  return [
    path.join(home, ".config", "google-chrome"),
    path.join(home, ".config", "chromium"),
    path.join(home, ".config", "google-chrome-for-testing"),
    path.join(home, ".config", "BraveSoftware", "Brave-Browser"),
    path.join(home, ".config", "microsoft-edge"),
    path.join(home, ".var", "app", "com.google.Chrome", "config", "google-chrome"),
    path.join(home, ".var", "app", "org.chromium.Chromium", "config", "chromium"),
  ];
}

function profileDirectoriesForUserDataDir(userDataDir, {
  existsImpl = fs.existsSync,
  readdirImpl = fs.readdirSync,
} = {}) {
  const resolvedUserDataDir = normalizeString(userDataDir);
  if (!resolvedUserDataDir || !existsImpl(resolvedUserDataDir)) {
    return ["Default"];
  }

  let entries = [];
  try {
    entries = readdirImpl(resolvedUserDataDir, { withFileTypes: true });
  } catch {
    return ["Default"];
  }

  const profileDirectories = entries
    .filter((entry) => typeof entry.isDirectory === "function" && entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => PROFILE_DIRECTORY_NAME_PATTERN.test(name))
    .sort((left, right) => {
      if (left === "Default") return -1;
      if (right === "Default") return 1;
      return left.localeCompare(right, undefined, { numeric: true });
    });

  return profileDirectories.length ? profileDirectories : ["Default"];
}

export function buildMinibiaHotbarSeedProfileCandidates({
  preferredProfiles = [],
  preferredUserDataDirs = [],
  includeDefaultBrowserProfiles = true,
  env = process.env,
  homeDir = os.homedir(),
  platform = process.platform,
  existsImpl = fs.existsSync,
  readdirImpl = fs.readdirSync,
} = {}) {
  const candidates = [];
  const seen = new Set();

  for (const candidate of preferredProfiles) {
    addUniqueCandidate(candidates, seen, candidate);
  }

  for (const userDataDir of preferredUserDataDirs) {
    for (const profileDirectory of profileDirectoriesForUserDataDir(userDataDir, { existsImpl, readdirImpl })) {
      addUniqueCandidate(candidates, seen, { userDataDir, profileDirectory });
    }
  }

  if (includeDefaultBrowserProfiles) {
    for (const userDataDir of defaultBrowserUserDataDirs({ env, homeDir, platform })) {
      for (const profileDirectory of profileDirectoriesForUserDataDir(userDataDir, { existsImpl, readdirImpl })) {
        addUniqueCandidate(candidates, seen, { userDataDir, profileDirectory });
      }
    }
  }

  return candidates;
}

export function resolveMinibiaHotbarSeed({
  candidates = [],
  excludeUserDataDirs = [],
  existsImpl = fs.existsSync,
  readdirImpl = fs.readdirSync,
  readFileImpl = fs.readFileSync,
  statImpl = fs.statSync,
} = {}) {
  const excluded = new Set(
    Array.from(excludeUserDataDirs || [])
      .map((value) => normalizeString(value))
      .filter(Boolean)
      .map((value) => path.resolve(value)),
  );

  let best = null;

  for (const candidate of candidates) {
    const userDataDir = normalizeString(candidate?.userDataDir);
    if (!userDataDir || excluded.has(path.resolve(userDataDir))) {
      continue;
    }

    const profileDirectory = normalizeString(candidate?.profileDirectory) || "Default";
    const values = readMinibiaLocalStorageValuesFromProfile({
      userDataDir,
      profileDirectory,
      existsImpl,
      readdirImpl,
      readFileImpl,
      statImpl,
    });

    const hotbar = values?.values?.[MINIBIA_HOTBAR_STORAGE_KEY] || "";
    const slotCount = countHotbarStorageSlots(hotbar);
    if (slotCount <= 1) {
      continue;
    }

    const latestMtime = Math.max(
      0,
      ...Object.values(values.meta || {}).map((entry) => Number(entry?.mtimeMs) || 0),
    );
    const next = {
      sourceUserDataDir: userDataDir,
      sourceProfileDirectory: profileDirectory,
      sourceLabel: normalizeString(candidate?.label),
      values: values.values,
      hotbarSlotCount: slotCount,
      latestMtime,
    };

    if (
      !best
      || next.hotbarSlotCount > best.hotbarSlotCount
      || (next.hotbarSlotCount === best.hotbarSlotCount && next.latestMtime > best.latestMtime)
    ) {
      best = next;
    }
  }

  return best;
}

export function buildMinibiaHotbarStorageHydrationExpression(seed = {}) {
  const values = seed?.values && typeof seed.values === "object" ? seed.values : {};
  const hotbar = normalizeString(values[MINIBIA_HOTBAR_STORAGE_KEY]);
  if (!hotbar) {
    return "(() => ({ ok: false, changed: false, reason: 'missing hotbar seed' }))()";
  }

  const payload = {
    values: Object.fromEntries(
      Object.entries(values)
        .filter(([key, value]) => MINIBIA_HOTBAR_STORAGE_KEYS.includes(key) && normalizeString(value))
        .map(([key, value]) => [key, String(value)]),
    ),
    sourceSlotCount: countHotbarStorageSlots(hotbar),
    sourceLabel: normalizeString(seed.sourceLabel),
    sourceUserDataDir: normalizeString(seed.sourceUserDataDir),
    sourceProfileDirectory: normalizeString(seed.sourceProfileDirectory),
  };

  return `(() => {
    const payload = ${JSON.stringify(payload)};
    const countHotbarSlots = (value) => {
      try {
        const hotbar = typeof value === "string" ? JSON.parse(value) : value;
        if (!hotbar || !Array.isArray(hotbar.presets)) return 0;
        return hotbar.presets.reduce((total, preset) => (
          total + (Array.isArray(preset) ? preset.filter((entry) => entry && typeof entry === "object").length : 0)
        ), 0);
      } catch {
        return 0;
      }
    };
    if (!/minibia\\.com$/i.test(String(location.hostname || ""))) {
      return { ok: false, changed: false, reason: "not minibia origin", href: location.href };
    }
    const sourceHotbar = payload.values.hotbar || "";
    const sourceSlotCount = countHotbarSlots(sourceHotbar);
    const currentHotbar = localStorage.getItem("hotbar") || "";
    const currentSlotCount = countHotbarSlots(currentHotbar);
    if (!sourceSlotCount || currentSlotCount >= sourceSlotCount) {
      return {
        ok: true,
        changed: false,
        reason: currentSlotCount >= sourceSlotCount ? "current hotbar already populated" : "seed hotbar empty",
        currentSlotCount,
        sourceSlotCount,
        sourceLabel: payload.sourceLabel,
        sourceUserDataDir: payload.sourceUserDataDir,
        sourceProfileDirectory: payload.sourceProfileDirectory,
      };
    }
    for (const [key, value] of Object.entries(payload.values)) {
      localStorage.setItem(key, value);
    }
    return {
      ok: true,
      changed: true,
      currentSlotCount,
      sourceSlotCount,
      sourceLabel: payload.sourceLabel,
      sourceUserDataDir: payload.sourceUserDataDir,
      sourceProfileDirectory: payload.sourceProfileDirectory,
    };
  })()`;
}
