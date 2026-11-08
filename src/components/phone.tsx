"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import type { Asset } from "@/lib/examples";
import { useMoney } from "@/components/currency";
import { pct, splitCents } from "@/lib/format";

const ICONS = {
  back: <path d="M15 5l-7 7 7 7" />,
  next: <path d="M9 5l7 7-7 7" />,
  down: <path d="M6 9l6 6 6-6" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  rise: <><path d="M7 17L17 7" /><path d="M9 7h8v8" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  hidden: <><path d="M3 3l18 18" /><path d="M10.6 6.1A9.6 9.6 0 0 1 12 6c5 0 8.5 4.5 9.5 6a17 17 0 0 1-3.1 3.5M6.6 6.6C4.6 8 3.2 10 2.5 12c1 1.5 4.5 6 9.5 6 1.5 0 2.9-.4 4.1-1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  account: <><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
  lock: <><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></>,
  bank: <><path d="M4 20h16" /><path d="M6 20V10M10 20V10M14 20V10M18 20V10" /><path d="M3 10l9-6 9 6z" /></>,
  shield: <><path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z" /><path d="M9 12l2 2 4-4" /></>,
  explore: <><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></>,
  wallet: <><path d="M3 7h18v12H3z" /><path d="M16 13h2" /><path d="M3 7l3-3h12l3 3" /></>,
  activity: <path d="M3 12h4l3-7 4 14 3-7h4" />,
  gift: <><path d="M3.5 8h17v4h-17z" /><path d="M5 12v8.5h14V12" /><path d="M12 8v12.5" /><path d="M12 8C10.6 5.2 7.2 5 7.2 6.9 7.2 8 9.5 8 12 8zm0 0c1.4-2.8 4.8-3 4.8-1.1C16.8 8 14.5 8 12 8z" /></>,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 16, stroke = 2, className }: { name: IconName; size?: number; stroke?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      {ICONS[name]}
    </svg>
  );
}

export function Phone({ size = "md", label, children }: { size?: "lg" | "md"; label: string; children: ReactNode }) {
  const lg = size === "lg";
  return (
    <div
      role="img"
      aria-label={label}
      className={`w-full bg-[linear-gradient(150deg,#5e5e64_0%,#1c1c1f_30%,#121214_70%,#46464b_100%)] shadow-[0_40px_80px_rgba(10,10,11,0.2)] ${lg ? "max-w-[324px] rounded-[52px] p-[9px]" : "max-w-[290px] rounded-[48px] p-2"}`}
    >
      <div className={`relative flex flex-col overflow-hidden bg-surface-app ${lg ? "h-[700px] gap-[13px] rounded-[44px] px-[15px] pt-[14px] pb-3" : "h-[580px] gap-3 rounded-[41px] px-[14px] pt-[13px] pb-[14px]"}`}>
        <div className={`shrink-0 self-center rounded-full bg-ink ${lg ? "h-[26px] w-[92px]" : "h-6 w-[84px]"}`} />
        {children}
      </div>
    </div>
  );
}

export function Header({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-full bg-card"><Icon name="back" size={15} stroke={2.2} /></span>
      <span className="text-base font-semibold">{title}</span>
    </div>
  );
}

// An amount held, in the viewer's currency; `dollars` keeps it in dollars (amounts typed in, loans).
export function Money({ value, dollars = false, className = "" }: { value: number; dollars?: boolean; className?: string }) {
  const split = useMoney().split;
  const [whole, cents] = (dollars ? splitCents : split)(value);
  return (
    <span className={`font-semibold tracking-[-0.04em] tabular-nums ${className}`}>
      {whole}<span className="text-ink-faint">{cents}</span>
    </span>
  );
}

export function Change({ value, className = "" }: { value: number; className?: string }) {
  return <span className={`tabular-nums ${value < 0 ? "text-loss" : "text-gain"} ${className}`}>{pct(value)}</span>;
}

export function AssetIcon({ asset, size = 30 }: { asset: Pick<Asset, "ticker" | "logo">; size?: number }) {
  if (asset.logo) return <Image src={asset.logo} alt="" width={size} height={size} className="shrink-0 rounded-full" />;
  return (
    <span style={{ width: size, height: size, fontSize: size * 0.3 }} className="flex shrink-0 items-center justify-center rounded-full bg-ink font-semibold text-white">
      {asset.ticker}
    </span>
  );
}

// A token logo with its chain as a small badge, like USDT with the Tron logo.
export function TokenIcon({ token, chain, size = 30 }: { token: string; chain: string; size?: number }) {
  return (
    <span className="relative shrink-0" style={{ width: size, height: size }}>
      <Image src={token} alt="" width={size} height={size} className="rounded-full" />
      <Image src={chain} alt="" width={14} height={14} className="absolute -right-1 -bottom-0.5 box-content rounded-full border-2 border-card" />
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-col rounded-[18px] bg-card ${className}`}>{children}</div>;
}

// With `price`, the value is a price per share or coin rather than an amount held.
export function AssetRow({ asset, sub, price = false }: { asset: Asset; sub?: string; price?: boolean }) {
  const m = useMoney();
  return (
    <div className="flex items-center gap-2.5 border-b border-divider py-[9px] last:border-0">
      <AssetIcon asset={asset} />
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="text-[13px] font-semibold">{asset.name}</span>
        <span className="text-[11px] text-ink-muted">{sub ?? asset.ticker}</span>
      </span>
      <span className="flex flex-col items-end leading-tight tabular-nums">
        <span className="text-[13px] font-semibold">{price ? m.price(asset.value) : m.money(asset.value)}</span>
        <Change value={asset.change} className="text-[11px]" />
      </span>
    </div>
  );
}

export function Pill({ children, dark = false, className = "" }: { children: ReactNode; dark?: boolean; className?: string }) {
  return (
    <span className={`flex items-center justify-center gap-1.5 rounded-full py-3 text-[13px] font-semibold ${dark ? "bg-ink text-on-ink" : "bg-card text-ink"} ${className}`}>
      {children}
    </span>
  );
}
