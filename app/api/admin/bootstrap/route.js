import { NextResponse } from "next/server";
import {
  createSession,
  getSessionCookieName,
  setVerifiedUserPassword,
  shouldUseSecureCookies,
} from "../../../lib/localAuth";

const DEFAULT_ADMIN_EMAIL = "mohalbi123@hotmail.com";

function isAuthorized(request) {
  const resetToken = process.env.ADMIN_RESET_TOKEN;
  const requestToken = request.headers.get("x-admin-reset-token");
  return Boolean(resetToken && requestToken && requestToken === resetToken);
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const password = String(body.password || "");
    const email = String(body.email || process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim();
    const fullName = String(body.fullName || "Mohamad Albi").trim();

    const admin = await setVerifiedUserPassword({ fullName, email, password });
    const session = await createSession(admin.internalUserId);
    const response = NextResponse.json({ ok: true, user: admin.user });

    response.cookies.set(getSessionCookieName(), session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: shouldUseSecureCookies(),
      path: "/",
      expires: new Date(session.expiresAt),
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create admin account." },
      { status: 400 },
    );
  }
}
