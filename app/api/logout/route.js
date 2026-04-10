import { NextResponse } from "next/server";
import { destroySession, getSessionCookieName } from "../../lib/localAuth";

export async function POST(request) {
  const token = request.cookies.get(getSessionCookieName())?.value;
  destroySession(token);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(getSessionCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    expires: new Date(0),
  });

  return response;
}
