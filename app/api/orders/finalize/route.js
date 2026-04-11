import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  finalizeTailoredPlanOrder,
  getSessionCookieName,
  getUserFromSessionToken,
} from "../../../lib/localAuth";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export async function POST(request) {
  try {
    const token = request.cookies.get(getSessionCookieName())?.value;
    const user = getUserFromSessionToken(token);

    if (!user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const body = await request.json();
    const orderId = String(body.orderId || "").trim();
    const sessionId = String(body.sessionId || "").trim();

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required." }, { status: 400 });
    }

    if (!sessionId) {
      return NextResponse.json({ error: "Stripe session ID is required." }, { status: 400 });
    }

    if (!stripeSecretKey) {
      return NextResponse.json({ error: "Stripe is not configured." }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey);
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);

    if (checkoutSession.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment has not been confirmed by Stripe." }, { status: 400 });
    }

    if (checkoutSession.metadata?.draftOrderId !== orderId) {
      return NextResponse.json({ error: "Stripe payment does not match this order." }, { status: 400 });
    }

    if (checkoutSession.metadata?.userId !== user.id) {
      return NextResponse.json({ error: "Stripe payment does not match this account." }, { status: 403 });
    }

    const order = finalizeTailoredPlanOrder({ orderId, currentUserId: user.id });
    return NextResponse.json({ ok: true, order });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to finalize order." }, { status: 400 });
  }
}
