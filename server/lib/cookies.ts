import type { CookieOptions } from "hono/utils/cookie";

function isLocalhost(headers: Headers): boolean {
  const host = headers.get("host") || "";
  return host.startsWith("localhost:") || host.startsWith("127.0.0.1:");
}

/**
 * Frontend ve API aynı alan adında (Vercel) olduğu için SameSite=Lax yeterli ve
 * en güvenli seçenektir. Yerelde (http) Secure kapalı, canlıda (https) açık.
 */
export function getSessionCookieOptions(headers: Headers): CookieOptions {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "Lax",
    secure: !isLocalhost(headers),
  };
}
