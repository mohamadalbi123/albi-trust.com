import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { sendActionPlanDeliveredEmail } from "../../../lib/email";
import {
  getAdminActionPlanGeneratorContext,
  getSessionCookieName,
  getUserFromSessionToken,
  uploadTailoredPlanPdf,
} from "../../../lib/localAuth";

const DEFAULT_ADMIN_EMAIL = "mohalbi123@hotmail.com";
let cachedCourseKnowledge = null;

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
    "Every action plan must follow this exact structure:",
    "Write it like a professional client-facing financial coaching document: clear section titles, concise paragraphs, practical tables/lists, and no messy free-form essay style.",
    "1. Cover summary.",
    "2. Trader profile based on the paid intake answers and the 30-question assessment.",
    "3. Main weakness.",
    "4. Main strength.",
    "5. Four-pillar trading analysis:",
    "- Technical analysis: what the trader is doing well and what needs improvement.",
    "- Risk management: what the trader is doing well and what needs improvement.",
    "- Trading plan: what the trader is doing well and what needs improvement.",
    "- Psychology: what the trader is doing well and what needs improvement.",
    "6. Root cause.",
    "7. Daily routine to follow in order to see improvement. This must be one standalone section that is clearly doable, with weekly routine first, then daily routine, then phone reminders/check-ins.",
    "The daily routine must include a weekly routine: set 1-2 hours during the weekend while markets are closed, review weekly charts for the traded assets, read COT where relevant, check the economic calendar, keep a saved seasonality file by month and asset, review that seasonality each weekend, then draw levels from monthly, weekly, and 4H charts and set alerts without going smaller. Explain that this focused weekend session builds the bias for the week.",
    "The daily routine must adapt to the client's life, country, session, work status, and whether trading is main income. If the client is in Europe, mention how London, US, and Asia session timing can shape the routine. Use examples only when they fit the client.",
    "Tell the trader to use the iPhone Reminders app, or a similar reminders/tasks app on Android or other phone brands, to schedule the weekly routine, daily trading rules review, economic calendar check, journaling reminder, and any planned candle-close check-ins. Make reminders practical and tied to the client's routine.",
    "When discussing execution, explain that many openings can involve manipulation or opposite-direction movement before distribution. Mention accumulation, manipulation, and distribution conceptually.",
    "If the client is a scalper, suggest monitor discipline and strict session rules. If the client is a day trader, suggest executing according to plan, then stepping away from the screen to avoid moving stops or closing emotionally, checking only at planned candle closes that fit their strategy.",
    "8. Trading rules the trader must write into their daily routine. Include examples such as reading rules, checking news, seasonality, and the economic calendar, but do not pretend to know exact rules the client did not give.",
    "9. What to stop doing.",
    "10. What to track.",
    "11. Course-based actionable advice. This must be one clear section using the Albi Trust course/book ideas. Give specific actions the client can do, for example to avoid overtrading, accept losses, strengthen discipline, improve risk management, or stop emotional decisions. Match the actions to the client's weakness instead of listing generic tips.",
    "12. Final notes.",
    "Use Mohamad's coaching voice: clear, serious, practical, and focused on behavior change.",
  ].join("\n");
}

function clippedText(value, maxLength = 60000) {
  return String(value || "").trim().slice(0, maxLength);
}

function pdfEscape(value) {
  return String(value || "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function wrapLine(line, maxLength = 92) {
  const words = String(line || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  return current ? lines.concat(current) : [""];
}

function color([r, g, b]) {
  return `${r} ${g} ${b} rg`;
}

function rect({ x, y, width, height, fill }) {
  return `${color(fill)}\n${x} ${y} ${width} ${height} re f`;
}

function text({ value, x, y, size = 11, bold = false, fill = [0.06, 0.13, 0.25] }) {
  return `${color(fill)}\nBT\n/${bold ? "F2" : "F1"} ${size} Tf\n${x} ${y} Td\n(${pdfEscape(value)}) Tj\nET`;
}

function drawWrappedText({ value, x, y, size = 11, bold = false, maxLength = 86, lineHeight = 15, fill }) {
  const commands = [];
  let nextY = y;

  wrapLine(value, maxLength).forEach((line) => {
    commands.push(text({ value: line, x, y: nextY, size, bold, fill }));
    nextY -= lineHeight;
  });

  return { commands, y: nextY };
}

function cleanHeading(value) {
  return String(value || "")
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\d+\.\s*/, "")
    .replace(/\*\*/g, "")
    .trim();
}

function contentPageBase() {
  return [
    rect({ x: 0, y: 0, width: 612, height: 842, fill: [1, 1, 1] }),
    rect({ x: 0, y: 800, width: 612, height: 42, fill: [0.06, 0.13, 0.25] }),
    text({ value: "ALBI TRUST ACTION PLAN", x: 50, y: 815, size: 10, bold: true, fill: [1, 1, 1] }),
  ];
}

function createDraftPdfBuffer({ draft, context }) {
  const assessment = context?.order?.assessmentSnapshot || {};
  const clientName = context?.order?.fullName || context?.order?.email || "Client";
  const orderNumber = context?.order?.displayId || context?.order?.id || "";
  const traderLevel = assessment.level?.title || context?.order?.traderLevel || "Not available";
  const primaryWeakness = assessment.primaryWeakness?.label || "Not available";
  const strongest = assessment.strongest?.label || "Not available";
  const overallScore = typeof assessment.overallScore === "number" ? assessment.overallScore : null;
  const categoryScores = Array.isArray(assessment.categoryScores) ? assessment.categoryScores : [];
  const pageStreams = [];
  const cover = [
    rect({ x: 0, y: 0, width: 612, height: 842, fill: [0.95, 0.97, 1] }),
    rect({ x: 0, y: 720, width: 612, height: 122, fill: [0.06, 0.13, 0.25] }),
    rect({ x: 50, y: 764, width: 42, height: 42, fill: [1, 1, 1] }),
    text({ value: "AT", x: 62, y: 778, size: 15, bold: true, fill: [0.06, 0.13, 0.25] }),
    text({ value: "ALBI TRUST", x: 108, y: 790, size: 13, bold: true, fill: [1, 1, 1] }),
    text({ value: "Tailored Action Plan", x: 50, y: 690, size: 28, bold: true }),
    text({ value: clientName, x: 50, y: 662, size: 16, bold: true, fill: [0.13, 0.22, 0.38] }),
    text({ value: `Order ${orderNumber}`, x: 50, y: 640, size: 10, fill: [0.38, 0.44, 0.56] }),
    rect({ x: 50, y: 550, width: 512, height: 70, fill: [1, 1, 1] }),
    text({ value: "Top summary", x: 70, y: 592, size: 12, bold: true }),
    text({ value: traderLevel, x: 70, y: 570, size: 20, bold: true }),
    rect({ x: 50, y: 450, width: 246, height: 76, fill: [1, 1, 1] }),
    text({ value: "Main blocker", x: 70, y: 500, size: 11, bold: true, fill: [0.38, 0.44, 0.56] }),
    ...drawWrappedText({ value: primaryWeakness, x: 70, y: 478, size: 15, bold: true, maxLength: 28, lineHeight: 18 }).commands,
    rect({ x: 316, y: 450, width: 246, height: 76, fill: [1, 1, 1] }),
    text({ value: "Strongest area", x: 336, y: 500, size: 11, bold: true, fill: [0.38, 0.44, 0.56] }),
    ...drawWrappedText({ value: strongest, x: 336, y: 478, size: 15, bold: true, maxLength: 28, lineHeight: 18 }).commands,
  ];

  if (overallScore !== null) {
    cover.push(
      rect({ x: 50, y: 390, width: 512, height: 24, fill: [0.86, 0.9, 0.96] }),
      rect({ x: 50, y: 390, width: Math.max(1, Math.round(512 * (overallScore / 100))), height: 24, fill: [0.09, 0.42, 0.3] }),
      text({ value: `Overall score: ${overallScore}/100`, x: 50, y: 424, size: 12, bold: true }),
    );
  }

  cover.push(text({ value: "Score profile", x: 50, y: 350, size: 15, bold: true }));

  categoryScores.slice(0, 6).forEach((entry, index) => {
    const y = 320 - index * 34;
    const score = typeof entry.score === "number" ? Math.max(0, Math.min(100, entry.score)) : 0;
    cover.push(
      text({ value: entry.label || entry.key || "Category", x: 50, y: y + 8, size: 10, bold: true }),
      rect({ x: 220, y, width: 270, height: 14, fill: [0.86, 0.9, 0.96] }),
      rect({ x: 220, y, width: Math.max(1, Math.round(270 * (score / 100))), height: 14, fill: [0.06, 0.13, 0.25] }),
      text({ value: `${score}/100`, x: 505, y: y + 2, size: 9, bold: true, fill: [0.38, 0.44, 0.56] }),
    );
  });

  cover.push(
    text({
      value: "Prepared for review and delivery by Albi Trust.",
      x: 50,
      y: 60,
      size: 9,
      fill: [0.38, 0.44, 0.56],
    }),
  );
  pageStreams.push(cover.join("\n"));

  const dashboard = [
    rect({ x: 0, y: 0, width: 612, height: 842, fill: [0.98, 0.99, 1] }),
    rect({ x: 0, y: 800, width: 612, height: 42, fill: [0.06, 0.13, 0.25] }),
    text({ value: "ACTION DASHBOARD", x: 50, y: 815, size: 10, bold: true, fill: [1, 1, 1] }),
    text({ value: "The four pillars we use to coach the trader", x: 50, y: 758, size: 20, bold: true }),
  ];
  [
    ["Technical analysis", "Clarity of levels, context, timing, and chart behavior."],
    ["Risk management", "Position size, drawdown limits, stop discipline, and capital protection."],
    ["Trading plan", "Rules, routine, review process, session plan, and repeatable execution."],
    ["Psychology", "Loss acceptance, overtrading control, patience, and emotional discipline."],
  ].forEach(([heading, body], index) => {
    const x = index % 2 === 0 ? 50 : 316;
    const yCard = index < 2 ? 640 : 515;
    dashboard.push(
      rect({ x, y: yCard, width: 246, height: 92, fill: [1, 1, 1] }),
      rect({ x, y: yCard + 86, width: 246, height: 6, fill: index % 2 === 0 ? [0.09, 0.42, 0.3] : [0.06, 0.13, 0.25] }),
      text({ value: heading, x: x + 18, y: yCard + 58, size: 13, bold: true }),
      ...drawWrappedText({ value: body, x: x + 18, y: yCard + 36, size: 9.5, maxLength: 32, lineHeight: 12, fill: [0.38, 0.44, 0.56] }).commands,
    );
  });
  dashboard.push(
    text({ value: "Routine map", x: 50, y: 445, size: 17, bold: true }),
    rect({ x: 50, y: 365, width: 150, height: 54, fill: [1, 1, 1] }),
    text({ value: "Weekend", x: 68, y: 397, size: 12, bold: true }),
    text({ value: "1-2h weekly review", x: 68, y: 378, size: 9, fill: [0.38, 0.44, 0.56] }),
    rect({ x: 231, y: 365, width: 150, height: 54, fill: [1, 1, 1] }),
    text({ value: "Daily", x: 249, y: 397, size: 12, bold: true }),
    text({ value: "Rules and calendar", x: 249, y: 378, size: 9, fill: [0.38, 0.44, 0.56] }),
    rect({ x: 412, y: 365, width: 150, height: 54, fill: [1, 1, 1] }),
    text({ value: "Reminders", x: 430, y: 397, size: 12, bold: true }),
    text({ value: "Phone check-ins", x: 430, y: 378, size: 9, fill: [0.38, 0.44, 0.56] }),
    rect({ x: 200, y: 389, width: 31, height: 4, fill: [0.09, 0.42, 0.3] }),
    rect({ x: 381, y: 389, width: 31, height: 4, fill: [0.09, 0.42, 0.3] }),
    text({ value: "Course-based action focus", x: 50, y: 300, size: 17, bold: true }),
    rect({ x: 50, y: 205, width: 512, height: 70, fill: [1, 1, 1] }),
    ...drawWrappedText({
      value: "The final plan must translate the Albi Trust course into specific actions for this trader: avoid overtrading, accept controlled losses, protect capital, follow one plan, and track repeated mistakes.",
      x: 70,
      y: 248,
      size: 11,
      maxLength: 78,
      lineHeight: 15,
      fill: [0.18, 0.24, 0.35],
    }).commands,
  );
  pageStreams.push(dashboard.join("\n"));

  const draftLines = String(draft || "").split(/\r?\n/);
  let page = contentPageBase();
  let y = 760;

  for (const rawLine of draftLines) {
    const cleanLine = cleanHeading(rawLine);
    const isHeading = Boolean(cleanLine) && (/^\s*(#{1,6}|\d+\.)/.test(rawLine) || rawLine === rawLine.toUpperCase());
    const wrapped = drawWrappedText({
      value: cleanLine,
      x: 50,
      y,
      size: isHeading ? 14 : 10.5,
      bold: isHeading,
      maxLength: isHeading ? 62 : 92,
      lineHeight: isHeading ? 18 : 14,
      fill: isHeading ? [0.06, 0.13, 0.25] : [0.18, 0.24, 0.35],
    });

    if (y < 88 || wrapped.y < 76) {
      pageStreams.push(page.join("\n"));
      page = contentPageBase();
      y = 760;
      const nextWrapped = drawWrappedText({
        value: cleanLine,
        x: 50,
        y,
        size: isHeading ? 14 : 10.5,
        bold: isHeading,
        maxLength: isHeading ? 62 : 92,
        lineHeight: isHeading ? 18 : 14,
        fill: isHeading ? [0.06, 0.13, 0.25] : [0.18, 0.24, 0.35],
      });
      if (isHeading) {
        page.push(
          rect({ x: 44, y: y - 8, width: 524, height: 28, fill: [0.95, 0.97, 1] }),
          rect({ x: 44, y: y - 8, width: 5, height: 28, fill: [0.09, 0.42, 0.3] }),
        );
      }
      page.push(...nextWrapped.commands);
      y = nextWrapped.y - (isHeading ? 8 : 3);
    } else {
      if (isHeading) {
        page.push(
          rect({ x: 44, y: y - 8, width: 524, height: 28, fill: [0.95, 0.97, 1] }),
          rect({ x: 44, y: y - 8, width: 5, height: 28, fill: [0.09, 0.42, 0.3] }),
        );
      }
      page.push(...wrapped.commands);
      y = wrapped.y - (isHeading ? 8 : 3);
    }
  }

  const objects = [];
  const addObject = (content) => {
    objects.push(content);
    return objects.length;
  };
  const catalogId = addObject("");
  const pagesId = addObject("");
  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const boldFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageIds = [];

  pageStreams.push(page.join("\n"));

  pageStreams.forEach((pageContent, pageIndex) => {
    const stream = [
      pageContent,
      text({
        value: `Albi Trust - Page ${pageIndex + 1} of ${pageStreams.length}`,
        x: 50,
        y: 28,
        size: 8,
        fill: [0.38, 0.44, 0.56],
      }),
    ].join("\n");
    const contentId = addObject(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    pageIds.push(pageId);
  });

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((content, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${content}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf);
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

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required." }, { status: 400 });
    }

    const context = await getAdminActionPlanGeneratorContext(orderId);

    if (action === "deliver_draft" || action === "preview_pdf") {
      const draft = String(body.draft || "").trim();

      if (!draft) {
        return NextResponse.json({ error: "Draft text is required." }, { status: 400 });
      }

      const displayId = context.order.displayId || context.order.id;
      const pdfBuffer = createDraftPdfBuffer({
        draft,
        context,
      });

      if (action === "preview_pdf") {
        return NextResponse.json({
          ok: true,
          fileName: `${displayId}-action-plan-preview.pdf`,
          dataBase64: pdfBuffer.toString("base64"),
        });
      }

      const order = await uploadTailoredPlanPdf({
        orderId,
        fileName: `${displayId}-action-plan.pdf`,
        mimeType: "application/pdf",
        dataBase64: pdfBuffer.toString("base64"),
        size: pdfBuffer.length,
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
                "Return the full revised draft, not only the changed parts.",
                adminInstructions ? `Mohamad's revision instruction:\n${adminInstructions}` : "",
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
        draft: extractResponseText(data) || draft,
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
              "Use these sections:",
              "1. Client snapshot",
              "2. Main behavioral diagnosis",
              "3. Why this trader is stuck",
              "4. 30-day correction plan",
              "5. Trading rules",
              "6. Daily routine",
              "7. What Mohamad should review before sending",
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
