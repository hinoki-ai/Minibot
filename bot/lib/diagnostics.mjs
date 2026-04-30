/*
 * Minibot-native diagnostics assembled from normalized runtime facts. These
 * messages are intentionally descriptive and avoid scripting/bypass advice.
 */

function normalizeText(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function addDiagnostic(list, severity, code, message, details = {}) {
  const normalizedMessage = normalizeText(message);
  if (!normalizedMessage) return;
  list.push({
    severity,
    code,
    message: normalizedMessage,
    details,
  });
}

export function buildRuntimeDiagnostics({
  snapshot = {},
  options = {},
  routeValidation = null,
  decisionTrace = null,
  protectorStatus = null,
} = {}) {
  const diagnostics = [];

  if (snapshot?.ready === false) {
    addDiagnostic(diagnostics, "error", "unsupported-runtime", snapshot.reason || "client runtime is not ready");
  }

  if (routeValidation && routeValidation.ok === false) {
    addDiagnostic(
      diagnostics,
      "error",
      "route-profile-compatibility",
      routeValidation.summary?.errorCount
        ? `${routeValidation.summary.errorCount} route validation error(s)`
        : "route profile validation failed",
      { signature: routeValidation.signature || "" },
    );
  }

  if (decisionTrace?.blocker?.owner === "looting" && /stuck|container|backpack/i.test(decisionTrace.blocker.reason || "")) {
    addDiagnostic(diagnostics, "warning", "looting-stuck", decisionTrace.blocker.reason);
  }

  if (options.bankingEnabled && /depot|deposit|naming/i.test(decisionTrace?.blocker?.reason || "")) {
    addDiagnostic(diagnostics, "warning", "depot-deposit-naming", decisionTrace.blocker.reason);
  }

  if (options.lootingEnabled && snapshot?.inventory?.openBackpackCount === 0) {
    addDiagnostic(diagnostics, "warning", "backpack-window-state-loss", "no open backpack containers were detected");
  }

  if (options.monsterNames?.length && decisionTrace?.blocker?.owner === "targeter") {
    addDiagnostic(diagnostics, "warning", "targeting-not-firing", decisionTrace.blocker.reason || "targeter did not select a target");
  }

  if (decisionTrace?.blocker?.owner === "route" && /tile|blocked|hazard|field|no-go/i.test(decisionTrace.blocker.reason || "")) {
    addDiagnostic(diagnostics, "warning", "tile-rule-blocker", decisionTrace.blocker.reason);
  }

  if (decisionTrace?.blocker?.owner === "npc" || /npc dialogue|dialogue/i.test(decisionTrace?.blocker?.reason || "")) {
    addDiagnostic(diagnostics, "warning", "npc-dialogue-failure", decisionTrace.blocker.reason);
  }

  if (protectorStatus?.active) {
    addDiagnostic(diagnostics, protectorStatus.highestSeverity === "critical" ? "error" : "warning", "protector-active", protectorStatus.reason);
  }

  return {
    ok: diagnostics.every((entry) => entry.severity !== "error"),
    diagnostics,
  };
}
