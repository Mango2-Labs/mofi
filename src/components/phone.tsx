import Image from "next/image";
import type { ReactNode } from "react";
import type { Asset } from "@/lib/examples";
import { pct, splitCents, usd } from "@/lib/format";

const ICONS = {
  back: <path d="M15 5l-7 7 7 7" />,
  next: <path d="M9 5l7 7-7 7" />,
  down: <path d="M6 9l6 6 6-6" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></>,
  bell: <><path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  up: <><path d="M12 19V5" /><path d="M6 11l6-6 6 6" /></>,
  rise: <><path d="M7 17L17 7" /><path d="M9 7h8v8" /></>,
  star: <path d="M12 4l2.5 5.2 5.5.8-4 3.9.9 5.6L12 16.9 7.1 19.5l.9-5.6-4-3.9 5.5-.8z" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  mail: <><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="M4 7l8 6 8-6" /></>,
  home: <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" />,
  invest: <path d="M4 16l5-5 4 4 7-8" />,
  friends: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 19c1-3.2 3.5-5 6.5-5s5.5 1.8 6.5 5" /><circle cx="17" cy="9" r="2.8" /><path d="M16.5 14.2c2.4.3 4.2 1.9 5 4.8" /></>,
  account: <><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
  lock: <><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></>,
  bank: <><path d="M4 20h16" /><path d="M6 20V10M10 20V10M14 20V10M18 20V10" /><path d="M3 10l9-6 9 6z" /></>,
  shield: <><path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z" /><path d="M9 12l2 2 4-4" /></>,
  explore: <><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></>,
  wallet: <><path d="M3 7h18v12H3z" /><path d="M16 13h2" /><path d="M3 7l3-3h12l3 3" /></>,
  activity: <path d="M3 12h4l3-7 4 14 3-7h4" />,
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

export function Money({ value, className = "" }: { value: number; className?: string }) {
  const [whole, cents] = splitCents(value);
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

export function AssetRow({ asset, sub }: { asset: Asset; sub?: string }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-divider py-[9px] last:border-0">
      <AssetIcon asset={asset} />
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="text-[13px] font-semibold">{asset.name}</span>
        <span className="text-[11px] text-ink-muted">{sub ?? asset.ticker}</span>
      </span>
      <span className="flex flex-col items-end leading-tight tabular-nums">
        <span className="text-[13px] font-semibold">{usd(asset.value)}</span>
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

const TABS = [["Home", "home"], ["Invest", "invest"], ["Friends", "friends"], ["Account", "account"]] as const;

export function TabBar({ active }: { active: (typeof TABS)[number][0] }) {
  return (
    <div className="mt-auto grid grid-cols-4 gap-1 text-[10.5px] font-medium text-ink-muted">
      {TABS.map(([label, icon]) => (
        <span key={label} className={`flex flex-col items-center gap-0.5 rounded-full py-1.5 ${label === active ? "bg-line text-ink" : ""}`}>
          <Icon name={icon} size={18} stroke={1.9} />
          {label}
        </span>
      ))}
    </div>
  );
}

export function Spark({ path, up, height = 34 }: { path: string; up: boolean; height?: number }) {
  return (
    <svg viewBox="0 0 100 34" width="100%" height={height} preserveAspectRatio="none" aria-hidden>
      <path d={`${path} L100 34 L0 34 Z`} className={up ? "fill-gain-soft" : "fill-loss-soft"} />
      <path d={path} fill="none" strokeWidth="1.6" className={up ? "stroke-gain" : "stroke-loss"} />
    </svg>
  );
}
