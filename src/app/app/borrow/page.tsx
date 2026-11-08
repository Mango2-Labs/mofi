"use client";

import { useSignTransaction } from "@privy-io/react-auth/solana";
import Link from "next/link";
import { useState } from "react";
import { Field } from "@/components/field";
import { useT } from "@/components/language";
import { AssetIcon, Card, Icon, Money } from "@/components/phone";
import { PoweredBy } from "@/components/powered-by";
import { SignedIn, useMofiWallet } from "@/components/signed-in";
import { postJson } from "@/lib/api";
import { ASSETS } from "@/lib/assets";
import { fromBase64, toBase64 } from "@/lib/base64";
import { Approx } from "@/components/currency";
import { usd } from "@/lib/format";
import type { BorrowOption, Loan } from "@/lib/server/kamino";
import { usePoll } from "@/lib/use-poll";

type Overview = { loans: Loan[]; options: BorrowOption[] };
type Quote = { transaction: string; setupFee: number; receive: number; rate: number; locked: number; health: string; at: number };

// Stamps a quote with when it arrived, so a stale one is fetched again before signing.
const stamped = (q: Omit<Quote, "at">): Quote => ({ ...q, at: Date.now() });
const HEALTH_COLOR: Record<string, string> = { Safe: "text-gain", Watch: "text-ink", "At risk": "text-loss" };
const iconOf = (symbol: string) => {
  const a = ASSETS.find((x) => x.symbol === symbol);
  return { ticker: symbol, logo: a?.logo };
};

export default function BorrowPage() {
  return (
    <SignedIn>
      <Borrow />
    </SignedIn>
  );
}

function Borrow() {
  const { address, wallet } = useMofiWallet();
  const { signTransaction } = useSignTransaction();
  const t = useT();
  const yearly = (rate: number) => t.borrow.yearly((rate * 100).toFixed(1));
  const { data: overview, error: loadError } = usePoll<Overview>(address ? `/api/borrow?owner=${address}` : null, 30_000);
  const [option, setOption] = useState<BorrowOption | null>(null);
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [done, setDone] = useState<{ kind: "borrow" | "repay"; amount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const dollars = Number(amount);

  async function post(path: string, body: object) {
    const res = await postJson(path, body);
    const data = await res.json();
    if (!res.ok) { setError(data.error); return null; }
    return data;
  }

  async function signAndSend(transaction: string) {
    const { signedTransaction } = await signTransaction({ transaction: fromBase64(transaction), wallet: wallet!, chain: "solana:mainnet" });
    return post("/api/send", { transaction: toBase64(signedTransaction) });
  }

  async function run(label: string, step: () => Promise<void>) {
    setBusy(label);
    setError(null);
    try {
      await step();
    } catch {
      setError(t.borrow.failed);
    } finally {
      setBusy(null);
    }
  }

  const getQuote = async () => {
    const data = await post("/api/borrow", { owner: address, symbol: option!.symbol, amount });
    const fresh = data && stamped(data);
    setQuote(fresh);
    return fresh as Quote | null;
  };

  // The transaction carries a recent blockhash, so a quote older than 45 seconds is fetched again before signing.
  const confirm = () =>
    run(t.borrow.borrowing, async () => {
      const q = quote && Date.now() - quote.at < 45_000 ? quote : await getQuote();
      if (q && (await signAndSend(q.transaction))) setDone({ kind: "borrow", amount: q.receive });
    });

  const repay = (loan: Loan) =>
    run(t.borrow.repaying, async () => {
      const data = await post("/api/borrow/repay", { owner: address, market: loan.market });
      if (data && (await signAndSend(data.transaction))) setDone({ kind: "repay", amount: data.debt });
    });

  const reset = () => { setOption(null); setQuote(null); setAmount(""); setError(null); };
  const back = done ? undefined : quote ? () => setQuote(null) : option ? reset : undefined;

  return (
    <>
      <div className="flex items-center gap-2">
        {back ? (
          <button type="button" onClick={back} aria-label={t.common.back} className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-card"><Icon name="back" size={16} stroke={2.2} /></button>
        ) : (
          <Link href="/app/account" aria-label={t.common.back} className="flex size-10 items-center justify-center rounded-full bg-card"><Icon name="back" size={16} stroke={2.2} /></Link>
        )}
        <h1 className="text-lg font-semibold">{t.borrow.title}</h1>
      </div>

      {done && (
        <>
          <span className="mt-8 flex size-16 items-center justify-center self-center rounded-full bg-gain-soft text-gain"><Icon name="check" size={30} stroke={2.4} /></span>
          <span className="self-center text-[22px] font-semibold tracking-[-0.02em]">{done.kind === "borrow" ? t.borrow.borrowed : t.borrow.repaid}</span>
          <span className="max-w-[260px] self-center text-center text-sm text-ink-muted">
            {done.kind === "borrow" ? t.borrow.borrowedText(usd(done.amount)) : t.borrow.repaidText(usd(done.amount))}
          </span>
          <div className="mt-auto flex flex-col gap-2">
            {done.kind === "borrow" && <Link href={`/app/withdraw?amount=${Math.floor(done.amount * 100) / 100}`} className="rounded-full bg-ink py-3.5 text-center font-semibold text-on-ink">{t.borrow.sendElsewhere}</Link>}
            <Link href="/app/account" className="rounded-full bg-card py-3.5 text-center font-semibold">{t.borrow.backToAccount}</Link>
          </div>
        </>
      )}

      {!done && !option && (
        <>
          {!overview && !loadError && <p className="px-1 pt-4 text-sm text-ink-muted">{t.borrow.loading}</p>}
          {loadError && <p className="px-1 text-sm text-loss">{t.serverError(loadError)}</p>}

          {overview?.loans.map((loan) => (
            <Card key={loan.market} className="gap-3 p-4">
              <div className="flex items-start justify-between">
                <span className="flex flex-col">
                  <span className="text-xs text-ink-muted">{t.borrow.youOwe}</span>
                  <Money value={loan.debt} dollars className="text-[28px] leading-[1.15]" />
                </span>
                <span className={`rounded-full bg-surface-app px-3 py-1 text-xs font-semibold ${HEALTH_COLOR[loan.health]}`}>{t.borrow.health[loan.health] ?? loan.health}</span>
              </div>
              <dl className="flex flex-col text-sm tabular-nums">
                {[...loan.collateral.map((c) => [t.borrow.locked(c.name), usd(c.value)]), [t.borrow.interest, yearly(loan.rate)]].map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-divider py-2 last:border-0">
                    <dt className="text-ink-muted">{label}</dt>
                    <dd className="font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
              {loan.debt > 0.005 && (
                <button type="button" onClick={() => repay(loan)} disabled={!!busy} className="cursor-pointer rounded-full bg-ink py-3 font-semibold text-on-ink disabled:opacity-40">
                  {busy === t.borrow.repaying ? busy : t.borrow.repay(usd(loan.debt))}
                </button>
              )}
            </Card>
          ))}

          {overview && (
            <>
              <span className="px-0.5 pt-2 text-[13px] font-semibold">{t.borrow.against}</span>
              {overview.options.length ? (
                <Card className="px-3 py-0.5">
                  {overview.options.map((o) => (
                    <button key={o.symbol} type="button" onClick={() => setOption(o)} disabled={o.needed > 0} className="flex cursor-pointer items-center gap-2.5 border-b border-divider py-3 text-left last:border-0 disabled:cursor-default disabled:opacity-50">
                      <AssetIcon asset={iconOf(o.symbol)} size={32} />
                      <span className="flex flex-1 flex-col leading-tight">
                        <span className="text-sm font-semibold">{o.name}</span>
                        <span className="text-xs text-ink-muted">
                          {o.needed > 0 ? t.borrow.startsAt(usd(o.held), usd(o.needed), o.name) : t.borrow.upToAt(usd(o.max), yearly(o.rate))}
                        </span>
                      </span>
                      <Icon name="next" size={15} stroke={2.2} className="text-ink-faint" />
                    </button>
                  ))}
                </Card>
              ) : (
                <Card className="p-4 text-sm text-ink-muted">{t.borrow.nothing}</Card>
              )}
              <p className="px-1 text-xs text-ink-muted">
                {t.borrow.worksWith}
              </p>
              <Link href="/app/explore" className="self-start px-1 text-sm font-semibold underline">{t.borrow.buyStocks}</Link>
              {error && <p className="px-1 text-sm text-loss">{t.serverError(error)}</p>}
            </>
          )}
        </>
      )}

      {!done && option && !quote && (
        <form className="flex flex-col gap-3.5 pt-2" onSubmit={(e) => { e.preventDefault(); run(t.borrow.checking, async () => { await getQuote(); }); }}>
          <div className="flex items-center gap-2.5 rounded-full bg-card py-2.5 pr-4 pl-2.5">
            <AssetIcon asset={iconOf(option.symbol)} size={30} />
            <span className="flex-1 text-sm font-semibold">{t.borrow.againstYour(option.name)}</span>
          </div>
          <Field
            id="amount"
            label={t.borrow.inUsd}
            hint={
              <span className="flex items-center justify-between">
                {t.borrow.upTo(usd(option.max))}
                <button type="button" onClick={() => setAmount(option.max.toFixed(2))} className="cursor-pointer rounded-full bg-surface-app px-3 py-1 font-semibold text-ink">{t.common.max}</button>
              </span>
            }
          >
            <span className="flex items-center text-[28px] font-semibold tracking-[-0.03em] tabular-nums">
              $<input id="amount" inputMode="decimal" autoComplete="off" placeholder="0" value={amount} onChange={(e) => /^\d*\.?\d{0,2}$/.test(e.target.value) && setAmount(e.target.value)} className="w-full bg-transparent outline-none placeholder:text-ink-faint" />
            </span>
          </Field>
          {error && <p className="px-1 text-sm text-loss">{t.serverError(error)}</p>}
          <button type="submit" disabled={!!busy || !(dollars >= 1) || dollars > option.max} className="cursor-pointer rounded-full bg-ink py-3.5 font-semibold text-on-ink disabled:cursor-default disabled:opacity-40">
            {busy ?? t.borrow.review}
          </button>
        </form>
      )}

      {!done && option && quote && (
        <>
          <Card className="gap-1 p-4">
            <span className="text-xs text-ink-muted">{t.borrow.youBorrow}</span>
            <Money value={dollars} dollars className="text-[32px] leading-[1.1]" />
            <Approx dollars={dollars} className="text-sm" />
            <dl className="mt-2 flex flex-col text-sm tabular-nums">
              {[
                [t.borrow.youLock, `${option.name} · ${usd(quote.locked)}`],
                [t.borrow.interest, yearly(quote.rate)],
                [t.borrow.healthLabel, t.borrow.health[quote.health] ?? quote.health],
                ...(quote.setupFee > 0 ? [[t.borrow.setup, usd(quote.setupFee)]] : []),
                [t.borrow.youGet, usd(quote.receive)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-divider py-2 last:border-0">
                  <dt className="text-ink-muted">{label}</dt>
                  <dd className={`font-semibold ${label === t.borrow.healthLabel ? HEALTH_COLOR[quote.health] : ""}`}>{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <p className="px-1 text-xs text-ink-muted">{t.borrow.staysYours(option.name)}</p>
          <PoweredBy by={t.borrow.by} />
          {error && <p className="px-1 text-sm text-loss">{t.serverError(error)}</p>}
          <button type="button" onClick={confirm} disabled={!!busy} className="mt-auto cursor-pointer rounded-full bg-ink py-3.5 font-semibold text-on-ink disabled:cursor-default disabled:opacity-40">
            {busy ?? t.borrow.submit(usd(dollars))}
          </button>
        </>
      )}
    </>
  );
}
