import { AuroraError, assets } from "@/lib/server/aurora";

export async function GET() {
  try {
    return Response.json(await assets());
  } catch (e) {
    return Response.json({ error: e instanceof AuroraError ? e.message : "Couldn't load chains right now." }, { status: 502 });
  }
}
