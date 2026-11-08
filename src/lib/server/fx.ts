// Dollars to rupiah, from the European Central Bank's daily reference rates (via Frankfurter). It's kept an hour, and
// the last good rate is used while the feed is down; null when there's never been one, so amounts stay in dollars.
let cached: { at: number; rate: number } | null = null;

export async function idrRate() {
  if (cached && Date.now() - cached.at < 3_600_000) return cached.rate;
  const data = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=IDR", { signal: AbortSignal.timeout(1500), cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  const rate = Number(data?.rates?.IDR);
  if (rate > 0) cached = { at: Date.now(), rate };
  return cached?.rate ?? null;
}
