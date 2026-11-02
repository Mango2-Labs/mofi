import { ASSETS } from "@/lib/assets";
import { prices } from "@/lib/server/jupiter";

export async function GET() {
  return Response.json(await prices(ASSETS.map((a) => a.mint)));
}
