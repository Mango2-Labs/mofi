const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const usd = (n: number) => dollars.format(n);

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
