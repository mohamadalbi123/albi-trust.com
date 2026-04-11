import { NextResponse } from "next/server";
import { sendPasswordResetEmail } from "../../../lib/email";
import { createPasswordResetToken, getAppBaseUrl } from "../../../lib/localAuth";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const token = createPasswordResetToken(email);

  if (!token) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const resetUrl = `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const result = await sendPasswordResetEmail({ to: email, resetUrl });

  if (!result.sent) {
    return NextResponse.json(
      { error: result.reason || "Unable to send reset email." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "A password reset link has been sent to your email.",
  });
}
