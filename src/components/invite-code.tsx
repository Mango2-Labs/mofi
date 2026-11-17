"use client";

import { useEffect, useState } from "react";
import { UsernameField } from "@/components/field";
import { useT } from "@/components/language";
import { Icon } from "@/components/phone";
import { Sheet } from "@/components/sheet";
import { postJson } from "@/lib/api";
import { INVITED_FEE_BPS, TRADE_FEE_BPS } from "@/lib/fees";
import { INVITE_KEY, askedKey } from "@/lib/invite";
import { USERNAME, cleanUsername } from "@/lib/username";

// How much less an invited friend pays, in percent.
const OFF = Math.round((1 - INVITED_FEE_BPS / TRADE_FEE_BPS) * 100);

const remember = (wallet: string) => {
  try {
    localStorage.setItem(askedKey(wallet), "1");
  } catch {}
};

// A new account that came without an invite link is asked once for a friend's invite code (their username), since
// it lowers the fee for good. Skipping is fine. Accounts that arrived through a link, or that can no longer use a
// code, are never asked.
export function InviteCodePrompt({ wallet }: { wallet: string }) {
  const t = useT();
  const [asking, setAsking] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  // A pasted invite link counts too: the username is what follows /r/.
  const code = cleanUsername(typed.split("/r/").pop() ?? "");

  useEffect(() => {
    try {
      if (localStorage.getItem(askedKey(wallet)) || localStorage.getItem(INVITE_KEY)) return;
    } catch {
      return;
    }
    let live = true;
    fetch(`/api/referral?wallet=${wallet}&ask=1`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((data: { eligible: boolean } | null) => {
        if (!data) return;
        if (!data.eligible) remember(wallet);
        else if (live) setAsking(wallet);
      });
    return () => { live = false; };
  }, [wallet]);

  if (asking !== wallet) return null;

  const close = () => {
    remember(wallet);
    setAsking(null);
  };

  async function apply() {
    setBusy(true);
    setError(null);
    try {
      const res = await postJson("/api/referral", { wallet, by: code });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.joined) {
        remember(wallet);
        setApplied(true);
      } else setError(res.status === 400 ? t.inviteCode.unknown : res.ok ? t.inviteCode.unusable : t.inviteCode.failed);
    } catch {
      setError(t.inviteCode.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet label={t.inviteCode.title} onClose={close}>
      {applied ? (
        <>
          <span className="mt-4 flex size-16 items-center justify-center self-center rounded-full bg-gain-soft text-gain"><Icon name="check" size={30} stroke={2.4} /></span>
          <div className="flex flex-col gap-1 text-center">
            <h2 className="text-2xl font-semibold tracking-[-0.03em]">{t.inviteCode.doneTitle}</h2>
            <p className="text-ink-muted">{t.inviteCode.doneText(OFF)}</p>
          </div>
          <button type="button" onClick={close} className="cursor-pointer rounded-full bg-ink py-3.5 font-semibold text-on-ink">{t.common.done}</button>
        </>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (USERNAME.test(code) && !busy) apply();
          }}
        >
          <div className="flex flex-col gap-1 pt-3 text-center">
            <h2 className="text-2xl font-semibold tracking-[-0.03em]">{t.inviteCode.title}</h2>
            <p className="text-ink-muted">
              {t.inviteCode.before}
              <span className="font-semibold text-ink">{t.inviteCode.discount(OFF)}</span>
              {t.inviteCode.after}
            </p>
          </div>
          <UsernameField
            id="invite-code"
            label={t.inviteCode.label}
            value={typed}
            onChange={(e) => { setTyped(e.target.value); setError(null); }}
            aria-invalid={!!error}
            placeholder={t.inviteCode.placeholder}
            hint={error && <span role="alert" className="text-loss">{error}</span>}
          />
          <div className="flex gap-2">
            <button type="button" onClick={close} className="cursor-pointer rounded-full bg-card px-6 py-3.5 font-semibold">{t.inviteCode.skip}</button>
            <button type="submit" disabled={!USERNAME.test(code) || busy} className="flex-1 cursor-pointer rounded-full bg-ink py-3.5 font-semibold text-on-ink disabled:cursor-default disabled:opacity-40">
              {busy ? t.common.loading : t.inviteCode.apply}
            </button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
