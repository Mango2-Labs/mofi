"use client";

import Link from "next/link";
import { AssetRow, Card, Icon, Money } from "@/components/phone";
import { SignedIn, useMofiWallet } from "@/components/signed-in";
import { KINDS, assetByMint } from "@/lib/assets";
import { pct, usd } from "@/lib/format";
import { usePortfolio } from "@/lib/use-portfolio";

export default function PortfolioPage() {
  return (
    <SignedIn>
      <Portfolio />
    </SignedIn>
  );
}

// What the user holds, by category. Moving money in and out lives in Account.
function Portfolio() {
  const { address } = useMofiWallet();
  const { portfolio, error } = usePortfolio(address);

  const holdings = portfolio?.holdings ?? [];
  // Today's move in dollars, from each holding's 24-hour change.
  const today = holdings.reduce((sum, h) => sum + (h.value * h.change) / (100 + h.change), 0);
  const invested = holdings.reduce((sum, h) => sum + h.value, 0);
  const groups = KINDS.map((k) => ({ ...k, items: holdings.filter((h) => assetByMint.get(h.mint)?.kind === k.kind) })).filter((g) => g.items.length);
  const empty = portfolio && portfolio.total < 0.01;

  return (
    <>
      <h1 className="text-center text-base font-semibold">Portfolio</h1>

      <div className="flex flex-col gap-0.5 px-1 pt-2">
        <span className="text-xs text-ink-muted">Total</span>
        {portfolio ? <Money value={portfolio.total} className="text-[44px] leading-[1.05]" /> : <span className="text-[44px] leading-[1.05] font-semibold text-ink-faint">$—</span>}
        {invested > 0 && (
          <span className={`text-[13px] font-medium tabular-nums ${today < 0 ? "text-loss" : "text-gain"}`}>
            {today < 0 ? "−" : "+"}{usd(Math.abs(today))} ({pct(invested - today > 0 ? (today / (invested - today)) * 100 : 0)}) <span className="font-normal text-ink-muted">today</span>
          </span>
        )}
        {error && <span className="text-xs text-loss">{error}</span>}
      </div>

      {empty ? (
        <Card className="items-center gap-2 px-5 py-8 text-center">
          <span className="font-semibold">Nothing here yet</span>
          <span className="text-sm text-ink-muted">Deposit from any chain in Account, then buy from Explore.</span>
          <Link href="/app/deposit" className="mt-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-on-ink">Deposit</Link>
        </Card>
      ) : (
        portfolio && (
          <>
            {groups.map((g) => (
              <section key={g.kind} className="flex flex-col gap-2">
                <h2 className="flex justify-between px-1 pt-2 text-[15px] font-semibold">
                  {g.label}
                  <span className="tabular-nums">{usd(g.items.reduce((s, h) => s + h.value, 0))}</span>
                </h2>
                <Card className="px-3.5 py-0.5">
                  {g.items.map((h) => (
                    <Link key={h.mint} href={`/app/explore/${h.symbol}`} className="block border-b border-divider last:border-0">
                      <AssetRow asset={{ name: h.name, ticker: h.symbol, value: h.value, change: h.change, logo: h.logo }} />
                    </Link>
                  ))}
                </Card>
              </section>
            ))}
            <section className="flex flex-col gap-2">
              <h2 className="flex justify-between px-1 pt-2 text-[15px] font-semibold">
                Cash
                <span className="tabular-nums">{usd(portfolio.cash + portfolio.earn)}</span>
              </h2>
              <Card className="px-3.5 py-0.5">
                {portfolio.earn >= 0.01 && (
                  <Link href="/app/earn" className="flex items-center gap-3 border-b border-divider py-3">
                    <span className="flex size-[26px] items-center justify-center rounded-full bg-gain-soft text-gain"><Icon name="rise" size={14} stroke={2.2} /></span>
                    <span className="flex-1 text-[15px] font-semibold">Earning</span>
                    <span className="text-[15px] font-semibold tabular-nums">{usd(portfolio.earn)}</span>
                  </Link>
                )}
                <div className="flex items-center gap-3 py-3">
                  <span className="flex size-[26px] items-center justify-center rounded-full bg-gain-soft text-xs font-semibold text-gain">$</span>
                  <span className="flex-1 text-[15px] font-semibold">Ready to invest</span>
                  <span className="text-[15px] font-semibold tabular-nums">{usd(portfolio.cash)}</span>
                </div>
              </Card>
            </section>
          </>
        )
      )}
    </>
  );
}
