import { NextResponse } from "next/server";

const WWW_HOSTNAME = "www.vitoshow.site";
const CANONICAL_HOSTNAME = "vitoshow.site";

export function middleware(request) {
  if (request.nextUrl.hostname !== WWW_HOSTNAME) {
    return NextResponse.next();
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.hostname = CANONICAL_HOSTNAME;
  redirectUrl.protocol = "https";

  return NextResponse.redirect(redirectUrl, 308);
}
