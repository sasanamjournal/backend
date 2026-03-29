// pdfImageExtractor.js
// Must patch globals BEFORE pdfjs-dist is imported

const canvasModule = require('canvas');
const { createCanvas } = canvasModule;
const path = require('path');
const fs   = require('fs');

// ── Patch globals that pdfjs-dist expects in a browser environment ──────────
if (typeof globalThis.Image === 'undefined') {
  globalThis.Image = canvasModule.Image;
}
if (typeof globalThis.ImageData === 'undefined') {
  globalThis.ImageData = canvasModule.ImageData;
}
if (typeof globalThis.Path2D === 'undefined') {
  try { globalThis.Path2D = canvasModule.Path2D; } catch (_) {}
}

// ── NodeCanvasFactory ────────────────────────────────────────────────────────
class NodeCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(width, height);
    return { canvas, context: canvas.getContext('2d') };
  }
  reset({ canvas }, width, height) {
    canvas.width = width;
    canvas.height = height;
  }
  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

// ── NodeCMapReaderFactory ────────────────────────────────────────────────────
class NodeCMapReaderFactory {
  constructor({ baseUrl, isCompressed }) {
    this.baseUrl      = baseUrl;
    this.isCompressed = isCompressed;
  }
  async fetch({ name }) {
    const suffix     = name + (this.isCompressed ? '.bcmap' : '');
    const nativeBase = this.baseUrl.replace(/\//g, path.sep).replace(/[/\\]$/, '');
    const fsPath     = path.join(nativeBase, suffix);
    const data       = fs.readFileSync(fsPath);
    return { cMapData: new Uint8Array(data), compressionType: this.isCompressed ? 1 : 0 };
  }
}

// ── Main extractor ───────────────────────────────────────────────────────────
/**
 * Renders every page of a PDF as a PNG and returns base64 strings.
 * @param {Buffer} pdfBuffer
 * @param {number} [scale=2.0]
 * @returns {Promise<Array<{page: number, base64: string, mimeType: string}>>}
 */
async function extractImagesFromPDF(pdfBuffer, scale = 2.0) {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const canvasFactory = new NodeCanvasFactory();

  // Build a forward-slash URL for cMapUrl (pdfjs rejects backslashes on Windows)
  const cmapDirNative = path.join(
    path.dirname(require.resolve('pdfjs-dist/package.json')),
    'cmaps'
  );
  const cmapExists = fs.existsSync(cmapDirNative);
  const cmapUrl    = cmapDirNative.replace(/\\/g, '/').replace(/\/?$/, '/');

  const docParams = {
    data: new Uint8Array(pdfBuffer),
    canvasFactory,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  };

  // Only add cmap options when the directory actually exists
  if (cmapExists) {
    docParams.cMapUrl            = cmapUrl;
    docParams.cMapPacked         = true;
    docParams.CMapReaderFactory  = NodeCMapReaderFactory;
  }

  const loadingTask = pdfjsLib.getDocument(docParams);
  const pdf         = await loadingTask.promise;
  const results     = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page       = await pdf.getPage(pageNum);
    const viewport   = page.getViewport({ scale });
    const canvasAndCtx = canvasFactory.create(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height)
    );

    try {
      await page.render({
        canvasContext: canvasAndCtx.context,
        viewport,
        canvasFactory,
      }).promise;

      const base64 = canvasAndCtx.canvas.toBuffer('image/png').toString('base64');
      results.push({ page: pageNum, base64, mimeType: 'image/png' });
    } finally {
      page.cleanup();
      canvasFactory.destroy(canvasAndCtx);
    }
  }

  return results;
}

module.exports = { extractImagesFromPDF };