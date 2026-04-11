import { NextResponse } from "next/server";
import {
  createSession,
  getSessionCookieName,
  loginUser,
  shouldUseSecureCookies,
} from "../../lib/localAuth";

export async function POST(request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const { user, internalUserId } = await loginUser({ email, password });
    const session = await createSession(internalUserId);

    const response = NextResponse.json({ ok: true, user });
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
      {
        error: error.message || "Unable to sign in.",
        code: error.code || null,
        verifyUrl: error.previewUrl || null,
      },
      { status: 400 },
    );
  }
}
