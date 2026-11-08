"use client";

import Image from "next/image";
import { useState } from "react";
import { useT } from "@/components/language";
import { Icon } from "@/components/phone";
import { CHAINS, MAIN_CHAINS, chainName } from "@/lib/chains";

// A logo, or the first letter of the name when there's no logo.
export function Logo({ src, label, size }: { src?: string; label: string; size: number }) {
  if (src) return <Image src={src} alt="" width={size} height={size} className="shrink-0 rounded-full" />;
  return (
    <span style={{ width: size, height: size, fontSize: size * 0.42 }} className="flex shrink-0 items-center justify-center rounded-full bg-line font-semibold text-ink">
      {label[0]}
    </span>
  );
}

const ChainLogo = ({ chain, size }: { chain: string; size: number }) => <Logo src={CHAINS[chain]?.logo} label={chainName(chain)} size={size} />;

// A dropdown of chains: the main ones first, the rest under "Other chains".
export function ChainSelect({ chains, value, onChange, label }: { chains: string[]; value: string; onChange: (chain: string) => void; label: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [others, setOthers] = useState(false);
  const main = MAIN_CHAINS.filter((c) => chains.includes(c));
  const rest = chains.filter((c) => !MAIN_CHAINS.includes(c)).sort((x, y) => chainName(x).localeCompare(chainName(y)));
  const close = () => { setOpen(false); setOthers(false); };

  const option = (c: string) => (
    <button key={c} type="button" role="option" aria-selected={c === value} onClick={() => { onChange(c); close(); }} className="flex w-full shrink-0 cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-surface-app">
      <ChainLogo chain={c} size={22} />
      <span className="flex-1">{chainName(c)}</span>
      {c === value && <Icon name="check" size={15} stroke={2.4} className="text-gain" />}
    </button>
  );

  return (
    <div className="relative" onKeyDown={(e) => e.key === "Escape" && close()}>
      <button type="button" aria-label={`${label}: ${chainName(value)}`} aria-haspopup="listbox" aria-expanded={open} onClick={() => (open ? close() : setOpen(true))} className="flex w-full cursor-pointer items-center gap-2.5 rounded-full bg-card py-2.5 pr-4 pl-2.5 text-left">
        <ChainLogo chain={value} size={30} />
        <span className="flex-1 text-sm font-semibold">{chainName(value)}</span>
        <Icon name="down" size={15} stroke={2.2} className="text-ink-muted" />
      </button>
      {open && (
        <>
          <button type="button" aria-label={t.common.close} tabIndex={-1} onClick={close} className="fixed inset-0 z-10 cursor-default" />
          <div role="listbox" aria-label={label} className="absolute inset-x-0 top-full z-20 mt-2 flex max-h-96 flex-col overflow-y-auto rounded-[18px] bg-card p-1.5 shadow-[0_16px_40px_rgba(10,10,11,0.14)]">
            {main.map(option)}
            {rest.length > 0 &&
              (others ? (
                <>
                  <span className="px-3 pt-3 pb-1 text-xs text-ink-muted">{t.chains.other}</span>
                  {rest.map(option)}
                </>
              ) : (
                <button type="button" onClick={() => setOthers(true)} className="flex w-full shrink-0 cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-ink-muted hover:bg-surface-app">
                  <span className="flex size-[22px] items-center justify-center rounded-full bg-surface-app"><Icon name="plus" size={13} stroke={2.4} /></span>
                  <span className="flex-1">{t.chains.other}</span>
                  <span className="text-xs font-normal">{t.chains.more(rest.length)}</span>
                </button>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
