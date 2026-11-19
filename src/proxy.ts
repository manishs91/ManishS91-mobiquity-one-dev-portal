import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 proxy (formerly middleware): send signed-out visitors to /login
 * before rendering the dashboard. This is only a fast path; the session
 * signature is still verified on the server (lib/auth/session).
 */
export function proxy(req: NextRequest) {
  if (!req.cookies.get("m1dp_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*"] };
