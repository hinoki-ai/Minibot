/*
 * Currency math helpers shared by banking, conversion, and overflow handling.
 * Keep coin totals, breakdowns, and overflow parsing centralized and side-effect
 * free so value math stays reusable in both runtime code and focused tests.
 */

export const GOLD_PER_PLATINUM = 100;
export const GOLD_PER_CRYSTAL = 10_000;

export function normalizeGoldValue(value, fallback = 0) {
  const normalizedFallback = Number.isFinite(Number(fallback))
    ? Math.max(0, Math.trunc(Number(fallback)))
    : 0;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return normalizedFallback;
  }

  return Math.max(0, Math.trunc(numericValue));
}

export function sumCoinCounts({
  goldCoinCount = 0,
  platinumCoinCount = 0,
  crystalCoinCount = 0,
} = {}) {
  return (
    normalizeGoldValue(goldCoinCount)
    + normalizeGoldValue(platinumCoinCount) * GOLD_PER_PLATINUM
    + normalizeGoldValue(crystalCoinCount) * GOLD_PER_CRYSTAL
  );
}

export function describeCoinBreakdown(totalGoldValue = 0) {
  const total = normalizeGoldValue(totalGoldValue);
  const crystalCoinCount = Math.floor(total / GOLD_PER_CRYSTAL);
  const afterCrystals = total - crystalCoinCount * GOLD_PER_CRYSTAL;
  const platinumCoinCount = Math.floor(afterCrystals / GOLD_PER_PLATINUM);
  const goldCoinCount = afterCrystals - platinumCoinCount * GOLD_PER_PLATINUM;

  return {
    totalGoldValue: total,
    goldCoinCount,
    platinumCoinCount,
    crystalCoinCount,
  };
}

export function parseOverflowSignature(overflowSignature = "") {
  const counts = {
    goldCoinCount: 0,
    platinumCoinCount: 0,
    crystalCoinCount: 0,
  };
  const text = String(overflowSignature || "").trim();
  if (!text) {
    return {
      ...counts,
      totalGoldValue: 0,
    };
  }

  for (const entry of text.split("|")) {
    const match = entry.match(/:(3031|3035|3043)x(\d+)$/);
    if (!match) continue;

    const itemId = Number(match[1]);
    const count = normalizeGoldValue(match[2]);
    if (itemId === 3031) {
      counts.goldCoinCount += count;
    } else if (itemId === 3035) {
      counts.platinumCoinCount += count;
    } else if (itemId === 3043) {
      counts.crystalCoinCount += count;
    }
  }

  return {
    ...counts,
    totalGoldValue: sumCoinCounts(counts),
  };
}

export function getCarriedGoldValue(snapshot = null) {
  const directValue = Number(snapshot?.currency?.totalGoldValue);
  if (Number.isFinite(directValue)) {
    return normalizeGoldValue(directValue);
  }

  return parseOverflowSignature(snapshot?.currency?.overflowSignature).totalGoldValue;
}
