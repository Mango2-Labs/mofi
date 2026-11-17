"use client";

import { useEffect } from "react";
import { useMofiWallet } from "@/components/signed-in";
import { postJson } from "@/lib/api";
import { USERNAME } from "@/lib/username";

const KEY = "mofi:invite";

// `username` is the inviter's.
export const inviteLink = (username: string) => `${location.origin}/r/${username}`;

// Remembers the friend behind an invite link, /r/username, on this device until the visitor signs up. The link
// opens the app with ?ref=username (see next.config.ts), which is taken off the address once it's been read.
export function InviteCapture() {
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const by = params.get("ref");
    if (by === null) return;
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
    postJson("/api/referral", { wallet: address, by }).then(
      (res) => {
        if (res.ok || res.status === 400) localStorage.removeItem(KEY);
      },
      () => {},
    );
  }, [address]);
  return null;
}
