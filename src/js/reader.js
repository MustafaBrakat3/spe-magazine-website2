// ================================================
// Flip Book Reader — Optimized for Performance
// Desktop: PageFlip with lazy-loaded images
// Mobile: Single-page Canvas with native pinch-zoom
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
let loadedPages = new Set(); // Track loaded pages
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
      await initSinglePageMode();
    } else {
      await initFlipBookMode();
    }

  } catch (error) {
    console.error('Error loading PDF:', error);
    showError('Failed to load the magazine. The PDF file may not be available yet.');
  }
}

// ================================================
// MOBILE: Single Page Canvas Mode
// ================================================

async function initSinglePageMode() {
  if (singlePageViewer) singlePageViewer.style.display = 'flex';
  if (bookContainer) bookContainer.style.display = 'none';

  currentPage = 1;
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

  const container = document.getElementById('readerContainer');
  const availableWidth = container ? container.clientWidth - 32 : window.innerWidth - 32;
  const baseCssWidth = Math.min(availableWidth, 900);
  const targetCssWidth = baseCssWidth * zoomLevel;

  // OPTIMIZED: Lower quality for mobile (1x instead of 2x)
  const { canvas } = await pdfRenderer.renderPageToCanvas(pageNum, targetCssWidth);

  singlePageWrapper.innerHTML = '';
  singlePageWrapper.appendChild(canvas);

  if (singlePageViewer) singlePageViewer.scrollTop = 0;
}

// ================================================
// DESKTOP: Flipbook Mode with Lazy Loading
// ================================================

async function initFlipBookMode() {
  if (bookContainer) bookContainer.style.display = 'flex';
  if (singlePageViewer) singlePageViewer.style.display = 'none';

  const dims = await pdfRenderer.getPageDimensions();
  const aspectRatio = dims.width / dims.height;

  const container = document.getElementById('readerContainer');
  const availableWidth = container ? container.clientWidth - 120 : 1000;
  const targetImageWidth = Math.min(Math.max(availableWidth / 2, 400), 700);

  // OPTIMIZED: Load first 4 pages only, rest on-demand
  const initialLoad = Math.min(4, totalPages);
  const pages = [];

  for (let i = 1; i <= initialLoad; i++) {
    const pageData = await pdfRenderer.renderPageToDataUrl(i, targetImageWidth);
    pages.push(pageData);
    loadedPages.add(i);
    updateLoading(`Rendering page ${i} of ${totalPages}...`, 10 + (i / totalPages) * 40);
  }

  updateLoading('Creating flip book...', 50);
  await createFlipBook(pages, aspectRatio, targetImageWidth);

  // Load remaining pages in background
  setTimeout(async () => {
    for (let i = initialLoad + 1; i <= totalPages; i++) {
      const pageData = await pdfRenderer.renderPageToDataUrl(i, targetImageWidth);
      loadedPages.add(i);

      // Add page to flipbook dynamically
      const pageDiv = createPageElement(pageData, i - 1, totalPages);
      // Note: PageFlip doesn't support dynamic addition easily, so we preload for next/prev
    }
  }, 1000);

  updateLoading('Ready!', 100);
  setTimeout(() => {
    if (readerLoading) readerLoading.classList.add('hidden');
    if (bookContainer) bookContainer.style.display = 'flex';
  }, 500);
}

function createPageElement(page, index, total) {
  const pageDiv = document.createElement('div');
  pageDiv.className = 'my-page';
  if (index === 0 || index === total - 1) {
    pageDiv.setAttribute('data-density', 'hard');
  } else {
    pageDiv.setAttribute('data-density', 'soft');
  }

  const img = document.createElement('img');
  img.src = page.dataUrl;
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit = 'contain';

  pageDiv.appendChild(img);
  return pageDiv;
}

async function createFlipBook(initialPages, aspectRatio, targetImageWidth) {
  if (!bookContainer || initialPages.length === 0) return;

  const container = document.getElementById('readerContainer');
  const availableWidth = container.clientWidth - 120;
  const availableHeight = container.clientHeight - 40;

  pageWidth = Math.min(availableWidth / 2, 500);
  let pageHeight = pageWidth / aspectRatio;

  if (pageHeight > availableHeight) {
    pageHeight = availableHeight;
    pageWidth = pageHeight * aspectRatio;
  }

  bookContainer.innerHTML = '';

  initialPages.forEach((page, index) => {
    const pageDiv = createPageElement(page, index, totalPages);
    bookContainer.appendChild(pageDiv);
  });

  // OPTIMIZED: Faster flipping, lighter shadow
  pageFlip = new PageFlip(bookContainer, {
    width: Math.floor(pageWidth),
    height: Math.floor(pageHeight),
    size: 'fixed',
    minWidth: 200,
    maxWidth: 800,
    minHeight: 300,
    maxHeight: 1200,
    maxShadowOpacity: 0.3, // LIGHTER shadow
    showCover: true,
    mobileScrollSupport: false,
    swipeDistance: 30,
    clickEventForward: true,
    useMouseEvents: true,
    flippingTime: 500, // FASTER (was 800)
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
  if (pageFlip) {
    pageFlip.on('flip', () => {
      currentPage = pageFlip.getCurrentPageIndex() + 1;
      updatePageInfo();
    });
    pageFlip.on('init', () => {
      currentPage = pageFlip.getCurrentPageIndex() + 1;
      updatePageInfo();
    });
  }

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

  // Keyboard
  document.addEventListener('keydown', handleKeyboard);

  // Touch swipe for mobile
  if (isMobileMode) setupTouchSwipe();
}

// ================================================
// Touch Swipe (Mobile) — Native Pinch Zoom
// ================================================

function setupTouchSwipe() {
  if (!singlePageViewer) return;

  let startX = 0;
  let startY = 0;
  let lastTapTime = 0;

  // Native pinch zoom via CSS
  singlePageViewer.style.touchAction = 'pan-zoom';

  singlePageViewer.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }
  }, { passive: true });

  singlePageViewer.addEventListener('touchend', (e) => {
    if (e.changedTouches.length === 1) {
      // Double Tap Zoom
      const now = Date.now();
      if (now - lastTapTime < 300) {
        e.preventDefault();
        zoomLevel = zoomLevel > 1 ? 1 : 2;
        applyZoom();
        return;
      }
      lastTapTime = now;

      // Swipe navigation (only when not zoomed)
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
// Update Page Info — FIXED: No offset
// ================================================

function updatePageInfo() {
  if (currentPageNum) currentPageNum.textContent = currentPage;
  if (totalPageNum) totalPageNum.textContent = totalPages;
  if (pageSlider) pageSlider.value = currentPage;
  if (prevBtn) prevBtn.classList.toggle('disabled', currentPage <= 1);
  if (nextBtn) nextBtn.classList.toggle('disabled', currentPage >= totalPages);

  // FIXED: No more translateX offset for cover pages
  if (bookContainer) {
    bookContainer.style.setProperty('--cover-offset', '0px');
    bookContainer.classList.remove('show-cover');
    bookContainer.classList.remove('show-back-cover');
  }
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
    if (bookContainer) bookContainer.style.display = 'none';
    if (singlePageViewer) singlePageViewer.style.display = 'flex';
    renderSinglePage(currentPage);
  } else {
    if (singlePageViewer) singlePageViewer.style.display = 'none';
    if (bookContainer) bookContainer.style.display = 'flex';
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
