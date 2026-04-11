import { NextResponse } from "next/server";
import { destroySession, getSessionCookieName, shouldUseSecureCookies } from "../../lib/localAuth";

export async function POST(request) {
  const token = request.cookies.get(getSessionCookieName())?.value;
  await destroySession(token);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(getSessionCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(),
    path: "/",
    expires: new Date(0),
  });

  return response;
}
