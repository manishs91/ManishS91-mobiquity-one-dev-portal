import { NextResponse, type NextRequest } from "next/server";

/**
 * Cheap edge check: send signed-out visitors to /login before rendering the
 * dashboard. Signature verification still happens on the server (lib/auth/session).
 */
export function middleware(req: NextRequest) {
  if (!req.cookies.get("m1dp_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*"] };
