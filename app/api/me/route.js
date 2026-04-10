import { NextResponse } from "next/server";
import { getSessionCookieName, getUserFromSessionToken } from "../../lib/localAuth";

export async function GET(request) {
  const token = request.cookies.get(getSessionCookieName())?.value;
  const user = getUserFromSessionToken(token);

  return NextResponse.json({
    authenticated: Boolean(user),
    user,
  });
}
