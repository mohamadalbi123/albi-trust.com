import { NextResponse } from "next/server";
import {
  createSession,
  getSessionCookieName,
  shouldUseSecureCookies,
  verifyEmailToken,
} from "../../lib/localAuth";

export async function GET(request) {
  const token = request.nextUrl.searchParams.get("token");
  const nextParam = request.nextUrl.searchParams.get("next");
  const nextPath =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/assessment";

  if (!token) {
    return NextResponse.redirect(new URL("/login?verified=missing", request.url));
  }

  const verified = verifyEmailToken(token);

  if (!verified) {
    return NextResponse.redirect(new URL("/login?verified=invalid", request.url));
  }

  const session = createSession(verified.internalUserId);
  const redirectUrl = new URL(nextPath, request.url);
  redirectUrl.searchParams.set("verified", "1");
  const response = NextResponse.redirect(redirectUrl);

  response.cookies.set(getSessionCookieName(), session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(),
    path: "/",
    expires: new Date(session.expiresAt),
  });

  return response;
}
