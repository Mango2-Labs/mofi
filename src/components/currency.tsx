"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useLang, useT } from "@/components/language";
import { CURRENCY_COOKIE, moneyIn, type Currency } from "@/lib/format";

const CurrencyContext = createContext<{ currency: Currency; rate: number | null; setCurrency: (c: Currency) => void }>({ currency: "usd", rate: null, setCurrency: () => {} });

// Which currency the app shows amounts held in: the one picked (saved for a year), else rupiah in Indonesian and
// dollars in English. Rupiah needs today's rate; without one, amounts stay in dollars.
export function CurrencyProvider({ saved, rate, children }: { saved: Currency | null; rate: number | null; children: ReactNode }) {
  const { lang } = useLang();
  const [picked, setPicked] = useState(saved);
  const setCurrency = (next: Currency) => {
    document.cookie = `${CURRENCY_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    setPicked(next);
  };
  return <CurrencyContext.Provider value={{ currency: picked ?? (lang === "id" ? "idr" : "usd"), rate, setCurrency }}>{children}</CurrencyContext.Provider>;
}

// Formatters for amounts held (balances, prices, activity). Amounts typed in and fees stay in dollars, since that's
// what moves; Approx shows them in rupiah alongside.
export function useMoney() {
  const { currency, rate } = useContext(CurrencyContext);
  return useMemo(() => moneyIn(currency === "idr" ? rate : null), [currency, rate]);
}

export function Approx({ dollars, className = "" }: { dollars: number; className?: string }) {
  const { currency, rate } = useContext(CurrencyContext);
  if (currency !== "idr" || !rate || !(dollars > 0)) return null;
  return <span className={`tabular-nums text-ink-faint ${className}`}>≈ {moneyIn(rate).money(dollars)}</span>;
}

export function CurrencySwitch() {
  const { currency, setCurrency } = useContext(CurrencyContext);
  const t = useT();
  return (
    <div role="radiogroup" aria-label={t.common.currency} className="flex shrink-0 rounded-full bg-surface-app p-0.5 text-[13px] font-semibold">
      {([["usd", "$"], ["idr", "Rp"]] as const).map(([c, label]) => (
        <button key={c} type="button" role="radio" aria-checked={currency === c} onClick={() => currency !== c && setCurrency(c)} className={`cursor-pointer rounded-full px-2.5 py-1 ${currency === c ? "bg-ink text-on-ink" : "text-ink-muted"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}
