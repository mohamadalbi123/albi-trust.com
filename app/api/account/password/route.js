import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionCookieName, getUserFromSessionToken, updateUserPassword } from "../../../lib/localAuth";

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(getSessionCookieName())?.value;
    const user = getUserFromSessionToken(sessionToken);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");

    const updatedUser = updateUserPassword({
      userId: user.id,
      currentPassword,
      newPassword,
    });

    return NextResponse.json({ ok: true, user: updatedUser });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update password." },
      { status: 400 },
    );
  }
}
