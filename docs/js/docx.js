/** Build a minimal Word .docx (OOXML) from accessible markdown. */

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

function paragraphXml(text) {
  if (!text) {
    return "<w:p/>";
  }
  return `<w:p>${parseInlineRuns(text).map(runXml).join("")}</w:p>`;
}

const PAGE_BREAK = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

export function markdownToDocumentXml(markdown) {
  const lines = String(markdown || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n$/, "")
    .split("\n");
  const body = lines
    .map((line) => (line.trim() === "---" ? PAGE_BREAK : paragraphXml(line)))
    .join("");
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

export function buildDocxFiles(markdown) {
  return {
    "[Content_Types].xml": CONTENT_TYPES,
    "_rels/.rels": ROOT_RELS,
    "word/_rels/document.xml.rels": DOCUMENT_RELS,
    "word/styles.xml": STYLES,
    "word/document.xml": markdownToDocumentXml(markdown),
  };
}
