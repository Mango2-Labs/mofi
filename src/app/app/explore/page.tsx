"use client";

import Link from "next/link";
import { useState } from "react";
import { AssetRow, Card, Icon } from "@/components/phone";
import { ASSETS, KINDS, type AssetKind } from "@/lib/assets";
import { usePrices } from "@/lib/use-portfolio";

export default function ExplorePage() {
  const prices = usePrices();
  const [kind, setKind] = useState<AssetKind | "all">("all");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const groups = KINDS.filter((k) => kind === "all" || k.kind === kind)
    .map((k) => ({ ...k, items: ASSETS.filter((a) => a.kind === k.kind && (!q || `${a.name} ${a.symbol}`.toLowerCase().includes(q))) }))
    .filter((g) => g.items.length);

  return (
    <>
      <h1 className="px-1 text-[22px] font-semibold tracking-[-0.03em]">Explore</h1>
      <label className="flex h-11 items-center gap-2 rounded-full bg-card px-4 text-ink-muted">
        <Icon name="search" size={16} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search stocks, ETFs, crypto" aria-label="Search" className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint" />
      </label>
      <div className="flex gap-1.5 overflow-x-auto text-[13px] font-medium">
        {[{ kind: "all" as const, label: "All" }, ...KINDS].map((k) => (
          <button key={k.kind} type="button" onClick={() => setKind(k.kind)} aria-pressed={kind === k.kind} className={`shrink-0 cursor-pointer rounded-full px-3.5 py-2 ${kind === k.kind ? "bg-ink text-on-ink" : "bg-card"}`}>
            {k.label}
          </button>
        ))}
      </div>
      {prices && groups.map((g) => (
        <section key={g.kind} className="flex flex-col gap-2">
          <h2 className="px-1 pt-1 text-[15px] font-semibold">{g.label}</h2>
          <Card className="px-3 py-0.5">
            {g.items.map((a) => (
              <Link key={a.symbol} href={`/app/explore/${a.symbol}`} className="block border-b border-divider last:border-0">
                <AssetRow
                  asset={{ name: a.name, ticker: a.symbol, logo: a.logo, value: prices?.[a.mint]?.usdPrice ?? 0, change: prices?.[a.mint]?.priceChange24h ?? 0 }}
                  sub={a.kind === "prestock" ? "Private company" : undefined}
                />
              </Link>
            ))}
          </Card>
        </section>
      ))}
      {!groups.length && <p className="px-1 text-sm text-ink-muted">Nothing matches “{query}”.</p>}
    </>
  );
}
