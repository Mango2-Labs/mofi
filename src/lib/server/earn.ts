// Earn: idle cash lent out through Kamino's Steakhouse USDC vault. The vault's shares sit in the user's wallet
// and grow in value as interest comes in.
export const EARN_VAULT = "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E";
export const EARN_SHARES_MINT = "7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS";

type Metrics = { apy: number; tokensPerShare: number };
let cached: { at: number; metrics: Promise<Metrics> } | null = null;

// The vault's current yearly rate and what one share is worth in USDC, from Kamino's API. Kept for a minute.
export function earnMetrics() {
  if (cached && Date.now() - cached.at < 60_000) return cached.metrics;
  const metrics = fetch(`https://api.kamino.finance/kvaults/${EARN_VAULT}/metrics`, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Kamino's API isn't answering."))))
    .then((d) => ({ apy: Number(d.apy), tokensPerShare: Number(d.tokensPerShare) }));
  cached = { at: Date.now(), metrics };
  metrics.catch(() => (cached = null));
  return metrics;
}
