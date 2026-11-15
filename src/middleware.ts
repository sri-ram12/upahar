import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Protect Admin Pages (server-side check before rendering HTML)
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const adminToken = req.cookies.get("upahar_admin_token")?.value;
    if (!adminToken) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Pass request and apply robust HTTP security headers
  const response = NextResponse.next();

  // Mitigate clickjacking attacks
  response.headers.set("X-Frame-Options", "SAMEORIGIN");

  // Prevent MIME type confusion
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Protect referrer information from leaking cross-domain
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Restrict sensitive browser APIs
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");

  // Enable browser XSS filtering
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Force HTTPS in production
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - icons / public assets
     */
    "/((?!_next/static|_next/image|favicon.ico|icons/|images/|sw.js).*)",
  ],
};
