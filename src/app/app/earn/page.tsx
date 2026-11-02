"use client";

import { useSignTransaction } from "@privy-io/react-auth/solana";
import Link from "next/link";
import { useState } from "react";
import { Keypad } from "@/components/keypad";
import { Card, Icon, Money } from "@/components/phone";
import { PoweredBy } from "@/components/powered-by";
import { Sheet } from "@/components/sheet";
import { SignedIn, useMofiWallet } from "@/components/signed-in";
import { postJson } from "@/lib/api";
import { fromBase64, toBase64 } from "@/lib/base64";
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
  const [moving, setMoving] = useState<Direction | null>(null);
  const earn = portfolio?.earn ?? 0;
  const cash = portfolio?.cash ?? 0;

  return (
    <>
      <div className="flex items-center gap-2">
        <Link href="/app/account" aria-label="Back" className="flex size-10 items-center justify-center rounded-full bg-card"><Icon name="back" size={16} stroke={2.2} /></Link>
        <h1 className="text-lg font-semibold">Earn</h1>
      </div>

      <div className="flex flex-col gap-0.5 px-1 pt-2">
        <span className="text-xs text-ink-muted">Earning</span>
        {portfolio ? <Money value={earn} className="text-[44px] leading-[1.05]" /> : <span className="text-[44px] leading-[1.05] font-semibold text-ink-faint">$—</span>}
        {apy != null && <span className="text-[13px] font-medium text-gain">{(apy * 100).toFixed(2)}% a year</span>}
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => setMoving("in")} disabled={cash < 1} className="flex-1 cursor-pointer rounded-full bg-ink py-3 text-sm font-semibold text-on-ink disabled:cursor-default disabled:opacity-40">Move in</button>
        <button type="button" onClick={() => setMoving("out")} disabled={earn < 0.01} className="flex-1 cursor-pointer rounded-full bg-card py-3 text-sm font-semibold disabled:cursor-default disabled:opacity-40">Move out</button>
      </div>

      <Card className="px-3.5 py-0.5">
        <div className="flex items-center gap-3 py-3">
          <span className="flex size-[26px] items-center justify-center rounded-full bg-gain-soft text-xs font-semibold text-gain">$</span>
          <span className="flex-1 text-[15px] font-semibold">Cash, not earning</span>
          <span className="text-[15px] font-semibold tabular-nums">{usd(cash)}</span>
        </div>
      </Card>

      <Card className="gap-1.5 p-4">
        <h2 className="text-sm font-semibold">How it works</h2>
        <p className="text-[13px] leading-[19px] text-ink-muted">Your cash is lent out through Kamino and earns interest every second. The rate changes with demand. Move it back to cash whenever you want.</p>
      </Card>
      <PoweredBy by="Earning on Kamino · Steakhouse USDC vault" />

      {moving && address && <MoveSheet owner={address} direction={moving} available={moving === "in" ? cash : earn} onClose={() => setMoving(null)} />}
    </>
  );
}

function MoveSheet({ owner, direction, available, onClose }: { owner: string; direction: Direction; available: number; onClose: () => void }) {
  const { wallet } = useMofiWallet();
  const { signTransaction } = useSignTransaction();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const dollars = Number(amount) || 0;
  const [whole, cents] = splitCents(dollars);
  const where = direction === "in" ? "Earn" : "cash";
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
      setError("This didn't go through, and your money didn't move. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet label={`Move to ${where}`} onClose={onClose}>
      {done ? (
        <>
          <span className="mt-4 flex size-16 items-center justify-center self-center rounded-full bg-gain-soft text-gain"><Icon name="check" size={30} stroke={2.4} /></span>
          <h2 className="text-center text-2xl font-semibold tracking-[-0.03em]">Moved {usd(dollars)} to {where}</h2>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-full bg-ink py-3.5 font-semibold text-on-ink">Done</button>
          <a href={`https://solscan.io/tx/${done}`} target="_blank" rel="noreferrer" className="self-center text-sm text-ink-muted underline">View on Solscan</a>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2.5">
            <h2 className="flex-1 text-[17px] font-semibold">Move to {where}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-card"><Icon name="plus" size={16} stroke={2.4} className="rotate-45" /></button>
          </div>
          <div className="flex flex-col items-center gap-1 py-3">
            <span className={`text-[64px] leading-none font-semibold tracking-[-0.05em] tabular-nums ${amount ? "" : "text-ink-faint"}`}>
              {whole}{amount.includes(".") && <span className="text-ink-faint">{cents}</span>}
            </span>
          </div>
          <Card className="px-3.5 py-0.5">
            <div className="flex items-center gap-3 py-3">
              <span className="flex flex-1 flex-col leading-tight">
                <span className="text-[11px] text-ink-muted">{direction === "in" ? "From cash" : "From Earn"}</span>
                <span className="text-sm font-semibold tabular-nums">{usd(available)}</span>
              </span>
              <button type="button" onClick={() => setAmount((Math.floor(available * 100) / 100).toFixed(2))} className="cursor-pointer rounded-full bg-surface-app px-3 py-1.5 text-xs font-semibold">Max</button>
            </div>
          </Card>
          <Keypad value={amount} onChange={(next) => { setAmount(next); setError(null); }} />
          {error && <p className="px-1 text-sm text-loss">{error}</p>}
          <button type="button" onClick={submit} disabled={busy || dollars < min || dollars > available + 0.005} className="cursor-pointer rounded-full bg-ink py-4 text-base font-semibold text-on-ink disabled:cursor-default disabled:opacity-40">
            {busy ? "Moving…" : `Move ${dollars ? usd(dollars) : ""} to ${where}`.replace("  ", " ")}
          </button>
          <PoweredBy by="On Kamino · No network fee" />
        </>
      )}
    </Sheet>
  );
}
