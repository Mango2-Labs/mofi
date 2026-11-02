import { NextResponse, type NextRequest } from "next/server";

// Privy's recommended Content Security Policy (docs.privy.io/security/implementation-guide/content-security-policy)
// with a fresh nonce per request, so Next.js's inline scripts run and nothing else inline does.
export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV === "development";
  const privyFrames = "https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'", // Privy's modal injects its own styles
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    `child-src ${privyFrames}`,
    `frame-src ${privyFrames} https://challenges.cloudflare.com`,
    `connect-src 'self' https://auth.privy.io https://*.rpc.privy.systems https://api.mainnet-beta.solana.com wss://relay.walletconnect.com wss://relay.walletconnect.org wss://www.walletlink.org https://explorer-api.walletconnect.com${dev ? " ws:" : ""}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|logos).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
