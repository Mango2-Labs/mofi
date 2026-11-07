"use client";

import { useState, type ReactNode } from "react";
import { Logo } from "@/components/chain-select";
import { useT } from "@/components/language";
import { Card, Icon } from "@/components/phone";
import { PoweredBy } from "@/components/powered-by";
import { QrCode } from "@/components/qr-code";
import { useMofiWallet } from "@/components/signed-in";
import { postJson } from "@/lib/api";
import { ASSETS } from "@/lib/assets";
import { CHAINS, DEPOSIT_CHAINS, EVM_CHAINS, MAIN_CHAINS, SOL_USDC_ASSET, chainName, tokenLogo, type AuroraAsset } from "@/lib/chains";
import { usd } from "@/lib/format";
import { usePoll } from "@/lib/use-poll";
import { usePrices } from "@/lib/use-portfolio";

export type Picked = { chain: string; coin: string; address: string; memo?: string };

const COIN_NAMES: Record<string, string> = { USDT: "Tether", USDC: "USD Coin", USDG: "Global Dollar", BTC: "Bitcoin", ETH: "Ether", SOL: "Solana", BNB: "BNB" };
const TOP = ["USDT", "USDC", "USDG", "BTC", "ETH"];
const SOLANA_ONLY: AuroraAsset[] = [{ assetId: SOL_USDC_ASSET, chain: "sol", symbol: "USDC", decimals: 6, native: false }];
// USDT0 is Tether's own USDT on Arbitrum and a few other chains, so it lists as USDT.
const coinOf = (symbol: string) => (symbol === "USDT0" ? "USDT" : symbol);
const topRank = (c: string) => (TOP.includes(c) ? TOP.indexOf(c) : 99);
const chainRank = (c: string) => (MAIN_CHAINS.includes(c) ? MAIN_CHAINS.indexOf(c) : 99);

function Heading({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <h2 className="text-2xl font-semibold tracking-[-0.03em]">{title}</h2>
      <p className="text-sm text-ink-muted">{sub}</p>
    </div>
  );
}

// Deposit from any chain: pick a coin, then its network, then send to the user's permanent address there.
// With `need` (USD) it says how much to send. `onPicked` runs once an address is on screen, `onUnpick` when the user goes back.
export function DepositFlow({ need, onBack, onPicked, onUnpick, children }: { need?: number; onBack?: () => void; onPicked?: (p: Picked) => void; onUnpick?: () => void; children?: ReactNode }) {
  const { address } = useMofiWallet();
  const prices = usePrices();
  const t = useT();
  const { data: list0, error: listError } = usePoll<AuroraAsset[]>("/api/assets", 600_000);
  // While Aurora is down, USDC on Solana still works: it goes straight to the user's own address.
  const aurora = !(listError && !list0);
  const assets = (list0 ?? (aurora ? undefined : SOLANA_ONLY))?.filter((a) => DEPOSIT_CHAINS.has(a.chain) && (a.chain !== "sol" || a.assetId === SOL_USDC_ASSET));
  const [coin, setCoin] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const coins = new Map<string, AuroraAsset[]>();
  for (const a of assets ?? []) coins.set(coinOf(a.symbol), [...(coins.get(coinOf(a.symbol)) ?? []), a]);
  const list = [...coins.keys()].sort((x, y) => topRank(x) - topRank(y) || x.localeCompare(y));
  const shown = more ? list : list.filter((c) => TOP.includes(c));
  const networksOf = (c: string) => [...new Set(coins.get(c)!.map((a) => a.chain))].sort((x, y) => chainRank(x) - chainRank(y) || chainName(x).localeCompare(chainName(y)));
  const logoOf = (c: string) => {
    const a = coins.get(c)?.[0];
    return a && tokenLogo(a);
  };

  const send = need ?? 0;
  const priceOf = (c: string) => prices?.[ASSETS.find((x) => x.kind === "crypto" && x.symbol === c)?.mint ?? ""]?.usdPrice;
  const amountText = (c: string) =>
    /^USD/.test(c) ? `${send.toFixed(2)} ${c}` : priceOf(c) ? `${(send / priceOf(c)!).toLocaleString("en-US", { maximumSignificantDigits: 4 })} ${c}` : t.deposit.amountOf(usd(send), c);

  async function pick(chain: string) {
    setError(null);
    const choose = (p: Omit<Picked, "chain" | "coin">) => {
      const next = { chain, coin: coin!, ...p };
      setPicked(next);
      onPicked?.(next);
    };
    if (chain === "sol") return choose({ address: address! });
    setBusy(chain);
    try {
      const res = await postJson("/api/deposit", { chain, recipient: address });
      const data = await res.json();
      if (res.ok) choose({ address: data.depositAddress, memo: data.memo });
      else setError(data.error);
    } catch {
      setError(t.common.unreachable);
    } finally {
      setBusy(null);
    }
  }

  const back = picked ? () => { setPicked(null); onUnpick?.(); } : coin ? () => setCoin(null) : onBack;

  return (
    <>
      {back && (
        <button type="button" onClick={back} aria-label={t.common.back} className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-card">
          <Icon name="back" size={16} stroke={2.2} />
        </button>
      )}

      {!coin && (
        <>
          <div className="flex justify-center pt-1">
            {[["USDT", "usdt"], ["USDC", "usdc"], ["BTC", "bitcoin"], ["ETH", "ethereum"], ["SOL", "solana"]].map(([c, file], i) => (
              <span key={c} className={`rounded-full border-[3px] border-surface-app ${i ? "-ml-3.5" : ""}`}>
                <Logo src={`/logos/${file}.png`} label={c} size={i === 2 ? 64 : i % 2 ? 54 : 44} />
              </span>
            ))}
          </div>
          <Heading title={need ? t.deposit.titleAmount(usd(send)) : t.deposit.title} sub={t.deposit.sub} />
          {!aurora && <p className="rounded-[18px] bg-card px-4 py-3 text-sm text-ink-muted">{t.deposit.auroraDown}</p>}
          <Card className="px-3 py-0.5">
            {shown.map((c) => (
              <button key={c} type="button" onClick={() => setCoin(c)} className="flex cursor-pointer items-center gap-3 border-b border-divider py-3 text-left last:border-0">
                <Logo src={logoOf(c)} label={c} size={36} />
                <span className="flex flex-1 flex-col leading-tight">
                  <span className="text-[15px] font-semibold">{COIN_NAMES[c] ?? c}</span>
                  <span className="text-xs text-ink-muted">{c}</span>
                </span>
                <span className="text-[13px] text-ink-muted">{t.deposit.networks(networksOf(c).length)}</span>
                <Icon name="next" size={14} stroke={2.2} className="text-ink-faint" />
              </button>
            ))}
            {!more && list.length > shown.length && (
              <button type="button" onClick={() => setMore(true)} className="flex cursor-pointer items-center gap-3 py-3 text-left">
                <span className="flex size-9 items-center justify-center rounded-full bg-surface-app"><Icon name="plus" size={15} stroke={2.4} /></span>
                <span className="flex-1 text-[15px] font-semibold">{t.deposit.moreCoins}</span>
                <span className="text-[13px] text-ink-muted">{t.deposit.more(list.length - shown.length)}</span>
              </button>
            )}
          </Card>
        </>
      )}

      {coin && !picked && (
        <>
          <span className="self-center"><Logo src={logoOf(coin)} label={coin} size={72} /></span>
          <Heading title={t.deposit.chooseNetwork} sub={t.deposit.chooseSub(coin)} />
          <Card className="px-3 py-0.5">
            {networksOf(coin).map((c) => (
              <button key={c} type="button" onClick={() => pick(c)} disabled={!!busy} className="flex cursor-pointer items-center gap-3 border-b border-divider py-3 text-left last:border-0 disabled:cursor-default">
                <Logo src={CHAINS[c]?.logo} label={chainName(c)} size={36} />
                <span className="flex-1 text-[15px] font-semibold">{chainName(c)}</span>
                {busy === c ? <span className="text-[13px] text-ink-muted">{t.deposit.oneMoment}</span> : <Icon name="next" size={14} stroke={2.2} className="text-ink-faint" />}
              </button>
            ))}
          </Card>
          {error && <p className="px-1 text-sm text-loss">{t.serverError(error)}</p>}
        </>
      )}

      {coin && picked && (
        <>
          <Heading title={need ? t.deposit.sendAmount(amountText(coin)) : t.deposit.coinTitle(coin)} sub={t.deposit.only(coin, chainName(picked.chain))} />
          <Card className="items-center gap-4 p-5">
            <div className="relative">
              <QrCode value={picked.address} label={t.common.qr} size={196} />
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-white">
                <Logo src={logoOf(coin)} label={coin} size={36} />
              </span>
            </div>
            <div className="flex w-full items-center gap-3 border-t border-dashed border-line pt-3">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-xs text-ink-muted">{t.common.yourAddress(chainName(picked.chain))}</span>
                <span className="font-mono text-[13px] font-medium break-all">{picked.address}</span>
              </span>
              <button type="button" onClick={() => navigator.clipboard?.writeText(picked.address).then(() => setCopied(true), () => {})} className="h-10 shrink-0 cursor-pointer rounded-full bg-ink px-4 text-sm font-semibold text-on-ink">
                {copied ? t.common.copied : t.common.copy}
              </button>
            </div>
            {picked.memo && <span className="w-full text-sm">{t.deposit.memo} <span className="font-mono">{picked.memo}</span></span>}
          </Card>
          {EVM_CHAINS.includes(picked.chain) && <p className="px-2 text-center text-xs text-ink-muted">{t.deposit.evm}</p>}
          {children}
          {picked.chain !== "sol" && <PoweredBy by={t.deposit.by} />}
        </>
      )}
    </>
  );
}
