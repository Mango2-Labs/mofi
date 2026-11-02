import { notFound } from "next/navigation";
import { ASSETS } from "@/lib/assets";
import { AssetView } from "./asset";

export default async function AssetPage({ params }: PageProps<"/app/explore/[symbol]">) {
  const { symbol } = await params;
  const asset = ASSETS.find((a) => a.symbol === symbol);
  if (!asset) notFound();
  return <AssetView asset={asset} />;
}
