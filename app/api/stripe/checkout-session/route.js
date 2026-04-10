import { NextResponse } from "next/server";
import Stripe from "stripe";
import { cookies, headers } from "next/headers";
import { getSessionCookieName, getUserFromSessionToken } from "../../../lib/localAuth";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

function getBaseUrl(headerStore) {
  const origin = headerStore.get("origin");
  if (origin) return origin;

  const host = headerStore.get("host");
  if (!host) return process.env.NEXTAUTH_URL || "http://localhost:3002";

  const protocol = host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${protocol}://${host}`;
}

export async function POST(request) {
  if (!stripeSecretKey) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey);
  const headerStore = await headers();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(getSessionCookieName())?.value || null;
  const user = getUserFromSessionToken(sessionToken);

  if (!user) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const method = body?.method === "crypto" ? "crypto" : "card";
  const draftOrderId = String(body?.draftOrderId || "").trim();

  if (method === "crypto") {
    return NextResponse.json(
      { error: "Crypto payments are not connected yet." },
      { status: 400 },
    );
  }

  if (!draftOrderId) {
    return NextResponse.json({ error: "Order draft is required before payment." }, { status: 400 });
  }

  const baseUrl = getBaseUrl(headerStore);
  const successUrl = `${baseUrl}/tailored-intake?paid=1&order=${draftOrderId}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/tailored-intake`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: user.email,
    billing_address_collection: "auto",
    client_reference_id: user.id,
    metadata: {
      userId: user.id,
      userEmail: user.email,
      product: "tailored_action_plan",
      draftOrderId,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 9900,
          product_data: {
            name: "Tailored Action Plan",
            description: "Personalized trader action plan based on level and assessment.",
          },
        },
      },
    ],
  });

  return NextResponse.json({ url: session.url });
}
