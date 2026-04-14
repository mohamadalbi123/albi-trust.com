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

function textList(value, minimum = 0) {
  const items = Array.isArray(value)
    ? value.map((entry) => normalizeInlineText(entry)).filter(Boolean)
    : [];

  while (items.length < minimum) {
    items.push("To be refined during final review.");
  }

  return items;
}

function textValue(value, fallback = "To be refined during final review.") {
  return normalizeInlineText(value) || fallback;
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

function formatStructuredDraft(plan, context) {
  const assessment = context?.order?.assessmentSnapshot || {};
  const intake = context?.order?.intake || {};
  const clientName = textValue(context?.order?.fullName, "Client");
  const preparedDate = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
  const marketsTraded = Array.isArray(intake?.tradedAssets)
    ? intake.tradedAssets.filter(Boolean).join(" / ")
    : textValue(intake?.tradedAssets, "To be confirmed");
  const tradingSession = Array.isArray(intake?.tradingSession)
    ? intake.tradingSession.filter(Boolean).join(" / ")
    : textValue(intake?.tradingSession, "To be confirmed");

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
    `- **Experience Level:** ${textValue(plan?.traderProfileOverview?.experienceLevel, intake?.tradingYears || "To be confirmed")}`,
    `- **Profitability Status:** ${textValue(plan?.traderProfileOverview?.profitabilityStatus, intake?.profitableBefore || "To be confirmed")}`,
    `- **Markets Traded:** ${textValue(plan?.traderProfileOverview?.marketsTraded, marketsTraded || "To be confirmed")}`,
    `- **Trading Session:** ${textValue(plan?.traderProfileOverview?.tradingSession, tradingSession || "To be confirmed")}`,
    `- **Holding Style:** ${textValue(plan?.traderProfileOverview?.holdingStyle, intake?.averageHoldingTime || "To be confirmed")}`,
    `- **Risk Per Trade:** ${textValue(plan?.traderProfileOverview?.riskPerTrade, intake?.riskPerTrade || "To be confirmed")}`,
    `- **Trading Environment:** ${textValue(plan?.traderProfileOverview?.tradingEnvironment, intake?.currentWorkStatus || "To be confirmed")}`,
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
    textValue(
      plan?.biggestBlockerAndSolution?.problem,
      assessment?.primaryWeakness?.label || "Biggest blocker to be refined during final review.",
    ),
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
  top: 724,
  bottom: 66,
};

function normalizeInlineText(value) {
  return String(value || "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
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

function diamond({ cx, cy, radius, fill }) {
  const top = `${cx} ${cy + radius} m`;
  const right = `${cx + radius} ${cy} l`;
  const bottom = `${cx} ${cy - radius} l`;
  const left = `${cx - radius} ${cy} l`;
  return `${color(fill)}\n${top}\n${right}\n${bottom}\n${left}\nh\nf`;
}

function outlineRect({ x, y, width, height, stroke = PDF_COLORS.line, lineWidth = 1 }) {
  return `${stroke[0]} ${stroke[1]} ${stroke[2]} RG\n${lineWidth} w\n${x} ${y} ${width} ${height} re S`;
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
    .replace(/^📊\s*/, "")
    .replace(/^🔍\s*/, "")
    .replace(/^📌\s*/, "")
    .replace(/^📅\s*/, "")
    .replace(/^🏆\s*/, "")
    .replace(/^🚧\s*/, "")
    .replace(/^📣\s*/, "")
    .trim();
}

function drawPdfBrandMark({ x, y, size = 34 }) {
  const accentSize = size >= 40 ? 9 : 8;
  const accentOffset = size >= 40 ? 7 : 6;
  const glyphSize = size >= 40 ? 15.5 : 12.8;
  const glyphX = x + (size >= 40 ? 10.5 : 8);
  const glyphY = y + (size >= 40 ? 15.5 : 12.5);

  return [
    rect({ x, y, width: size, height: size, fill: [0.985, 0.989, 0.997] }),
    outlineRect({ x, y, width: size, height: size, stroke: [0.9, 0.92, 0.96], lineWidth: 1 }),
    diamond({
      cx: x + size - accentOffset,
      cy: y + size - accentOffset,
      radius: accentSize / 2,
      fill: [0.79, 0.6, 0.27],
    }),
    text({ value: "AT", x: glyphX, y: glyphY, size: glyphSize, bold: true, fill: PDF_COLORS.ink }),
  ];
}

function drawBrandHeader({ sectionLabel = "Tailored Action Plan" } = {}) {
  return [
    rect({ x: 0, y: 0, width: PAGE.width, height: PAGE.height, fill: PDF_COLORS.paper }),
    rect({ x: 0, y: 772, width: PAGE.width, height: 70, fill: PDF_COLORS.paper }),
    line({ x1: 56, y1: 770, x2: 556, y2: 770, stroke: PDF_COLORS.line }),
    ...drawPdfBrandMark({ x: 56, y: 786, size: 38 }),
    text({ value: "ALBI TRUST", x: 106, y: 808, size: 14.2, bold: true, fill: PDF_COLORS.ink }),
    text({ value: "Tailored trading performance improvement", x: 106, y: 792, size: 8.2, fill: PDF_COLORS.softText }),
    text({ value: sectionLabel.toUpperCase(), x: 441, y: 804, size: 8.2, bold: true, fill: PDF_COLORS.softText }),
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

    if (/^\s*---+\s*$/.test(trimmed)) {
      blocks.push({ type: "divider" });
      continue;
    }

    const heading = cleanHeading(original);
    const isHeading = Boolean(heading) && (/^\s*(#{1,6}|\d+\.)/.test(original) || trimmed === trimmed.toUpperCase());
    const isBullet = /^\s*[-*]\s+/.test(original);
    const isNumbered = /^\s*\d+\.\s+/.test(original);

    if (isHeading) {
      blocks.push({ type: "heading", text: heading });
      continue;
    }

    if (isBullet) {
      blocks.push({ type: "bullet", text: cleanHeading(original) });
      continue;
    }

    if (isNumbered) {
      const match = original.match(/^\s*(\d+)\.\s+(.*)$/);
      blocks.push({
        type: "numbered",
        number: match?.[1] || "",
        text: cleanHeading(match?.[2] || original),
      });
      continue;
    }

    blocks.push({ type: "paragraph", text: normalizeInlineText(trimmed) });
  }

  return blocks;
}

function createDraftPdfBuffer({ draft, context }) {
  const pageStreams = [];
  const blocks = parseDraftBlocks(draft);
  let page = contentPageBase({ sectionLabel: "Client Report" });
  let y = 726;

  function ensureSpace(requiredHeight, nextSectionLabel = "Client Report") {
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

    if (block.type === "divider") {
      ensureSpace(18, "Client Report");
      page.push(line({ x1: 56, y1: y, x2: 556, y2: y, stroke: PDF_COLORS.line }));
      y -= 18;
      continue;
    }

    if (block.type === "heading") {
      const isMainTitle = cleanHeading(block.text).toLowerCase() === "personalized trading action plan";

      if (isMainTitle) {
        ensureSpace(68, "Client Report");
        page.push(
          ...drawWrappedText({
            value: block.text,
            x: 56,
            y,
            size: 23,
            bold: true,
            maxLength: 36,
            lineHeight: 26,
            fill: PDF_COLORS.ink,
          }).commands,
        );
        y -= 40;
        continue;
      }

      ensureSpace(40, "Client Report");
      page.push(
        rect({ x: 56, y: y - 8, width: 500, height: 30, fill: [0.985, 0.989, 0.997] }),
        rect({ x: 56, y: y - 8, width: 4, height: 30, fill: PDF_COLORS.accent }),
        ...drawWrappedText({
          value: block.text,
          x: 72,
          y: y + 2,
          size: 13.5,
          bold: true,
          maxLength: 58,
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
      ensureSpace((wrapped.commands.length / 2) * 14 + 8, "Client Report");
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

    if (block.type === "numbered") {
      const wrapped = drawWrappedText({
        value: block.text,
        x: 86,
        y,
        size: 10.4,
        maxLength: 80,
        lineHeight: 14,
        fill: PDF_COLORS.body,
      });
      ensureSpace((wrapped.commands.length / 2) * 14 + 8, "Client Report");
      page.push(
        text({ value: `${block.number || ""}.`, x: 66, y, size: 10.6, bold: true, fill: PDF_COLORS.accent }),
        ...wrapped.commands,
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
    ensureSpace((paragraph.commands.length / 2) * 14 + 6, "Client Report");
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
    const chatHistory = sanitizeChatHistory(body.chatHistory);

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
