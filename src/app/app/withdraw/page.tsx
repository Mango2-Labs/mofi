"use client";

import { useSignTransaction } from "@privy-io/react-auth/solana";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChainSelect, Logo } from "@/components/chain-select";
import { Field } from "@/components/field";
import { Card, Icon } from "@/components/phone";
import { PoweredBy } from "@/components/powered-by";
import { SignedIn, useMofiWallet } from "@/components/signed-in";
import { postJson } from "@/lib/api";
import { fromBase64, toBase64 } from "@/lib/base64";
import { CASH_OUT_NETWORK_FEE } from "@/lib/fees";
import { usd } from "@/lib/format";
import { SOL_USDC_ASSET, byPreference, chainName, looksLikeAddress, tokenLogo, type AuroraAsset } from "@/lib/chains";
import { usePoll } from "@/lib/use-poll";
import { usePortfolio } from "@/lib/use-portfolio";
import { useSwapStatus } from "@/lib/use-swap-status";

type Quote = { transaction: string; depositAddress: string; amountOut: string; timeEstimate: number };
// total is everything taken from cash for the amount typed to arrive, fees on top.
type Price = { total: number; amountOut: number; timeEstimate: number };
// What the withdrawal comes to, with and without Private. priv is null when there's no private route.
type Priced = { key: string; plain?: Price; priv?: Price | null; error?: string };

const short = (a: string) => (a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);
const amountOf = (n: string | number) => Number(n).toLocaleString("en-US", { maximumSignificantDigits: 6 });
// Totals are in tenths of a cent, shown in full when they aren't whole cents: $2.24, $2.235, +$0.004.
const exact = (n: number) => (Math.round(n * 1000) % 10 === 0 ? usd(n) : `$${n.toFixed(3)}`);
const minutes = (s: number) => `about ${Math.max(1, Math.round(s / 60))} min`;

export default function WithdrawPage() {
  return (
    <SignedIn>
      <Withdraw />
    </SignedIn>
  );
}

// One page: the price updates as the form is filled in, and Withdraw sends it in one tap.
function Withdraw() {
  const { address, wallet } = useMofiWallet();
  const { portfolio } = usePortfolio(address);
  const { signTransaction } = useSignTransaction();
  const assets = usePoll<AuroraAsset[]>("/api/assets", 600_000).data?.filter((a) => a.assetId !== SOL_USDC_ASSET);
  const [chain, setChain] = useState("bsc");
  const [picked, setPicked] = useState<string | null>(null);
  // Borrow sends people here with ?amount= set to what they just borrowed.
  const [amount, setAmount] = useState(useSearchParams().get("amount") ?? "");
  const [recipient, setRecipient] = useState("");
  const [confidential, setConfidential] = useState(false);
  const [priced, setPriced] = useState<Priced | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const status = useSwapStatus(sent && quote ? quote.depositAddress : null);
  const cash = portfolio?.cash;
  // Dollars and the chain's own coin only; the first is picked until the user taps another.
  const onChain = (assets ?? []).filter((a) => a.chain === chain).sort(byPreference);
  const main = onChain.filter((a) => /^USD/.test(a.symbol) || a.native);
  const tokens = (main.length ? main : onChain).slice(0, 4);
  const to = tokens.find((a) => a.assetId === picked) ?? tokens[0];
  const dollars = Number(amount);

  // Prices the withdrawal both ways once the form is filled in. Nothing is created until Withdraw.
  const assetId = to?.assetId;
  const priceKey = assetId && dollars >= 1 && (cash == null || dollars <= cash) && looksLikeAddress(recipient.trim()) ? `${assetId}|${amount}|${recipient.trim()}` : null;
  useEffect(() => {
    if (!priceKey) return;
    let live = true;
    const timer = setTimeout(async () => {
      const res = await postJson("/api/cash-out", { compare: true, assetId, amount, owner: address, recipient }).catch(() => null);
      const data = res ? await res.json().catch(() => null) : null;
      if (live) setPriced(res?.ok && data ? { key: priceKey, plain: data.plain, priv: data.private } : { key: priceKey, error: data?.error });
    }, 600);
    return () => { live = false; clearTimeout(timer); };
  }, [priceKey, assetId, amount, recipient, address]);
  const now = priced?.key === priceKey ? priced : null;
  const checking = !!priceKey && !now;
  const price = confidential ? now?.priv : now?.plain;
  const extra = now?.plain && now.priv ? now.priv.total - now.plain.total : null;
  const privateCost = checking ? "Checking…" : now?.priv === null ? "Not available" : extra === null ? null : extra <= 0 ? "No extra cost" : `+${exact(extra)}`;
  const tooMuch = (price && cash != null && price.total > cash) || (cash != null && dollars > cash);
  // Max leaves room for the fees, using the latest price when there is one. Part of the fee grows with the amount
  // (0.3% and the route's spread), so it keeps half a percent spare.
  const max = cash != null ? Math.max(0, Math.floor(((cash - (price ? price.total - dollars : CASH_OUT_NETWORK_FEE)) / 1.005) * 100) / 100) : 0;

  async function run(step: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await step();
    } catch {
      setError("This didn't go through, and your money didn't move. Try again.");
    } finally {
      setBusy(false);
    }
  }

  // A fresh quote carries a recent blockhash, so it's fetched at the tap and signed straight away.
  const withdraw = () =>
    run(async () => {
      if (!price) return;
      const res = await postJson("/api/cash-out", { assetId, amount: price.total.toFixed(3), owner: address, recipient, private: confidential });
      const data = await res.json();
      if (!res.ok) return setError(data.error);
      if (!wallet) return;
      setQuote(data);
      const { signedTransaction } = await signTransaction({ transaction: fromBase64(data.transaction), wallet, chain: "solana:mainnet" });
      const sentRes = await postJson("/api/send", { transaction: toBase64(signedTransaction) });
      if (sentRes.ok) setSent(true);
      else setError((await sentRes.json()).error);
    });

  const steps = [
    ["Sent from Mofi", true],
    [`Moving to ${chainName(chain)}`, status !== "PENDING_DEPOSIT"],
    ["In your wallet", status === "SUCCESS"],
  ] as const;
  const rows: [string, string][] = [
    ["You get about", price && to ? `${amountOf(price.amountOut)} ${to.symbol}` : "…"],
    ["Fees", price ? `+${exact(price.total - dollars)}` : "…"],
    ["Taken from your cash", price ? exact(price.total) : "…"],
    ["Arrives in", price ? minutes(price.timeEstimate) : "…"],
  ];

  return (
    <>
      <div className="flex items-center gap-2">
        <Link href="/app/account" aria-label="Back" className="flex size-10 items-center justify-center rounded-full bg-card"><Icon name="back" size={16} stroke={2.2} /></Link>
        <h1 className="text-lg font-semibold">Withdraw</h1>
      </div>

      {assets && !sent && (
        <form className="flex flex-col gap-3.5 pt-2" onSubmit={(e) => { e.preventDefault(); withdraw(); }}>
          <ChainSelect chains={[...new Set(assets.map((a) => a.chain))]} value={chain} onChange={(c) => { setChain(c); setPicked(null); }} label="Send to" />
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Token">
            {tokens.map((a) => (
              <button key={a.assetId} type="button" role="radio" aria-checked={a === to} onClick={() => setPicked(a.assetId)} className={`flex cursor-pointer items-center gap-1.5 rounded-full py-1.5 pr-3.5 pl-1.5 text-sm font-semibold ${a === to ? "bg-ink text-on-ink" : "bg-card"}`}>
                <Logo src={tokenLogo(a)} label={a.symbol} size={22} />{a.symbol}
              </button>
            ))}
          </div>
          <Field
            id="amount"
            label="Amount to send, in USD"
            hint={cash != null && (
              <span className="flex items-center justify-between">
                Cash {usd(cash)}
                <button type="button" onClick={() => setAmount(max.toFixed(2))} className="cursor-pointer rounded-full bg-surface-app px-3 py-1 font-semibold text-ink">Max</button>
              </span>
            )}
          >
            <span className="flex items-center text-[28px] font-semibold tracking-[-0.03em] tabular-nums">
              $<input id="amount" inputMode="decimal" autoComplete="off" placeholder="0" value={amount} onChange={(e) => /^\d*\.?\d{0,2}$/.test(e.target.value) && setAmount(e.target.value)} className="w-full bg-transparent outline-none placeholder:text-ink-faint" />
            </span>
          </Field>
          <Field id="recipient" label={`Your ${chainName(chain)} address`} hint="Use your own wallet or exchange deposit address.">
            <input id="recipient" autoComplete="off" spellCheck={false} placeholder="Paste your address" value={recipient} onChange={(e) => setRecipient(e.target.value)} className="w-full bg-transparent font-mono text-sm outline-none placeholder:text-ink-faint" />
          </Field>
          <button type="button" role="switch" aria-checked={confidential} onClick={() => setConfidential(!confidential)} className="flex cursor-pointer items-center gap-3 rounded-[18px] bg-card px-4 py-3 text-left">
            <span className="flex flex-1 flex-col leading-tight">
              <span className="text-sm font-semibold">Private</span>
              <span className="text-xs text-ink-muted">Nobody can link this address to your Mofi wallet</span>
            </span>
            {privateCost && <span className="text-xs font-semibold text-ink-muted tabular-nums">{privateCost}</span>}
            <span className={`flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors ${confidential ? "bg-ink" : "bg-line"}`}>
              <span className={`size-5 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${confidential ? "translate-x-4" : ""}`} />
            </span>
          </button>

          {priceKey && (now?.error ? (
            <p className="px-1 text-sm text-loss">{now.error}</p>
          ) : (
            <Card className="px-4 py-1">
              <dl className="flex flex-col text-sm tabular-nums" aria-busy={checking}>
                {rows.map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-divider py-2.5 last:border-0">
                    <dt className="text-ink-muted">{label}</dt>
                    <dd className={`font-semibold ${value === "…" ? "text-ink-faint" : ""}`}>{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          ))}
          {tooMuch && <p className="px-1 text-sm text-loss">That&apos;s more than your cash once fees are added. Tap Max for the most you can send.</p>}
          {error && <p className="px-1 text-sm text-loss">{error}</p>}

          <button type="submit" disabled={busy || !price || !wallet || tooMuch} className="cursor-pointer rounded-full bg-ink py-3.5 font-semibold text-on-ink disabled:cursor-default disabled:opacity-40">
            {busy ? "Sending…" : price ? `Withdraw ${exact(price.total)}${confidential ? " privately" : ""}` : "Withdraw"}
          </button>
          <PoweredBy by={confidential ? "Moved privately by Aurora Intents" : "Moved by Aurora Intents"} />
        </form>
      )}

      {to && quote && sent && (
        <>
          <span className="mt-8 flex size-16 items-center justify-center self-center rounded-full bg-gain-soft text-gain"><Icon name="check" size={30} stroke={2.4} /></span>
          <span className="self-center text-[22px] font-semibold tracking-[-0.02em]">{status === "SUCCESS" ? "Arrived" : status === "REFUNDED" || status === "FAILED" ? "Sent back" : "On its way"}</span>
          <span className="max-w-[260px] self-center text-center text-sm text-ink-muted" aria-live="polite">
            {status === "REFUNDED" || status === "FAILED"
              ? "This couldn't go through, so the money went back to your Mofi cash."
              : `About ${amountOf(quote.amountOut)} ${to.symbol} to ${short(recipient.trim())} on ${chainName(chain)}.`}
          </span>
          {status !== "REFUNDED" && status !== "FAILED" && (
            <Card className="px-4 py-1 text-sm">
              {steps.map(([label, done], i) => {
                const active = !done && steps[i - 1]?.[1];
                return (
                  <div key={label} className="flex items-center gap-2.5 border-b border-divider py-3 last:border-0">
                    {done ? (
                      <span className="flex size-5 items-center justify-center rounded-full bg-gain text-white"><Icon name="check" size={12} stroke={3} /></span>
                    ) : (
                      <span className={`flex size-5 items-center justify-center rounded-full border-2 ${active ? "border-gain" : "border-line"}`}>{active && <span className="size-2 animate-pulse rounded-full bg-gain motion-reduce:animate-none" />}</span>
                    )}
                    <span className={done || active ? "font-semibold" : "text-ink-muted"}>{label}</span>
                  </div>
                );
              })}
            </Card>
          )}
          <Link href="/app/account" className="mt-auto rounded-full bg-card py-3.5 text-center font-semibold">Done</Link>
        </>
      )}
    </>
  );
}
