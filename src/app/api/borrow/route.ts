import { guard } from "@/lib/server/auth";
import { ASSETS } from "@/lib/assets";
import { isSolanaAddress } from "@/lib/chains";
import { feeWallet } from "@/lib/server/fee-payer";
import { KaminoError, borrowOverview, buildBorrow } from "@/lib/server/kamino";
import { portfolio } from "@/lib/server/portfolio";

const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

// The user's loans and what they can borrow against.
export async function GET(req: Request) {
  const owner = new URL(req.url).searchParams.get("owner") ?? "";
  if (!isSolanaAddress(owner)) return fail("Unknown wallet.");
  try {
    const { holdings } = await portfolio(owner);
    return Response.json(await borrowOverview(owner, holdings));
  } catch (e) {
    return e instanceof KaminoError ? fail(e.message, 422) : fail("Couldn't load loans right now.", 502);
  }
}

// A loan transaction for the user to sign, already signed by the fee wallet.
export async function POST(req: Request) {
  const denied = await guard(req, { counted: true });
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const owner = String(body?.owner ?? "");
  const asset = ASSETS.find((a) => a.symbol === body?.symbol);
  const dollars = Number(body?.amount);
  if (!isSolanaAddress(owner)) return fail("Your Mofi wallet isn't ready yet.");
  if (!asset) return fail("Pick a stock to borrow against.");
  if (!(dollars >= 1)) return fail("Borrow at least $1.");
  if (!feeWallet()) return fail("Borrowing isn't set up yet.", 503);
  try {
    return Response.json(await buildBorrow(owner, asset, Math.floor(dollars * 100) / 100));
  } catch (e) {
    return e instanceof KaminoError ? fail(e.message, 422) : fail("Couldn't set up this loan. Try again.", 502);
  }
}
