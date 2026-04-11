import crypto from "crypto";
import { NextResponse } from "next/server";
import { GOOGLE_AUTH_STATE_COOKIE, safeGoogleReturnPath } from "../../../lib/googleOAuth";

function randomState() {
  return crypto.randomUUID();
}

export async function GET(request) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/login?google=not-configured", request.url));
  }

  const nextPath = safeGoogleReturnPath(request.nextUrl.searchParams.get("next"));
  const state = randomState();
  const redirectUri = new URL("/api/google/callback", request.url);
  const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  googleUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID);
  googleUrl.searchParams.set("redirect_uri", redirectUri.toString());
  googleUrl.searchParams.set("response_type", "code");
  googleUrl.searchParams.set("scope", "openid email profile");
  googleUrl.searchParams.set("prompt", "select_account");
  googleUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(googleUrl);
  response.cookies.set(GOOGLE_AUTH_STATE_COOKIE, JSON.stringify({ state, nextPath }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
