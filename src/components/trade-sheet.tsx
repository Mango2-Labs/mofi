"use client";

import { useEffect, useState } from "react";
import { DepositFlow } from "@/components/deposit-flow";
import { Keypad } from "@/components/keypad";
import { useT } from "@/components/language";
import { usePendingBuy } from "@/components/pending-buy";
import { AssetIcon, Card, Icon } from "@/components/phone";
import { Sheet } from "@/components/sheet";
import { units, type AssetInfo } from "@/lib/assets";
import { TRADE_FEE_BPS, tradeFee } from "@/lib/fees";
import { exact, priceUsd, splitCents, usd } from "@/lib/format";
import type { Portfolio } from "@/lib/use-portfolio";
import { TradeError, useTrade } from "@/lib/use-trade";

const MIN = 1;

// Buy or sell with the keypad. A buy bigger than the user's cash deposits the difference from any chain
// inside the same sheet, and Mofi buys once it lands.
export function TradeSheet({ asset, side, price, portfolio, onClose }: { asset: AssetInfo; side: "buy" | "sell"; price?: number; portfolio: Portfolio | null; onClose: () => void }) {
  const trade = useTrade();
  const t = useT();
  const { pending, result, start, cancel, setShown } = usePendingBuy();
  const [amount, setAmount] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [done, setDone] = useState<{ spent: number; signature: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dollars = Number(amount) || 0;
  const cash = portfolio?.cash ?? 0;
  const holding = portfolio?.holdings.find((h) => h.mint === asset.mint)?.value ?? 0;
  // The gap plus 1%, so Aurora's fee doesn't leave the deposit short.
  const short = side === "buy" && dollars > cash ? Math.ceil((dollars - cash) * 1.01 * 100) / 100 : 0;
  const tooMuch = side === "sell" && dollars > holding + 0.005;
  const landed = depositing && result?.status === "done" && result.symbol === asset.symbol ? result : null;
  const finished = done ?? (landed && { spent: landed.spent, signature: landed.signature });
  const [whole, cents] = splitCents(dollars);
  // Mofi's fee comes out of what's bought (or out of the cash a sale brings in).
  const fee = tradeFee(dollars);

  // While this sheet shows the deposit's progress, the app-wide toast stays out of the way.
  useEffect(() => {
    setShown(depositing);
    return () => setShown(false);
  }, [depositing, setShown]);

  const submit = async () => {
    if (short > 0) return setDepositing(true);
    setBusy(true);
    setError(null);
    try {
      setDone({ spent: dollars, signature: await trade.execute(await trade.order(side, asset.symbol, dollars.toFixed(2))) });
    } catch (e) {
      setError(e instanceof TradeError ? e.message : t.common.failed);
    } finally {
      setBusy(false);
    }
  };

  const steps = t.trade.steps(asset.name);
  // Which step is under way: the deposit is awaited (0) until the buy starts (2).
  const progress = landed ? 3 : result?.status === "buying" ? 2 : pending ? 0 : -1;

  return (
    <Sheet label={t.trade.title(side, asset.name)} onClose={onClose}>
      {finished ? (
        <>
          <span className="mt-4 flex size-16 items-center justify-center self-center rounded-full bg-gain-soft text-gain"><Icon name="check" size={30} stroke={2.4} /></span>
          <div className="flex flex-col items-center gap-1 text-center">
            <h2 className="text-2xl font-semibold tracking-[-0.03em]">{side === "buy" ? t.trade.bought(asset.name) : t.trade.sold(asset.name)}</h2>
            <p className="text-sm text-ink-muted">
              {side === "buy" ? t.trade.boughtText(price ? units(asset, finished.spent / price, t.common.shares) : asset.name, usd(finished.spent)) : t.trade.soldText(usd(finished.spent))}
            </p>
          </div>
          <button type="button" onClick={onClose} className="h-13 cursor-pointer rounded-full bg-ink py-3.5 font-semibold text-on-ink">{t.common.done}</button>
          <a href={`https://solscan.io/tx/${finished.signature}`} target="_blank" rel="noreferrer" className="self-center text-sm text-ink-muted underline">{t.common.solscan}</a>
        </>
      ) : depositing ? (
        <DepositFlow
          need={short}
          onBack={() => setDepositing(false)}
          onPicked={() => start({ symbol: asset.symbol, amount: dollars, needed: short, baseline: cash })}
          onUnpick={cancel}
        >
          <Card className="px-4 py-1 text-sm">
            {steps.map((label, i) => (
              <div key={label} className="flex items-center gap-2.5 border-b border-divider py-3 last:border-0">
                {i < progress ? (
                  <span className="flex size-5 items-center justify-center rounded-full bg-gain text-white"><Icon name="check" size={12} stroke={3} /></span>
                ) : (
                  <span className={`flex size-5 items-center justify-center rounded-full border-2 ${i === progress ? "border-gain" : "border-line"}`}>{i === progress && <span className="size-2 animate-pulse rounded-full bg-gain motion-reduce:animate-none" />}</span>
                )}
                <span className={i <= progress ? "font-semibold" : "text-ink-muted"}>{label}</span>
              </div>
            ))}
          </Card>
          {result?.status === "failed" && <p className="px-1 text-sm text-loss">{t.trade.buyFailed(t.serverError(result.error))}</p>}
          <p className="px-2 text-center text-xs text-ink-muted">{t.trade.keepOpen}</p>
        </DepositFlow>
      ) : (
        <>
          <div className="flex items-center gap-2.5">
            <AssetIcon asset={{ ticker: asset.symbol, logo: asset.logo }} size={32} />
            <h2 className="flex-1 text-[17px] font-semibold">{t.trade.title(side, asset.name)}</h2>
            <button type="button" onClick={onClose} aria-label={t.common.close} className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-card"><Icon name="plus" size={16} stroke={2.4} className="rotate-45" /></button>
          </div>
          <div className="flex flex-col items-center gap-1 py-3">
            <span className={`text-[64px] leading-none font-semibold tracking-[-0.05em] tabular-nums ${amount ? "" : "text-ink-faint"}`}>
              {whole}{amount.includes(".") && <span className="text-ink-faint">{cents}</span>}
            </span>
            <span className="text-sm text-ink-muted tabular-nums">{price && dollars ? t.trade.about(units(asset, (side === "buy" ? dollars - fee : dollars) / price, t.common.shares)) : t.trade.at(price ? priceUsd(price) : "—")}</span>
          </div>
          <Card className="px-3.5 py-0.5">
            <div className="flex items-center gap-3 py-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-gain-soft font-semibold text-gain">$</span>
              <span className="flex flex-1 flex-col leading-tight">
                <span className="text-[11px] text-ink-muted">{side === "buy" ? t.trade.payWith : t.trade.youOwn}</span>
                <span className="text-sm font-semibold tabular-nums">{side === "buy" ? t.trade.cash(usd(cash)) : usd(holding)}</span>
              </span>
              <button type="button" onClick={() => setAmount((Math.floor((side === "buy" ? cash : holding) * 100) / 100).toFixed(2))} className="cursor-pointer rounded-full bg-surface-app px-3 py-1.5 text-xs font-semibold">{t.common.max}</button>
            </div>
            {short > 0 && (
              <div className="flex items-center gap-3 border-t border-divider py-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-surface-app"><Icon name="plus" size={14} stroke={2.4} /></span>
                <span className="flex flex-1 flex-col leading-tight">
                  <span className="text-sm font-semibold">{t.trade.depositShort(usd(short))}</span>
                  <span className="text-xs text-ink-muted">{t.trade.buysWhenLands(asset.name)}</span>
                </span>
              </div>
            )}
            {dollars > 0 && (
              <div className="flex items-center justify-between border-t border-divider py-3 text-sm">
                <span className="text-ink-muted">{t.trade.fee(`${TRADE_FEE_BPS / 100}%`)}</span>
                <span className="font-semibold tabular-nums">{exact(fee)}</span>
              </div>
            )}
          </Card>
          <Keypad value={amount} onChange={(next) => { setAmount(next); setError(null); }} />
          {error && <p className="px-1 text-sm text-loss">{t.serverError(error)}</p>}
          <button type="button" onClick={submit} disabled={busy || dollars < MIN || tooMuch} className="cursor-pointer rounded-full bg-ink py-4 text-base font-semibold text-on-ink disabled:cursor-default disabled:opacity-40">
            {busy ? t.trade.busy(side) : short > 0 ? t.trade.depositAndBuy(usd(short)) : t.trade.submit(side, dollars ? usd(dollars) : "")}
          </button>
        </>
      )}
    </Sheet>
  );
}
