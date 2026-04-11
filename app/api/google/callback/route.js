import { NextResponse } from "next/server";
import {
  createSession,
  getSessionCookieName,
  shouldUseSecureCookies,
  upsertGoogleUser,
} from "../../../lib/localAuth";
import { GOOGLE_AUTH_STATE_COOKIE, safeGoogleReturnPath } from "../../../lib/googleOAuth";

async function exchangeCodeForToken({ code, redirectUri }) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error("Google token exchange failed.");
  }

  return response.json();
}

async function getGoogleProfile(accessToken) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Google profile lookup failed.");
  }

  return response.json();
}

function readStateCookie(request) {
  try {
    return JSON.parse(request.cookies.get(GOOGLE_AUTH_STATE_COOKIE)?.value || "{}");
  } catch {
    return {};
  }
}

export async function GET(request) {
  const code = request.nextUrl.searchParams.get("code");
  const returnedState = request.nextUrl.searchParams.get("state");
  const storedState = readStateCookie(request);
  const loginUrl = new URL("/login?google=failed", request.url);

  if (!code || !returnedState || returnedState !== storedState.state) {
    return NextResponse.redirect(loginUrl);
  }

  try {
    const redirectUri = new URL("/api/google/callback", request.url).toString();
    const tokenData = await exchangeCodeForToken({ code, redirectUri });
    const profile = await getGoogleProfile(tokenData.access_token);

    if (!profile?.email) {
      throw new Error("Google account email is missing.");
    }

    const { internalUserId } = await upsertGoogleUser({
      fullName: profile.name || profile.email,
      email: profile.email,
    });
    const appSession = await createSession(internalUserId);
    const response = NextResponse.redirect(new URL(safeGoogleReturnPath(storedState.nextPath) || "/dashboard", request.url));

    response.cookies.set(getSessionCookieName(), appSession.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: shouldUseSecureCookies(),
      path: "/",
      expires: new Date(appSession.expiresAt),
    });
    response.cookies.set(GOOGLE_AUTH_STATE_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
    });

    return response;
  } catch {
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set(GOOGLE_AUTH_STATE_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
    });
    return response;
  }
}
