import { NextResponse } from "next/server";
import { getSessionCookieName, getTailoredPlanPdfForUser, getUserFromSessionToken } from "../../../../lib/localAuth";

function safeFileName(value) {
  const name = String(value || "albi-trust-action-plan-report.html").replace(/[^a-z0-9._-]+/gi, "-");
  return name || "albi-trust-action-plan-report.html";
}

export async function GET(request, { params }) {
  try {
    const user = await getUserFromSessionToken(request.cookies.get(getSessionCookieName())?.value);

    if (!user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const { orderId } = await params;
    const report = await getTailoredPlanPdfForUser({ orderId, userId: user.id });
    const buffer = Buffer.from(report.dataBase64, "base64");
    const mimeType = String(report.mimeType || "application/octet-stream");
    const disposition = mimeType.startsWith("text/html") ? "inline" : "attachment";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `${disposition}; filename="${safeFileName(report.fileName)}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to download report." },
      { status: 400 },
    );
  }
}
