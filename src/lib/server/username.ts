import { USERNAME } from "@/lib/username";
import { kvGet, kvReady, kvRun, kvSetNew } from "@/lib/server/kv";

// Usernames live in the shared store, both ways round: name to wallet, and wallet to name. One each, picked once.
export class UsernameError extends Error {}

// Names that could pass for Mofi itself or for a page of the site.
const RESERVED = new Set(["mofi", "admin", "support", "help", "official", "team", "app", "api", "ref", "invite", "gift", "rewards", "account", "null", "undefined"]);

const byName = (name: string) => `name:${name}`;
const byWallet = (wallet: string) => `username:${wallet}`;

export const usernameOf = (wallet: string) => (kvReady() ? kvGet(byWallet(wallet)) : null);
export const walletOf = (name: string) => (kvReady() && USERNAME.test(name) ? kvGet(byName(name)) : null);
export const isFree = async (name: string) => USERNAME.test(name) && !RESERVED.has(name) && !(await walletOf(name));

// Gives a wallet its username. The name is taken first, so two people can never end up with the same one.
export async function claim(wallet: string, name: string) {
  if (!kvReady()) throw new UsernameError("Usernames aren't set up yet.");
  if (!USERNAME.test(name)) throw new UsernameError("Use 3 to 20 letters, numbers or underscores.");
  if (RESERVED.has(name) || !(await kvSetNew(byName(name), wallet))) throw new UsernameError("That username is taken.");
  if (await kvSetNew(byWallet(wallet), name)) return name;
  // This wallet already had one: give the new name back and keep the old.
  await kvRun([["DEL", byName(name)]]);
  return (await kvGet(byWallet(wallet))) ?? name;
}
