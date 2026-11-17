"use client";

import { useEffect } from "react";
import { useMofiWallet } from "@/components/signed-in";
import { postJson } from "@/lib/api";
import { USERNAME } from "@/lib/username";

const KEY = "mofi:invite";

// `username` is the inviter's.
export const inviteLink = (username: string) => `${location.origin}/r/${username}`;

// Remembers the friend behind an invite link on this device until the visitor signs up. The link, /r/username,
// redirects to /?ref=username (see next.config.ts).
export function InviteCapture() {
  useEffect(() => {
    const by = new URLSearchParams(location.search).get("ref");
    try {
      if (by && USERNAME.test(by)) localStorage.setItem(KEY, by);
    } catch {}
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
