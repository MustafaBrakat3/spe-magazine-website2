// ================================================
// Archive Page JS
// ================================================
import { initNavbar, initScrollAnimations, fetchMagazines, createMagazineCard } from './theme.js';

initNavbar();

let allMagazines = [];
let activeYear = 'all';
let searchQuery = '';

async function init() {
  allMagazines = await fetchMagazines();
  allMagazines.sort((a, b) => b.year - a.year);
  buildFilterTabs();
  renderMagazines();
  setupSearch();
  initScrollAnimations();
}

function buildFilterTabs() {
  const tabsContainer = document.getElementById('filterTabs');
  if (!tabsContainer) return;
  
  // Create sliding indicator element
  const indicator = document.createElement('div');
  indicator.className = 'filter-indicator';
  indicator.id = 'filterIndicator';
  tabsContainer.appendChild(indicator);

  const years = [...new Set(allMagazines.map(m => m.year))].sort((a, b) => b - a);
  years.forEach(year => {
    const tab = document.createElement('button');
    tab.className = 'filter-tab';
    tab.dataset.year = year;
    tab.textContent = year;
    tabsContainer.appendChild(tab);
  });

  const updateIndicator = () => {
    const activeTab = tabsContainer.querySelector('.filter-tab.active');
    if (activeTab && indicator) {
      indicator.style.left = `${activeTab.offsetLeft}px`;
      indicator.style.width = `${activeTab.offsetWidth}px`;
      indicator.style.height = `${activeTab.offsetHeight}px`;
      indicator.style.top = `${activeTab.offsetTop}px`;
    }
  };

  tabsContainer.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      tabsContainer.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeYear = tab.dataset.year;
      renderMagazines();
      updateIndicator();
    });
  });

  // Calculate position after rendering
  setTimeout(updateIndicator, 50);
  setTimeout(updateIndicator, 300);
  window.addEventListener('resize', updateIndicator);
}

function renderMagazines() {
  const grid = document.getElementById('archiveGrid');
  const emptyState = document.getElementById('emptyState');
  const resultNumber = document.getElementById('resultNumber');
  if (!grid) return;

  let filtered = [...allMagazines];
  if (activeYear !== 'all') filtered = filtered.filter(m => m.year === parseInt(activeYear));
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(m =>
      m.title.toLowerCase().includes(q) ||
      (m.subtitle && m.subtitle.toLowerCase().includes(q)) ||
      (m.description && m.description.toLowerCase().includes(q)) ||
      m.year.toString().includes(q) ||
      (m.tags && m.tags.some(t => t.toLowerCase().includes(q)))
    );
  }

  grid.innerHTML = '';
  if (filtered.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    if (resultNumber) resultNumber.textContent = '0';
    return;
  }
  if (emptyState) emptyState.style.display = 'none';
  if (resultNumber) resultNumber.textContent = filtered.length;

  filtered.forEach((magazine, index) => {
    const card = createMagazineCard(magazine);
    card.style.animationDelay = `${index * 0.05}s`;
    grid.appendChild(card);
  });
}

function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;
  let debounceTimer;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchQuery = e.target.value.trim();
      renderMagazines();
    }, 200);
  });
}

init();
