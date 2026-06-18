// ================================================
// PDF Renderer — Optimized Quality (Lower for Speed)
// ================================================

import * as pdfjsLib from 'pdfjs-dist';

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

  async loadDocument() {
    const loadingTask = pdfjsLib.getDocument({
      url: this.pdfUrl,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/cmaps/',
      cMapPacked: true,
      // OPTIMIZED: Disable auto-fetch for large PDFs
      disableAutoFetch: true,
    });
    this.pdfDoc = await loadingTask.promise;
    this.pageCount = this.pdfDoc.numPages;
    return this.pageCount;
  }

  async renderPageToCanvas(pageNum, cssWidth = 600) {
    if (!this.pdfDoc) throw new Error('PDF not loaded');

    const page = await this.pdfDoc.getPage(pageNum);
    const unscaledViewport = page.getViewport({ scale: 1 });

    const cssScale = cssWidth / unscaledViewport.width;

    // OPTIMIZED: Cap DPR to 2 (was 3) for better performance
    const dpr = window.devicePixelRatio || 1;
    const effectiveDpr = Math.min(dpr, 2); // Lower cap for speed

    const renderScale = cssScale * effectiveDpr;
    const viewport = page.getViewport({ scale: renderScale });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    canvas.style.width = `${viewport.width / effectiveDpr}px`;
    canvas.style.height = `${viewport.height / effectiveDpr}px`;

    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;
    page.cleanup();

    return {
      canvas,
      cssWidth: viewport.width / effectiveDpr,
      cssHeight: viewport.height / effectiveDpr,
      pageNum,
    };
  }

  // OPTIMIZED: Lower quality multiplier for flipbook images
  async renderPageToDataUrl(pageNum, targetWidth = 800) {
    if (!this.pdfDoc) throw new Error('PDF not loaded');

    const page = await this.pdfDoc.getPage(pageNum);
    const unscaledViewport = page.getViewport({ scale: 1 });

    const baseScale = targetWidth / unscaledViewport.width;
    // OPTIMIZED: 1.5x instead of 2x for faster rendering
    const qualityMultiplier = 1.5;
    const renderScale = baseScale * qualityMultiplier;

    const viewport = page.getViewport({ scale: renderScale });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;
    page.cleanup();

    // OPTIMIZED: JPEG instead of PNG for smaller size (0.85 quality)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    return {
      dataUrl,
      width: viewport.width,
      height: viewport.height,
      pageNum,
    };
  }

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