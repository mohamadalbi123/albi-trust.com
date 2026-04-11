import { NextResponse } from "next/server";
import {
  adminDeleteUser,
  adminResetUserAssessment,
  adminVerifyUserEmail,
  getAdminClientDashboardData,
  getSessionCookieName,
  getUserFromSessionToken,
} from "../../../lib/localAuth";

const DEFAULT_ADMIN_EMAIL = "mohalbi123@hotmail.com";

function adminEmail() {
  return String(process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
}

async function isAuthorized(request) {
  const resetToken = process.env.ADMIN_RESET_TOKEN;
  const requestToken = request.headers.get("x-admin-reset-token");

  if (resetToken && requestToken && requestToken === resetToken) {
    return true;
  }

  const user = await getUserFromSessionToken(request.cookies.get(getSessionCookieName())?.value);
  return String(user?.email || "").toLowerCase() === adminEmail();
}

export async function POST(request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const userId = String(body.userId || "").trim();
    const action = String(body.action || "").trim();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    if (action === "reset_assessment") {
      await adminResetUserAssessment(userId);
    } else if (action === "verify_email") {
      await adminVerifyUserEmail(userId);
    } else if (action === "delete_user") {
      await adminDeleteUser(userId);
    } else {
      return NextResponse.json({ error: "Unknown admin action." }, { status: 400 });
    }

    const data = await getAdminClientDashboardData();
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update user." },
      { status: 400 },
    );
  }
}
