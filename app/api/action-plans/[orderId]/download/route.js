import { NextResponse } from "next/server";
import { getSessionCookieName, getTailoredPlanPdfForUser, getUserFromSessionToken } from "../../../../lib/localAuth";

function safeFileName(value) {
  const name = String(value || "albi-trust-action-plan.pdf").replace(/[^a-z0-9._-]+/gi, "-");
  return name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`;
}

export async function GET(request, { params }) {
  try {
    const user = await getUserFromSessionToken(request.cookies.get(getSessionCookieName())?.value);

    if (!user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const { orderId } = await params;
    const pdf = await getTailoredPlanPdfForUser({ orderId, userId: user.id });
    const buffer = Buffer.from(pdf.dataBase64, "base64");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": pdf.mimeType,
        "Content-Disposition": `attachment; filename="${safeFileName(pdf.fileName)}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to download PDF." },
      { status: 400 },
    );
  }
}
