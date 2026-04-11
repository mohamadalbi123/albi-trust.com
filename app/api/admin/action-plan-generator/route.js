import { NextResponse } from "next/server";
import {
  getAdminActionPlanGeneratorContext,
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

function extractResponseText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const chunks = (data?.output || [])
    .flatMap((item) => item?.content || [])
    .map((content) => content?.text || "")
    .filter(Boolean);

  return chunks.join("\n").trim();
}

function systemPrompt() {
  return [
    "You are the Albi Trust internal action plan assistant.",
    "Write practical trader action-plan drafts for Mohamad Albi to review before delivery.",
    "Do not claim certainty beyond the data. Use the client's assessment and intake answers only.",
    "Be direct, structured, and behavioral. Avoid generic motivation.",
    "The final client PDF will be reviewed and edited by Mohamad before delivery.",
    process.env.ACTION_PLAN_GENERATOR_GUIDANCE
      ? `Mohamad's private guidance:\n${process.env.ACTION_PLAN_GENERATOR_GUIDANCE}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function POST(request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI is not configured yet. Add OPENAI_API_KEY in Vercel environment variables." },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const orderId = String(body.orderId || "").trim();

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required." }, { status: 400 });
    }

    const context = await getAdminActionPlanGeneratorContext(orderId);
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1",
        input: [
          {
            role: "system",
            content: systemPrompt(),
          },
          {
            role: "user",
            content: [
              "Create a tailored action plan draft from this paid order.",
              "Use these sections:",
              "1. Client snapshot",
              "2. Main behavioral diagnosis",
              "3. Why this trader is stuck",
              "4. 30-day correction plan",
              "5. Trading rules",
              "6. Daily routine",
              "7. What Mohamad should review before sending",
              "",
              "Paid order data:",
              JSON.stringify(context, null, 2),
            ].join("\n"),
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "Unable to generate action plan draft." },
        { status: response.status },
      );
    }

    const draft = extractResponseText(data);

    return NextResponse.json({
      ok: true,
      draft: draft || "No draft text returned.",
      order: context.order,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate action plan draft." },
      { status: 400 },
    );
  }
}
