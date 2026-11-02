import type { NextConfig } from "next";

// The Content Security Policy is set per request in src/proxy.ts, because it carries a nonce.
const nextConfig: NextConfig = {
  // Kamino's SDK reaches Orca code that reads a .wasm file from disk, which breaks when bundled.
  serverExternalPackages: ["@kamino-finance/klend-sdk", "@kamino-finance/scope-sdk"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
