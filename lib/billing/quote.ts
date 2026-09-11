export type PaperQuote = { targetWords: number; estimatedInputTokens: number; estimatedOutputTokens: number; webSearchAllowance: number; providerCostUsd: number; platformMarginUsd: number; credits: number };

// A credit is priced by product configuration later; this conservative estimator is
// deliberately server-owned, shown before a run, and reconciled against provider usage.
export function quotePaper(targetWords: number, webSearchAllowance = 3): PaperQuote {
  const safeWords = Math.max(250, Math.min(10000, Math.round(targetWords / 50) * 50));
  const estimatedOutputTokens = Math.ceil(safeWords * 1.35);
  const estimatedInputTokens = 5000 + webSearchAllowance * 3500;
  const providerCostUsd = (estimatedInputTokens / 1_000_000) + (estimatedOutputTokens / 1_000_000) * 5 + webSearchAllowance * 0.01;
  const platformMarginUsd = Math.max(0.01, providerCostUsd * 0.45);
  return { targetWords: safeWords, estimatedInputTokens, estimatedOutputTokens, webSearchAllowance, providerCostUsd, platformMarginUsd, credits: Math.ceil((providerCostUsd + platformMarginUsd) * 100) };
}
