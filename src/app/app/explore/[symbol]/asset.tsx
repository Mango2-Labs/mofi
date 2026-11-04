"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { AssetIcon, Card, Change, Icon, Money } from "@/components/phone";
import { SignedIn, useMofiWallet } from "@/components/signed-in";
import { GiftSheet } from "@/components/gift-sheet";
import { TradeSheet } from "@/components/trade-sheet";
import { KINDS, units, type AssetInfo } from "@/lib/assets";
import { usd } from "@/lib/format";
import { usePortfolio, usePrices } from "@/lib/use-portfolio";

// The assets Kamino lends against (see lib/server/kamino.ts).
const BORROWABLE = new Set(["SPY", "QQQ", "NVDA", "AAPL", "GOOGL", "META", "TSLA", "SPCX", "BTC"]);

export function AssetView({ asset }: { asset: AssetInfo }) {
  return (
    <SignedIn>
      <Asset asset={asset} />
    </SignedIn>
  );
}

function Asset({ asset }: { asset: AssetInfo }) {
  const { address } = useMofiWallet();
  const { portfolio } = usePortfolio(address);
  const price = usePrices()?.[asset.mint];
  const [side, setSide] = useState<"buy" | "sell" | null>(null);
  // Arriving from Account's "Send a gift" (?gift=1) opens the Gift sheet straight away.
  const [gifting, setGifting] = useState(useSearchParams().get("gift") === "1");
  const holding = portfolio?.holdings.find((h) => h.mint === asset.mint);

  return (
    <>
      <div className="flex items-center justify-between">
        <Link href="/app/explore" aria-label="Back" className="flex size-10 items-center justify-center rounded-full bg-card"><Icon name="back" size={16} stroke={2.2} /></Link>
      </div>

      <div className="flex flex-col gap-1 px-1">
        <span className="flex items-center gap-2">
          <AssetIcon asset={{ ticker: asset.symbol, logo: asset.logo }} size={26} />
          <h1 className="text-[15px] font-semibold">{asset.name}</h1>
          <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-medium text-ink-muted">{KINDS.find((k) => k.kind === asset.kind)?.label.replace(/s$/, "")}</span>
        </span>
        {price ? <Money value={price.usdPrice} className="text-[40px] leading-[1.1]" /> : <span className="text-[40px] leading-[1.1] font-semibold text-ink-faint">$—</span>}
        {price && <span className="text-[13px]"><Change value={price.priceChange24h ?? 0} className="font-medium" /> <span className="text-ink-muted">today</span></span>}
      </div>

      {holding && (
        <Card className="gap-1 p-4">
          <span className="text-xs text-ink-muted">You own</span>
          <span className="text-xl font-semibold tabular-nums">{usd(holding.value)}</span>
          <span className="text-sm text-ink-muted tabular-nums">{units(asset, holding.amount)}</span>
        </Card>
      )}

      <Card className="gap-1.5 p-4">
        <h2 className="text-sm font-semibold">About</h2>
        <p className="text-[13px] leading-[19px] text-ink-muted">{asset.about}</p>
      </Card>

      {holding && BORROWABLE.has(asset.symbol) && (
        <Link href="/app/borrow" className="flex items-center gap-3 rounded-[18px] bg-card px-4 py-3">
          <Icon name="bank" size={16} />
          <span className="flex-1 text-sm font-semibold">Borrow cash against it</span>
          <Icon name="next" size={14} stroke={2.2} className="text-ink-faint" />
        </Link>
      )}

      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-[440px] gap-2 bg-surface-app px-4 pt-3 pb-6">
        <button type="button" onClick={() => setSide("buy")} className="flex-1 cursor-pointer rounded-full bg-ink py-3.5 text-base font-semibold text-on-ink">Buy</button>
        {holding && <button type="button" onClick={() => setSide("sell")} className="w-24 cursor-pointer rounded-full bg-card py-3.5 text-base font-semibold">Sell</button>}
        <button type="button" onClick={() => setGifting(true)} className="flex w-24 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-card py-3.5 text-base font-semibold"><Icon name="gift" size={17} stroke={2} />Gift</button>
      </div>

      {side && <TradeSheet asset={asset} side={side} price={price?.usdPrice} portfolio={portfolio} onClose={() => setSide(null)} />}
      {gifting && <GiftSheet asset={asset} price={price?.usdPrice} cash={portfolio?.cash ?? 0} onClose={() => setGifting(false)} />}
    </>
  );
}
