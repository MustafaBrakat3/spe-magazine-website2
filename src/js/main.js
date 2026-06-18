// ================================================
// Home Page JS
// ================================================
import { initNavbar, initScrollAnimations, fetchMagazines, createMagazineCard } from './theme.js';

initNavbar();

async function init() {
  const magazines = await fetchMagazines();
  if (!magazines.length) return;

  const featured = magazines.find(m => m.featured) || magazines[0];
  const sorted = [...magazines].sort((a, b) => b.year - a.year);

  // --- Hero Magazine ---
  const heroMagazine = document.getElementById('heroMagazine');
  if (heroMagazine && featured) {
    const img = document.createElement('img');
    img.src = featured.cover;
    img.alt = `${featured.title} ${featured.year}`;
    img.onerror = function() {
      this.style.display = 'none';
      heroMagazine.innerHTML += window.createPlaceholderSVG(featured);
      const badge = document.createElement('div');
      badge.className = 'hero-magazine-badge';
      badge.textContent = 'Latest Issue';
      heroMagazine.appendChild(badge);
    };
    heroMagazine.prepend(img);
  }

  // --- Featured Card ---
  renderFeaturedCard(featured);

  // --- Magazine Grid ---
  const grid = document.getElementById('magazineGrid');
  if (grid) {
    sorted.forEach(magazine => {
      grid.appendChild(createMagazineCard(magazine));
    });
  }

  // --- About Image ---
  renderAboutImage();

  initScrollAnimations();
}

function renderFeaturedCard(magazine) {
  const container = document.getElementById('featuredCard');
  if (!container || !magazine) return;

  container.innerHTML = `
    <div class="featured-card animate-on-scroll">
      <div class="featured-cover">
        <img src="${magazine.cover}" alt="${magazine.title} ${magazine.year}"
             onerror="this.src='data:image/svg+xml,${encodeURIComponent(window.createPlaceholderSVG(magazine))}'">
      </div>
      <div class="featured-info">
        <div class="featured-label">⭐ Latest Issue</div>
        <h3 class="featured-title">${magazine.title}</h3>
        <div class="featured-subtitle">${magazine.subtitle || ''}</div>
        <p class="featured-description">${magazine.description || ''}</p>
        <div class="featured-meta-row">
          <div class="featured-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
            ${magazine.pages || '—'} pages
          </div>
          <div class="featured-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
            ${magazine.date ? new Date(magazine.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''}
          </div>
        </div>
        <div class="featured-tags">
          ${(magazine.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}
        </div>
        <div class="featured-actions">
          <a href="/reader.html?id=${magazine.id}" class="btn btn-primary">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            Read Now
          </a>
          <a href="${magazine.pdf}" download class="btn btn-secondary">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download PDF
          </a>
        </div>
      </div>
    </div>
  `;
}

function renderAboutImage() {
  const container = document.getElementById('aboutImage');
  if (!container) return;
  container.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" style="width:100%;aspect-ratio:4/3;">
    <rect width="600" height="400" fill="#0d1117"/>
    <circle cx="300" cy="200" r="80" stroke="#1d4ed8" stroke-width="1.5" fill="none" opacity="0.2"/>
    <g transform="translate(300,225)" opacity="0.15">
      <polygon points="0,-120 -40,120 40,120" fill="#1d4ed8" stroke="none"/>
      <rect x="-5" y="-140" width="10" height="30" fill="#1d4ed8"/>
      <rect x="-60" y="100" width="120" height="8" rx="4" fill="#1d4ed8"/>
    </g>
    <text x="300" y="60" fill="#ffffff" font-family="Inter,sans-serif" font-size="24" font-weight="800" text-anchor="middle" opacity="0.8">SPE CAIRO</text>
    <text x="300" y="200" fill="#1d4ed8" font-family="Inter,sans-serif" font-size="60" font-weight="900" text-anchor="middle" opacity="0.6">SPE</text>
    <text x="300" y="240" fill="#94a3b8" font-family="Inter,sans-serif" font-size="18" text-anchor="middle" opacity="0.6">Cairo University Chapter</text>
    <text x="300" y="270" fill="#64748b" font-family="Inter,sans-serif" font-size="14" text-anchor="middle" opacity="0.4">Est. 1987</text>
  </svg>`;
}

init();
