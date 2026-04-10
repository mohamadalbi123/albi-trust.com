import { NextResponse } from "next/server";
import { sendVerificationEmail } from "../../lib/email";
import { signupUser } from "../../lib/localAuth";

export async function POST(request) {
  try {
    const body = await request.json();
    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");

    if (!fullName || !email || !password) {
      return NextResponse.json({ error: "Full name, email, and password are required." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password should be at least 8 characters." }, { status: 400 });
    }

    const { user, verifyUrl } = signupUser({ fullName, email, password });

    let emailSent = false;

    try {
      const result = await sendVerificationEmail({
        to: user.email,
        fullName: user.fullName,
        verifyUrl,
      });
      emailSent = Boolean(result.sent);
    } catch {
      emailSent = false;
    }

    return NextResponse.json({
      ok: true,
      user,
      verifyUrl: emailSent ? null : verifyUrl,
      emailSent,
      message: emailSent
        ? "Account created. Please check your inbox or spam folder to confirm your email."
        : "Account created. Please confirm your email before continuing.",
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to create account." }, { status: 400 });
  }
}
