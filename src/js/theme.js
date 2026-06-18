// ================================================
// Theme / Shared Utilities
// ================================================

// --- Navbar ---
export function initNavbar() {
  const navbar = document.getElementById('navbar');
  const menuBtn = document.getElementById('menuBtn');
  const navLinks = document.getElementById('navLinks');

  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
  }

  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });

    navLinks.querySelectorAll('.nav-link, .nav-cta').forEach(link => {
      link.addEventListener('click', () => navLinks.classList.remove('open'));
    });
  }
}

// --- Scroll Animations ---
export function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
}

// --- Fetch Magazines ---
export async function fetchMagazines() {
  try {
    const res = await fetch('/magazines.json');
    return await res.json();
  } catch (err) {
    console.error('Error fetching magazines:', err);
    return [];
  }
}

// --- Create Magazine Card ---
export function createMagazineCard(magazine) {
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <div class="card-cover">
      <img src="${magazine.cover}" alt="${magazine.title} ${magazine.year}"
           onerror="this.style.display='none'; this.parentElement.innerHTML += createPlaceholderSVG(${JSON.stringify(magazine).replace(/"/g, '&quot;')})">
      <div class="card-cover-overlay">
        <a href="/reader.html?id=${magazine.id}" class="card-read-btn">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          Read Now
        </a>
      </div>
    </div>
    <div class="card-body">
      <div class="card-year">${magazine.year}</div>
      <div class="card-title">${magazine.title}</div>
      <div class="card-subtitle">${magazine.subtitle || ''}</div>
      <div class="card-meta">
        <span>📄 ${magazine.pages || '—'} pages</span>
        <span>📅 ${magazine.date ? new Date(magazine.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''}</span>
      </div>
    </div>
  `;
  return card;
}

// --- Placeholder SVG ---
// Exposed globally for onerror
window.createPlaceholderSVG = function(magazine) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" style="width:100%;height:100%;">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#111827"/>
        <stop offset="100%" style="stop-color:#1a2235"/>
      </linearGradient>
    </defs>
    <rect width="400" height="533" fill="url(#bg)"/>
    <circle cx="200" cy="180" r="60" stroke="#1d4ed8" stroke-width="1.5" fill="none" opacity="0.3"/>
    <text x="200" y="200" fill="#1d4ed8" font-family="Inter,sans-serif" font-size="48" font-weight="900" text-anchor="middle">SPE</text>
    <text x="200" y="250" fill="#94a3b8" font-family="Inter,sans-serif" font-size="16" font-weight="500" text-anchor="middle">Cairo University</text>
    <text x="200" y="320" fill="#f1f5f9" font-family="Inter,sans-serif" font-size="64" font-weight="900" text-anchor="middle">${magazine.year}</text>
    <text x="200" y="360" fill="#64748b" font-family="Inter,sans-serif" font-size="14" text-anchor="middle">Annual Magazine</text>
    <line x1="150" y1="280" x2="250" y2="280" stroke="#1d4ed8" stroke-width="2" opacity="0.5"/>
  </svg>`;
};

// --- Global Mouse Glow Event Tracking ---
if (typeof window !== 'undefined') {
  document.addEventListener('mousemove', (e) => {
    document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
    document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
  });
}
