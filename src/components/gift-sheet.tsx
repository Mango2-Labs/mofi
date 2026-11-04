"use client";

import { useSignTransaction } from "@privy-io/react-auth/solana";
import { useState } from "react";
import { Keypad } from "@/components/keypad";
import { AssetIcon, Card, Icon } from "@/components/phone";
import { PoweredBy } from "@/components/powered-by";
import { Sheet } from "@/components/sheet";
import { useMofiWallet } from "@/components/signed-in";
import { postJson } from "@/lib/api";
import { units, type AssetInfo } from "@/lib/assets";
import { fromBase64, toBase64 } from "@/lib/base64";
import { splitCents, usd } from "@/lib/format";
import { newGift, saveGift } from "@/lib/gift-links";

const MIN = 1;

// Gift an asset as a link: Mofi buys it with your cash into a gift wallet, and whoever opens the link claims it.
export function GiftSheet({ asset, price, cash, onClose }: { asset: AssetInfo; price?: number; cash: number; onClose: () => void }) {
  const { address, wallet } = useMofiWallet();
  const { signTransaction } = useSignTransaction();
  const [amount, setAmount] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const dollars = Number(amount) || 0;
  const [whole, cents] = splitCents(dollars);
  const cashShown = usd(Math.floor(cash * 100) / 100);
  const message = `I got you ${usd(dollars)} of ${asset.name} on Mofi. Open the link to claim it:`;

  async function send() {
    setBusy(true);
    setError(null);
    // The link is saved before anything moves and is never deleted, so a gift can't be lost even if this tab closes
    // mid-way or the reply fails after the buy landed. An empty one is simply hidden in Account.
    const gift = await newGift();
    saveGift({ link: gift.link, symbol: asset.symbol, name: asset.name, amount: dollars, at: Date.now() });
    try {
      const res = await postJson("/api/gift", { owner: address, gift: gift.address, symbol: asset.symbol, amount: dollars.toFixed(2) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const { signedTransaction } = await signTransaction({ transaction: fromBase64(data.transaction), wallet: wallet!, chain: "solana:mainnet" });
      const done = await postJson("/api/trade/execute", { signedTransaction: toBase64(signedTransaction), requestId: data.requestId });
      const result = await done.json();
      if (!done.ok) throw new Error(result.error);
      setLink(gift.link);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "This didn't go through, and your money didn't move. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    if (!link) return;
    try {
      // Share sends a short note with the link; where sharing isn't available, the note and link are copied.
      if (navigator.share) await navigator.share({ text: message, url: link });
      else await navigator.clipboard?.writeText(`${message} ${link}`);
    } catch {}
  }

  // Copy is just the link, nothing else.
  async function copy() {
    if (!link) return;
    await navigator.clipboard?.writeText(link).then(() => setCopied(true), () => {});
  }

  return (
    <Sheet label={`Gift ${asset.name}`} onClose={onClose}>
      {link ? (
        <>
          <span className="mt-4 flex size-16 items-center justify-center self-center rounded-full bg-gain-soft text-gain"><Icon name="gift" size={30} stroke={2} /></span>
          <div className="flex flex-col items-center gap-1 text-center">
            <h2 className="text-2xl font-semibold tracking-[-0.03em]">Your gift is ready</h2>
            <p className="text-sm text-ink-muted">Anyone with this link can claim {usd(dollars)} of {asset.name}, so send it only to your friend.</p>
          </div>
          <button type="button" onClick={share} className="cursor-pointer rounded-full bg-ink py-3.5 font-semibold text-on-ink">Share link</button>
          <button type="button" onClick={copy} className="cursor-pointer rounded-full bg-card py-3.5 font-semibold">{copied ? "Copied" : "Copy link"}</button>
          <p className="px-2 text-center text-xs text-ink-muted">It&apos;s also saved in Account, if you need it again.</p>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2.5">
            <AssetIcon asset={{ ticker: asset.symbol, logo: asset.logo }} size={32} />
            <h2 className="flex-1 text-[17px] font-semibold">Gift {asset.name}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-card"><Icon name="plus" size={16} stroke={2.4} className="rotate-45" /></button>
          </div>
          <div className="flex flex-col items-center gap-1 py-3">
            <span className={`text-[64px] leading-none font-semibold tracking-[-0.05em] tabular-nums ${amount ? "" : "text-ink-faint"}`}>
              {whole}{amount.includes(".") && <span className="text-ink-faint">{cents}</span>}
            </span>
            <span className="text-sm text-ink-muted tabular-nums">{price && dollars ? `About ${units(asset, dollars / price)}` : `From your cash · ${cashShown}`}</span>
          </div>
          <Card className="px-4 py-3 text-sm text-ink-muted">You get a link to send. Your friend opens it, signs in with email, and it&apos;s theirs.</Card>
          <Keypad value={amount} onChange={(next) => { setAmount(next); setError(null); }} />
          {dollars > cash && <p className="px-1 text-sm text-loss">You have {cashShown} in cash.</p>}
          {error && <p className="px-1 text-sm text-loss">{error}</p>}
          <button type="button" onClick={send} disabled={busy || dollars < MIN || dollars > cash} className="cursor-pointer rounded-full bg-ink py-4 text-base font-semibold text-on-ink disabled:cursor-default disabled:opacity-40">
            {busy ? "Making your gift…" : dollars ? `Gift ${usd(dollars)} of ${asset.name}` : `Gift ${asset.name}`}
          </button>
          <PoweredBy by="Bought on Jupiter · No network fee" />
        </>
      )}
    </Sheet>
  );
}
