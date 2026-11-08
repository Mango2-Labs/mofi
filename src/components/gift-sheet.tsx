"use client";

import { useSignTransaction } from "@privy-io/react-auth/solana";
import { useState } from "react";
import { Keypad } from "@/components/keypad";
import { Approx } from "@/components/currency";
import { useT } from "@/components/language";
import { AssetIcon, Card, Icon } from "@/components/phone";
import { Sheet } from "@/components/sheet";
import { useMofiWallet } from "@/components/signed-in";
import { postJson } from "@/lib/api";
import { units, type AssetInfo } from "@/lib/assets";
import { fromBase64, toBase64 } from "@/lib/base64";
import { TRADE_FEE_BPS, tradeFee } from "@/lib/fees";
import { exact, splitCents, usd } from "@/lib/format";
import { newGift, saveGift, signWithGift } from "@/lib/gift-links";

const MIN = 1;

// Gift an asset as a link: Mofi buys it with your cash into a gift wallet, and whoever opens the link claims it.
export function GiftSheet({ asset, price, cash, onClose }: { asset: AssetInfo; price?: number; cash: number; onClose: () => void }) {
  const { address, wallet } = useMofiWallet();
  const { signTransaction } = useSignTransaction();
  const t = useT();
  const [amount, setAmount] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const dollars = Number(amount) || 0;
  const [whole, cents] = splitCents(dollars);
  const fee = tradeFee(dollars);
  const cashShown = usd(Math.floor(cash * 100) / 100);
  const message = t.gift.message(usd(dollars), asset.name);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const gift = await newGift().catch(() => {
        throw new Error(t.gift.noBrowser);
      });
      // The link is saved (and read back) before anything moves, and never deleted, so a gift can't be lost even if
      // this tab closes mid-way or the reply fails after the buy landed. An empty one is simply hidden in Account.
      if (!address || !saveGift(address, { link: gift.link, symbol: asset.symbol, name: asset.name, amount: dollars, at: Date.now() })) {
        throw new Error(t.gift.notSaved);
      }
      // First the gift wallet's account opens, with Mofi as its only closer; the gift key signs that here.
      const prep = await postJson("/api/gift/prepare", { owner: address, gift: gift.address, symbol: asset.symbol, amount: dollars.toFixed(2) });
      const prepared = await prep.json();
      if (!prep.ok) throw new Error(prepared.error);
      const opened = await postJson("/api/send", { transaction: await signWithGift(gift.keyPair, prepared.transaction) });
      if (!opened.ok) throw new Error((await opened.json()).error);
      const res = await postJson("/api/gift", { owner: address, gift: gift.address, symbol: asset.symbol, amount: dollars.toFixed(2) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const { signedTransaction } = await signTransaction({ transaction: fromBase64(data.transaction), wallet: wallet!, chain: "solana:mainnet" });
      const done = await postJson("/api/trade/execute", { signedTransaction: toBase64(signedTransaction), requestId: data.requestId });
      const result = await done.json();
      if (!done.ok) throw new Error(result.error);
      setLink(gift.link);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : t.common.failed);
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
    <Sheet label={t.gift.title(asset.name)} onClose={onClose}>
      {link ? (
        <>
          <span className="mt-4 flex size-16 items-center justify-center self-center rounded-full bg-gain-soft text-gain"><Icon name="gift" size={30} stroke={2} /></span>
          <div className="flex flex-col items-center gap-1 text-center">
            <h2 className="text-2xl font-semibold tracking-[-0.03em]">{t.gift.ready}</h2>
            <p className="text-sm text-ink-muted">{t.gift.readyText(usd(dollars), asset.name)}</p>
          </div>
          <button type="button" onClick={share} className="cursor-pointer rounded-full bg-ink py-3.5 font-semibold text-on-ink">{t.gift.share}</button>
          <button type="button" onClick={copy} className="cursor-pointer rounded-full bg-card py-3.5 font-semibold">{copied ? t.common.copied : t.common.copyLink}</button>
          <p className="px-2 text-center text-xs text-ink-muted">{t.gift.savedNote}</p>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2.5">
            <AssetIcon asset={{ ticker: asset.symbol, logo: asset.logo }} size={32} />
            <h2 className="flex-1 text-[17px] font-semibold">{t.gift.title(asset.name)}</h2>
            <button type="button" onClick={onClose} aria-label={t.common.close} className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-card"><Icon name="plus" size={16} stroke={2.4} className="rotate-45" /></button>
          </div>
          <div className="flex flex-col items-center gap-1 py-3">
            <span className={`text-[64px] leading-none font-semibold tracking-[-0.05em] tabular-nums ${amount ? "" : "text-ink-faint"}`}>
              {whole}{amount.includes(".") && <span className="text-ink-faint">{cents}</span>}
            </span>
            <Approx dollars={dollars} className="text-sm" />
            <span className="text-sm text-ink-muted tabular-nums">{price && dollars ? t.trade.about(units(asset, (dollars - fee) / price, t.common.shares)) : t.gift.fromCash(cashShown)}</span>
          </div>
          {dollars > 0 && (
            <Card className="flex items-center justify-between px-4 py-3.5 text-sm">
              <span className="text-ink-muted">{t.trade.fee(`${TRADE_FEE_BPS / 100}%`)}</span>
              <span className="font-semibold tabular-nums">{exact(fee)}</span>
            </Card>
          )}
          <Keypad value={amount} onChange={(next) => { setAmount(next); setError(null); }} />
          {dollars > cash && <p className="px-1 text-sm text-loss">{t.gift.youHave(cashShown)}</p>}
          {error && <p className="px-1 text-sm text-loss">{t.serverError(error)}</p>}
          <button type="button" onClick={send} disabled={busy || dollars < MIN || dollars > cash} className="cursor-pointer rounded-full bg-ink py-4 text-base font-semibold text-on-ink disabled:cursor-default disabled:opacity-40">
            {busy ? t.gift.making : dollars ? t.gift.submit(usd(dollars), asset.name) : t.gift.title(asset.name)}
          </button>
        </>
      )}
    </Sheet>
  );
}
