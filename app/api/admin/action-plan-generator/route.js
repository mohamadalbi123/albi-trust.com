import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { sendActionPlanDeliveredEmail } from "../../../lib/email";
import { renderActionPlanReportHtml } from "../../../lib/actionPlanReport";
import {
  getAdminActionPlanGeneratorContext,
  getSessionCookieName,
  getUserFromSessionToken,
  uploadTailoredPlanPdf,
} from "../../../lib/localAuth";

const DEFAULT_ADMIN_EMAIL = "mohalbi123@hotmail.com";
let cachedCourseKnowledge = null;

const FIXED_PLAN_JSON_SCHEMA = {
  observationBasedOnCoreTradingPillars: {
    technicalAnalysis: "string",
    riskManagement: "string",
    tradingPlan: "string",
    psychology: "string",
  },
  traderProfileOverview: {
    experienceLevel: "string",
    profitabilityStatus: "string",
    marketsTraded: "string",
    tradingSession: "string",
    holdingStyle: "string",
    riskPerTrade: "string",
    tradingEnvironment: "string",
  },
  dailyWeeklyRoutine: {
    weeklyCotReport: ["string", "string"],
    seasonalityAnalysis: {
      intro: "string",
      exampleMonth: "string",
      exampleAsset: "string",
      exampleInsight: "string",
      closing: "string",
    },
    economicCalendar: ["string", "string", "string"],
    chartAnalysisProcess: ["string", "string", "string", "string"],
  },
  goldenAdvice: {
    followTheTrend: {
      intro: "string",
      alignmentFactors: ["string", "string", "string", "string"],
      closing: "string",
    },
    executionAtTheRightLevel: {
      intro: "string",
      accumulation: ["string"],
      manipulation: ["string", "string"],
      distribution: ["string", "string"],
    },
  },
  biggestBlockerAndSolution: {
    problem: "string",
    solutionPlan: ["string", "string", "string", "string", "string", "string"],
  },
  finalNote: {
    message: "string",
    commitment: ["string", "string"],
  },
};

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

function sanitizeChatHistory(value) {
  return Array.isArray(value)
    ? value
        .map((entry) => ({
          role: entry?.role === "model" ? "assistant" : "user",
          content: clippedText(entry?.content, 4000),
        }))
        .filter((entry) => entry.content)
        .slice(-12)
    : [];
}

function systemPrompt() {
  return [
    "You are the Albi Trust internal action plan assistant.",
    "Write practical trader action-plan drafts for Mohamad Albi to review before delivery.",
    "Do not claim certainty beyond the data. Use the client's assessment and intake answers only.",
    "Be direct, structured, and behavioral. Avoid generic motivation.",
    "The final client PDF will be reviewed and edited by Mohamad before delivery.",
    actionPlanStructurePrompt(),
    builtInCourseKnowledgePrompt(),
    process.env.ACTION_PLAN_GENERATOR_GUIDANCE
      ? `Mohamad's private guidance:\n${process.env.ACTION_PLAN_GENERATOR_GUIDANCE}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function builtInCourseKnowledgePrompt() {
  if (cachedCourseKnowledge === null) {
    try {
      cachedCourseKnowledge = readFileSync(
        join(process.cwd(), "app/lib/knowledge/albi-trust-trading-course.txt"),
        "utf8",
      );
    } catch {
      cachedCourseKnowledge = "";
    }
  }

  if (!cachedCourseKnowledge) {
    return "";
  }

  return [
    "Internal Albi Trust course reference:",
    "Use the following course material to understand Mohamad's teaching style, trading concepts, and 4-pillar framework.",
    "Do not copy long passages. Do not turn the action plan into a generic course. Convert relevant ideas into specific advice for the paid client's data.",
    clippedText(cachedCourseKnowledge, 50000),
  ].join("\n\n");
}

function actionPlanStructurePrompt() {
  return [
    "Every action plan must follow one fixed Albi Trust report template.",
    "The section titles, section order, and hierarchy must always stay the same.",
    "Do not rename sections. Do not remove sections. Do not merge sections. Do not add extra main sections.",
    "Think of this like a medical report template: the headings stay fixed, but the diagnosis and treatment change depending on the client.",
    "The PDF must look professional and consistent every time, so structure discipline matters as much as the analysis itself.",
    "Write it like a professional client-facing financial coaching document: clear, direct, serious, and practical.",
    "Use this exact document structure every time:",
    "1. Personalized Trading Action Plan",
    "2. Prepared for / Prepared by / Date",
    "3. Observation Based on Core Trading Pillars",
    "4. Trader Profile Overview",
    "5. Daily / Weekly Routine",
    "6. Golden Advice",
    "7. Biggest Blocker & Solution",
    "8. Final Note",
    "Within 'Observation Based on Core Trading Pillars', always include exactly these four subsections:",
    "- Technical Analysis",
    "- Risk Management",
    "- Trading Plan",
    "- Psychology",
    "Within 'Daily / Weekly Routine', always include exactly these four subsections:",
    "- Weekly COT Report",
    "- Seasonality Analysis",
    "- Economic Calendar",
    "- Chart Analysis Process",
    "Within 'Golden Advice', always include exactly these two subsections:",
    "- Follow the Trend",
    "- Execution at the Right Level",
    "Within 'Execution at the Right Level', always explain accumulation, manipulation, and distribution.",
    "Only the content inside each section should change based on the trader's data, assessment answers, scores, strengths, blockers, and life situation.",
    "Trader Profile Overview must reflect the client's actual intake answers directly. Do not invent profile facts and do not drift away from the submitted questionnaire data.",
    "For Biggest Blocker & Solution, start from the client's own reported blockers in the intake, then combine that with the assessment and chart/intake evidence to choose the main blocker you want to address first.",
    "If the client selected multiple blockers, choose the most urgent one as the main blocker and keep the others in mind when writing the solution plan.",
    "Before writing, first reason internally about the trader's main blocker, strongest pillar, weakest pillar, behavior pattern, emotional pattern, and execution problem.",
    "Then write using the fixed structure.",
    "The routine section must be clearly doable and must include the following logic whenever relevant: weekend review while markets are closed, weekly charts, COT, economic calendar, seasonality review, monthly-weekly-daily top-down analysis, 4H refinement, and alerts instead of constant screen watching.",
    "The routine must adapt to the client's life, country, session, work status, and whether trading is main income. Use examples only when they fit the client.",
    "Tell the trader to use iPhone Reminders or a similar reminders/tasks app to schedule the weekly review, daily rules review, economic calendar check, journaling reminder, and any planned candle-close check-ins when relevant.",
    "When discussing execution, explain that many openings can involve manipulation or opposite-direction movement before distribution. Mention accumulation, manipulation, and distribution conceptually.",
    "If the client is a scalper, suggest monitor discipline and strict session rules. If the client is intraday or swing, suggest executing according to plan, then stepping away from the screen to avoid moving stops or closing emotionally, checking only at planned candle closes that fit their strategy.",
    "Use Mohamad's coaching voice: clear, serious, practical, and focused on behavior change.",
    "Do not sound generic. Do not write like a course. Do not repeat the same sentence pattern in every section.",
    "Return the analysis as JSON only, using the exact schema requested by the user message.",
  ].join("\n");
}

function clippedText(value, maxLength = 60000) {
  return String(value || "").trim().slice(0, maxLength);
}

function extractJsonObject(value) {
  const text = String(value || "").trim();

  if (!text) return null;

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : text;

  try {
    return JSON.parse(candidate);
  } catch {}

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function sanitizeInlineText(value) {
  return String(value || "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\t+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function textList(value, minimum = 0) {
  const items = Array.isArray(value)
    ? value.map((entry) => sanitizeInlineText(entry)).filter(Boolean)
    : [];

  while (items.length < minimum) {
    items.push("To be refined during final review.");
  }

  return items;
}

function textValue(value, fallback = "To be refined during final review.") {
  return sanitizeInlineText(value) || fallback;
}

function heading(title) {
  return `## ${title}`;
}

function subheading(title) {
  return `### ${title}`;
}

function bulletList(items) {
  return textList(items).map((item) => `- ${item}`).join("\n");
}

function describeProfitabilityStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "yes") return "Has been profitable before";
  if (normalized === "no") return "Not yet consistent";
  return textValue(value, "To be confirmed");
}

function describeHoldingStyle(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "minutes") return "Scalping / very short-term";
  if (normalized === "1-4 hours") return "Intraday";
  if (normalized === "4-12 hours") return "Intraday to multi-session";
  if (normalized === "several days") return "Swing";
  return textValue(value, "To be confirmed");
}

function joinValues(value, fallback = "To be confirmed") {
  if (Array.isArray(value)) {
    const joined = value.map((entry) => String(entry || "").trim()).filter(Boolean).join(" / ");
    return joined || fallback;
  }

  return textValue(value, fallback);
}

function getReportedBlockers(intake) {
  const selections = Array.isArray(intake?.traderWeaknesses)
    ? intake.traderWeaknesses.map((entry) => String(entry || "").trim()).filter(Boolean)
    : [];
  const otherSelected = selections.includes("Other (please specify)");
  const otherValue = String(intake?.otherTraderWeakness || "").trim();
  const normalizedSelections = selections.map((entry) => (
    entry === "Other (please specify)" && otherValue ? `Other: ${otherValue}` : entry
  ));

  return otherSelected && otherValue
    ? normalizedSelections
    : normalizedSelections.filter((entry) => entry !== "Other (please specify)");
}

function formatStructuredDraft(plan, context) {
  const assessment = context?.order?.assessmentSnapshot || {};
  const intake = context?.order?.intake || {};
  const clientName = textValue(context?.order?.fullName, "Client");
  const preparedDate = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
  const marketsTraded = joinValues(intake?.tradedAssets);
  const tradingSession = joinValues(intake?.tradingSession);
  const reportedBlockers = getReportedBlockers(intake);
  const fallbackProblem = reportedBlockers.length
    ? `Your own intake answers point first to these blockers: ${reportedBlockers.join(", ")}. The plan should address the most urgent one first.`
    : assessment?.primaryWeakness?.label || "Biggest blocker to be refined during final review.";

  return [
    "# Personalized Trading Action Plan",
    "",
    `**Prepared for:** ${clientName}`,
    "**Prepared by:** Mohamad Albi",
    `**Date:** ${preparedDate}`,
    "",
    "---",
    "",
    "## Observation Based on Core Trading Pillars",
    "",
    "### 1. Technical Analysis",
    textValue(plan?.observationBasedOnCoreTradingPillars?.technicalAnalysis),
    "",
    "---",
    "",
    "### 2. Risk Management",
    textValue(plan?.observationBasedOnCoreTradingPillars?.riskManagement),
    "",
    "---",
    "",
    "### 3. Trading Plan",
    textValue(plan?.observationBasedOnCoreTradingPillars?.tradingPlan),
    "",
    "---",
    "",
    "### 4. Psychology",
    textValue(plan?.observationBasedOnCoreTradingPillars?.psychology),
    "",
    "---",
    "",
    "## Trader Profile Overview",
    "",
    `- **Experience Level:** ${textValue(intake?.tradingYears, "To be confirmed")}`,
    `- **Profitability Status:** ${describeProfitabilityStatus(intake?.profitableBefore)}`,
    `- **Markets Traded:** ${marketsTraded}`,
    `- **Trading Session:** ${tradingSession}`,
    `- **Holding Style:** ${describeHoldingStyle(intake?.averageHoldingTime)}`,
    `- **Risk Per Trade:** ${textValue(intake?.riskPerTrade, "To be confirmed")}`,
    `- **Trading Environment:** ${textValue(intake?.currentWorkStatus, "To be confirmed")}`,
    "",
    "---",
    "",
    "## Daily / Weekly Routine",
    "",
    "### 1. Weekly COT Report",
    bulletList(plan?.dailyWeeklyRoutine?.weeklyCotReport),
    "",
    "---",
    "",
    "### 2. Seasonality Analysis",
    textValue(plan?.dailyWeeklyRoutine?.seasonalityAnalysis?.intro),
    "",
    "| Month | Asset | Insight |",
    "| --- | --- | --- |",
    `| ${textValue(plan?.dailyWeeklyRoutine?.seasonalityAnalysis?.exampleMonth, "January")} | ${textValue(plan?.dailyWeeklyRoutine?.seasonalityAnalysis?.exampleAsset, "XAUUSD")} | ${textValue(plan?.dailyWeeklyRoutine?.seasonalityAnalysis?.exampleInsight, "Add a seasonality note relevant to the traded asset.")} |`,
    "",
    textValue(plan?.dailyWeeklyRoutine?.seasonalityAnalysis?.closing),
    "",
    "---",
    "",
    "### 3. Economic Calendar",
    bulletList(plan?.dailyWeeklyRoutine?.economicCalendar),
    "",
    "---",
    "",
    "### 4. Chart Analysis Process",
    bulletList(plan?.dailyWeeklyRoutine?.chartAnalysisProcess),
    "",
    "---",
    "",
    "## Golden Advice",
    "",
    "### 1. Follow the Trend",
    textValue(plan?.goldenAdvice?.followTheTrend?.intro),
    "",
    bulletList(plan?.goldenAdvice?.followTheTrend?.alignmentFactors),
    "",
    textValue(plan?.goldenAdvice?.followTheTrend?.closing),
    "",
    "---",
    "",
    "### 2. Execution at the Right Level",
    textValue(plan?.goldenAdvice?.executionAtTheRightLevel?.intro),
    "",
    "#### Accumulation",
    bulletList(plan?.goldenAdvice?.executionAtTheRightLevel?.accumulation, 1),
    "",
    "#### Manipulation",
    bulletList(plan?.goldenAdvice?.executionAtTheRightLevel?.manipulation, 2),
    "",
    "#### Distribution",
    bulletList(plan?.goldenAdvice?.executionAtTheRightLevel?.distribution, 2),
    "",
    "---",
    "",
    "## Biggest Blocker & Solution",
    "",
    "### Problem",
    textValue(plan?.biggestBlockerAndSolution?.problem, fallbackProblem),
    "",
    "---",
    "",
    "### Solution Plan",
    textList(plan?.biggestBlockerAndSolution?.solutionPlan, 4)
      .map((item, index) => `${index + 1}. ${item}`)
      .join("\n"),
    "",
    "---",
    "",
    "## Final Note",
    "",
    textValue(plan?.finalNote?.message),
    "",
    "### Your Commitment",
    bulletList(plan?.finalNote?.commitment),
    "",
    "---",
  ].join("\n");
}

function normalizePlanDraftFromResponse(responseText, context, fallbackDraft = "") {
  const parsed = extractJsonObject(responseText);

  if (!parsed) {
    return clippedText(responseText || fallbackDraft, 60000);
  }

  return formatStructuredDraft(parsed, context);
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
    const action = String(body.action || "generate").trim();
    const adminInstructions = clippedText(body.instructions, 12000);
    const knowledgeNotes = clippedText(body.knowledge, 60000);
    const chatHistory = sanitizeChatHistory(body.chatHistory);

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required." }, { status: 400 });
    }

    const context = await getAdminActionPlanGeneratorContext(orderId);

    if (action === "deliver_draft") {
      const draft = String(body.draft || "").trim();

      if (!draft) {
        return NextResponse.json({ error: "Draft text is required." }, { status: 400 });
      }

      const displayId = context.order.displayId || context.order.id;
      const reportHtml = renderActionPlanReportHtml({
        draft,
        clientName: context.order.fullName || context.order.email || "Albi Trust Report",
        reportLabel: "Client Report",
        showToolbar: false,
      });
      const reportBuffer = Buffer.from(reportHtml, "utf8");

      const order = await uploadTailoredPlanPdf({
        orderId,
        fileName: `${displayId}-action-plan-report.html`,
        mimeType: "text/html; charset=utf-8",
        dataBase64: reportBuffer.toString("base64"),
        size: reportBuffer.length,
      });

      try {
        const result = await sendActionPlanDeliveredEmail({ order });

        if (!result.sent) {
          console.error("Action plan delivery email was not sent:", result.reason);
        }
      } catch (emailError) {
        console.error("Action plan delivery email failed:", emailError);
      }

      return NextResponse.json({ ok: true, order });
    }

    if (action === "chat") {
      const draft = clippedText(body.draft, 60000);

      if (!draft) {
        return NextResponse.json({ error: "Draft text is required before chatting about revisions." }, { status: 400 });
      }

      if (!adminInstructions && !chatHistory.length) {
        return NextResponse.json({ error: "Add a message for the AI first." }, { status: 400 });
      }

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
              content: [
                systemPrompt(),
                "You are chatting with Mohamad inside the Albi Trust admin action plan generator.",
                "Your job is to discuss what should change in the draft before Mohamad applies revisions.",
                "Reply like ChatGPT: clear, direct, practical, and conversational.",
                "Do not return JSON for this chat action.",
                "Do not rewrite the full draft unless Mohamad explicitly asks for it in the chat.",
                "When useful, suggest exact improvements to sections, tone, diagnosis strength, or action steps.",
              ].join("\n\n"),
            },
            {
              role: "user",
              content: [
                "Paid order data:",
                JSON.stringify(context, null, 2),
                "",
                "Current draft:",
                draft,
                knowledgeNotes ? `Mohamad's method notes / uploaded text:\n${knowledgeNotes}` : "",
              ]
                .filter(Boolean)
                .join("\n\n"),
            },
            ...chatHistory,
            ...(adminInstructions ? [{ role: "user", content: adminInstructions }] : []),
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { error: data?.error?.message || "Unable to chat with the action plan assistant." },
          { status: response.status },
        );
      }

      return NextResponse.json({
        ok: true,
        reply: extractResponseText(data) || "No reply returned.",
        order: context.order,
      });
    }

    if (action === "revise_draft") {
      const draft = clippedText(body.draft, 60000);

      if (!draft) {
        return NextResponse.json({ error: "Draft text is required." }, { status: 400 });
      }

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
                "Revise the existing action plan draft for this paid order.",
                "Keep the same client context and keep it practical.",
                "Keep the Albi Trust structure fixed.",
                "Do not rename, remove, merge, or reorder sections.",
                "Return valid JSON only. Do not return prose outside the JSON object.",
                `Use this exact JSON schema:\n${JSON.stringify(FIXED_PLAN_JSON_SCHEMA, null, 2)}`,
                adminInstructions ? `Mohamad's revision instruction:\n${adminInstructions}` : "",
                ...(chatHistory.length
                  ? [
                      "Recent admin chat about the draft:",
                      ...chatHistory.map((entry) => `${entry.role === "assistant" ? "Model" : "Mohamad"}: ${entry.content}`),
                    ]
                  : []),
                knowledgeNotes ? `Mohamad's method notes / uploaded text:\n${knowledgeNotes}` : "",
                "",
                "Paid order data:",
                JSON.stringify(context, null, 2),
                "",
                "Existing draft:",
                draft,
              ]
                .filter(Boolean)
                .join("\n\n"),
            },
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { error: data?.error?.message || "Unable to revise action plan draft." },
          { status: response.status },
        );
      }

      return NextResponse.json({
        ok: true,
        draft: normalizePlanDraftFromResponse(extractResponseText(data), context, draft) || draft,
        order: context.order,
      });
    }

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
              "Use the fixed Albi Trust structure only.",
              "Do not rename, remove, merge, or reorder sections.",
              "Return valid JSON only. Do not wrap it in markdown.",
              `Use this exact JSON schema:\n${JSON.stringify(FIXED_PLAN_JSON_SCHEMA, null, 2)}`,
              adminInstructions ? `Mohamad's instruction for this draft:\n${adminInstructions}` : "",
              knowledgeNotes ? `Mohamad's method notes / uploaded text:\n${knowledgeNotes}` : "",
              "",
              "Paid order data:",
              JSON.stringify(context, null, 2),
            ]
              .filter(Boolean)
              .join("\n\n"),
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

    const draft = normalizePlanDraftFromResponse(extractResponseText(data), context);

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
