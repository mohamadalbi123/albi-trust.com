import { NextResponse } from "next/server";
import { resetAppData } from "../../../lib/localAuth";

export async function POST(request) {
  const resetToken = process.env.ADMIN_RESET_TOKEN;
  const requestToken = request.headers.get("x-admin-reset-token");

  if (!resetToken) {
    return NextResponse.json({ error: "Admin reset is not configured." }, { status: 404 });
  }

  if (!requestToken || requestToken !== resetToken) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await resetAppData();

  return NextResponse.json({
    ok: true,
    message: "All app data has been reset.",
  });
}
