"use client";

import { useEffect, useState, type ReactNode } from "react";
import { UsernameField } from "@/components/field";
import { InviteCodePrompt } from "@/components/invite-code";
import { useT } from "@/components/language";
import { Wordmark } from "@/components/logo";
import { postJson } from "@/lib/api";
import { USERNAME, cleanUsername } from "@/lib/username";

// Usernames already looked up in this visit, by wallet. null is a wallet that goes without one: usernames aren't set
// up, or the lookup failed. A wallet that still has to pick one isn't in here.
const known = new Map<string, string | null>();

export const usernameOf = (wallet: string | undefined) => (wallet ? known.get(wallet) ?? null : null);

// Every account picks a username before using the app. If the check can't be made, nobody is held up.
export function Named({ wallet, email, children }: { wallet: string | undefined; email: string | undefined; children: ReactNode }) {
  // Which wallet has been looked up and found to need a username. Setting it also redraws once `known` has changed.
  const [needs, setNeeds] = useState<{ wallet: string; needed: boolean } | null>(null);
  useEffect(() => {
    if (!wallet || known.has(wallet)) return;
    let live = true;
    fetch(`/api/username?wallet=${wallet}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((data: { username: string | null; ready: boolean } | null) => {
        const needed = !!data?.ready && !data.username;
        if (!needed) known.set(wallet, data?.username ?? null);
        if (live) setNeeds({ wallet, needed });
      });
    return () => { live = false; };
  }, [wallet]);

  if (!wallet) return children;
  if (known.get(wallet)) return <>{children}<InviteCodePrompt wallet={wallet} /></>;
  if (known.has(wallet)) return children;
  if (needs?.wallet !== wallet) return <div className="m-auto"><Wordmark width={72} /></div>;
  return (
    <PickUsername
      wallet={wallet}
      suggestion={cleanUsername(email?.split("@")[0] ?? "")}
      onPicked={(username) => {
        known.set(wallet, username);
        setNeeds({ wallet, needed: false });
      }}
    />
  );
}

function PickUsername({ wallet, suggestion, onPicked }: { wallet: string; suggestion: string; onPicked: (username: string) => void }) {
  const t = useT();
  const [name, setName] = useState(suggestion);
  const [free, setFree] = useState<{ name: string; free: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = USERNAME.test(name);

  // Checks the name a moment after typing stops.
  useEffect(() => {
    if (!valid) return;
    let live = true;
    const timer = setTimeout(() => {
      fetch(`/api/username?name=${name}`)
        .then((r) => r.json())
        .then((data: { free?: boolean }) => live && typeof data.free === "boolean" && setFree({ name, free: data.free }), () => {});
    }, 350);
    return () => { live = false; clearTimeout(timer); };
  }, [name, valid]);

  const checked = free?.name === name ? free.free : null;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await postJson("/api/username", { wallet, username: name });
      const data = await res.json();
      if (res.ok) onPicked(data.username);
      else setError(data.error);
    } catch {
      setError(t.username.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="m-auto flex w-full flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && checked !== false && !busy) save();
      }}
    >
      <div className="flex justify-center"><Wordmark width={72} /></div>
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.03em]">{t.username.title}</h1>
        <p className="text-ink-muted">{t.username.text}</p>
      </div>
      <UsernameField
        id="username"
        label={t.username.label}
        value={name}
        onChange={(e) => { setName(cleanUsername(e.target.value)); setError(null); }}
        maxLength={20}
        aria-invalid={!!error || checked === false}
        placeholder={t.username.placeholder}
        hint={
          error ? <span role="alert" className="text-loss">{error}</span>
          : !valid ? t.username.rules
          : checked === false ? <span role="alert" className="text-loss">{t.username.taken}</span>
          : checked ? <span className="text-gain">{t.username.free}</span>
          : t.username.checking
        }
      />
      <button type="submit" disabled={!valid || checked === false || busy} className="w-full cursor-pointer rounded-full bg-ink py-3.5 font-semibold text-on-ink disabled:cursor-default disabled:opacity-40">
        {busy ? t.common.loading : t.username.save}
      </button>
    </form>
  );
}
