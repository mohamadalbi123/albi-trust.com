import { NextResponse } from "next/server";
import {
  getSessionCookieName,
  getUserFromSessionToken,
  saveAssessmentForUser,
} from "../../../lib/localAuth";

export async function POST(request) {
  try {
    const token = request.cookies.get(getSessionCookieName())?.value;
    const user = getUserFromSessionToken(token);

    if (!user) {
      return NextResponse.json({ error: "Please sign in before saving an assessment." }, { status: 401 });
    }

    const body = await request.json();
    const result = body.result;

    if (!result) {
      return NextResponse.json({ error: "Assessment result is required." }, { status: 400 });
    }

    const assessment = saveAssessmentForUser({
      email: user.email,
      result,
    });

    return NextResponse.json({
      ok: true,
      assessment,
    });
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
