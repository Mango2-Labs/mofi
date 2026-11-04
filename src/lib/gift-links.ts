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

// The sender keeps a copy of each link on this device, to share again or claim back.
export type SavedGift = { link: string; symbol: string; name: string; amount: number; at: number };
const KEY = "mofi:gifts";

export function savedGifts(): SavedGift[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function store(gifts: SavedGift[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(gifts));
  } catch {}
}

export const saveGift = (gift: SavedGift) => store([gift, ...savedGifts()]);
