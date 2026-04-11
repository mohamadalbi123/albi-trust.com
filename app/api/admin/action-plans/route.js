import { NextResponse } from "next/server";
import {
  getAdminClientDashboardData,
  getSessionCookieName,
  getUserFromSessionToken,
  uploadTailoredPlanPdf,
} from "../../../lib/localAuth";

const MAX_PDF_BYTES = 4 * 1024 * 1024;
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

export async function GET(request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const data = await getAdminClientDashboardData();
  return NextResponse.json({ ok: true, ...data });
}

export async function POST(request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const orderId = String(formData.get("orderId") || "").trim();
    const file = formData.get("pdf");

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required." }, { status: 400 });
    }

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "PDF file is required." }, { status: 400 });
    }

    if (file.type && file.type !== "application/pdf") {
      return NextResponse.json({ error: "Upload a PDF file." }, { status: 400 });
    }

    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json({ error: "PDF must be smaller than 4MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const order = await uploadTailoredPlanPdf({
      orderId,
      fileName: file.name || "albi-trust-action-plan.pdf",
      mimeType: "application/pdf",
      dataBase64: buffer.toString("base64"),
      size: buffer.length,
    });

    return NextResponse.json({ ok: true, order });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to upload PDF." },
      { status: 400 },
    );
  }
}
