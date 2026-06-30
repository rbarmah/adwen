/* ============================================================
   Adwen — Universal Document Text Extractor
   Supports: PDF, DOCX, PPTX, TXT, MD, and generic binary fallback
   All parsing is server-side only (Node.js).
   ============================================================ */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Extract plain text from a file buffer given its filename.
 * Returns clean UTF-8 text or a fallback placeholder string.
 */
export async function extractDocumentText(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const lower = filename.toLowerCase();

  try {
    if (lower.endsWith('.pdf')) {
      return await extractPDF(buffer);
    }
    if (lower.endsWith('.docx')) {
      return await extractDOCX(buffer);
    }
    if (lower.endsWith('.pptx') || lower.endsWith('.ppt')) {
      return await extractPPTX(buffer);
    }
    if (lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.markdown')) {
      return extractPlainText(buffer);
    }
    if (lower.endsWith('.doc')) {
      // .doc (old binary format) — attempt UTF-8 extraction; results may be partial
      return extractPlainText(buffer, true);
    }
  } catch (err) {
    console.error(`[extract] Failed to parse ${filename}:`, err);
  }

  return `[Could not extract text from ${filename}. File may be encrypted, corrupted, or an unsupported format.]`;
}

// ─── PDF ─────────────────────────────────────────────────────────────────────
async function extractPDF(buffer: Buffer): Promise<string> {
  // Polyfill DOMMatrix for pdf-parse (pdfjs-dist) in Node.js environment
  if (typeof (globalThis as any).DOMMatrix === 'undefined') {
    (globalThis as any).DOMMatrix = class DOMMatrix {
      a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
      constructor() {}
      static fromMatrix() { return new DOMMatrix(); }
      static fromFloat32Array() { return new DOMMatrix(); }
      static fromFloat64Array() { return new DOMMatrix(); }
      translate() { return this; }
      scale() { return this; }
      multiply() { return this; }
      inverse() { return this; }
      transformPoint(p: any) { return p; }
    };
  }

  // Use require() on the internal lib path — bypasses the test-file ENOENT bug
  // in pdf-parse@1.1.1 where index.js tries to open test/data/05-versions-space.pdf
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse/lib/pdf-parse') as (buf: Buffer, opts?: any) => Promise<{ text: string; numpages: number }>;
  const result = await pdfParse(buffer);
  const text = result.text?.trim();
  if (!text || text.length < 50) {
    return `[PDF parsed but contained minimal text — may be a scanned image PDF. Page count: ${result.numpages}]`;
  }
  // Clean up excessive whitespace while preserving paragraph breaks
  return text
    .replace(/[ \t]{3,}/g, '  ')       // collapse long horizontal whitespace
    .replace(/\n{4,}/g, '\n\n\n')      // max 3 blank lines
    .trim();
}

// ─── DOCX ─────────────────────────────────────────────────────────────────────
async function extractDOCX(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value?.trim();
  if (!text || text.length < 20) {
    return '[Word document parsed but contained no readable text.]';
  }
  return text.replace(/\n{4,}/g, '\n\n\n').trim();
}

// ─── PPTX ─────────────────────────────────────────────────────────────────────
async function extractPPTX(buffer: Buffer): Promise<string> {
  // PPTX is a ZIP archive. We extract slide XML files and pull text nodes.
  const AdmZip = (await import('adm-zip')).default;
  const zip = new AdmZip(buffer);

  const slideEntries = zip.getEntries()
    .filter(e => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
    .sort((a, b) => {
      // Sort numerically by slide number
      const numA = parseInt(a.entryName.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.entryName.match(/\d+/)?.[0] || '0');
      return numA - numB;
    });

  if (slideEntries.length === 0) {
    return '[Could not find slide content in PPTX file.]';
  }

  const slideTexts: string[] = [];

  for (const entry of slideEntries) {
    const xml = entry.getData().toString('utf-8');
    // Extract all <a:t> text nodes (DrawingML text elements)
    const textMatches = xml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) || [];
    const slideText = textMatches
      .map(m => m.replace(/<[^>]+>/g, '').trim())
      .filter(t => t.length > 0)
      .join(' ');

    if (slideText) {
      const slideNum = entry.entryName.match(/\d+/)?.[0];
      slideTexts.push(`[Slide ${slideNum}] ${slideText}`);
    }
  }

  if (slideTexts.length === 0) {
    return '[PPTX parsed but slides contained no text. May use image-only slides.]';
  }

  return slideTexts.join('\n\n');
}

// ─── Plain text / Markdown ────────────────────────────────────────────────────
function extractPlainText(buffer: Buffer, lossy = false): string {
  if (lossy) {
    // For old .doc binary: extract printable ASCII runs
    const raw = buffer.toString('binary');
    const printable = raw.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/ {4,}/g, ' ');
    const clean = printable.split(/\n|\r/).filter(l => l.trim().length > 3).join('\n');
    return clean.trim() || '[Could not extract text from legacy .doc file.]';
  }
  return buffer.toString('utf-8').replace(/\n{4,}/g, '\n\n\n').trim();
}
