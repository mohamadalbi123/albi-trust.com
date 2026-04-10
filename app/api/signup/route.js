import { NextResponse } from "next/server";
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

    return NextResponse.json({
      ok: true,
      user,
      verifyUrl,
      message: "Account created. Please confirm your email before continuing.",
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to create account." }, { status: 400 });
  }
}
