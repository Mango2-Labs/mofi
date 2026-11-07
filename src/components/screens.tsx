"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useT } from "@/components/language";
import { Wordmark } from "@/components/logo";
import { AssetIcon, AssetRow, Card, Header, Icon, Money, Pill } from "@/components/phone";
import { KINDS } from "@/lib/assets";
import { TRADE_FEE_BPS, tradeFee } from "@/lib/fees";
import { cash, coins, earning, explore, portfolio, spacex, total } from "@/lib/examples";
import { exact, pct, usd } from "@/lib/format";

// Example screens for the landing page, drawn like the app's own screens.

function Group({ label, value, children }: { label: string; value?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex justify-between px-0.5 text-[13px] font-semibold">{label}{value && <span className="tabular-nums">{value}</span>}</span>
      {children}
    </div>
  );
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <div className="flex flex-col text-xs tabular-nums">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between border-b border-divider py-1.5 last:border-0">
          <span className="text-ink-muted">{label}</span>
          <span className="font-semibold">{value}</span>
        </div>
      ))}
    </div>
  );
}

function Caption({ children }: { children: ReactNode }) {
  return <span className="self-center text-[10.5px] text-ink-faint">{children}</span>;
}

function Done({ icon, className = "" }: { icon: "check" | "gift"; className?: string }) {
  return <span className={`flex size-14 shrink-0 items-center justify-center self-center rounded-full bg-gain-soft text-gain ${className}`}><Icon name={icon} size={26} stroke={2.2} /></span>;
}

function Back() {
  return <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-card"><Icon name="back" size={15} stroke={2.2} /></span>;
}

const TABS = [["explore", "explore"], ["portfolio", "wallet"], ["activity", "activity"], ["account", "account"]] as const;

// The app's floating tab bar.
function TabBar({ active }: { active: (typeof TABS)[number][0] }) {
  const t = useT();
  return (
    <div className="absolute inset-x-2.5 bottom-2.5 grid grid-cols-4 gap-0.5 rounded-full bg-card p-1 text-[10px] font-medium text-ink-muted shadow-[0_8px_24px_rgba(10,10,11,0.12)]">
      {TABS.map(([tab, icon]) => (
        <span key={tab} className={`flex flex-col items-center gap-0.5 rounded-full py-1.5 ${tab === active ? "bg-surface-app text-ink" : ""}`}>
          <Icon name={icon} size={17} stroke={1.9} />
          {t.tabs[tab]}
        </span>
      ))}
    </div>
  );
}

function Qr() {
  return (
    <svg width="112" height="112" viewBox="0 0 29 29" aria-hidden shapeRendering="crispEdges">
      <rect width="29" height="29" fill="#fff" />
      <path fill="#0a0a0b" d="M2 2h7v7H2zM20 2h7v7h-7zM2 20h7v7H2z" />
      <path fill="#fff" d="M3 3h5v5H3zM21 3h5v5h-5zM3 21h5v5H3z" />
      <path fill="#0a0a0b" d="M4 4h3v3H4zM22 4h3v3h-3zM4 22h3v3H4zM11 2h1v1h-1zM13 3h2v1h-2zM11 5h3v1h-3zM16 4h1v3h-1zM12 7h2v2h-2zM17 8h1v1h-1zM2 11h2v1H2zM6 11h3v1H6zM11 11h2v2h-2zM15 10h3v1h-3zM20 11h1v2h-1zM23 11h4v1h-4zM3 13h2v2H3zM8 14h2v1H8zM13 14h4v1h-4zM19 14h2v1h-2zM24 13h1v3h-1zM2 17h3v1H2zM7 16h1v2H7zM10 17h3v1h-3zM15 16h1v3h-1zM18 17h3v1h-3zM25 17h2v1h-2zM11 20h2v2h-2zM14 21h3v1h-3zM19 20h1v2h-1zM21 21h3v1h-3zM26 20h1v3h-1zM11 24h1v3h-1zM13 25h3v1h-3zM17 23h2v2h-2zM20 25h2v2h-2zM23 24h3v1h-3zM24 26h1v1h-1z" />
    </svg>
  );
}

export function PortfolioScreen() {
  const t = useT();
  const held = portfolio.flatMap((g) => g.items);
  const invested = held.reduce((sum, a) => sum + a.value, 0);
  const today = held.reduce((sum, a) => sum + (a.value * a.change) / (100 + a.change), 0);
  return (
    <>
      <span className="text-center text-[13px] font-semibold">{t.portfolio.title}</span>
      <div className="flex flex-col px-0.5">
        <span className="text-[11px] text-ink-muted">{t.portfolio.total}</span>
        <Money value={total} className="text-[38px] leading-[1.1]" />
        <span className="text-[11.5px] font-medium text-gain tabular-nums">
          +{usd(today)} ({pct((today / (invested - today)) * 100)}) <span className="font-normal text-ink-muted">{t.common.today}</span>
        </span>
      </div>
      {portfolio.map((g) => (
        <Group key={g.kind} label={t.kinds[g.kind]} value={usd(g.items.reduce((s, a) => s + a.value, 0))}>
          <Card className="px-3 py-0.5">{g.items.map((a) => <AssetRow key={a.ticker} asset={a} />)}</Card>
        </Group>
      ))}
      <Group label={t.portfolio.cash} value={usd(earning + cash)}>
        <Card className="px-3 py-0.5 text-[13px] font-semibold tabular-nums">
          <span className="flex items-center gap-2.5 border-b border-divider py-2.5">
            <span className="flex size-6 items-center justify-center rounded-full bg-gain-soft text-gain"><Icon name="rise" size={12} stroke={2.4} /></span>
            <span className="flex-1">{t.portfolio.earning}</span>{usd(earning)}
          </span>
          <span className="flex items-center gap-2.5 py-2.5">
            <span className="flex size-6 items-center justify-center rounded-full bg-gain-soft text-[11px] text-gain">$</span>
            <span className="flex-1">{t.portfolio.ready}</span>{usd(cash)}
          </span>
        </Card>
      </Group>
      <TabBar active="portfolio" />
    </>
  );
}

export function ExploreScreen() {
  const t = useT();
  return (
    <>
      <span className="px-0.5 text-xl font-semibold tracking-[-0.03em]">{t.explore.title}</span>
      <span className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-card px-3.5 text-xs text-ink-faint">
        <Icon name="search" size={14} className="text-ink-muted" />{t.explore.search}
      </span>
      <div className="flex shrink-0 gap-1.5 overflow-hidden text-[11.5px] font-medium">
        {[t.explore.all, ...KINDS.map((k) => t.kinds[k])].map((chip, i) => (
          <span key={chip} className={`shrink-0 rounded-full px-3 py-1.5 ${i === 0 ? "bg-ink text-on-ink" : "bg-card"}`}>{chip}</span>
        ))}
      </div>
      {explore.map((g) => (
        <Group key={g.kind} label={t.kinds[g.kind]}>
          <Card className="px-3 py-0.5">{g.items.map((a) => <AssetRow key={a.ticker} asset={a} sub={g.kind === "prestock" ? t.common.privateCompany : undefined} price />)}</Card>
        </Group>
      ))}
      <TabBar active="explore" />
    </>
  );
}

function Keys() {
  return (
    <div className="grid grid-cols-3 text-center text-[19px] font-medium">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"].map((k) => <span key={k} className="py-1.5">{k}</span>)}
      <span className="flex items-center justify-center"><Icon name="back" size={17} stroke={2} /></span>
    </div>
  );
}

// An amount sheet over SpaceX's screen, as Buy and Gift open it.
function AmountSheet({ title, amount, children }: { title: string; amount: number; children: ReactNode }) {
  const t = useT();
  const fee = tradeFee(amount);
  return (
    <>
      <div className="flex items-center gap-2 px-0.5"><AssetIcon asset={spacex} size={24} /><span className="text-sm font-semibold">SpaceX</span></div>
      <Money value={spacex.value} className="px-0.5 text-[34px] leading-[1.1]" />
      <div className="absolute inset-0 bg-ink/30" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2.5 rounded-t-[30px] bg-surface-app px-3.5 pt-2 pb-3.5">
        <span className="h-1 w-9 self-center rounded-full bg-line" />
        <div className="flex items-center gap-2">
          <AssetIcon asset={spacex} size={26} />
          <span className="flex-1 text-sm font-semibold">{title}</span>
          <span className="flex size-7 items-center justify-center rounded-full bg-card"><Icon name="plus" size={13} stroke={2.4} className="rotate-45" /></span>
        </div>
        <div className="flex flex-col items-center py-1">
          <span className="text-[44px] leading-none font-semibold tracking-[-0.05em] tabular-nums">${amount}</span>
          <span className="pt-1 text-[11.5px] text-ink-muted tabular-nums">{t.trade.about(`${((amount - fee) / spacex.value).toFixed(4)} ${t.common.shares}`)} · {t.trade.fee(`${TRADE_FEE_BPS / 100}%`)} {exact(fee)}</span>
        </div>
        {children}
        <Keys />
      </div>
    </>
  );
}

export function BuyScreen() {
  const t = useT();
  return (
    <AmountSheet title={t.trade.title("buy", "SpaceX")} amount={50}>
      <div className="flex items-center gap-2.5 rounded-[16px] bg-card px-3 py-2">
        <span className="flex size-7 items-center justify-center rounded-full bg-gain-soft text-xs font-semibold text-gain">$</span>
        <span className="flex flex-1 flex-col leading-tight">
          <span className="text-[10.5px] text-ink-muted">{t.trade.payWith}</span>
          <span className="text-[13px] font-semibold tabular-nums">{t.trade.cash(usd(cash))}</span>
        </span>
        <span className="rounded-full bg-surface-app px-3 py-1 text-[11px] font-semibold">{t.common.max}</span>
      </div>
      <Pill dark className="order-last">{t.trade.submit("buy", "$50.00")}</Pill>
    </AmountSheet>
  );
}

export function DepositCoinsScreen() {
  const t = useT();
  return (
    <>
      <Back />
      <div className="flex justify-center">
        {[...coins.map((c) => c.logo), "/logos/solana.png"].map((logo) => (
          <Image key={logo} src={logo} alt="" width={34} height={34} className="-mx-1 rounded-full bg-card ring-2 ring-surface-app" />
        ))}
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-lg font-semibold tracking-[-0.02em]">{t.deposit.title}</span>
        <span className="text-[11.5px] text-ink-muted">{t.deposit.sub}</span>
      </div>
      <Card className="px-3 py-0.5">
        {coins.map((c) => (
          <div key={c.symbol} className="flex items-center gap-2.5 border-b border-divider py-2">
            <Image src={c.logo} alt="" width={30} height={30} className="rounded-full" />
            <span className="flex flex-1 flex-col leading-tight">
              <span className="text-[13px] font-semibold">{c.name}</span>
              <span className="text-[11px] text-ink-muted">{c.symbol}</span>
            </span>
            <span className="text-[11px] text-ink-muted">{t.deposit.networks(c.networks)}</span>
            <Icon name="next" size={13} stroke={2.2} className="text-ink-faint" />
          </div>
        ))}
        <div className="flex items-center gap-2.5 py-2">
          <span className="flex size-[30px] items-center justify-center rounded-full bg-surface-app"><Icon name="plus" size={14} stroke={2.2} /></span>
          <span className="flex-1 text-[13px] font-semibold">{t.deposit.moreCoins}</span>
          <span className="text-[11px] text-ink-muted">{t.deposit.more("100+")}</span>
        </div>
      </Card>
    </>
  );
}

export function DepositAddressScreen() {
  const t = useT();
  return (
    <>
      <Back />
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-lg font-semibold tracking-[-0.02em]">{t.deposit.coinTitle("USDT")}</span>
        <span className="text-[11.5px] text-ink-muted">{t.deposit.only("USDT", "Tron")}</span>
      </div>
      <Card className="items-center gap-3 p-3.5">
        <span className="relative">
          <Qr />
          <Image src="/logos/usdt.png" alt="" width={26} height={26} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-3 ring-white" />
        </span>
        <span className="w-full border-t border-dashed border-line" />
        <div className="flex w-full items-center justify-between gap-2">
          <span className="flex min-w-0 flex-col leading-snug">
            <span className="text-[11px] text-ink-muted">{t.common.yourAddress("Tron")}</span>
            <span className="font-mono text-[13px] font-medium">TQ7hX2…k2Fp</span>
          </span>
          <span className="rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold text-on-ink">{t.common.copy}</span>
        </div>
      </Card>
      <span className="flex items-center gap-2 self-center text-xs text-ink-muted">
        <span className="size-2 rounded-full bg-green" />{t.deposit.waiting}
      </span>
      <Caption>{t.deposit.by}</Caption>
    </>
  );
}

export function WithdrawScreen() {
  const t = useT();
  return (
    <>
      <Header title={t.withdraw.title} />
      <span className="flex items-center gap-2 rounded-full bg-card py-1.5 pr-3 pl-1.5">
        <Image src="/logos/bnb.png" alt="" width={26} height={26} className="rounded-full" />
        <span className="flex-1 text-[13px] font-semibold">BNB Chain</span>
        <Icon name="down" size={14} stroke={2.2} className="text-ink-muted" />
      </span>
      <div className="flex gap-1.5 text-xs font-semibold">
        {[["USDT", "/logos/usdt.png"], ["USDC", "/logos/usdc.png"], ["BNB", "/logos/bnb.png"]].map(([symbol, logo], i) => (
          <span key={symbol} className={`flex items-center gap-1 rounded-full py-1 pr-2.5 pl-1 ${i === 0 ? "bg-ink text-on-ink" : "bg-card"}`}>
            <Image src={logo} alt="" width={18} height={18} className="rounded-full" />{symbol}
          </span>
        ))}
      </div>
      <Card className="gap-0.5 px-3.5 py-2">
        <span className="text-[10.5px] text-ink-muted">{t.withdraw.amount}</span>
        <span className="flex items-baseline justify-between">
          <span className="text-[24px] leading-tight font-semibold tracking-[-0.03em]">$100</span>
          <span className="text-[10.5px] text-ink-muted tabular-nums">{t.withdraw.cash(usd(cash))}</span>
        </span>
      </Card>
      <Card className="gap-0.5 px-3.5 py-2">
        <span className="text-[10.5px] text-ink-muted">{t.common.yourAddress("BNB Chain")}</span>
        <span className="font-mono text-xs">0x7a3f…91c2</span>
      </Card>
      <span className="flex items-center gap-3 rounded-[16px] bg-card px-3.5 py-2">
        <span className="flex flex-1 flex-col leading-tight">
          <span className="text-[13px] font-semibold">{t.withdraw.private}</span>
          <span className="text-[10.5px] text-ink-muted">{t.withdraw.privateHint}</span>
        </span>
        <span className="flex h-5 w-8 shrink-0 items-center justify-end rounded-full bg-ink p-0.5"><span className="size-4 rounded-full bg-white" /></span>
      </span>
      <Card className="px-3.5 py-0.5">
        <Rows rows={[[t.withdraw.youGet, "100.00 USDT"], [t.withdraw.fees, "+$0.47"], [t.withdraw.taken, "$100.47"]]} />
      </Card>
      <Pill dark>{t.withdraw.submit("$100.47", true)}</Pill>
    </>
  );
}

export function WithdrawDoneScreen() {
  const t = useT();
  const steps = t.withdraw.steps("BNB Chain");
  const state = ["done", "now", "next"];
  return (
    <>
      <Done icon="check" className="mt-8" />
      <span className="self-center text-[22px] font-semibold tracking-[-0.02em]">{t.withdraw.onItsWay}</span>
      <span className="max-w-[230px] self-center text-center text-[12.5px] text-ink-muted">{t.withdraw.onItsWayText("100.00 USDT", "0x7a3f…91c2", "BNB Chain")}</span>
      <Card className="px-3.5 py-1 text-[12.5px]">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center gap-2.5 border-b border-divider py-2.5 last:border-0">
            {state[i] === "done" && <span className="flex size-5 items-center justify-center rounded-full bg-gain text-white"><Icon name="check" size={12} stroke={3} /></span>}
            {state[i] === "now" && <span className="flex size-5 items-center justify-center rounded-full border-2 border-gain"><span className="size-2 rounded-full bg-gain" /></span>}
            {state[i] === "next" && <span className="size-5 rounded-full border-2 border-line" />}
            <span className={state[i] === "next" ? "text-ink-muted" : "font-semibold"}>{label}</span>
          </div>
        ))}
      </Card>
      <Pill className="mt-auto">{t.common.done}</Pill>
    </>
  );
}

export function GiftScreen() {
  const t = useT();
  return (
    <AmountSheet title={t.gift.title("SpaceX")} amount={10}>
      <span className="rounded-[16px] bg-card px-3 py-2 text-[11.5px] text-ink-muted">{t.gift.howTo}</span>
      <Pill dark className="order-last">{t.gift.submit("$10.00", "SpaceX")}</Pill>
    </AmountSheet>
  );
}

export function GiftClaimScreen() {
  const t = useT();
  return (
    <>
      <span className="mt-3 self-center"><Wordmark width={58} /></span>
      <Done icon="gift" className="mt-6" />
      <div className="flex flex-col items-center gap-0.5 text-center">
        <span className="text-[22px] font-semibold tracking-[-0.03em]">{t.claim.gotGift}</span>
        <span className="text-[12.5px] text-ink-muted">{t.claim.toInvest("$10.00")}</span>
      </div>
      <Card className="px-3 py-0.5"><AssetRow asset={{ ...spacex, value: 10 }} /></Card>
      <Pill dark className="mt-auto">{t.claim.signIn}</Pill>
    </>
  );
}

// A gift link as it shows up in a chat.
export function GiftLink() {
  const t = useT();
  return (
    <div className="flex flex-col gap-3 rounded-[22px] rounded-bl-md bg-ink p-5 text-white">
      <div className="flex items-center gap-3">
        <span className="flex size-[46px] shrink-0 items-center justify-center rounded-full bg-monogram"><Icon name="gift" size={22} stroke={1.9} /></span>
        <span className="flex flex-col leading-tight">
          <span className="text-xs text-zinc-400">{t.landing.giftFrom}</span>
          <span className="text-2xl font-semibold tracking-[-0.03em]">{t.landing.giftAmount}</span>
        </span>
      </div>
      <span className="truncate text-[13px] text-zinc-400 underline">getmofi.com/app/gift#7Hq2…</span>
    </div>
  );
}

export function EarnScreen() {
  const t = useT();
  return (
    <>
      <Header title={t.earn.title} />
      <div className="flex flex-col px-0.5">
        <span className="text-[11px] text-ink-muted">{t.earn.earning}</span>
        <Money value={earning} className="text-[38px] leading-[1.1]" />
        <span className="text-[11.5px] font-medium text-gain">{t.landing.everySecond}</span>
      </div>
      <div className="flex gap-2">
        <Pill dark className="flex-1">{t.earn.moveIn}</Pill>
        <Pill className="flex-1">{t.earn.moveOut}</Pill>
      </div>
      <span className="flex items-center gap-2.5 rounded-[16px] bg-card px-3 py-2.5 text-[13px] font-semibold tabular-nums">
        <span className="flex size-6 items-center justify-center rounded-full bg-gain-soft text-[11px] text-gain">$</span>
        <span className="flex-1">{t.earn.notEarning}</span>{usd(cash)}
      </span>
      <Card className="gap-1 px-3.5 py-3">
        <span className="text-[13px] font-semibold">{t.earn.how}</span>
        <span className="text-xs leading-snug text-ink-muted">{t.earn.howText}</span>
      </Card>
      <Caption>{t.earn.by}</Caption>
    </>
  );
}
