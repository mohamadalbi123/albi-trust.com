function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatInline(value) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

function cleanLine(value) {
  return String(value || "").replace(/\s+$/g, "");
}

function parseTableRow(line) {
  return String(line || "")
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isTableDivider(line) {
  const cells = parseTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function renderTable(lines) {
  const rows = lines.map(parseTableRow).filter((row) => row.length);

  if (!rows.length) {
    return "";
  }

  const [headerRow, ...bodyRows] = rows;
  const normalizedBodyRows = bodyRows[0] && isTableDivider(lines[1]) ? bodyRows.slice(1) : bodyRows;

  return `
    <div class="report-table-wrap">
      <table class="report-table">
        <thead>
          <tr>${headerRow.map((cell) => `<th>${formatInline(cell)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${normalizedBodyRows
            .map((row) => `<tr>${row.map((cell) => `<td>${formatInline(cell)}</td>`).join("")}</tr>`)
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function parseDraftBlocks(draft) {
  const lines = String(draft || "").split(/\r?\n/);
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const raw = cleanLine(lines[index]);
    const trimmed = raw.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      blocks.push({ type: "divider" });
      index += 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      index += 1;
      continue;
    }

    if (trimmed.startsWith("|")) {
      const tableLines = [];
      while (index < lines.length && cleanLine(lines[index]).trim().startsWith("|")) {
        tableLines.push(cleanLine(lines[index]).trim());
        index += 1;
      }
      blocks.push({ type: "table", lines: tableLines });
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      const items = [];
      while (index < lines.length) {
        const match = cleanLine(lines[index]).trim().match(/^[-*]\s+(.+)$/);
        if (!match) break;
        items.push(match[1].trim());
        index += 1;
      }
      blocks.push({ type: "bulletList", items });
      continue;
    }

    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      const items = [];
      while (index < lines.length) {
        const match = cleanLine(lines[index]).trim().match(/^(\d+)\.\s+(.+)$/);
        if (!match) break;
        items.push(match[2].trim());
        index += 1;
      }
      blocks.push({ type: "numberedList", items });
      continue;
    }

    const paragraphLines = [];
    while (index < lines.length) {
      const candidate = cleanLine(lines[index]);
      const candidateTrimmed = candidate.trim();

      if (
        !candidateTrimmed ||
        /^---+$/.test(candidateTrimmed) ||
        /^(#{1,4})\s+/.test(candidateTrimmed) ||
        candidateTrimmed.startsWith("|") ||
        /^[-*]\s+/.test(candidateTrimmed) ||
        /^\d+\.\s+/.test(candidateTrimmed)
      ) {
        break;
      }

      paragraphLines.push(candidateTrimmed);
      index += 1;
    }

    blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
  }

  return blocks;
}

function renderBlock(block) {
  if (block.type === "divider") {
    return `<hr class="report-divider" />`;
  }

  if (block.type === "heading") {
    const tag = block.level === 1 ? "h1" : block.level === 2 ? "h2" : block.level === 3 ? "h3" : "h4";
    return `<${tag} class="report-${tag}">${formatInline(block.text)}</${tag}>`;
  }

  if (block.type === "paragraph") {
    if (/^\*\*[^*]+:\*\*/.test(block.text)) {
      return `<p class="report-meta-line">${formatInline(block.text)}</p>`;
    }

    return `<p class="report-paragraph">${formatInline(block.text)}</p>`;
  }

  if (block.type === "bulletList") {
    return `<ul class="report-list">${block.items.map((item) => `<li>${formatInline(item)}</li>`).join("")}</ul>`;
  }

  if (block.type === "numberedList") {
    return `<ol class="report-list report-list-numbered">${block.items.map((item) => `<li>${formatInline(item)}</li>`).join("")}</ol>`;
  }

  if (block.type === "table") {
    return renderTable(block.lines);
  }

  return "";
}

function reportStyles(showToolbar) {
  return `
    :root {
      color-scheme: light;
      --report-ink: #10213f;
      --report-muted: #546b92;
      --report-line: #d9e3f1;
      --report-soft: #f6f9ff;
      --report-soft-strong: #eef4fd;
      --report-accent: #c99a44;
      --report-accent-deep: #1f7a63;
    }

    * {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #edf2f8;
      color: var(--report-ink);
      font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    }

    body {
      ${showToolbar ? "padding: 24px;" : "padding: 0;"}
    }

    .report-preview-shell {
      max-width: 1100px;
      margin: 0 auto;
    }

    .report-toolbar {
      ${showToolbar ? "display: flex;" : "display: none;"}
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin: 0 auto 18px;
      padding: 14px 18px;
      border: 1px solid rgba(16, 33, 63, 0.08);
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.92);
      box-shadow: 0 18px 48px rgba(16, 33, 63, 0.08);
    }

    .report-toolbar-copy {
      display: grid;
      gap: 4px;
    }

    .report-toolbar-copy strong {
      font-size: 0.96rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .report-toolbar-copy span {
      color: var(--report-muted);
      font-size: 0.92rem;
    }

    .report-toolbar button {
      border: 0;
      border-radius: 999px;
      background: var(--report-ink);
      color: #ffffff;
      font: inherit;
      font-weight: 700;
      padding: 12px 18px;
      cursor: pointer;
    }

    .report-paper {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #ffffff;
      box-shadow: 0 28px 80px rgba(16, 33, 63, 0.16);
      padding: 0 16mm 20mm;
    }

    .report-header {
      display: flex;
      align-items: flex-start;
      justify-content: flex-start;
      gap: 20px;
      padding: 18mm 0 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.16);
      margin-bottom: 26px;
      background: linear-gradient(180deg, #162744, #10213f 72%);
      margin-left: -16mm;
      margin-right: -16mm;
      padding-left: 16mm;
      padding-right: 16mm;
    }

    .report-brand {
      display: inline-flex;
      align-items: center;
      gap: 14px;
    }

    .report-brand-mark {
      width: 56px;
      height: 56px;
      border-radius: 18px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: #10173d;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 14px 32px rgba(2, 7, 23, 0.22);
    }

    .report-brand-mark img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
    }

    .report-brand-copy {
      display: grid;
      gap: 4px;
    }

    .report-brand-copy strong {
      font-size: 1.05rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #ffffff;
    }

    .report-brand-copy span {
      color: rgba(233, 240, 250, 0.82);
      font-size: 0.9rem;
    }

    .report-intro {
      margin-top: -6px;
      margin-bottom: 22px;
      padding: 0 0 18px;
      border-bottom: 1px solid var(--report-line);
    }

    .report-intro .report-h1 {
      margin-bottom: 14px;
    }

    .report-intro .report-meta-line {
      margin-bottom: 6px;
      font-size: 0.95rem;
      color: #395279;
    }

    .report-h1,
    .report-h2,
    .report-h3,
    .report-h4 {
      font-family: Georgia, "Times New Roman", serif;
      color: var(--report-ink);
      margin: 0;
      page-break-after: avoid;
    }

    .report-h1 {
      font-size: 2rem;
      line-height: 1.15;
      margin-bottom: 16px;
    }

    .report-h2 {
      font-size: 1.34rem;
      line-height: 1.25;
      margin-top: 28px;
      margin-bottom: 14px;
      padding: 12px 16px;
      border-radius: 16px;
      background: linear-gradient(180deg, var(--report-soft), #fbfdff);
      border-left: 4px solid var(--report-accent-deep);
    }

    .report-h3 {
      font-size: 1.07rem;
      line-height: 1.3;
      margin-top: 20px;
      margin-bottom: 12px;
    }

    .report-h4 {
      font-size: 0.98rem;
      line-height: 1.3;
      margin-top: 18px;
      margin-bottom: 10px;
      color: #29466f;
    }

    .report-meta-line,
    .report-paragraph {
      margin: 0 0 12px;
      font-size: 0.98rem;
      line-height: 1.72;
      color: #203657;
    }

    .report-meta-line strong {
      color: var(--report-ink);
    }

    .report-divider {
      margin: 18px 0;
      border: 0;
      border-top: 1px solid var(--report-line);
    }

    .report-list {
      margin: 0 0 14px 20px;
      padding: 0;
      color: #203657;
    }

    .report-list li {
      margin-bottom: 8px;
      line-height: 1.68;
      padding-left: 4px;
    }

    .report-table-wrap {
      margin: 14px 0 16px;
      border: 1px solid var(--report-line);
      border-radius: 16px;
      overflow: hidden;
      page-break-inside: avoid;
    }

    .report-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.95rem;
    }

    .report-table thead th {
      background: var(--report-soft-strong);
      color: var(--report-ink);
      font-weight: 700;
      text-align: left;
      padding: 12px 14px;
      border-bottom: 1px solid var(--report-line);
    }

    .report-table td {
      padding: 12px 14px;
      border-top: 1px solid var(--report-line);
      border-right: 1px solid var(--report-line);
      vertical-align: top;
      line-height: 1.6;
      color: #203657;
      background: #ffffff;
    }

    .report-table td:last-child,
    .report-table th:last-child {
      border-right: 0;
    }

    code {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      background: #f3f6fb;
      border: 1px solid #e2e9f4;
      border-radius: 6px;
      padding: 1px 5px;
      font-size: 0.92em;
    }

    @media print {
      html, body {
        background: #ffffff;
      }

      body {
        padding: 0;
      }

      .report-toolbar {
        display: none !important;
      }

      .report-paper {
        width: auto;
        min-height: auto;
        margin: 0;
        box-shadow: none;
        padding: 14mm 14mm 16mm;
      }

      @page {
        size: A4;
        margin: 10mm;
      }
    }
  `;
}

export function renderActionPlanReportHtml({ draft, clientName, reportLabel = "Client Report", showToolbar = false }) {
  const blocks = parseDraftBlocks(draft);
  const introBlocks = [];
  const contentBlocks = [];
  let introFinished = false;

  for (const block of blocks) {
    const isIntroBlock =
      !introFinished &&
      (block.type === "heading" && block.level === 1 ||
        (block.type === "paragraph" && /^\*\*[^*]+:\*\*/.test(block.text)));

    if (isIntroBlock) {
      introBlocks.push(block);
      continue;
    }

    introFinished = true;
    contentBlocks.push(block);
  }

  const intro = introBlocks.length
    ? `<section class="report-intro">${introBlocks.map(renderBlock).join("\n")}</section>`
    : "";
  const body = contentBlocks.map(renderBlock).join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(clientName || "Albi Trust Report")}</title>
    <style>${reportStyles(showToolbar)}</style>
  </head>
  <body>
    <div class="report-preview-shell">
      <div class="report-toolbar">
        <div class="report-toolbar-copy">
          <strong>Printable Report</strong>
          <span>Preview the final layout, then print or save as PDF from your browser.</span>
        </div>
        <button type="button" onclick="window.print()">Print / Save PDF</button>
      </div>

      <article class="report-paper">
        <header class="report-header">
          <div class="report-brand">
            <span class="report-brand-mark" aria-hidden="true">
              <img src="/brand/albitrust-face-symbol.png" alt="" />
            </span>
            <div class="report-brand-copy">
              <strong>Albi Trust</strong>
              <span>Personalized Trading Action Plan</span>
            </div>
          </div>
        </header>

        ${intro}
        ${body}
      </article>
    </div>
  </body>
</html>`;
}
