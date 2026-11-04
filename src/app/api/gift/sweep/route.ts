import { sweepGiftAccounts } from "@/lib/server/gift";

// Daily cleanup, run by Vercel Cron (see vercel.json), which sends `Authorization: Bearer <CRON_SECRET>`: the fee
// wallet closes empty gift accounts it's the closer of and gets their rent back.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Not allowed." }, { status: 401 });
  try {
    return Response.json(await sweepGiftAccounts({ send: true }));
  } catch {
    return Response.json({ error: "Couldn't sweep gift accounts." }, { status: 502 });
  }
}
