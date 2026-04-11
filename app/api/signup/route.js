import { NextResponse } from "next/server";
import { sendVerificationEmail } from "../../lib/email";
import { signupUser } from "../../lib/localAuth";

export async function POST(request) {
  try {
    const body = await request.json();
    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");
    const returnTo = String(body.returnTo || "").trim();

    if (!fullName || !email || !password) {
      return NextResponse.json({ error: "Full name, email, and password are required." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password should be at least 8 characters." }, { status: 400 });
    }

    const { user, verifyUrl } = await signupUser({ fullName, email, password, returnTo });

    let emailSent = false;
    let emailError = "";

    try {
      const result = await sendVerificationEmail({
        to: user.email,
        fullName: user.fullName,
        verifyUrl,
        returnTo,
      });
      emailSent = Boolean(result.sent);
      emailError = result.reason || "";
    } catch (error) {
      emailSent = false;
      emailError = error.message || "Unable to send verification email.";
      console.error("Verification email failed:", emailError);
    }

    const canShowPreviewLink = process.env.NODE_ENV !== "production";

    return NextResponse.json({
      ok: true,
      user,
      verifyUrl: !emailSent && canShowPreviewLink ? verifyUrl : null,
      emailSent,
      emailError: emailSent ? null : emailError || "Email delivery is not configured.",
      message: emailSent
        ? "Account created. Please check your inbox or spam folder to confirm your email."
        : "Account created, but the confirmation email could not be sent. Please contact support.",
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to create account." }, { status: 400 });
  }
}
