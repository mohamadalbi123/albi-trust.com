import { NextResponse } from "next/server";
import { getPaidTailoredPlanOrders, uploadTailoredPlanPdf } from "../../../lib/localAuth";

const MAX_PDF_BYTES = 4 * 1024 * 1024;

function isAuthorized(request) {
  const resetToken = process.env.ADMIN_RESET_TOKEN;
  const requestToken = request.headers.get("x-admin-reset-token");
  return Boolean(resetToken && requestToken && requestToken === resetToken);
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const orders = await getPaidTailoredPlanOrders();
  return NextResponse.json({ ok: true, orders });
}

export async function POST(request) {
  if (!isAuthorized(request)) {
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
