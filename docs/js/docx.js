/** Build a minimal Word .docx (OOXML) from accessible markdown. */

import { headingLevelForLine } from "./headings.js";

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>
`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
`;

const DOCUMENT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>
`;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:after="160" w:line="276" w:lineRule="auto"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:sz w:val="24"/>
    </w:rPr>
  </w:style>
  ${[1, 2, 3, 4, 5, 6]
    .map((level) => {
      const size = [32, 28, 26, 24, 22, 20][level - 1];
      const before = [240, 200, 160, 160, 120, 120][level - 1];
      return `<w:style w:type="paragraph" w:styleId="Heading${level}">
    <w:name w:val="heading ${level}"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:uiPriority w:val="9"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:keepLines/>
      <w:spacing w:before="${before}" w:after="80"/>
      <w:outlineLvl w:val="${level - 1}"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:sz w:val="${size}"/>
      <w:szCs w:val="${size}"/>
    </w:rPr>
  </w:style>`;
    })
    .join("\n  ")}
</w:styles>
`;

export function escapeXml(text) {
  return String(text)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function sameMarks(left, right) {
  return (
    Boolean(left.bold) === Boolean(right.bold) &&
    Boolean(left.italic) === Boolean(right.italic) &&
    Boolean(left.underline) === Boolean(right.underline)
  );
}

/** Split a markdown line into plain, italic, bold, and underline runs. */
export function parseInlineRuns(text, marks = {}) {
  const source = String(text);
  const runs = [];

  const push = (value, nextMarks = marks) => {
    if (!value) {
      return;
    }
    const last = runs[runs.length - 1];
    if (last && sameMarks(last, nextMarks)) {
      last.text += value;
      return;
    }
    runs.push({
      text: value,
      bold: Boolean(nextMarks.bold),
      italic: Boolean(nextMarks.italic),
      underline: Boolean(nextMarks.underline),
    });
  };

  let i = 0;
  let plain = "";
  while (i < source.length) {
    if (source.startsWith("$$", i)) {
      const end = source.indexOf("$$", i + 2);
      if (end !== -1) {
        push(plain);
        plain = "";
        push(source.slice(i, end + 2));
        i = end + 2;
        continue;
      }
    }
    if (source.startsWith("\\(", i)) {
      const end = source.indexOf("\\)", i + 2);
      if (end !== -1) {
        push(plain);
        plain = "";
        push(source.slice(i, end + 2));
        i = end + 2;
        continue;
      }
    }
    if (!marks.bold && source.startsWith("__", i)) {
      const end = source.indexOf("__", i + 2);
      if (end !== -1) {
        push(plain);
        plain = "";
        runs.push(
          ...parseInlineRuns(source.slice(i + 2, end), { ...marks, bold: true })
        );
        i = end + 2;
        continue;
      }
    }
    if (!marks.underline && /^<u>/i.test(source.slice(i))) {
      const close = source.slice(i).search(/<\/u>/i);
      if (close !== -1) {
        push(plain);
        plain = "";
        runs.push(
          ...parseInlineRuns(source.slice(i + 3, i + close), {
            ...marks,
            underline: true,
          })
        );
        i = i + close + 4;
        continue;
      }
    }
    if (!marks.italic && source[i] === "_" && source[i + 1] !== "_") {
      const prev = i === 0 ? "" : source[i - 1];
      if (!/[A-Za-z0-9]/.test(prev)) {
        const end = source.indexOf("_", i + 1);
        if (end !== -1 && source[end + 1] !== "_") {
          const next = end + 1 < source.length ? source[end + 1] : "";
          const inner = source.slice(i + 1, end);
          if (!/[A-Za-z0-9]/.test(next) && inner.length && !inner.includes("\n")) {
            push(plain);
            plain = "";
            runs.push(...parseInlineRuns(inner, { ...marks, italic: true }));
            i = end + 1;
            continue;
          }
        }
      }
    }
    plain += source[i];
    i += 1;
  }
  push(plain);
  return runs;
}

function runXml(run) {
  const rPr = [];
  if (run.bold) {
    rPr.push("<w:b/>");
  }
  if (run.italic) {
    rPr.push("<w:i/>");
  }
  if (run.underline) {
    rPr.push('<w:u w:val="single"/>');
  }
  const props = rPr.length ? `<w:rPr>${rPr.join("")}</w:rPr>` : "";
  return `<w:r>${props}<w:t xml:space="preserve">${escapeXml(run.text)}</w:t></w:r>`;
}

function paragraphXml(text, styleId = "") {
  if (!text) {
    return "<w:p/>";
  }
  const style = styleId ? `<w:pPr><w:pStyle w:val="${styleId}"/></w:pPr>` : "";
  return `<w:p>${style}${parseInlineRuns(text).map(runXml).join("")}</w:p>`;
}

const PAGE_BREAK = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
const PAGE_CONTENT_TWIPS = 9360;
const TABLE_BORDER = 'w:val="single" w:sz="4" w:space="0" w:color="666666"';
const HEADER_FILL = "D9E2F3";

function tableBorder(side) {
  return `<w:${side} ${TABLE_BORDER}/>`;
}

/** Split a markdown pipe-table line into trimmed cell strings. */
export function parsePipeCells(line) {
  let inner = String(line).trim();
  if (inner.startsWith("|")) {
    inner = inner.slice(1);
  }
  if (inner.endsWith("|")) {
    inner = inner.slice(0, -1);
  }
  return inner.split("|").map((cell) => cell.trim());
}

/** True when a line is a markdown pipe-table row (not a section break). */
export function isPipeTableRow(line) {
  const trimmed = String(line).trim();
  if (!trimmed.startsWith("|")) {
    return false;
  }
  const pipes = trimmed.match(/\|/g);
  return Boolean(pipes && pipes.length >= 2);
}

/** True for a GFM header-separator row such as `| --- | :---: |`. */
export function isPipeSeparatorRow(cells) {
  if (!cells.length) {
    return false;
  }
  return cells.every((cell) => {
    const compact = String(cell).replace(/\s+/g, "");
    return /^:?-{3,}:?$/.test(compact);
  });
}

function padCells(row, colCount) {
  const next = row.slice(0, colCount);
  while (next.length < colCount) {
    next.push("");
  }
  return next;
}

function tableCellXml(text, { header, colWidth }) {
  const shading = header
    ? `<w:shd w:val="clear" w:color="auto" w:fill="${HEADER_FILL}"/>`
    : "";
  const runs = parseInlineRuns(text).map((run) =>
    header ? { ...run, bold: true } : run
  );
  const paragraph = runs.length
    ? `<w:p>${runs.map(runXml).join("")}</w:p>`
    : "<w:p/>";
  return `<w:tc><w:tcPr><w:tcW w:w="${colWidth}" w:type="dxa"/>${shading}</w:tcPr>${paragraph}</w:tc>`;
}

function tableRowXml(cells, { header, colWidth }) {
  const props = header ? "<w:trPr><w:tblHeader/></w:trPr>" : "";
  return `<w:tr>${props}${cells
    .map((cell) => tableCellXml(cell, { header, colWidth }))
    .join("")}</w:tr>`;
}

function tableXml(rowLines) {
  const dataRows = rowLines
    .map(parsePipeCells)
    .filter((cells) => !isPipeSeparatorRow(cells));
  if (!dataRows.length) {
    return rowLines.map((line) => paragraphXml(line)).join("");
  }
  const colCount = Math.max(...dataRows.map((row) => row.length), 1);
  const padded = dataRows.map((row) => padCells(row, colCount));
  const colWidth = Math.max(Math.floor(PAGE_CONTENT_TWIPS / colCount), 1);
  const grid = Array.from(
    { length: colCount },
    () => `<w:gridCol w:w="${colWidth}"/>`
  ).join("");
  const headerRow = tableRowXml(padded[0], { header: true, colWidth });
  const bodyRows = padded
    .slice(1)
    .map((row) => tableRowXml(row, { header: false, colWidth }))
    .join("");
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>${tableBorder(
    "top"
  )}${tableBorder("left")}${tableBorder("bottom")}${tableBorder("right")}${tableBorder(
    "insideH"
  )}${tableBorder(
    "insideV"
  )}</w:tblBorders><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${headerRow}${bodyRows}</w:tbl>`;
}

export function markdownToDocumentXml(markdown, headingMap = []) {
  const lines = String(markdown || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n$/, "")
    .split("\n");
  const parts = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "---") {
      parts.push(PAGE_BREAK);
      i += 1;
      continue;
    }
    if (isPipeTableRow(line)) {
      const start = i;
      i += 1;
      while (i < lines.length && isPipeTableRow(lines[i])) {
        i += 1;
      }
      parts.push(tableXml(lines.slice(start, i)));
      continue;
    }
    const headingLevel = headingLevelForLine(line, headingMap);
    const styleId = headingLevel ? `Heading${headingLevel}` : "";
    parts.push(paragraphXml(line, styleId));
    i += 1;
  }
  const body = parts.join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${body}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>
`;
}

export function buildDocxFiles(markdown, headingMap = []) {
  return {
    "[Content_Types].xml": CONTENT_TYPES,
    "_rels/.rels": ROOT_RELS,
    "word/_rels/document.xml.rels": DOCUMENT_RELS,
    "word/styles.xml": STYLES,
    "word/document.xml": markdownToDocumentXml(markdown, headingMap),
  };
}
