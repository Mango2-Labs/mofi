import { encode } from "uqr";

export function QrCode({ value, label, size = 168 }: { value: string; label: string; size?: number }) {
  // High error correction, so a logo over the middle still scans.
  const { data, size: n } = encode(value, { border: 1, ecc: "H" });
  const d = data.flatMap((row, y) => row.map((on, x) => (on ? `M${x} ${y}h1v1h-1z` : ""))).join("");
  return (
    <svg viewBox={`0 0 ${n} ${n}`} width={size} height={size} shapeRendering="crispEdges" role="img" aria-label={label}>
      <rect width={n} height={n} fill="#fff" />
      <path d={d} fill="#0a0a0b" />
    </svg>
  );
}
