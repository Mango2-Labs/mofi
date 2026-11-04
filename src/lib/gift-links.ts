"use client";

import { createKeyPairFromPrivateKeyBytes, getAddressFromPublicKey, getBase58Decoder, getBase58Encoder } from "@solana/kit";

// A gift wallet is a fresh key whose 32 secret bytes go in the link after #, a part browsers never send to a server.
// Whoever has the link can claim what's in it.
export async function newGift() {
  const seed = crypto.getRandomValues(new Uint8Array(32));
  const keyPair = await createKeyPairFromPrivateKeyBytes(seed);
  return { address: await getAddressFromPublicKey(keyPair.publicKey), link: `${location.origin}/app/gift#${getBase58Decoder().decode(seed)}` };
}

export async function openGift(hash: string) {
  const seed = getBase58Encoder().encode(hash.replace(/^#/, ""));
  if (seed.length !== 32) throw new Error("Not a gift link.");
  const keyPair = await createKeyPairFromPrivateKeyBytes(seed);
  return { keyPair, address: await getAddressFromPublicKey(keyPair.publicKey) };
}

// The sender keeps a copy of each link on this device, per account, to share again or claim back.
export type SavedGift = { link: string; symbol: string; name: string; amount: number; at: number };
const keyFor = (wallet: string) => `mofi:gifts:${wallet}`;
// Links saved before they were kept per account move to the first account that opens them on this device.
const LEGACY = "mofi:gifts";

export function savedGifts(wallet: string): SavedGift[] {
  try {
    const legacy = localStorage.getItem(LEGACY);
    if (legacy) {
      localStorage.setItem(keyFor(wallet), JSON.stringify([...JSON.parse(legacy), ...JSON.parse(localStorage.getItem(keyFor(wallet)) ?? "[]")]));
      localStorage.removeItem(LEGACY);
    }
    return JSON.parse(localStorage.getItem(keyFor(wallet)) ?? "[]");
  } catch {
    return [];
  }
}

// Saves a link and reads it back, so a gift is only made once its link is safely kept.
export function saveGift(wallet: string, gift: SavedGift) {
  try {
    localStorage.setItem(keyFor(wallet), JSON.stringify([gift, ...savedGifts(wallet)]));
  } catch {}
  return savedGifts(wallet).some((g) => g.link === gift.link);
}
