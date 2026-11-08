"use client";

import { useSignTransaction } from "@privy-io/react-auth/solana";
import Link from "next/link";
import { useState } from "react";
import { Keypad } from "@/components/keypad";
import { useT } from "@/components/language";
import { Card, Icon, Money } from "@/components/phone";
import { PoweredBy } from "@/components/powered-by";
import { Sheet } from "@/components/sheet";
import { SignedIn, useMofiWallet } from "@/components/signed-in";
import { postJson } from "@/lib/api";
import { fromBase64, toBase64 } from "@/lib/base64";
import { Approx, useMoney } from "@/components/currency";
import { splitCents, usd } from "@/lib/format";
import { usePoll } from "@/lib/use-poll";
import { usePortfolio } from "@/lib/use-portfolio";

type Direction = "in" | "out";

export default function EarnPage() {
  return (
    <SignedIn>
      <Earn />
    </SignedIn>
  );
}

// Idle cash earns interest in Kamino's Steakhouse USDC vault. Moving in and out is one signature, with no network fee.
function Earn() {
  const { address } = useMofiWallet();
  const { portfolio } = usePortfolio(address);
  const apy = usePoll<{ apy: number }>("/api/earn", 300_000).data?.apy;
  const t = useT();
  const m = useMoney();
  const [moving, setMoving] = useState<Direction | null>(null);
  const earn = portfolio?.earn ?? 0;
  const cash = portfolio?.cash ?? 0;

  return (
    <>
      <div className="flex items-center gap-2">
        <Link href="/app/account" aria-label={t.common.back} className="flex size-10 items-center justify-center rounded-full bg-card"><Icon name="back" size={16} stroke={2.2} /></Link>
        <h1 className="text-lg font-semibold">{t.earn.title}</h1>
      </div>

      <div className="flex flex-col gap-0.5 px-1 pt-2">
        <span className="text-xs text-ink-muted">{t.earn.earning}</span>
        {portfolio ? <Money value={earn} className="text-[44px] leading-[1.05]" /> : <span className="text-[44px] leading-[1.05] font-semibold text-ink-faint">{m.none}</span>}
        {apy != null && <span className="text-[13px] font-medium text-gain">{t.earn.rate((apy * 100).toFixed(2))}</span>}
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => setMoving("in")} disabled={cash < 1} className="flex-1 cursor-pointer rounded-full bg-ink py-3 text-sm font-semibold text-on-ink disabled:cursor-default disabled:opacity-40">{t.earn.moveIn}</button>
        <button type="button" onClick={() => setMoving("out")} disabled={earn < 0.01} className="flex-1 cursor-pointer rounded-full bg-card py-3 text-sm font-semibold disabled:cursor-default disabled:opacity-40">{t.earn.moveOut}</button>
      </div>

      <Card className="px-3.5 py-0.5">
        <div className="flex items-center gap-3 py-3">
          <span className="flex size-[26px] items-center justify-center rounded-full bg-gain-soft text-xs font-semibold text-gain">$</span>
          <span className="flex-1 text-[15px] font-semibold">{t.earn.notEarning}</span>
          <span className="text-[15px] font-semibold tabular-nums">{m.money(cash)}</span>
        </div>
      </Card>

      <Card className="gap-1.5 p-4">
        <h2 className="text-sm font-semibold">{t.earn.how}</h2>
        <p className="text-[13px] leading-[19px] text-ink-muted">{t.earn.howText}</p>
      </Card>
      <PoweredBy by={t.earn.by} />

      {moving && address && <MoveSheet owner={address} direction={moving} available={moving === "in" ? cash : earn} onClose={() => setMoving(null)} />}
    </>
  );
}

function MoveSheet({ owner, direction, available, onClose }: { owner: string; direction: Direction; available: number; onClose: () => void }) {
  const { wallet } = useMofiWallet();
  const { signTransaction } = useSignTransaction();
  const t = useT();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const dollars = Number(amount) || 0;
  const [whole, cents] = splitCents(dollars);
  const into = direction === "in";
  const min = direction === "in" ? 1 : 0.01;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await postJson("/api/earn", { owner, direction, amount: dollars });
      const data = await res.json();
      if (!res.ok) return setError(data.error);
      const { signedTransaction } = await signTransaction({ transaction: fromBase64(data.transaction), wallet: wallet!, chain: "solana:mainnet" });
      const sent = await postJson("/api/send", { transaction: toBase64(signedTransaction) });
      const result = await sent.json();
      if (sent.ok) setDone(result.signature);
      else setError(result.error);
    } catch {
      setError(t.common.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet label={t.earn.moveTo(into)} onClose={onClose}>
      {done ? (
        <>
          <span className="mt-4 flex size-16 items-center justify-center self-center rounded-full bg-gain-soft text-gain"><Icon name="check" size={30} stroke={2.4} /></span>
          <h2 className="text-center text-2xl font-semibold tracking-[-0.03em]">{t.earn.moved(usd(dollars), into)}</h2>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-full bg-ink py-3.5 font-semibold text-on-ink">{t.common.done}</button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2.5">
            <h2 className="flex-1 text-[17px] font-semibold">{t.earn.moveTo(into)}</h2>
            <button type="button" onClick={onClose} aria-label={t.common.close} className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-card"><Icon name="plus" size={16} stroke={2.4} className="rotate-45" /></button>
          </div>
          <div className="flex flex-col items-center gap-1 py-3">
            <span className={`text-[64px] leading-none font-semibold tracking-[-0.05em] tabular-nums ${amount ? "" : "text-ink-faint"}`}>
              {whole}{amount.includes(".") && <span className="text-ink-faint">{cents}</span>}
            </span>
            <Approx dollars={dollars} className="text-sm" />
          </div>
          <Card className="px-3.5 py-0.5">
            <div className="flex items-center gap-3 py-3">
              <span className="flex flex-1 flex-col leading-tight">
                <span className="text-[11px] text-ink-muted">{t.earn.from(into)}</span>
                <span className="text-sm font-semibold tabular-nums">{usd(available)}</span>
              </span>
              <button type="button" onClick={() => setAmount((Math.floor(available * 100) / 100).toFixed(2))} className="cursor-pointer rounded-full bg-surface-app px-3 py-1.5 text-xs font-semibold">{t.common.max}</button>
            </div>
          </Card>
          <Keypad value={amount} onChange={(next) => { setAmount(next); setError(null); }} />
          {error && <p className="px-1 text-sm text-loss">{t.serverError(error)}</p>}
          <button type="button" onClick={submit} disabled={busy || dollars < min || dollars > available + 0.005} className="cursor-pointer rounded-full bg-ink py-4 text-base font-semibold text-on-ink disabled:cursor-default disabled:opacity-40">
            {busy ? t.earn.moving : t.earn.submit(dollars ? usd(dollars) : "", into)}
          </button>
          <PoweredBy by={t.earn.sheetBy} />
        </>
      )}
    </Sheet>
  );
}
