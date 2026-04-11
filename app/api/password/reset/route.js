import { NextResponse } from "next/server";
import {
  createSession,
  getSessionCookieName,
  resetPasswordWithToken,
  shouldUseSecureCookies,
} from "../../../lib/localAuth";

export async function POST(request) {
  try {
    const body = await request.json();
    const token = String(body.token || "").trim();
    const newPassword = String(body.newPassword || "");

    const reset = resetPasswordWithToken({ token, newPassword });
    const session = createSession(reset.internalUserId);
    const response = NextResponse.json({ ok: true, user: reset.user });

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
      { error: error.message || "Unable to reset password." },
      { status: 400 },
    );
  }
}
