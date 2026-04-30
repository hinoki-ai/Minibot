/*
 * Route validation is intentionally side-effect free. The same report feeds the
 * desktop warning surface, start gating, and deterministic route checks.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULTS,
  WAYPOINT_ACTION_TYPES,
  WAYPOINT_TYPES,
  isGeneratedWaypointLabel,
  isKnownMinibiaMonsterName,
  isKnownMinibiaNpcName,
  normalizeMonsterNames,
  normalizeOptions,
  normalizeWaypointAction,
  normalizeWaypointTargetIndex,
  normalizeWaypointType,
} from "./bot-core.mjs";
import { MINIBIA_DATA_ROOT } from "./minibia-data.mjs";

const ROUTE_VALIDATION_SEVERITY_RANK = Object.freeze({
  info: 0,
  warning: 1,
  error: 2,
});

const WAYPOINT_BASE_FIELDS = Object.freeze(new Set([
  "x",
  "y",
  "z",
  "label",
  "type",
  "radius",
  "action",
  "targetIndex",
  "targetLabel",
  "gotoLabel",
  "labelTarget",
  "npcName",
  "keyword",
  "shopKeyword",
  "city",
  "destination",
  "residence",
  "blessing",
  "promotionName",
  "taskTarget",
  "taskKeyword",
  "rewardKeyword",
  "mode",
  "progressionAction",
  "refillRole",
  "steps",
  "recorderIntents",
  "advanceOnBlocked",
]));

const FLOOR_TRANSITION_WAYPOINT_TYPES = Object.freeze(new Set([
  "stairs-up",
  "stairs-down",
  "ladder",
  "exani-tera",
  "rope",
  "shovel-hole",
  "use-item",
]));

const TOOL_WAYPOINT_TYPES = Object.freeze({
  rope: "rope",
  "shovel-hole": "shovel",
});

const NPC_WAYPOINT_TYPES = Object.freeze(new Set([
  "bank",
  "shop",
  "npc-action",
  "daily-task",
]));

const ITEM_CATEGORY_TOKENS = Object.freeze(new Set([
  "all",
  "any",
  "ammo",
  "ammunition",
  "coin",
  "coins",
  "currency",
  "food",
  "foods",
  "gold",
  "gold coin",
  "gold coins",
  "gp",
  "loot",
  "pot",
  "pots",
  "potion",
  "potions",
  "rare",
  "ring",
  "rings",
  "rune",
  "runes",
  "shovel",
  "tool",
  "tools",
  "rope",
]));

function normalizeText(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeKey(value = "") {
  return normalizeText(value).toLowerCase();
}

function readKnownNames(fileName = "") {
  try {
    const documentPath = path.join(MINIBIA_DATA_ROOT, "current", fileName);
    const document = JSON.parse(fs.readFileSync(documentPath, "utf8"));
    return new Set(
      (Array.isArray(document?.items) ? document.items : [])
        .map((entry) => normalizeKey(entry?.name))
        .filter(Boolean),
    );
  } catch {
    return new Set();
  }
}

const KNOWN_ITEM_NAME_KEYS = readKnownNames("items.json");

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toList(value = []) {
  if (Array.isArray(value)) {
    return value;
  }
  return String(value ?? "").split(/[\n,;]+/);
}

function isKnownItemName(value = "") {
  const key = normalizeKey(value);
  if (!key || ITEM_CATEGORY_TOKENS.has(key)) {
    return true;
  }
  return KNOWN_ITEM_NAME_KEYS.size ? KNOWN_ITEM_NAME_KEYS.has(key) : true;
}

function collectTextList(value = []) {
  const entries = [];
  for (const entry of toList(value)) {
    const text = normalizeText(entry);
    if (text) {
      entries.push(text);
    }
  }
  return entries;
}

function collectConfiguredItemNames(source = {}) {
  const names = [];
  names.push(...collectTextList(source.lootWhitelist));
  names.push(...collectTextList(source.lootBlacklist));
  names.push(...collectTextList(source.lootPreferredContainers));
  names.push(...collectTextList(source.refillAutoSellProtectedNames));
  names.push(...collectTextList(source.ammoPreferredNames));
  names.push(...collectTextList(source.autoEatFoodName));
  names.push(...collectTextList(source.autoEatForbiddenFoodNames));
  names.push(...collectTextList(source.ringAutoReplaceItemName));
  names.push(...collectTextList(source.amuletAutoReplaceItemName));

  for (const request of Array.isArray(source.refillSellRequests) ? source.refillSellRequests : []) {
    const name = normalizeText(request?.name);
    if (name) {
      names.push(name);
    }
  }

  return names;
}

function collectConfiguredMonsterNames(source = {}) {
  const names = [];
  names.push(...normalizeMonsterNames(source.monsterNames || source.monster || []));
  for (const profile of Array.isArray(source.targetProfiles) ? source.targetProfiles : []) {
    const category = normalizeText(profile?.category);
    const name = normalizeText(profile?.name);
    if (name && !category) {
      names.push(name);
    }
  }
  return names;
}

function collectConfiguredNpcNames(source = {}, waypoints = []) {
  const names = [];
  names.push(...collectTextList(source.refillNpcNames));
  for (const waypoint of waypoints) {
    const name = normalizeText(waypoint?.npcName);
    if (name) {
      names.push(name);
    }
  }
  return names;
}

function getPositionKey(waypoint = null) {
  if (!waypoint) {
    return "";
  }
  return `${waypoint.x},${waypoint.y},${waypoint.z}`;
}

function getChebyshevDistance(left = null, right = null) {
  if (!left || !right || Number(left.z) !== Number(right.z)) {
    return null;
  }
  return Math.max(
    Math.abs(Number(left.x) - Number(right.x)),
    Math.abs(Number(left.y) - Number(right.y)),
  );
}

function getFloorTransitionTargetZ(waypoints = [], index = 0, type = "") {
  const waypoint = waypoints[index] || null;
  const sourceZ = Number(waypoint?.z);
  if (!Number.isFinite(sourceZ)) {
    return null;
  }

  if (type === "stairs-up" || type === "exani-tera" || type === "rope") {
    return Math.trunc(sourceZ) - 1;
  }
  if (type === "stairs-down" || type === "shovel-hole") {
    return Math.trunc(sourceZ) + 1;
  }
  if (type !== "ladder" && type !== "use-item") {
    return null;
  }

  const next = waypoints[index + 1] || null;
  const nextZ = Number(next?.z);
  if (Number.isFinite(nextZ) && Math.trunc(nextZ) !== Math.trunc(sourceZ)) {
    return Math.trunc(nextZ);
  }

  const previous = waypoints[index - 1] || null;
  const previousZ = Number(previous?.z);
  if (Number.isFinite(previousZ) && Math.trunc(previousZ) !== Math.trunc(sourceZ)) {
    return Math.trunc(previousZ);
  }

  return null;
}

function hasForwardFloorLandingWaypoint(waypoints = [], index = 0, targetZ = null, {
  lookahead = 2,
  allowLoop = true,
} = {}) {
  if (!waypoints.length || targetZ == null || !Number.isFinite(Number(targetZ))) {
    return false;
  }

  const wantedZ = Math.trunc(Number(targetZ));
  const total = waypoints.length;
  let current = index;
  for (let offset = 1; offset <= Math.max(1, Math.trunc(Number(lookahead) || 1)); offset += 1) {
    if (current < total - 1) {
      current += 1;
    } else if (allowLoop) {
      current = 0;
    } else {
      return false;
    }

    if (current === index) {
      return false;
    }

    const waypointZ = Number(waypoints[current]?.z);
    if (Number.isFinite(waypointZ) && Math.trunc(waypointZ) === wantedZ) {
      return true;
    }
  }

  return false;
}

function formatWaypointReference(index = null) {
  return Number.isInteger(index) && index >= 0 ? `waypoint ${index + 1}` : "route";
}

function normalizeRawWaypoint(rawWaypoint = {}, normalizedWaypoint = {}) {
  return isRecord(rawWaypoint) ? rawWaypoint : normalizedWaypoint;
}

function issueSortKey(issue = {}) {
  return [
    String(ROUTE_VALIDATION_SEVERITY_RANK[issue.severity] ?? 0).padStart(2, "0"),
    String(issue.waypointIndex ?? 999999).padStart(6, "0"),
    issue.code || "",
    issue.message || "",
  ].join(":");
}

function buildRouteValidationSignature({
  sourceName = "",
  normalized = {},
  issues = [],
} = {}) {
  const payload = {
    sourceName,
    cavebotName: normalized.cavebotName || "",
    waypoints: (Array.isArray(normalized.waypoints) ? normalized.waypoints : []).map((waypoint) => ({
      x: waypoint.x,
      y: waypoint.y,
      z: waypoint.z,
      label: waypoint.label,
      type: waypoint.type,
      action: waypoint.action || "",
      targetIndex: waypoint.targetIndex ?? null,
      targetLabel: waypoint.targetLabel || "",
    })),
    tileRules: (Array.isArray(normalized.tileRules) ? normalized.tileRules : []).map((rule) => ({
      x: rule.x,
      y: rule.y,
      z: rule.z,
      shape: rule.shape,
      policy: rule.policy,
      trigger: rule.trigger,
    })),
    issues: issues.map((issue) => ({
      severity: issue.severity,
      code: issue.code,
      waypointIndex: issue.waypointIndex,
      field: issue.field,
      message: issue.message,
    })),
  };

  return createHash("sha1").update(JSON.stringify(payload)).digest("hex").slice(0, 16);
}

function summarizeRouteValidationIssues(issues = []) {
  const counts = {
    error: 0,
    warning: 0,
    info: 0,
  };
  for (const issue of issues) {
    if (Object.hasOwn(counts, issue.severity)) {
      counts[issue.severity] += 1;
    }
  }
  const highestSeverity = counts.error ? "error" : counts.warning ? "warning" : counts.info ? "info" : "clear";
  const firstProblem = issues.find((issue) => issue.severity === "error")
    || issues.find((issue) => issue.severity === "warning")
    || issues[0]
    || null;

  return {
    ok: counts.error === 0,
    errorCount: counts.error,
    warningCount: counts.warning,
    infoCount: counts.info,
    highestSeverity,
    firstProblemWaypointIndex: Number.isInteger(firstProblem?.waypointIndex) ? firstProblem.waypointIndex : null,
  };
}

export function validateRouteConfig(config = {}, {
  sourceName = "",
  sourcePath = "",
  rawConfig = null,
} = {}) {
  const rawSource = isRecord(rawConfig) ? rawConfig : (isRecord(config) ? config : {});
  const normalized = normalizeOptions(config || rawSource || {});
  const normalizedWaypoints = Array.isArray(normalized.waypoints) ? normalized.waypoints : [];
  const rawWaypoints = Array.isArray(rawSource.waypoints) ? rawSource.waypoints : normalizedWaypoints;
  const routeName = normalizeText(sourceName || normalized.cavebotName || rawSource.name || rawSource.cavebotName || DEFAULTS.cavebotName);
  const issues = [];
  const seenIssueKeys = new Set();

  const addIssue = (severity, code, message, {
    waypointIndex = null,
    field = "",
    value = null,
    requiresAcknowledgement = severity === "error",
  } = {}) => {
    const normalizedSeverity = Object.hasOwn(ROUTE_VALIDATION_SEVERITY_RANK, severity) ? severity : "warning";
    const normalizedIssue = {
      severity: normalizedSeverity,
      code: normalizeText(code) || "route-validation",
      message: normalizeText(message),
      waypointIndex: Number.isInteger(waypointIndex) && waypointIndex >= 0 ? waypointIndex : null,
      field: normalizeText(field),
      value,
      requiresAcknowledgement: requiresAcknowledgement === true,
    };
    if (!normalizedIssue.message) {
      return;
    }

    const key = JSON.stringify(normalizedIssue);
    if (seenIssueKeys.has(key)) {
      return;
    }
    seenIssueKeys.add(key);
    issues.push(normalizedIssue);
  };

  if (normalized.autowalkEnabled && !normalizedWaypoints.length) {
    addIssue("warning", "empty-route", "Autowalk is enabled but the route has no waypoints.");
  }

  const allLabelKeys = new Set(
    normalizedWaypoints
      .map((waypoint) => normalizeText(waypoint?.label))
      .filter((label) => label && !isGeneratedWaypointLabel(label))
      .map((label) => normalizeKey(label)),
  );
  const labels = new Map();
  let explicitLabelCount = 0;
  let generatedLabelCount = 0;
  let gotoActionCount = 0;
  normalizedWaypoints.forEach((waypoint, index) => {
    const rawWaypoint = normalizeRawWaypoint(rawWaypoints[index], waypoint);
    const label = normalizeText(waypoint.label);
    const labelKey = normalizeKey(label);
    const type = normalizeWaypointType(rawWaypoint?.type ?? waypoint.type);
    const rawType = normalizeText(rawWaypoint?.type || waypoint.type || "");

    if (rawType && !WAYPOINT_TYPES.includes(rawType.toLowerCase()) && normalizeWaypointType(rawType) === "walk") {
      addIssue("warning", "unknown-waypoint-type", `${formatWaypointReference(index)} uses unknown waypoint type "${rawType}" and will normalize to walk.`, {
        waypointIndex: index,
        field: "type",
        value: rawType,
      });
    }

    if (labelKey && !isGeneratedWaypointLabel(label)) {
      explicitLabelCount += 1;
      const existing = labels.get(labelKey);
      if (Number.isInteger(existing)) {
        addIssue("warning", "duplicate-label", `${formatWaypointReference(index)} duplicates label "${label}" from waypoint ${existing + 1}.`, {
          waypointIndex: index,
          field: "label",
          value: label,
        });
      } else {
        labels.set(labelKey, index);
      }
    } else if (label && isGeneratedWaypointLabel(label)) {
      generatedLabelCount += 1;
    }

    for (const key of Object.keys(rawWaypoint || {})) {
      if (!WAYPOINT_BASE_FIELDS.has(key)) {
        addIssue("warning", "unknown-waypoint-field", `${formatWaypointReference(index)} contains unknown field "${key}".`, {
          waypointIndex: index,
          field: key,
        });
      }
    }

    if (type === "action") {
      const rawAction = normalizeText(rawWaypoint?.action || waypoint.action || "restart").toLowerCase();
      if (rawAction && !WAYPOINT_ACTION_TYPES.includes(rawAction)) {
        addIssue("error", "unknown-action", `${formatWaypointReference(index)} uses unsupported action "${rawAction}".`, {
          waypointIndex: index,
          field: "action",
          value: rawAction,
        });
      }

      const action = normalizeWaypointAction(rawAction);
      if (action === "goto") {
        gotoActionCount += 1;
      }
      const targetIndex = normalizeWaypointTargetIndex(rawWaypoint?.targetIndex ?? waypoint.targetIndex);
      const targetLabel = normalizeText(rawWaypoint?.targetLabel || rawWaypoint?.gotoLabel || rawWaypoint?.labelTarget || waypoint.targetLabel);
      const targetLabelValid = Boolean(targetLabel && allLabelKeys.has(normalizeKey(targetLabel)));
      if (
        action === "goto"
        && !targetLabelValid
        && (targetIndex == null || targetIndex < 0 || targetIndex >= normalizedWaypoints.length || targetIndex === index)
      ) {
        addIssue("error", "broken-goto", `${formatWaypointReference(index)} has a goto action without a valid target waypoint.`, {
          waypointIndex: index,
          field: "targetIndex",
          value: rawWaypoint?.targetIndex ?? waypoint.targetIndex ?? null,
        });
      }

      if (targetLabel && !allLabelKeys.has(normalizeKey(targetLabel))) {
        addIssue("error", "broken-goto-label", `${formatWaypointReference(index)} targets missing label "${targetLabel}".`, {
          waypointIndex: index,
          field: "targetLabel",
          value: targetLabel,
        });
      }
    }

    if (NPC_WAYPOINT_TYPES.has(type)) {
      const npcName = normalizeText(rawWaypoint?.npcName || waypoint.npcName);
      if (!npcName) {
        addIssue("warning", "missing-npc", `${formatWaypointReference(index)} is a ${type} waypoint without an NPC name.`, {
          waypointIndex: index,
          field: "npcName",
        });
      } else if (!isKnownMinibiaNpcName(npcName)) {
        addIssue("warning", "unknown-npc", `${formatWaypointReference(index)} references unknown NPC "${npcName}".`, {
          waypointIndex: index,
          field: "npcName",
          value: npcName,
        });
      }
    }

    const requiredTool = TOOL_WAYPOINT_TYPES[type];
    if (requiredTool) {
      addIssue("warning", "required-tool", `${formatWaypointReference(index)} requires a ${requiredTool} to be visible in inventory at runtime.`, {
        waypointIndex: index,
        field: "type",
        value: requiredTool,
        requiresAcknowledgement: false,
      });
    }

    if (FLOOR_TRANSITION_WAYPOINT_TYPES.has(type)) {
      const targetZ = getFloorTransitionTargetZ(normalizedWaypoints, index, type);
      if (targetZ != null
        && Number.isFinite(Number(targetZ))
        && !hasForwardFloorLandingWaypoint(normalizedWaypoints, index, targetZ, {
          allowLoop: normalized.autowalkLoop !== false,
        })) {
        addIssue("warning", "floor-transition-landing-gap", `${formatWaypointReference(index)} changes floor but has no same-floor landing waypoint within the next 2 route steps.`, {
          waypointIndex: index,
          field: "z",
          value: targetZ,
          requiresAcknowledgement: false,
        });
      }
    }

    const previous = normalizedWaypoints[index - 1] || null;
    if (previous) {
      const distance = getChebyshevDistance(previous, waypoint);
      const previousType = normalizeWaypointType(rawWaypoints[index - 1]?.type ?? previous.type);
      const zDelta = Math.abs(Number(waypoint.z) - Number(previous.z));
      const transitionTagged = FLOOR_TRANSITION_WAYPOINT_TYPES.has(previousType) || FLOOR_TRANSITION_WAYPOINT_TYPES.has(type);

      if (zDelta > 1) {
        addIssue("warning", "unsupported-floor-jump", `${formatWaypointReference(index)} jumps ${zDelta} floors from the previous waypoint.`, {
          waypointIndex: index,
          field: "z",
          value: waypoint.z,
        });
      } else if (zDelta === 1 && !transitionTagged) {
        addIssue("warning", "untagged-floor-change", `${formatWaypointReference(index)} changes floor without a floor-change waypoint type.`, {
          waypointIndex: index,
          field: "type",
        });
      }

      if (getPositionKey(previous) === getPositionKey(waypoint)) {
        addIssue("warning", "duplicate-position", `${formatWaypointReference(index)} repeats the previous waypoint position.`, {
          waypointIndex: index,
          field: "position",
        });
      } else if (distance != null && distance > 15 && previousType !== "helper" && type !== "helper") {
        addIssue("warning", "long-segment", `${formatWaypointReference(index)} is ${distance} SQM from the previous same-floor waypoint.`, {
          waypointIndex: index,
          field: "position",
          value: distance,
        });
      }
    }

    if (type === "helper") {
      const previous = normalizedWaypoints[index - 1] || null;
      const next = normalizedWaypoints[index + 1] || null;
      const previousDistance = getChebyshevDistance(previous, waypoint);
      const nextDistance = getChebyshevDistance(waypoint, next);
      if (
        (previousDistance != null && previousDistance > 3)
        || (nextDistance != null && nextDistance > 3)
      ) {
        addIssue("warning", "unsafe-helper-gap", `${formatWaypointReference(index)} helper has a gap larger than 3 SQM to its route neighbors.`, {
          waypointIndex: index,
          field: "position",
        });
      }
    }
  });

  for (const name of collectConfiguredMonsterNames(rawSource)) {
    if (!isKnownMinibiaMonsterName(name)) {
      addIssue("warning", "unknown-monster", `Route target list references unknown monster "${name}".`, {
        field: "monster",
        value: name,
      });
    }
  }

  for (const name of collectConfiguredNpcNames(rawSource, rawWaypoints)) {
    if (!isKnownMinibiaNpcName(name)) {
      addIssue("warning", "unknown-npc", `Route configuration references unknown NPC "${name}".`, {
        field: "npcName",
        value: name,
      });
    }
  }

  for (const name of collectConfiguredItemNames(rawSource)) {
    if (!isKnownItemName(name)) {
      addIssue("warning", "unknown-item", `Route item rule references unknown item "${name}".`, {
        field: "item",
        value: name,
      });
    }
  }

  if (normalizedWaypoints.length >= 6 && explicitLabelCount === 0 && generatedLabelCount > 0) {
    addIssue("info", "generated-labels-only", "Route uses only generated waypoint labels; named labels make validation and recovery messages easier to act on.", {
      field: "label",
      requiresAcknowledgement: false,
    });
  }

  if (
    normalized.autowalkEnabled
    && normalized.autowalkLoop === false
    && normalizedWaypoints.length > 1
    && gotoActionCount === 0
    && !normalizedWaypoints.some((waypoint) => normalizeWaypointType(waypoint?.type) === "exit-zone")
  ) {
    addIssue("info", "linear-route-no-return", "Autowalk is enabled on a linear route without a goto or exit-zone waypoint; route completion will stop instead of looping.", {
      field: "autowalkLoop",
      requiresAcknowledgement: false,
    });
  }

  if (normalized.partyFollowEnabled && !collectTextList(normalized.partyFollowMembers).length) {
    addIssue("warning", "party-follow-no-members", "Follow Chain is enabled without saved members; support/follower diagnostics will have no leader to sync to.", {
      field: "partyFollowMembers",
      requiresAcknowledgement: false,
    });
  }

  if (normalized.lootingEnabled && !collectTextList(normalized.lootPreferredContainers).length) {
    addIssue("warning", "loot-no-destination", "Looting is enabled without preferred containers; backpack/window state loss will be harder to diagnose.", {
      field: "lootPreferredContainers",
      requiresAcknowledgement: false,
    });
  }

  if (normalized.bankingEnabled && !(Array.isArray(normalized.bankingRules) && normalized.bankingRules.length)) {
    addIssue("warning", "banking-no-rules", "Banking is enabled without banking rules; depot/deposit naming mismatches cannot be validated before runtime.", {
      field: "bankingRules",
      requiresAcknowledgement: false,
    });
  }

  if (
    normalized.alarmsEnabled
    && normalized.alarmsPlayerEnabled === false
    && normalized.alarmsStaffEnabled === false
    && normalized.alarmsBlacklistEnabled === false
  ) {
    addIssue("warning", "alarms-no-scopes", "Alarms are enabled but every alarm scope is disabled.", {
      field: "alarmsEnabled",
      requiresAcknowledgement: false,
    });
  }

  issues.sort((left, right) => issueSortKey(right).localeCompare(issueSortKey(left)));
  const summary = summarizeRouteValidationIssues(issues);
  const signature = buildRouteValidationSignature({
    sourceName: routeName,
    normalized,
    issues,
  });

  return {
    schemaVersion: 1,
    sourceName: routeName,
    sourcePath: normalizeText(sourcePath),
    signature,
    checkedAt: Date.now(),
    ok: summary.ok,
    requiresAcknowledgement: summary.errorCount > 0,
    summary,
    issues,
  };
}
