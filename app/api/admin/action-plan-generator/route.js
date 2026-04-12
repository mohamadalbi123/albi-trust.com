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

const PDF_COLORS = {
  ink: [0.06, 0.13, 0.25],
  accent: [0.09, 0.42, 0.3],
  softText: [0.38, 0.44, 0.56],
  body: [0.18, 0.24, 0.35],
  paper: [1, 1, 1],
  pageTint: [0.97, 0.98, 1],
  line: [0.88, 0.91, 0.96],
  card: [0.95, 0.97, 1],
  cardStrong: [0.92, 0.95, 0.99],
};

const PAGE = {
  width: 612,
  height: 842,
  contentLeft: 56,
  contentRight: 556,
  top: 754,
  bottom: 66,
};

function normalizeInlineText(value) {
  return String(value || "")
    .replace(/\t+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wrapLine(line, maxLength = 92) {
  const words = normalizeInlineText(line).split(" ").filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    if (word.length > maxLength) {
      if (current) {
        lines.push(current);
        current = "";
      }

      for (let index = 0; index < word.length; index += maxLength) {
        lines.push(word.slice(index, index + maxLength));
      }
      continue;
    }

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

function line({ x1, y1, x2, y2, stroke = PDF_COLORS.line, width = 1 }) {
  return `${stroke[0]} ${stroke[1]} ${stroke[2]} RG\n${width} w\n${x1} ${y1} m\n${x2} ${y2} l\nS`;
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
    .replace(/^[-*]\s+/, "")
    .replace(/\*\*/g, "")
    .trim();
}

function drawBrandHeader({ sectionLabel = "Tailored Action Plan" } = {}) {
  return [
    rect({ x: 0, y: 0, width: PAGE.width, height: PAGE.height, fill: PDF_COLORS.paper }),
    rect({ x: 0, y: 772, width: PAGE.width, height: 70, fill: PDF_COLORS.ink }),
    rect({ x: 0, y: 758, width: PAGE.width, height: 14, fill: PDF_COLORS.accent }),
    rect({ x: 56, y: 788, width: 34, height: 34, fill: PDF_COLORS.paper }),
    text({ value: "AT", x: 64, y: 800, size: 13, bold: true, fill: PDF_COLORS.ink }),
    text({ value: "ALBI TRUST", x: 104, y: 806, size: 15, bold: true, fill: PDF_COLORS.paper }),
    text({ value: "Tailored trading performance improvement", x: 104, y: 790, size: 8.5, fill: [0.84, 0.9, 0.97] }),
    text({ value: sectionLabel.toUpperCase(), x: 438, y: 801, size: 8.5, bold: true, fill: PDF_COLORS.paper }),
  ];
}

function contentPageBase({ sectionLabel } = {}) {
  return [
    ...drawBrandHeader({ sectionLabel }),
    line({ x1: 56, y1: 748, x2: 556, y2: 748, stroke: PDF_COLORS.line }),
  ];
}

function drawPageFooter(pageNumber, totalPages) {
  return [
    line({ x1: 56, y1: 44, x2: 556, y2: 44, stroke: PDF_COLORS.line }),
    text({
      value: "Prepared by Albi Trust for internal review before client delivery",
      x: 56,
      y: 28,
      size: 7.5,
      fill: PDF_COLORS.softText,
    }),
    text({
      value: `Page ${pageNumber} of ${totalPages}`,
      x: 500,
      y: 28,
      size: 7.5,
      fill: PDF_COLORS.softText,
    }),
  ];
}

function parseDraftBlocks(draft) {
  const rawLines = String(draft || "").split(/\r?\n/);
  const blocks = [];

  for (const rawLine of rawLines) {
    const original = String(rawLine || "");
    const trimmed = original.trim();

    if (!trimmed) {
      blocks.push({ type: "spacer", size: 10 });
      continue;
    }

    const heading = cleanHeading(original);
    const isHeading = Boolean(heading) && (/^\s*(#{1,6}|\d+\.)/.test(original) || trimmed === trimmed.toUpperCase());
    const isBullet = /^\s*[-*]\s+/.test(original);

    if (isHeading) {
      blocks.push({ type: "heading", text: heading });
      continue;
    }

    if (isBullet) {
      blocks.push({ type: "bullet", text: cleanHeading(original) });
      continue;
    }

    blocks.push({ type: "paragraph", text: normalizeInlineText(trimmed) });
  }

  return blocks;
}

function createCoverPage({ assessment, clientName, orderNumber, traderLevel, primaryWeakness, strongest, overallScore, categoryScores }) {
  const commands = [
    rect({ x: 0, y: 0, width: PAGE.width, height: PAGE.height, fill: PDF_COLORS.pageTint }),
    rect({ x: 0, y: 612, width: PAGE.width, height: 230, fill: PDF_COLORS.ink }),
    rect({ x: 0, y: 590, width: PAGE.width, height: 22, fill: PDF_COLORS.accent }),
    rect({ x: 56, y: 744, width: 44, height: 44, fill: PDF_COLORS.paper }),
    text({ value: "AT", x: 67, y: 759, size: 16, bold: true, fill: PDF_COLORS.ink }),
    text({ value: "ALBI TRUST", x: 114, y: 764, size: 16, bold: true, fill: PDF_COLORS.paper }),
    text({ value: "Tailored Action Plan", x: 56, y: 684, size: 30, bold: true, fill: PDF_COLORS.paper }),
    text({ value: "Structured diagnosis and improvement path for the client.", x: 56, y: 658, size: 11, fill: [0.84, 0.9, 0.97] }),
    text({ value: clientName, x: 56, y: 621, size: 17, bold: true, fill: PDF_COLORS.paper }),
    text({ value: `Order ${orderNumber}`, x: 56, y: 600, size: 10, fill: [0.84, 0.9, 0.97] }),
    rect({ x: 56, y: 486, width: 500, height: 86, fill: PDF_COLORS.paper }),
    text({ value: "Client summary", x: 76, y: 544, size: 10, bold: true, fill: PDF_COLORS.softText }),
    text({ value: traderLevel, x: 76, y: 517, size: 23, bold: true, fill: PDF_COLORS.ink }),
  ];

  if (overallScore !== null) {
    commands.push(
      text({ value: `Assessment score: ${overallScore}/100`, x: 396, y: 544, size: 10, bold: true, fill: PDF_COLORS.softText }),
      rect({ x: 396, y: 510, width: 132, height: 16, fill: PDF_COLORS.line }),
      rect({ x: 396, y: 510, width: Math.max(4, Math.round(132 * (overallScore / 100))), height: 16, fill: PDF_COLORS.accent }),
    );
  }

  commands.push(
    rect({ x: 56, y: 372, width: 238, height: 86, fill: PDF_COLORS.paper }),
    text({ value: "Main blocker", x: 76, y: 430, size: 10, bold: true, fill: PDF_COLORS.softText }),
    ...drawWrappedText({ value: primaryWeakness, x: 76, y: 402, size: 15, bold: true, maxLength: 28, lineHeight: 18, fill: PDF_COLORS.ink }).commands,
    rect({ x: 318, y: 372, width: 238, height: 86, fill: PDF_COLORS.paper }),
    text({ value: "Strongest area", x: 338, y: 430, size: 10, bold: true, fill: PDF_COLORS.softText }),
    ...drawWrappedText({ value: strongest, x: 338, y: 402, size: 15, bold: true, maxLength: 28, lineHeight: 18, fill: PDF_COLORS.ink }).commands,
    text({ value: "Score profile", x: 56, y: 330, size: 16, bold: true, fill: PDF_COLORS.ink }),
  );

  categoryScores.slice(0, 6).forEach((entry, index) => {
    const y = 296 - index * 34;
    const score = typeof entry.score === "number" ? Math.max(0, Math.min(100, entry.score)) : 0;
    commands.push(
      text({ value: entry.label || entry.key || "Category", x: 56, y: y + 7, size: 9.5, bold: true, fill: PDF_COLORS.body }),
      rect({ x: 226, y, width: 250, height: 14, fill: PDF_COLORS.line }),
      rect({ x: 226, y, width: Math.max(3, Math.round(250 * (score / 100))), height: 14, fill: PDF_COLORS.ink }),
      text({ value: `${score}/100`, x: 490, y: y + 2, size: 8.5, bold: true, fill: PDF_COLORS.softText }),
    );
  });

  if (assessment?.level?.focus) {
    commands.push(
      rect({ x: 56, y: 62, width: 500, height: 66, fill: PDF_COLORS.paper }),
      text({ value: "Primary focus now", x: 76, y: 102, size: 10, bold: true, fill: PDF_COLORS.softText }),
      ...drawWrappedText({
        value: assessment.level.focus,
        x: 76,
        y: 79,
        size: 11,
        maxLength: 74,
        lineHeight: 14,
        fill: PDF_COLORS.body,
      }).commands,
    );
  }

  return commands;
}

function createDashboardPage() {
  const dashboard = [
    ...contentPageBase({ sectionLabel: "Action Dashboard" }),
    text({ value: "How Albi Trust reviews a trader", x: 56, y: 716, size: 23, bold: true, fill: PDF_COLORS.ink }),
    text({ value: "Every paid action plan is built around the same four pillars, then adapted to the client's reality.", x: 56, y: 692, size: 10.5, fill: PDF_COLORS.softText }),
  ];

  [
    ["Technical analysis", "Chart clarity, higher-timeframe bias, execution timing, and whether the trader reads context properly."],
    ["Risk management", "Position sizing, stop discipline, drawdown control, and whether capital is protected first."],
    ["Trading plan", "Rules, routine, preparation quality, review process, and whether execution is actually repeatable."],
    ["Psychology", "Loss acceptance, impulse control, patience, emotional regulation, and reaction after mistakes."],
  ].forEach(([heading, body], index) => {
    const x = index % 2 === 0 ? 56 : 316;
    const y = index < 2 ? 554 : 404;
    dashboard.push(
      rect({ x, y, width: 240, height: 108, fill: PDF_COLORS.card }),
      rect({ x, y: y + 98, width: 240, height: 10, fill: index % 2 === 0 ? PDF_COLORS.accent : PDF_COLORS.ink }),
      text({ value: heading, x: x + 18, y: y + 68, size: 13, bold: true, fill: PDF_COLORS.ink }),
      ...drawWrappedText({
        value: body,
        x: x + 18,
        y: y + 43,
        size: 9.5,
        maxLength: 32,
        lineHeight: 12.5,
        fill: PDF_COLORS.body,
      }).commands,
    );
  });

  dashboard.push(
    text({ value: "Routine structure we normally reinforce", x: 56, y: 340, size: 16, bold: true, fill: PDF_COLORS.ink }),
    rect({ x: 56, y: 246, width: 145, height: 64, fill: PDF_COLORS.paper }),
    text({ value: "Weekend review", x: 74, y: 284, size: 11.5, bold: true, fill: PDF_COLORS.ink }),
    text({ value: "Bias, levels, calendar", x: 74, y: 264, size: 8.8, fill: PDF_COLORS.softText }),
    rect({ x: 233, y: 246, width: 145, height: 64, fill: PDF_COLORS.paper }),
    text({ value: "Daily prep", x: 251, y: 284, size: 11.5, bold: true, fill: PDF_COLORS.ink }),
    text({ value: "Rules, timing, focus check", x: 251, y: 264, size: 8.8, fill: PDF_COLORS.softText }),
    rect({ x: 410, y: 246, width: 145, height: 64, fill: PDF_COLORS.paper }),
    text({ value: "Review + reminders", x: 428, y: 284, size: 11.5, bold: true, fill: PDF_COLORS.ink }),
    text({ value: "Journal and phone prompts", x: 428, y: 264, size: 8.8, fill: PDF_COLORS.softText }),
    line({ x1: 201, y1: 278, x2: 233, y2: 278, stroke: PDF_COLORS.accent, width: 3 }),
    line({ x1: 378, y1: 278, x2: 410, y2: 278, stroke: PDF_COLORS.accent, width: 3 }),
    rect({ x: 56, y: 108, width: 500, height: 94, fill: PDF_COLORS.cardStrong }),
    text({ value: "What the plan should feel like", x: 76, y: 171, size: 11, bold: true, fill: PDF_COLORS.softText }),
    ...drawWrappedText({
      value: "Not generic motivation. The final action plan should read like a focused diagnosis and a realistic correction path: clear priorities, practical routines, capital protection, and behavior change linked to the trader's actual weaknesses.",
      x: 76,
      y: 146,
      size: 10.5,
      maxLength: 79,
      lineHeight: 14,
      fill: PDF_COLORS.body,
    }).commands,
  );

  return dashboard;
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
  pageStreams.push(
    createCoverPage({
      assessment,
      clientName,
      orderNumber,
      traderLevel,
      primaryWeakness,
      strongest,
      overallScore,
      categoryScores,
    }).join("\n"),
  );
  pageStreams.push(createDashboardPage().join("\n"));

  const blocks = parseDraftBlocks(draft);
  let page = contentPageBase({ sectionLabel: "Client Plan" });
  let y = PAGE.top;

  function ensureSpace(requiredHeight, nextSectionLabel = "Client Plan") {
    if (y - requiredHeight >= PAGE.bottom) {
      return;
    }

    pageStreams.push(page.join("\n"));
    page = contentPageBase({ sectionLabel: nextSectionLabel });
    y = PAGE.top;
  }

  for (const block of blocks) {
    if (block.type === "spacer") {
      y -= block.size;
      continue;
    }

    if (block.type === "heading") {
      ensureSpace(40, "Client Plan");
      page.push(
        rect({ x: 56, y: y - 8, width: 500, height: 30, fill: PDF_COLORS.card }),
        rect({ x: 56, y: y - 8, width: 6, height: 30, fill: PDF_COLORS.accent }),
        ...drawWrappedText({
          value: block.text,
          x: 74,
          y: y + 2,
          size: 13.5,
          bold: true,
          maxLength: 56,
          lineHeight: 16,
          fill: PDF_COLORS.ink,
        }).commands,
      );
      y -= 40;
      continue;
    }

    if (block.type === "bullet") {
      const wrapped = drawWrappedText({
        value: block.text,
        x: 86,
        y,
        size: 10.4,
        maxLength: 80,
        lineHeight: 14,
        fill: PDF_COLORS.body,
      });
      ensureSpace((wrapped.commands.length / 2) * 14 + 8, "Client Plan");
      page.push(
        text({ value: "-", x: 72, y, size: 13, bold: true, fill: PDF_COLORS.accent }),
        ...drawWrappedText({
          value: block.text,
          x: 86,
          y,
          size: 10.4,
          maxLength: 80,
          lineHeight: 14,
          fill: PDF_COLORS.body,
        }).commands,
      );
      y = wrapped.y - 4;
      continue;
    }

    const paragraph = drawWrappedText({
      value: block.text,
      x: 56,
      y,
      size: 10.4,
      maxLength: 92,
      lineHeight: 14,
      fill: PDF_COLORS.body,
    });
    ensureSpace((paragraph.commands.length / 2) * 14 + 6, "Client Plan");
    page.push(
      ...drawWrappedText({
        value: block.text,
        x: 56,
        y,
        size: 10.4,
        maxLength: 92,
        lineHeight: 14,
        fill: PDF_COLORS.body,
      }).commands,
    );
    y = paragraph.y - 6;
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
      ...drawPageFooter(pageIndex + 1, pageStreams.length),
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
