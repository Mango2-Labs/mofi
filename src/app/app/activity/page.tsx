"use client";

import { useT } from "@/components/language";
import { AssetIcon, Card, Icon, type IconName } from "@/components/phone";
import { SignedIn, useMofiWallet } from "@/components/signed-in";
import { useMoney } from "@/components/currency";
import type { Activity as Item, Kind } from "@/lib/server/activity";
import { usePoll } from "@/lib/use-poll";

export default function ActivityPage() {
  return (
    <SignedIn>
      <Activity />
    </SignedIn>
  );
}

const time = (t: number, locale: string) => new Date(t).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
const day = (t: number, words: { todayLabel: string; yesterday: string }, locale: string) => {
  const d = new Date(t);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return words.todayLabel;
  if (d.toDateString() === yesterday.toDateString()) return words.yesterday;
  return d.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" });
};

// Money in is green, money out is dark, Earn is green, loans are neutral. Buys, sells and gifts use the asset's logo.
const BADGE: Record<Exclude<Kind, "buy" | "sell" | "receive" | "gift">, { icon: IconName; className: string; turn?: string }> = {
  deposit: { icon: "rise", className: "bg-gain-soft text-gain", turn: "rotate-180" },
  withdraw: { icon: "rise", className: "bg-ink text-on-ink" },
  earn: { icon: "rise", className: "bg-gain text-white" },
  loan: { icon: "bank", className: "bg-surface-app text-ink" },
};

// Recent transactions, newest first and grouped by day, each linked to Solscan.
function Activity() {
  const { address } = useMofiWallet();
  const t = useT();
  const m = useMoney();
  const { data, error } = usePoll<Item[]>(address ? `/api/activity?owner=${address}` : null, 30_000);
  const days = (data ?? []).reduce<[string, Item[]][]>((groups, a) => {
    const label = day(a.time, t.activity, t.locale);
    const last = groups[groups.length - 1];
    if (last?.[0] === label) last[1].push(a);
    else groups.push([label, [a]]);
    return groups;
  }, []);

  return (
    <>
      <h1 className="text-center text-base font-semibold">{t.activity.title}</h1>
      {error && <p className="px-1 text-sm text-loss">{t.serverError(error)}</p>}
      {!data ? (
        <p className="pt-6 text-center text-sm text-ink-muted">{t.common.loading}</p>
      ) : !data.length ? (
        <p className="pt-6 text-center text-sm text-ink-muted">{t.activity.empty}</p>
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
                      <span className="text-[15px] font-semibold">{t.activity.action[a.action](a.name ?? "")}</span>
                      <span className="text-xs text-ink-muted">{t.activity.kind[a.kind]} · {time(a.time, t.locale)}</span>
                    </span>
                    {a.amount !== 0 && (
                      <span className={`text-[15px] font-semibold tabular-nums ${a.amount > 0 ? "text-gain" : ""}`}>
                        {a.amount > 0 ? "+" : "−"}{m.exact(Math.abs(a.amount))}
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
