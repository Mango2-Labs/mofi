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

export type Currency = "usd" | "idr";
export const CURRENCY_COOKIE = "currency";

// Rupiah by hand, the same on the server and in every browser: whole rupiah with Indonesian dots ("Rp 1.650.000"),
// and three significant digits below Rp 100 ("Rp 0,361").
const rupiah = (n: number) => `Rp ${n >= 100 ? Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : Number(n.toPrecision(3)).toString().replace(".", ",")}`;

// How amounts held are shown: in rupiah at `rate` per dollar, or in dollars when there's no rate.
export function moneyIn(rate: number | null) {
  if (!rate) return { money: usd, price: priceUsd, exact, split: splitCents, none: "$—" };
  const idr = (n: number) => rupiah(n * rate);
  return { money: idr, price: idr, exact: idr, split: (n: number): [string, string] => [idr(n), ""], none: "Rp —" };
}
