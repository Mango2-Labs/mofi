"use client";

import { usePrivy } from "@privy-io/react-auth";
import { getBase64Decoder, getBase64Encoder, getTransactionDecoder, getTransactionEncoder, partiallySignTransaction } from "@solana/kit";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/logo";
import { AssetRow, Card, Icon } from "@/components/phone";
import { useMofiWallet } from "@/components/signed-in";
import { postJson } from "@/lib/api";
import { usd } from "@/lib/format";
import { openGift } from "@/lib/gift-links";
import { usePoll } from "@/lib/use-poll";
import type { Portfolio } from "@/lib/use-portfolio";

type Gift = Awaited<ReturnType<typeof openGift>>;

// Opening a gift link: shows what's inside, then moves it to the claimer's Mofi wallet. The link's key signs here,
// in the browser, and never goes to Mofi's server.
export default function GiftPage() {
  const { ready, authenticated, login } = usePrivy();
  const { address } = useMofiWallet();
  const [gift, setGift] = useState<Gift | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);
  const { data: inside } = usePoll<Portfolio>(gift && !claimed ? `/api/portfolio?owner=${gift.address}` : null, 15_000);
  // Whether it's been claimed comes from token balances, not prices, which can be briefly missing.
  const status = usePoll<{ claimed: boolean }>(gift && !claimed ? `/api/gift/status?address=${gift.address}` : null, 15_000).data;

  useEffect(() => {
    const load = () =>
      openGift(location.hash).then(
        (g) => { setGift(g); setInvalid(false); setClaimed(false); },
        () => setInvalid(true),
      );
    load();
    addEventListener("hashchange", load);
    return () => removeEventListener("hashchange", load);
  }, []);

  async function claim() {
    if (!gift || !address) return;
    setBusy(true);
    setError(null);
    try {
      const res = await postJson("/api/gift/claim", { gift: gift.address, to: address });
      const data = await res.json();
      if (!res.ok) return setError(data.error);
      const tx = getTransactionDecoder().decode(getBase64Encoder().encode(data.transaction));
      const signed = getBase64Decoder().decode(getTransactionEncoder().encode(await partiallySignTransaction([gift.keyPair], tx)));
      const sent = await postJson("/api/send", { transaction: signed });
      if (sent.ok) setClaimed(true);
      else setError((await sent.json()).error);
    } catch (e) {
      setError(`This didn't go through${e instanceof Error && e.message ? ` (${e.message})` : ""}. Try again.`);
    } finally {
      setBusy(false);
    }
  }

  const items = inside?.holdings ?? [];
  const total = inside?.total ?? 0;
  const empty = status?.claimed;

  return (
    <div className="m-auto flex w-full flex-col gap-5">
      <div className="flex justify-center"><Wordmark width={72} /></div>
      {invalid ? (
        <Card className="items-center gap-2 px-5 py-8 text-center">
          <span className="font-semibold">This isn&apos;t a gift link</span>
          <span className="text-sm text-ink-muted">Ask your friend to send it again.</span>
        </Card>
      ) : claimed ? (
        <>
          <span className="flex size-16 items-center justify-center self-center rounded-full bg-gain-soft text-gain"><Icon name="check" size={30} stroke={2.4} /></span>
          <h1 className="text-center text-2xl font-semibold tracking-[-0.03em]">It&apos;s yours</h1>
          <Link href="/app" className="rounded-full bg-ink py-3.5 text-center font-semibold text-on-ink">See your portfolio</Link>
        </>
      ) : (
        <>
          {!empty && <span className="flex size-16 items-center justify-center self-center rounded-full bg-gain-soft text-gain"><Icon name="gift" size={30} stroke={2} /></span>}
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.03em]">{empty ? "This gift was already claimed" : "You got a gift"}</h1>
            {!empty && <p className="text-ink-muted">{inside ? `${usd(total)} to invest with Mofi` : "Opening it…"}</p>}
          </div>
          {!empty && items.length > 0 && (
            <Card className="px-3.5 py-0.5">
              {items.map((h) => <AssetRow key={h.mint} asset={{ name: h.name, ticker: h.symbol, value: h.value, change: h.change, logo: h.logo }} />)}
            </Card>
          )}
          {error && <p className="px-1 text-sm text-loss">{error}</p>}
          {!empty && inside && (
            !ready ? null : authenticated ? (
              <button type="button" onClick={claim} disabled={busy || !address} className="cursor-pointer rounded-full bg-ink py-3.5 font-semibold text-on-ink disabled:cursor-default disabled:opacity-40">
                {/* A new account's wallet takes a moment to appear after sign-in. */}
                {!address ? "Setting up your Mofi wallet…" : busy ? "Claiming…" : `Claim ${usd(total)}`}
              </button>
            ) : (
              <button type="button" onClick={login} className="cursor-pointer rounded-full bg-ink py-3.5 font-semibold text-on-ink">Sign in with email to claim</button>
            )
          )}
          {empty && <Link href="/app" className="rounded-full bg-card py-3.5 text-center font-semibold">Go to Mofi</Link>}
        </>
      )}
    </div>
  );
}
