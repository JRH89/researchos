export type PaperQuote = { targetWords: number; estimatedInputTokens: number; estimatedOutputTokens: number; webSearchAllowance: number; providerCostUsd: number; platformMarginUsd: number; credits: number };
export type ResearchQuote = { webSearchAllowance: number; estimatedInputTokens: number; estimatedOutputTokens: number; providerCostUsd: number; platformMarginUsd: number; credits: number };

const INPUT_PER_MILLION_USD = 1;
const OUTPUT_PER_MILLION_USD = 5;
const WEB_SEARCH_USD = 0.01;
const CREDIT_COST_TARGET_USD = 0.02;
const INFRA_RESERVE_USD = 0.015;

function creditsFor(providerCostUsd: number, minimum = 1) {
  return Math.max(minimum, Math.ceil((providerCostUsd + INFRA_RESERVE_USD) / CREDIT_COST_TARGET_USD));
}

// A credit is priced by product configuration later; this conservative estimator is
// deliberately server-owned, shown before a run, and reconciled against provider usage.
export function quotePaper(targetWords: number, webSearchAllowance = 0): PaperQuote {
  const safeWords = Math.max(250, Math.min(10000, Math.round(targetWords / 50) * 50));
  const estimatedOutputTokens = Math.ceil(safeWords * 1.35);
  const estimatedInputTokens = 5000 + webSearchAllowance * 3500;
  const providerCostUsd = (estimatedInputTokens / 1_000_000) * INPUT_PER_MILLION_USD + (estimatedOutputTokens / 1_000_000) * OUTPUT_PER_MILLION_USD + webSearchAllowance * WEB_SEARCH_USD;
  const platformMarginUsd = Math.max(0.01, providerCostUsd * 0.45 + INFRA_RESERVE_USD);
  return { targetWords: safeWords, estimatedInputTokens, estimatedOutputTokens, webSearchAllowance, providerCostUsd, platformMarginUsd, credits: creditsFor(providerCostUsd, 2) };
}

export function quoteResearch(webSearchAllowance = 5): ResearchQuote {
  const searches = Math.max(0, Math.min(12, Math.round(webSearchAllowance)));
  const estimatedInputTokens = 12_000 + searches * 3_500;
  const estimatedOutputTokens = 2_500 + searches * 300;
  const providerCostUsd = (estimatedInputTokens / 1_000_000) * INPUT_PER_MILLION_USD + (estimatedOutputTokens / 1_000_000) * OUTPUT_PER_MILLION_USD + searches * WEB_SEARCH_USD;
  const platformMarginUsd = Math.max(0.01, providerCostUsd * 0.45 + INFRA_RESERVE_USD);
  return { webSearchAllowance: searches, estimatedInputTokens, estimatedOutputTokens, providerCostUsd, platformMarginUsd, credits: creditsFor(providerCostUsd, 4) };
}
