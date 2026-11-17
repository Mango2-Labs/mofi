"use client";

import { useEffect } from "react";
import { useMofiWallet } from "@/components/signed-in";
import { postJson } from "@/lib/api";
import { INVITE_KEY as KEY } from "@/lib/invite";
import { USERNAME, cleanUsername } from "@/lib/username";

// `username` is the inviter's.
export const inviteLink = (username: string) => `${location.origin}/r/${username}`;

// Remembers the friend behind an invite link, /r/username, on this device until the visitor signs up. The link
// opens the app with ?ref=username (see next.config.ts), which is taken off the address once it's been read.
export function InviteCapture() {
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const typed = params.get("ref");
    if (typed === null) return;
    // However the link was typed (capitals, say), it's read the way a username is written.
    const by = cleanUsername(typed);
    try {
      if (USERNAME.test(by)) localStorage.setItem(KEY, by);
    } catch {}
    params.delete("ref");
    history.replaceState(null, "", `${location.pathname}${params.size ? `?${params}` : ""}${location.hash}`);
  }, []);
  return null;
}

// Once signed in, ties a new account to the friend who invited it. Mofi's server decides whether it counts; either
// way the link is used up. If the server can't be reached, it's tried again next time.
export function InviteJoin() {
  const { address } = useMofiWallet();
  useEffect(() => {
    if (!address) return;
    let by: string | null = null;
    try {
      by = localStorage.getItem(KEY);
    } catch {}
    if (!by) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // A brand-new wallet can be refused for a moment (the sign-in service hasn't listed it yet), and a new account
    // can only join before its first deposit, so a failed try is repeated a few times straight away.
    const waits = [2_000, 5_000, 15_000, 30_000];
    const attempt = () =>
      postJson("/api/referral", { wallet: address, by })
        .then((res) => res.ok || res.status === 400, () => false)
        .then((settled) => {
          if (settled) localStorage.removeItem(KEY);
          else if (live && waits.length) timer = setTimeout(attempt, waits.shift());
        });
    attempt();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [address]);
  return null;
}
