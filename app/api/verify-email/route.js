import { NextResponse } from "next/server";
import { createSession, getSessionCookieName, verifyEmailToken } from "../../lib/localAuth";

export async function GET(request) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/assessment?verified=missing", request.url));
  }

  const verified = verifyEmailToken(token);

  if (!verified) {
    return NextResponse.redirect(new URL("/assessment?verified=invalid", request.url));
  }

  const session = createSession(verified.internalUserId);
  const response = NextResponse.redirect(new URL("/assessment?verified=1", request.url));

  response.cookies.set(getSessionCookieName(), session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    expires: new Date(session.expiresAt),
  });

  return response;
}
