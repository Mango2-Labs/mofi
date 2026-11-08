const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const usd = (n: number) => dollars.format(n);

// A price: whole cents from $1 up, four significant digits below, so $0.0166 doesn't show as $0.02.
export const priceUsd = (n: number) => (n >= 1 ? usd(n) : `$${n.toLocaleString("en-US", { maximumSignificantDigits: 4 })}`);

// Exact to a tenth of a cent when it isn't whole cents: $2.24, $2.235, $0.005.
export const exact = (n: number) => (Math.round(n * 1000) % 10 === 0 ? usd(n) : `$${n.toFixed(3)}`);

// "$1,284.50" → ["$1,284", ".50"], so cents can be set in ink-faint.
export function splitCents(n: number): [string, string] {
  const s = usd(n);
  const dot = s.lastIndexOf(".");
  return dot < 0 ? [s, ""] : [s.slice(0, dot), s.slice(dot)];
}

// Signed percent with a true minus sign: +2.8%, −0.4%.
export const pct = (n: number) => `${n < 0 ? "−" : "+"}${Math.abs(n).toFixed(1)}%`;

// Fees under a cent read as "Under $0.01" rather than "$0.00".
export const feeUsd = (n: number) => (n < 0.01 ? "Under $0.01" : usd(n));
