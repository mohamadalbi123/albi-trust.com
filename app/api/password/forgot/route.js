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

  if (token) {
    try {
      const resetUrl = `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
      await sendPasswordResetEmail({ to: email, resetUrl });
    } catch (error) {
      console.error("Password reset email failed:", error.message || error);
    }
  }

  return NextResponse.json({
    ok: true,
    message: "If an account exists for this email, a reset link has been sent.",
  });
}
