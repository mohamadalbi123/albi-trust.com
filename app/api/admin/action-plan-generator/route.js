import { NextResponse } from "next/server";
import {
  getAdminActionPlanGeneratorContext,
  getSessionCookieName,
  getUserFromSessionToken,
  uploadTailoredPlanPdf,
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

function createDraftPdfBuffer({ title, draft }) {
  const sourceLines = [
    title,
    "Generated draft reviewed and delivered by Albi Trust.",
    "",
    ...String(draft || "").split(/\r?\n/),
  ];
  const lines = sourceLines.flatMap((line) => wrapLine(line));
  const linesPerPage = 44;
  const pages = [];

  for (let index = 0; index < lines.length; index += linesPerPage) {
    pages.push(lines.slice(index, index + linesPerPage));
  }

  const objects = [];
  const addObject = (content) => {
    objects.push(content);
    return objects.length;
  };
  const catalogId = addObject("");
  const pagesId = addObject("");
  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds = [];

  pages.forEach((pageLines, pageIndex) => {
    const streamLines = [
      "BT",
      "/F1 11 Tf",
      "50 790 Td",
      "14 TL",
      ...pageLines.map((line, lineIndex) => {
        const text = pdfEscape(line);
        return lineIndex === 0 ? `(${text}) Tj` : `T* (${text}) Tj`;
      }),
      "ET",
      "BT /F1 8 Tf 50 28 Td",
      `(Albi Trust - Page ${pageIndex + 1} of ${pages.length}) Tj`,
      "ET",
    ];
    const stream = streamLines.join("\n");
    const contentId = addObject(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`,
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
      const pdfBuffer = createDraftPdfBuffer({
        title: `Albi Trust Action Plan - ${context.order.fullName || context.order.email}`,
        draft,
      });
      const order = await uploadTailoredPlanPdf({
        orderId,
        fileName: `${displayId}-action-plan.pdf`,
        mimeType: "application/pdf",
        dataBase64: pdfBuffer.toString("base64"),
        size: pdfBuffer.length,
      });

      return NextResponse.json({ ok: true, order });
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
