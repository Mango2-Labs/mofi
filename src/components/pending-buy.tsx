"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useT } from "@/components/language";
import { Icon } from "@/components/phone";
import { useMofiWallet } from "@/components/signed-in";
import { ASSETS } from "@/lib/assets";
import { usd } from "@/lib/format";
import { usePoll } from "@/lib/use-poll";
import type { Portfolio } from "@/lib/use-portfolio";
import { TradeError, useTrade } from "@/lib/use-trade";

// A buy waiting for a deposit: when cash is short, the user deposits the difference from any chain,
// Aurora delivers it as cash, and Mofi buys as soon as it lands. The buy needs the user's wallet, so it
// runs while any Mofi page is open; the order is remembered in this browser until then.
export type PendingBuy = { symbol: string; amount: number; needed: number; baseline: number; at: number };
export type BuyResult = { status: "buying" } | { status: "done"; symbol: string; spent: number; signature: string } | { status: "failed"; symbol: string; error: string };

const KEY = "mofi:pending-buy";
const DAY = 86_400_000;

function load(): PendingBuy | null {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? "null") as PendingBuy | null;
    return p && Date.now() - p.at < DAY ? p : null;
  } catch {
    return null;
  }
}

function save(p: PendingBuy | null) {
  try {
    if (p) localStorage.setItem(KEY, JSON.stringify(p));
    else localStorage.removeItem(KEY);
  } catch {}
}

const stamped = (p: Omit<PendingBuy, "at">): PendingBuy => ({ ...p, at: Date.now() });

type Context = {
  pending: PendingBuy | null;
  result: BuyResult | null;
  start: (p: Omit<PendingBuy, "at">) => void;
  cancel: () => void;
  dismiss: () => void;
  // A screen that shows the result itself hides the toast while it's open.
  setShown: (shown: boolean) => void;
};
const PendingBuyContext = createContext<Context | null>(null);
export const usePendingBuy = () => useContext(PendingBuyContext)!;

export function PendingBuyProvider({ children }: { children: ReactNode }) {
  const { address, wallet } = useMofiWallet();
  const { order, execute } = useTrade();
  const t = useT();
  const [pending, setPending] = useState<PendingBuy | null>(() => (typeof window === "undefined" ? null : load()));
  const [result, setResult] = useState<BuyResult | null>(null);
  const [shown, setShown] = useState(false);
  const { data: portfolio } = usePoll<Portfolio>(pending && address ? `/api/portfolio?owner=${address}` : null, 8_000);
  const running = useRef(false);

  // Once most of the deposit shows up as cash (Aurora keeps a small fee), buy with what's there, up to the planned amount.
  useEffect(() => {
    if (!pending || !portfolio || !wallet || running.current) return;
    if (portfolio.cash < pending.baseline + pending.needed * 0.9) return;
    running.current = true;
    const spend = Math.floor(Math.min(pending.amount, portfolio.cash) * 100) / 100;
    const buy = async () => {
      setResult({ status: "buying" });
      try {
        const signature = await execute(await order("buy", pending.symbol, spend.toFixed(2)));
        setResult({ status: "done", symbol: pending.symbol, spent: spend, signature });
      } catch (e) {
        setResult({ status: "failed", symbol: pending.symbol, error: e instanceof TradeError ? e.message : t.trade.buyDidntGoThrough });
      } finally {
        save(null);
        setPending(null);
        running.current = false;
      }
    };
    buy();
  }, [pending, portfolio, wallet, order, execute, t]);

  const value: Context = {
    pending,
    result,
    start: (p) => {
      const next = stamped(p);
      save(next);
      setPending(next);
      setResult(null);
    },
    cancel: () => { save(null); setPending(null); },
    dismiss: () => setResult(null),
    setShown,
  };

  const name = (symbol: string) => ASSETS.find((a) => a.symbol === symbol)?.name ?? symbol;

  return (
    <PendingBuyContext.Provider value={value}>
      {children}
      {!shown && result && result.status !== "buying" && (
        <div role="status" className="fixed inset-x-4 bottom-24 z-40 mx-auto flex max-w-[408px] items-start gap-3 rounded-[18px] bg-ink p-4 text-sm text-on-ink shadow-[0_16px_40px_rgba(10,10,11,0.25)]">
          <span className="flex-1">
            {result.status === "done"
              ? t.trade.toastDone(usd(result.spent), name(result.symbol))
              : t.trade.toastFailed(name(result.symbol), t.serverError(result.error))}
          </span>
          <button type="button" onClick={value.dismiss} aria-label={t.common.close} className="cursor-pointer opacity-70 hover:opacity-100"><Icon name="plus" size={16} stroke={2.4} className="rotate-45" /></button>
        </div>
      )}
    </PendingBuyContext.Provider>
  );
}
