// ================================================
// PDF Renderer — HiDPI / Retina Quality
// Uses Mozilla PDF.js with devicePixelRatio-aware rendering
// ================================================

import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export class PDFRenderer {
  constructor(pdfUrl) {
    this.pdfUrl = pdfUrl;
    this.pdfDoc = null;
    this.pageCount = 0;
  }

  /**
   * Load the PDF document
   */
  async loadDocument() {
    const loadingTask = pdfjsLib.getDocument({
      url: this.pdfUrl,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/cmaps/',
      cMapPacked: true,
    });
    this.pdfDoc = await loadingTask.promise;
    this.pageCount = this.pdfDoc.numPages;
    return this.pageCount;
  }

  /**
   * Render a single page to a canvas element at a given scale.
   * This uses the FULL device pixel ratio for crisp rendering on HiDPI screens.
   * 
   * @param {number} pageNum - 1-indexed page number
   * @param {number} cssWidth - desired CSS pixel width of the output
   * @returns {{ canvas: HTMLCanvasElement, width: number, height: number }}
   */
  async renderPageToCanvas(pageNum, cssWidth = 600) {
    if (!this.pdfDoc) throw new Error('PDF not loaded');

    const page = await this.pdfDoc.getPage(pageNum);
    const unscaledViewport = page.getViewport({ scale: 1 });

    // The CSS scale makes the page fit the desired width
    const cssScale = cssWidth / unscaledViewport.width;

    // The DPR multiplier ensures sharp rendering on Retina / HiDPI displays
    const dpr = window.devicePixelRatio || 1;
    // Clamp DPR to avoid excessive memory usage on very high DPI devices
    const effectiveDpr = Math.min(dpr, 3);

    // The actual rendering scale = cssScale * devicePixelRatio
    const renderScale = cssScale * effectiveDpr;
    const viewport = page.getViewport({ scale: renderScale });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set the canvas backing store to the full resolution
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Set CSS size so the canvas appears at the desired size but with extra pixels for sharpness
    canvas.style.width = `${viewport.width / effectiveDpr}px`;
    canvas.style.height = `${viewport.height / effectiveDpr}px`;

    await page.render({ canvasContext: ctx, viewport }).promise;
    page.cleanup();

    return {
      canvas,
      cssWidth: viewport.width / effectiveDpr,
      cssHeight: viewport.height / effectiveDpr,
      pageNum,
    };
  }

  /**
   * Render page to a high-quality data URL (for flipbook images).
   * Uses a higher base scale (2x minimum) regardless of device.
   */
  async renderPageToDataUrl(pageNum, targetWidth = 800) {
    if (!this.pdfDoc) throw new Error('PDF not loaded');

    const page = await this.pdfDoc.getPage(pageNum);
    const unscaledViewport = page.getViewport({ scale: 1 });

    // Always render at 2x minimum for quality
    const baseScale = targetWidth / unscaledViewport.width;
    const qualityMultiplier = 2;
    const renderScale = baseScale * qualityMultiplier;

    const viewport = page.getViewport({ scale: renderScale });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;
    page.cleanup();

    // Use PNG for better quality (vs JPEG which has compression artifacts)
    const dataUrl = canvas.toDataURL('image/png');

    return {
      dataUrl,
      width: viewport.width,
      height: viewport.height,
      pageNum,
    };
  }

  /**
   * Render all pages as high-quality data URLs for flipbook mode
   */
  async renderAllPagesAsImages(targetWidth, onProgress) {
    if (!this.pdfDoc) throw new Error('PDF not loaded');
    const pages = [];
    for (let i = 1; i <= this.pageCount; i++) {
      const pageData = await this.renderPageToDataUrl(i, targetWidth);
      pages.push(pageData);
      if (onProgress) onProgress(i, this.pageCount);
    }
    return pages;
  }

  /**
   * Get base page dimensions (unscaled)
   */
  async getPageDimensions() {
    if (!this.pdfDoc) throw new Error('PDF not loaded');
    const page = await this.pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    page.cleanup();
    return { width: viewport.width, height: viewport.height };
  }

  getPageCount() { return this.pageCount; }

  destroy() {
    if (this.pdfDoc) {
      if (typeof this.pdfDoc.destroy === 'function') {
        this.pdfDoc.destroy();
      }
      this.pdfDoc = null;
    }
  }
}
