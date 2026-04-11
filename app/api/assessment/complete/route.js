import { NextResponse } from "next/server";
import {
  createSession,
  getSessionCookieName,
  getUserFromSessionToken,
  saveAssessmentForUser,
  shouldUseSecureCookies,
} from "../../../lib/localAuth";

export async function POST(request) {
  try {
    const token = request.cookies.get(getSessionCookieName())?.value;
    const user = await getUserFromSessionToken(token);

    if (!user) {
      return NextResponse.json({ error: "Please sign in before saving an assessment." }, { status: 401 });
    }

    const body = await request.json();
    const result = body.result;

    if (!result) {
      return NextResponse.json({ error: "Assessment result is required." }, { status: 400 });
    }

    const saved = await saveAssessmentForUser({
      email: user.email,
      result,
    });
    const session = await createSession(saved.internalUserId);

    const response = NextResponse.json({
      ok: true,
      assessment: saved.assessment,
      user: saved.user,
    });

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
        error: error.message || "Unable to save assessment.",
        code: error.code || null,
      },
      { status: 400 },
    );
  }
}
