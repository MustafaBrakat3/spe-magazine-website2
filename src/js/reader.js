// ================================================
// Flip Book Reader — Rewritten for HiDPI Quality
// Desktop: StPageFlip with 2x rendered images
// Mobile: Single-page Canvas with devicePixelRatio rendering
// ================================================

import { PageFlip } from 'page-flip';
import { PDFRenderer } from './pdf-renderer.js';
import { fetchMagazines } from './theme.js';

// ================================================
// State
// ================================================

let pageFlip = null;
let pdfRenderer = null;
let currentMagazine = null;
let totalPages = 0;
let currentPage = 0;
let isMobileMode = false;
let zoomLevel = 1;
let pageWidth = 0;
const ZOOM_STEP = 0.15;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;

// ================================================
// DOM Elements
// ================================================

const readerTitle = document.getElementById('readerTitle');
const currentPageNum = document.getElementById('currentPageNum');
const totalPageNum = document.getElementById('totalPageNum');
const bookContainer = document.getElementById('bookContainer');
const singlePageViewer = document.getElementById('singlePageViewer');
const singlePageWrapper = document.getElementById('singlePageWrapper');
const readerLoading = document.getElementById('readerLoading');
const loadingText = document.getElementById('loadingText');
const loadingProgressBar = document.getElementById('loadingProgressBar');
const loadingPageCount = document.getElementById('loadingPageCount');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageSlider = document.getElementById('pageSlider');
const sliderLabelEnd = document.getElementById('sliderLabelEnd');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const downloadBtn = document.getElementById('downloadBtn');
const keyboardHintsBtn = document.getElementById('keyboardHintsBtn');
const keyboardHints = document.getElementById('keyboardHints');

// ================================================
// Detect Mobile
// ================================================

function checkMobile() {
  return window.innerWidth < 900 || ('ontouchstart' in window && window.innerWidth < 1200);
}

// ================================================
// Initialize
// ================================================

async function init() {
  const params = new URLSearchParams(window.location.search);
  const magazineId = params.get('id');

  if (!magazineId) {
    showError('No magazine specified. Please go back and select a magazine.');
    return;
  }

  const magazines = await fetchMagazines();
  currentMagazine = magazines.find(m => m.id === magazineId);

  if (!currentMagazine) {
    showError('Magazine not found. Please go back and try again.');
    return;
  }

  if (readerTitle) readerTitle.textContent = `${currentMagazine.title} ${currentMagazine.year}`;
  document.title = `${currentMagazine.title} ${currentMagazine.year} — SPE Cairo`;

  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const link = document.createElement('a');
      link.href = currentMagazine.pdf;
      link.download = `SPE-Cairo-Magazine-${currentMagazine.year}.pdf`;
      link.click();
    });
  }

  isMobileMode = checkMobile();
  await loadPDF(currentMagazine.pdf);
}

// ================================================
// Load PDF
// ================================================

async function loadPDF(pdfUrl) {
  try {
    updateLoading('Loading PDF document...', 0);

    pdfRenderer = new PDFRenderer(pdfUrl);
    const pageCount = await pdfRenderer.loadDocument();
    totalPages = pageCount;

    updateLoading('Rendering pages...', 10);

    if (isMobileMode) {
      // === MOBILE MODE: Single page canvas rendering ===
      await initSinglePageMode();
    } else {
      // === DESKTOP MODE: Flipbook with high-quality images ===
      await initFlipBookMode();
    }

  } catch (error) {
    console.error('Error loading PDF:', error);
    showError('Failed to load the magazine. The PDF file may not be available yet.');
  }
}

// ================================================
// MOBILE: Single Page Canvas Mode
// Renders each page on-demand using full devicePixelRatio
// ================================================

async function initSinglePageMode() {
  if (singlePageViewer) singlePageViewer.style.display = 'flex';
  if (bookContainer) bookContainer.style.display = 'none';

  currentPage = 1;

  // Render the first page immediately
  await renderSinglePage(1);

  updateLoading('Ready!', 100);
  setTimeout(() => {
    if (readerLoading) readerLoading.classList.add('hidden');
  }, 300);

  setupControls();
  updatePageInfo();
}

async function renderSinglePage(pageNum) {
  if (!singlePageWrapper || !pdfRenderer) return;

  // Calculate target CSS width based on available space
  const container = document.getElementById('readerContainer');
  const availableWidth = container ? container.clientWidth - 32 : window.innerWidth - 32;
  const baseCssWidth = Math.min(availableWidth, 900); // Cap at 900px CSS

  // Scale the CSS width by zoomLevel to get high-quality rendering without CSS pixel stretching
  const targetCssWidth = baseCssWidth * zoomLevel;

  // Render to canvas at the requested scale
  const { canvas } = await pdfRenderer.renderPageToCanvas(pageNum, targetCssWidth);

  singlePageWrapper.innerHTML = '';
  singlePageWrapper.appendChild(canvas);

  // Scroll to top
  if (singlePageViewer) singlePageViewer.scrollTop = 0;
}

// ================================================
// DESKTOP: Flipbook Mode with High-Quality Images
// ================================================

async function initFlipBookMode() {
  if (bookContainer) bookContainer.style.display = 'flex';
  if (singlePageViewer) singlePageViewer.style.display = 'none';

  const dims = await pdfRenderer.getPageDimensions();
  const aspectRatio = dims.width / dims.height;

  // Determine the target image width for quality
  // Use at least 600px, or the available space * dpr
  const container = document.getElementById('readerContainer');
  const availableWidth = container ? container.clientWidth - 120 : 1000;
  const targetImageWidth = Math.min(Math.max(availableWidth / 2, 400), 700);

  // Render ONLY the first 4 pages immediately to get the user reading instantly
  const initialPagesToRender = Math.min(4, totalPages);
  const initialPages = [];

  for (let i = 1; i <= initialPagesToRender; i++) {
    const progress = 10 + (i / initialPagesToRender) * 85;
    updateLoading(`Rendering page ${i} of ${totalPages}...`, progress);
    if (loadingPageCount) loadingPageCount.textContent = `${i} / ${totalPages} pages`;

    const pageData = await pdfRenderer.renderPageToDataUrl(i, targetImageWidth);
    initialPages.push(pageData);
  }

  updateLoading('Creating flip book...', 95);
  await createFlipBook(initialPages, aspectRatio, targetImageWidth);

  // Start rendering remaining pages silently in the background
  if (totalPages > initialPagesToRender) {
    startBackgroundRendering(initialPagesToRender + 1, totalPages, targetImageWidth);
  }

  updateLoading('Ready!', 100);
  setTimeout(() => {
    if (readerLoading) readerLoading.classList.add('hidden');
    if (bookContainer) bookContainer.style.display = 'flex';
  }, 300);
}

async function startBackgroundRendering(startPage, endPage, targetImageWidth) {
  for (let i = startPage; i <= endPage; i++) {
    // If the component was unmounted or user left the page, stop rendering
    if (!pdfRenderer || !pageFlip) break;

    try {
      const pageData = await pdfRenderer.renderPageToDataUrl(i, targetImageWidth);
      const img = document.getElementById(`page-img-${i}`);
      if (img) {
        img.src = pageData.dataUrl;
      }
      const spinner = document.getElementById(`spinner-${i}`);
      if (spinner) {
        spinner.style.display = 'none'; // Hide the loading spinner once image is loaded
      }
    } catch (err) {
      console.warn(`Failed to background render page ${i}`, err);
    }

    // Crucial: yield to the main thread so animations and page flips stay buttery smooth
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

async function createFlipBook(initialPages, aspectRatio, targetImageWidth) {
  if (!bookContainer || totalPages === 0) return;

  const container = document.getElementById('readerContainer');
  const availableWidth = container.clientWidth - 120;
  const availableHeight = container.clientHeight - 40;

  pageWidth = Math.min(availableWidth / 2, 500);
  let pageHeight = pageWidth / aspectRatio;

  if (pageHeight > availableHeight) {
    pageHeight = availableHeight;
    pageWidth = pageHeight * aspectRatio;
  }

  // Clear container
  bookContainer.innerHTML = '';

  // Create all page elements including unrendered placeholders
  for (let i = 1; i <= totalPages; i++) {
    const pageDiv = document.createElement('div');
    pageDiv.className = 'my-page';

    // First and last pages are hard covers
    if (i === 1 || i === totalPages) {
      pageDiv.setAttribute('data-density', 'hard');
    } else {
      pageDiv.setAttribute('data-density', 'soft');
    }

    const img = document.createElement('img');
    img.id = `page-img-${i}`;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';

    if (i <= initialPages.length) {
      img.src = initialPages[i - 1].dataUrl;
    } else {
      // 1x1 transparent GIF placeholder
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      // Add a small subtle spinner for lazy-loading pages
      pageDiv.innerHTML += `<div class="lazy-spinner" id="spinner-${i}" style="position: absolute; inset: 0; display: flex; justify-content: center; align-items: center; z-index: -1;">
        <div class="reader-loading-icon" style="width: 28px; height: 28px; opacity: 0.5;"></div>
      </div>`;
    }

    pageDiv.appendChild(img);
    bookContainer.appendChild(pageDiv);
  }

  pageFlip = new PageFlip(bookContainer, {
    width: Math.floor(pageWidth),
    height: Math.floor(pageHeight),
    size: 'fixed',
    minWidth: 200,
    maxWidth: 800,
    minHeight: 300,
    maxHeight: 1200,
    maxShadowOpacity: 0.5,
    showCover: true,
    mobileScrollSupport: false,
    swipeDistance: 30,
    clickEventForward: true,
    useMouseEvents: true,
    flippingTime: 800,
    usePortrait: false,
    autoSize: true,
  });

  pageFlip.loadFromHTML(bookContainer.querySelectorAll('.my-page'));

  setupControls();
  updatePageInfo();
}

// ================================================
// Controls
// ================================================

function setupControls() {
  // Page flip event (desktop only)
  if (pageFlip) {
    pageFlip.on('flip', () => {
      currentPage = pageFlip.getCurrentPageIndex() + 1;
      updatePageInfo();
    });
    pageFlip.on('init', () => {
      currentPage = pageFlip.getCurrentPageIndex() + 1;
      updatePageInfo();
    });
    pageFlip.on('update', () => {
      currentPage = pageFlip.getCurrentPageIndex() + 1;
      updatePageInfo();
    });
  }

  // Window resize to recheck alignment
  window.addEventListener('resize', () => {
    if (pageFlip) {
      updatePageInfo();
    }
  });

  // Multiple timeouts to guarantee correct alignment as StPageFlip finishes layout
  [100, 300, 600, 1000].forEach(delay => {
    setTimeout(updatePageInfo, delay);
  });

  // Navigation
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (isMobileMode || zoomLevel > 1) {
        if (currentPage > 1) { currentPage--; renderSinglePage(currentPage); updatePageInfo(); }
      } else if (pageFlip) {
        pageFlip.flipPrev('top');
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (isMobileMode || zoomLevel > 1) {
        if (currentPage < totalPages) { currentPage++; renderSinglePage(currentPage); updatePageInfo(); }
      } else if (pageFlip) {
        pageFlip.flipNext('bottom');
      }
    });
  }

  // Slider
  if (pageSlider) {
    pageSlider.min = 1;
    pageSlider.max = totalPages;
    pageSlider.value = 1;
    if (sliderLabelEnd) sliderLabelEnd.textContent = totalPages;

    pageSlider.addEventListener('input', (e) => {
      const targetPage = parseInt(e.target.value);
      if (isMobileMode || zoomLevel > 1) {
        currentPage = targetPage;
        renderSinglePage(currentPage);
        updatePageInfo();
      } else if (pageFlip) {
        pageFlip.turnToPage(targetPage - 1);
      }
    });
  }

  // Zoom
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      zoomLevel = Math.min(zoomLevel + ZOOM_STEP, ZOOM_MAX);
      applyZoom();
    });
  }
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      zoomLevel = Math.max(zoomLevel - ZOOM_STEP, ZOOM_MIN);
      applyZoom();
    });
  }

  // Fullscreen
  if (fullscreenBtn) fullscreenBtn.addEventListener('click', toggleFullscreen);

  // Keyboard hints
  if (keyboardHintsBtn && keyboardHints) {
    keyboardHintsBtn.addEventListener('click', () => {
      keyboardHints.classList.toggle('visible');
      keyboardHintsBtn.classList.toggle('active');
    });
  }

  // Keyboard
  document.addEventListener('keydown', handleKeyboard);

  // Touch swipe for mobile
  if (isMobileMode) setupTouchSwipe();
}

// ================================================
// Touch Swipe (Mobile)
// ================================================

function setupTouchSwipe() {
  if (!singlePageViewer) return;

  let startX = 0;
  let startY = 0;
  let initialTouchDist = 0;
  let initialZoom = 1;
  let isPinching = false;
  let lastTouchDist = 0;
  let lastTapTime = 0;

  // Midpoint distance helper
  const getTouchDist = (e) => {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  singlePageViewer.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      isPinching = true;
      initialTouchDist = getTouchDist(e);
      lastTouchDist = initialTouchDist;
      initialZoom = zoomLevel;
    } else if (e.touches.length === 1) {
      if (zoomLevel > 1) return; // Don't interfere with scroll/pan when zoomed
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }
  }, { passive: false });

  singlePageViewer.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && isPinching) {
      e.preventDefault(); // Stop default browser zoom
      const dist = getTouchDist(e);
      lastTouchDist = dist;
      const factor = dist / initialTouchDist;

      // Scale visual canvas smoothly
      const canvas = singlePageWrapper.querySelector('canvas');
      if (canvas) {
        canvas.style.transform = `scale(${factor})`;
        canvas.style.transformOrigin = 'center center';
      }
    }
  }, { passive: false });

  singlePageViewer.addEventListener('touchend', (e) => {
    if (isPinching) {
      isPinching = false;
      const canvas = singlePageWrapper.querySelector('canvas');
      if (canvas) {
        canvas.style.transform = '';
        canvas.style.transformOrigin = '';
      }

      const factor = lastTouchDist / initialTouchDist;
      if (factor && !isNaN(factor)) {
        zoomLevel = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, initialZoom * factor));
        applyZoom();
      }
    } else if (e.changedTouches.length === 1) {
      // Handle Double Tap Zoom
      const now = Date.now();
      if (now - lastTapTime < 300) {
        e.preventDefault();
        zoomLevel = zoomLevel > 1 ? 1 : 2;
        applyZoom();
        return;
      }
      lastTapTime = now;

      // Handle Swipe navigation (only when not zoomed)
      if (zoomLevel > 1) return;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = startX - endX;
      const diffY = Math.abs(startY - endY);

      if (Math.abs(diffX) > 50 && diffY < 100) {
        if (diffX > 0 && currentPage < totalPages) {
          currentPage++;
          renderSinglePage(currentPage);
          updatePageInfo();
        } else if (diffX < 0 && currentPage > 1) {
          currentPage--;
          renderSinglePage(currentPage);
          updatePageInfo();
        }
      }
    }
  }, { passive: false });
}

// ================================================
// Update Page Info
// ================================================

function updatePageInfo() {
  if (currentPageNum) currentPageNum.textContent = currentPage;
  if (totalPageNum) totalPageNum.textContent = totalPages;
  if (pageSlider) pageSlider.value = currentPage;
  if (prevBtn) prevBtn.classList.toggle('disabled', currentPage <= 1);
  if (nextBtn) nextBtn.classList.toggle('disabled', currentPage >= totalPages);

  // Center cover pages visually by toggling classes (Landscape mode only, defer slightly for library layout)
  setTimeout(() => {
    if (pageFlip && !isMobileMode && zoomLevel === 1) {
      const total = pageFlip.getPageCount();
      const index = pageFlip.getCurrentPageIndex();
      const orientation = pageFlip.getOrientation();

      if (orientation === 'landscape' && index === 0) {
        const rect = pageFlip.getRender().getRect();
        const actualPageWidth = rect ? rect.pageWidth : pageWidth;
        bookContainer.style.setProperty('--cover-offset', `-${actualPageWidth / 2}px`);
        bookContainer.classList.add('show-cover');
        bookContainer.classList.remove('show-back-cover');
      } else if (orientation === 'landscape' && index === total - 1 && total % 2 === 0) {
        const rect = pageFlip.getRender().getRect();
        const actualPageWidth = rect ? rect.pageWidth : pageWidth;
        bookContainer.style.setProperty('--cover-offset', `${actualPageWidth / 2}px`);
        bookContainer.classList.remove('show-cover');
        bookContainer.classList.add('show-back-cover');
      } else {
        bookContainer.style.setProperty('--cover-offset', '0px');
        bookContainer.classList.remove('show-cover');
        bookContainer.classList.remove('show-back-cover');
      }
    } else if (bookContainer) {
      bookContainer.style.setProperty('--cover-offset', '0px');
      bookContainer.classList.remove('show-cover');
      bookContainer.classList.remove('show-back-cover');
    }
  }, 50);
}

// ================================================
// Zoom
// ================================================

function applyZoom() {
  const isZoomed = zoomLevel > 1;

  if (singlePageViewer) {
    singlePageViewer.classList.toggle('zoomed', isZoomed);
  }

  if (isMobileMode || isZoomed) {
    // Hide flipbook container and show single page canvas container
    if (bookContainer) bookContainer.style.display = 'none';
    if (singlePageViewer) singlePageViewer.style.display = 'flex';

    // Render single page at current zoom scale
    renderSinglePage(currentPage);
  } else {
    // Zoom is 1 (or less) on desktop - show interactive flipbook
    if (singlePageViewer) singlePageViewer.style.display = 'none';
    if (bookContainer) bookContainer.style.display = 'flex';

    // Sync flipbook page with single-page reader page index
    if (pageFlip) {
      pageFlip.turnToPage(currentPage - 1);
    }
  }
}

// ================================================
// Fullscreen
// ================================================

function toggleFullscreen() {
  const readerPage = document.getElementById('readerPage');
  if (!readerPage) return;
  if (!document.fullscreenElement) {
    readerPage.requestFullscreen().catch(err => console.warn('Fullscreen not available:', err));
  } else {
    document.exitFullscreen();
  }
}

// ================================================
// Keyboard
// ================================================

function handleKeyboard(e) {
  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault();
      if (isMobileMode || zoomLevel > 1) {
        if (currentPage > 1) { currentPage--; renderSinglePage(currentPage); updatePageInfo(); }
      } else if (pageFlip) pageFlip.flipPrev('top');
      break;
    case 'ArrowRight':
    case ' ':
      e.preventDefault();
      if (isMobileMode || zoomLevel > 1) {
        if (currentPage < totalPages) { currentPage++; renderSinglePage(currentPage); updatePageInfo(); }
      } else if (pageFlip) pageFlip.flipNext('bottom');
      break;
    case 'f': case 'F':
      toggleFullscreen();
      break;
    case 'Escape':
      if (document.fullscreenElement) document.exitFullscreen();
      break;
    case '+': case '=':
      zoomLevel = Math.min(zoomLevel + ZOOM_STEP, ZOOM_MAX);
      applyZoom();
      break;
    case '-':
      zoomLevel = Math.max(zoomLevel - ZOOM_STEP, ZOOM_MIN);
      applyZoom();
      break;
    case '0':
      zoomLevel = 1;
      applyZoom();
      break;
  }
}

// ================================================
// Loading / Error
// ================================================

function updateLoading(text, progress) {
  if (loadingText) loadingText.textContent = text;
  if (loadingProgressBar) loadingProgressBar.style.width = `${progress}%`;
}

function showError(message) {
  if (readerLoading) {
    readerLoading.innerHTML = `
      <div style="text-align: center;">
        <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">📄</div>
        <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary);">
          Unable to Load Magazine
        </div>
        <div style="color: var(--text-secondary); margin-bottom: 1.5rem; max-width: 400px;">
          ${message}
        </div>
        <a href="/archive.html" class="btn btn-primary" style="display: inline-flex;">
          Browse Archive
        </a>
      </div>
    `;
  }
}

// ================================================
// Cleanup
// ================================================

window.addEventListener('beforeunload', () => {
  if (pdfRenderer) pdfRenderer.destroy();
  if (pageFlip) pageFlip.destroy();
});

// Start
init();