import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/chat", "/plan", "/today", "/history"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get("session")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/chat/:path*", "/plan/:path*", "/today/:path*", "/history/:path*"],
};
