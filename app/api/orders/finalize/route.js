import { NextResponse } from "next/server";
import {
  finalizeTailoredPlanOrder,
  getSessionCookieName,
  getUserFromSessionToken,
} from "../../../lib/localAuth";

export async function POST(request) {
  try {
    const token = request.cookies.get(getSessionCookieName())?.value;
    const user = getUserFromSessionToken(token);

    if (!user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const body = await request.json();
    const orderId = String(body.orderId || "").trim();

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required." }, { status: 400 });
    }

    const order = finalizeTailoredPlanOrder({ orderId });
    return NextResponse.json({ ok: true, order });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to finalize order." }, { status: 400 });
  }
}
