import fs from "node:fs";
import path from "node:path";

export const BROWSER_PROFILE_COPY_EXCLUDED_BASENAMES = Object.freeze([
  "Account Web Data",
  "Account Web Data-journal",
  "Accounts",
  "Affiliation Database",
  "Affiliation Database-journal",
  "AmountExtractionHeuristicRegexes",
  "AutofillAiModelCache",
  "AutofillStrikeDatabase",
  "BrowserMetrics",
  "BrowsingTopicsSiteData",
  "BrowsingTopicsSiteData-journal",
  "BrowsingTopicsState",
  "BudgetDatabase",
  "Cache",
  "CacheStorage",
  "CaptchaProviders",
  "CertificateRevocation",
  "chrome_cart_db",
  "ClientCertificates",
  "Code Cache",
  "commerce_subscription_db",
  "component_crx_cache",
  "Crashpad",
  "Crowd Deny",
  "DawnGraphiteCache",
  "DawnWebGPUCache",
  "DeferredBrowserMetrics",
  "Dictionaries",
  "DIPS",
  "DIPS-journal",
  "DIPS-wal",
  "discounts_db",
  "Extension Rules",
  "Extension Scripts",
  "Extension State",
  "Favicons",
  "Favicons-journal",
  "FileTypePolicies",
  "Feature Engagement Tracker",
  "GPUCache",
  "GCM Store",
  "GraphiteDawnCache",
  "GrShaderCache",
  "heavy_ad_intervention_opt_out.db",
  "heavy_ad_intervention_opt_out.db-journal",
  "History",
  "History Provider Cache",
  "History-journal",
  "hyphen-data",
  "InterestGroups",
  "InterestGroups-wal",
  "Login Data",
  "Login Data For Account",
  "Login Data For Account-journal",
  "Login Data-journal",
  "MediaDeviceSalts",
  "MediaDeviceSalts-journal",
  "MEIPreload",
  "Network Action Predictor",
  "Network Action Predictor-journal",
  "Network Persistent State",
  "OnDeviceHeadSuggestModel",
  "OptimizationHints",
  "optimization_guide_hint_cache_store",
  "optimization_guide_model_store",
  "OriginTrials",
  "parcel_tracking_db",
  "PersistentOriginTrials",
  "PKIMetadata",
  "PreferredApps",
  "Reporting and NEL",
  "Reporting and NEL-journal",
  "Safe Browsing",
  "Safe Browsing Cookies",
  "Safe Browsing Cookies-journal",
  "SafetyTips",
  "segmentation_platform",
  "ServerCertificate",
  "ServerCertificate-journal",
  "Session Storage",
  "ShaderCache",
  "Shared Dictionary",
  "SharedStorage",
  "SharedStorage-wal",
  "Shortcuts",
  "Shortcuts-journal",
  "SSLErrorAssistant",
  "Sessions",
  "Site Characteristics Database",
  "Subresource Filter",
  "Top Sites",
  "Top Sites-journal",
  "TransportSecurity",
  "Trust Tokens",
  "Trust Tokens-journal",
  "TrustTokenKeyCommitments",
  "VideoDecodeStats",
  "Visited Links",
  "WasmTtsEngine",
  "Web Data",
  "Web Data-journal",
  "ZxcvbnData",
  "blob_storage",
]);

export const BROWSER_PROFILE_COPY_EXCLUDED_PREFIXES = Object.freeze([
  "BrowserMetrics-",
  "Safe Browsing ",
]);

const SAVED_PASSWORD_PROFILE_BASENAMES = new Set([
  "Account Web Data",
  "Account Web Data-journal",
  "Login Data",
  "Login Data For Account",
  "Login Data For Account-journal",
  "Login Data-journal",
]);

function getRelativeSegments(sourcePath, rootPath) {
  const resolvedRoot = path.resolve(String(rootPath || ""));
  const resolvedSource = path.resolve(String(sourcePath || ""));
  if (!resolvedRoot || !resolvedSource) {
    return [];
  }

  const relativePath = path.relative(resolvedRoot, resolvedSource);
  if (
    !relativePath
    || relativePath === "."
    || relativePath.startsWith("..")
    || path.isAbsolute(relativePath)
  ) {
    return [];
  }

  return relativePath.split(path.sep).filter(Boolean);
}

export function matchesBrowserProfileExcludedName(name = "", {
  excludedBasenames = BROWSER_PROFILE_COPY_EXCLUDED_BASENAMES,
  excludedPrefixes = BROWSER_PROFILE_COPY_EXCLUDED_PREFIXES,
  preserveSavedPasswords = false,
} = {}) {
  const normalizedName = String(name || "").trim();
  if (!normalizedName) {
    return false;
  }

  if (preserveSavedPasswords && SAVED_PASSWORD_PROFILE_BASENAMES.has(normalizedName)) {
    return false;
  }

  const exactNames = excludedBasenames instanceof Set
    ? excludedBasenames
    : new Set(Array.from(excludedBasenames || [], (value) => String(value || "").trim()).filter(Boolean));
  if (exactNames.has(normalizedName)) {
    return true;
  }

  return Array.from(excludedPrefixes || [])
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .some((prefix) => normalizedName.startsWith(prefix));
}

export function shouldCopyBrowserProfilePath(sourcePath, profileRoot, options = {}) {
  const segments = getRelativeSegments(sourcePath, profileRoot);
  return !segments.some((segment) => matchesBrowserProfileExcludedName(segment, options));
}

export function pruneBrowserProfile(profileRoot, {
  existsImpl = fs.existsSync,
  readdirImpl = fs.readdirSync,
  rmImpl = fs.rmSync,
  preserveSavedPasswords = false,
} = {}) {
  const resolvedProfileRoot = path.resolve(String(profileRoot || ""));
  if (!resolvedProfileRoot || !existsImpl(resolvedProfileRoot)) {
    return [];
  }

  const removedPaths = [];
  const visitDirectory = (directoryPath) => {
    let entries = [];
    try {
      entries = readdirImpl(directoryPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const entryPath = path.join(directoryPath, entry.name);
      if (matchesBrowserProfileExcludedName(entry.name, { preserveSavedPasswords })) {
        try {
          rmImpl(entryPath, { recursive: true, force: true });
          removedPaths.push(entryPath);
        } catch {}
        continue;
      }

      if (typeof entry.isDirectory === "function" && entry.isDirectory()) {
        visitDirectory(entryPath);
      }
    }
  };

  visitDirectory(resolvedProfileRoot);
  return removedPaths;
}
