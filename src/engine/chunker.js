/**
 * chunker.js — Splits text into overlapping chunks for retrieval
 */

/**
 * Tokenizes text into lowercase words, removing punctuation
 */
export function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);
}

/**
 * Splits text into overlapping chunks
 * @param {string} text - Raw document text
 * @param {number} chunkSize - Characters per chunk
 * @param {number} overlap - Overlap characters between chunks
 * @returns {Array<{text: string, index: number, start: number, end: number}>}
 */
export function chunkText(text, chunkSize = 600, overlap = 100) {
  const chunks = [];
  let i = 0;

  // Normalize whitespace
  const normalized = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  while (i < normalized.length) {
    const end = Math.min(i + chunkSize, normalized.length);
    let chunkEnd = end;

    // Try to end at a sentence boundary or paragraph
    if (end < normalized.length) {
      const sentenceEnd = normalized.lastIndexOf('. ', end);
      const paraEnd = normalized.lastIndexOf('\n\n', end);
      const boundary = Math.max(sentenceEnd, paraEnd);
      if (boundary > i + chunkSize * 0.5) {
        chunkEnd = boundary + 1;
      }
    }

    const chunkText = normalized.slice(i, chunkEnd).trim();
    if (chunkText.length > 20) {
      chunks.push({
        text: chunkText,
        index: chunks.length,
        start: i,
        end: chunkEnd
      });
    }

    i = chunkEnd - overlap;
    if (i <= 0) i = chunkEnd; // prevent infinite loop on small texts
  }

  return chunks;
}

/**
 * Parse a plain text or markdown file via FileReader
 */
export function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Parse a PDF file using PDF.js loaded from CDN
 */
export async function readPDFFile(file) {
  // Dynamically import PDF.js from CDN if not available
  if (!window.pdfjsLib) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
      script.type = 'module';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    // give it a tick
    await new Promise(r => setTimeout(r, 100));
  }

  const pdfjsLib = window.pdfjsLib || (await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs'));
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += pageText + '\n\n';
  }

  return fullText;
}

/**
 * Extract text from any supported file type
 */
export async function extractText(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'pdf') {
    return readPDFFile(file);
  }
  return readTextFile(file);
}
