import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import {
  createSession,
  getSessionCookieName,
  shouldUseSecureCookies,
  upsertGoogleUser,
} from "../../lib/localAuth";

export async function GET(request) {
  const nextParam = request.nextUrl.searchParams.get("next");
  const nextPath =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/dashboard";

  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/login?google=failed", request.url));
  }

  const fullName =
    session.user.name ||
    [session.user.given_name, session.user.family_name].filter(Boolean).join(" ").trim() ||
    session.user.email;

  const { internalUserId } = upsertGoogleUser({
    fullName,
    email: session.user.email,
  });

  const appSession = createSession(internalUserId);
  const response = NextResponse.redirect(new URL(nextPath, request.url));

  response.cookies.set(getSessionCookieName(), appSession.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(),
    path: "/",
    expires: new Date(appSession.expiresAt),
  });

  return response;
}
