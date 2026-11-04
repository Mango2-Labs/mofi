"use client";

import { AssetIcon, Card, Icon, type IconName } from "@/components/phone";
import { SignedIn, useMofiWallet } from "@/components/signed-in";
import { usd } from "@/lib/format";
import type { Activity as Item, Kind } from "@/lib/server/activity";
import { usePoll } from "@/lib/use-poll";

export default function ActivityPage() {
  return (
    <SignedIn>
      <Activity />
    </SignedIn>
  );
}

// Exact to a tenth of a cent when it isn't whole cents, like the Withdraw screen: $2.236.
const exact = (n: number) => (Math.round(n * 1000) % 10 === 0 ? usd(n) : `$${n.toFixed(3)}`);
const time = (t: number) => new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const day = (t: number) => {
  const d = new Date(t);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

// Money in is green, money out is dark, Earn is green, loans are neutral. Buys, sells and gifts use the asset's logo.
const BADGE: Record<Exclude<Kind, "buy" | "sell" | "receive" | "gift">, { icon: IconName; className: string; turn?: string }> = {
  deposit: { icon: "rise", className: "bg-gain-soft text-gain", turn: "rotate-180" },
  withdraw: { icon: "rise", className: "bg-ink text-on-ink" },
  earn: { icon: "rise", className: "bg-gain text-white" },
  loan: { icon: "bank", className: "bg-surface-app text-ink" },
};
const LABEL: Record<Kind, string> = { deposit: "Deposit", withdraw: "Withdrawal", buy: "Buy", sell: "Sell", receive: "Received", gift: "Gift", earn: "Earn", loan: "Loan" };

// Recent transactions, newest first and grouped by day, each linked to Solscan.
function Activity() {
  const { address } = useMofiWallet();
  const { data, error } = usePoll<Item[]>(address ? `/api/activity?owner=${address}` : null, 30_000);
  const days = (data ?? []).reduce<[string, Item[]][]>((groups, a) => {
    const label = day(a.time);
    const last = groups[groups.length - 1];
    if (last?.[0] === label) last[1].push(a);
    else groups.push([label, [a]]);
    return groups;
  }, []);

  return (
    <>
      <h1 className="text-center text-base font-semibold">Activity</h1>
      {error && <p className="px-1 text-sm text-loss">{error}</p>}
      {!data ? (
        <p className="pt-6 text-center text-sm text-ink-muted">Loading…</p>
      ) : !data.length ? (
        <p className="pt-6 text-center text-sm text-ink-muted">Nothing yet. Deposits, buys and withdrawals show up here.</p>
      ) : (
        days.map(([label, items]) => (
          <section key={label} className="flex flex-col gap-2">
            <h2 className="px-1 pt-2 text-[13px] font-semibold text-ink-muted">{label}</h2>
            <Card className="px-3.5 py-0.5">
              {items.map((a) => {
                const badge = a.kind === "buy" || a.kind === "sell" || a.kind === "receive" || a.kind === "gift" ? null : BADGE[a.kind];
                return (
                  <a key={a.signature} href={`https://solscan.io/tx/${a.signature}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 border-b border-divider py-3 last:border-0">
                    {badge ? (
                      <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${badge.className}`}><Icon name={badge.icon} size={16} stroke={2.2} className={badge.turn} /></span>
                    ) : (
                      <AssetIcon asset={{ ticker: a.symbol ?? "", logo: a.logo }} size={36} />
                    )}
                    <span className="flex flex-1 flex-col leading-tight">
                      <span className="text-[15px] font-semibold">{a.title}</span>
                      <span className="text-xs text-ink-muted">{LABEL[a.kind]} · {time(a.time)}</span>
                    </span>
                    {a.amount !== 0 && (
                      <span className={`text-[15px] font-semibold tabular-nums ${a.amount > 0 ? "text-gain" : ""}`}>
                        {a.amount > 0 ? "+" : "−"}{exact(Math.abs(a.amount))}
                      </span>
                    )}
                  </a>
                );
              })}
            </Card>
          </section>
        ))
      )}
    </>
  );
}
