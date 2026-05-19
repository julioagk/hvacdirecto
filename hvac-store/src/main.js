import './style.css';
import { categories, brands, products } from './data.js';
import { productCard, formatPrice, renderCartSidebar, toggleCart, bindCartEvents, bindProductCards, addToCart, favorites, getRecentlyViewedIds, restoreCart, updateCartUI, closeCheckoutSummary } from './shared.js';
import { getRoute, renderCategoryPage, renderSubcategoryPage, renderBrandPage, renderSearchPage, renderBrandsList, renderLoginPage, renderRegisterPage, bindCategoryPageEvents, bindAuthEvents } from './router.js';

function slugify(str) { return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

function brandRouteForCategory(catId, brand) {
  const category = categories.find(c => c.id === catId);
  const subSlug = category?.subs?.[0] ? slugify(category.subs[0]) : '';
  if (catId && subSlug) return `#/category/${catId}/${subSlug}/${encodeURIComponent(brand)}`;
  if (catId) return `#/category/${catId}`;
  return `#/brand/${encodeURIComponent(brand)}`;
}

function normalizeSearchString(str) { return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

function getGlobalSearchSuggestions(query) {
  const normalizedQuery = String(query || '').toLowerCase().trim();
  if (normalizedQuery.length < 2) return [];
  return products
    .filter(product => {
      const haystack = [product.name, product.model, product.sku, product.description, product.brand, product.category, product.subcategory]
        .filter(Boolean)
        .join(' ');
      const haystackNorm = normalizeSearchString(haystack);
      const qNorm = normalizeSearchString(normalizedQuery);
      return haystackNorm.includes(qNorm);
    })
    .slice(0, 8)
    .map(product => ({ display: `${product.name} · ${product.model || ''} · ${product.brand}`, query: product.model || product.name }));
}

function bindGlobalSearch(searchInputId, sugBoxId, searchBtnId) {
  const searchInput = document.getElementById(searchInputId);
  const sugBox = document.getElementById(sugBoxId);
  const searchBtn = document.getElementById(searchBtnId);
  if (!searchInput || !sugBox) return;

  searchInput.addEventListener('input', () => {
    const matches = getGlobalSearchSuggestions(searchInput.value);
    if (matches.length) {
      sugBox.innerHTML = matches.map(m => `<li data-query="${encodeURIComponent(m.query)}">${m.display}</li>`).join('');
      sugBox.classList.add('active');
      sugBox.querySelectorAll('li').forEach(li => li.addEventListener('click', () => {
        const q = decodeURIComponent(li.dataset.query || '') || li.textContent;
        searchInput.value = li.textContent;
        sugBox.classList.remove('active');
        window.location.hash = '#/search/' + encodeURIComponent(q);
      }));
    } else {
      sugBox.classList.remove('active');
    }
  });

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      if (searchInput.value.trim()) window.location.hash = '#/search/' + encodeURIComponent(searchInput.value.trim());
    });
  }

  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && searchInput.value.trim()) window.location.hash = '#/search/' + encodeURIComponent(searchInput.value.trim());
  });

  document.addEventListener('click', e => { if (!e.target.closest(`.search-bar[data-search-id="${searchInputId}"]`)) sugBox.classList.remove('active'); });
}

function getAuthUser() {
  try { return JSON.parse(localStorage.getItem('auth_user') || 'null'); } catch { return null; }
}

function renderHeader() {
  const user = getAuthUser();
  const token = localStorage.getItem('auth_token');
  const isLoggedIn = !!(user && token);
  const displayName = isLoggedIn ? (user.firstName || user.name || 'Mi cuenta') : null;

  const userArea = isLoggedIn
    ? `<div class="header-action user-menu-wrap" id="userMenuWrap">
        <button class="user-menu-trigger" id="userMenuTrigger" aria-expanded="false" aria-haspopup="true">
          <span class="user-avatar"><i class="fas fa-user"></i></span>
          <span class="user-menu-name">${displayName}</span>
          <i class="fas fa-chevron-down user-menu-arrow"></i>
        </button>
        <div class="user-dropdown" id="userDropdown" role="menu">
          <div class="user-dropdown-header">
            <span class="user-dropdown-avatar"><i class="fas fa-user-circle"></i></span>
            <div>
              <strong>${displayName}</strong>
              <span>${user.email || ''}</span>
            </div>
          </div>
          <ul class="user-dropdown-list">
            <li><a href="#/account" role="menuitem"><i class="fas fa-sliders"></i> Mi cuenta</a></li>
            <li><a href="#/favorites" role="menuitem"><i class="fas fa-heart"></i> Favoritos</a></li>
          </ul>
          <div class="user-dropdown-footer">
            <button id="logoutBtn" class="user-logout-btn"><i class="fas fa-right-from-bracket"></i> Cerrar sesión</button>
          </div>
        </div>
      </div>`
    : `<a href="#/login" class="header-action header-link" id="loginLink"><i class="fas fa-user"></i><span>Ingresar</span></a>`;

  return `<header class="header"><div class="container">
    <a href="#/" class="logo"><span style="color:var(--orange-primary);font-weight:800">Hvac</span><span style="color:var(--blue-primary);font-weight:800;margin-left:6px">Directo</span></a>
    <div class="search-bar">
      <input type="text" id="searchInput" placeholder="Buscar productos en toda la tienda..." autocomplete="off" />
      <button id="searchBtn"><i class="fas fa-search"></i></button>
      <ul class="search-suggestions" id="searchSuggestions"></ul>
    </div>
    <div class="header-actions">
      ${userArea}
      <div class="header-action" id="cartToggle">
        <i class="fas fa-shopping-cart"></i><span>Carrito</span>
        <span class="cart-badge" id="cartCount">0</span>
      </div>
    </div>
  </div></header>`;
}

function getProductsByIds(ids) {
  return ids.map(id => products.find(p => p.id === id)).filter(Boolean);
}

function renderShelfSection(title, items, options = {}) {
  const sectionId = options.sectionId ? ` id="${options.sectionId}"` : '';
  const emptyIcon = options.emptyIcon || 'fa-box-open';
  const emptyTitle = options.emptyTitle || 'Todavía no hay productos aquí';
  const emptyText = options.emptyText || 'Agrega favoritos o abre productos para que aparezcan en este bloque.';
  return `<section class="section home-shelf"${sectionId}><div class="container">
    <div class="section-header"><div><h2>${title}</h2>${options.subtitle ? `<p class="section-intro">${options.subtitle}</p>` : ''}</div></div>
    ${items.length ? `<div class="products-grid">${items.map(productCard).join('')}</div>` : `<div class="home-empty-state"><i class="fas ${emptyIcon}"></i><h3>${emptyTitle}</h3><p>${emptyText}</p>${options.cta || ''}</div>`}
  </div></section>`;
}

function renderNav() {
  const route = getRoute();
  const currentBrand = route.brand || '';
  const items = categories.map(c => `
    <li class="nav-item">
      <a href="#/category/${c.id}"><i class="fas ${c.icon} nav-icon"></i> ${c.name} <i class="fas fa-chevron-down nav-arrow"></i></a>
      <div class="mega-menu">
        <div><h4>${c.name}</h4>${c.subs.map(s => `<a href="#/category/${c.id}/${slugify(s)}">${s}</a>`).join('')}</div>
        <div><h4>Por Marca</h4>${brands.map(b => `<a href="${brandRouteForCategory(c.id, b)}" class="${b === currentBrand ? 'active' : ''}">${b}</a>`).join('')}</div>
      </div>
    </li>`).join('');
  return `<nav class="main-nav"><div class="container"><ul class="nav-list">
    ${items}
    <li class="nav-item"><a href="#/brands" id="navBrands"><i class="fas fa-tags nav-icon"></i> Marcas</a></li>
  </ul></div></nav>`;
}

function renderFooter() {
  return `<footer class="footer"><div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <h4><span style="color:var(--orange-primary)">Hvac</span><span style="color:var(--blue-primary)">Directo</span></h4>
        <p>Tu tienda de equipos de climatización con precios de mayorista.</p>
        <div class="footer-social">
          <a href="#"><i class="fab fa-facebook-f"></i></a>
          <a href="#"><i class="fab fa-instagram"></i></a>
          <a href="#"><i class="fab fa-youtube"></i></a>
          <a href="#"><i class="fab fa-whatsapp"></i></a>
        </div>
      </div>
      <div><h4>Categorías</h4><ul>
        ${categories.slice(0, 5).map(c => `<li><a href="#/category/${c.id}">${c.name}</a></li>`).join('')}
      </ul></div>
      <div><h4>Servicio</h4><ul>
        <li><a href="#">Centro de Ayuda</a></li><li><a href="#">Seguimiento de Pedido</a></li>
        <li><a href="#">Garantías</a></li><li><a href="#">Devoluciones</a></li><li><a href="#">Contacto</a></li>
      </ul></div>
      <div><h4>Contacto</h4><ul>
        <li><i class="fas fa-envelope" style="margin-right:6px"></i> ventas@hvacdirecto.mx</li>
        <li><i class="fas fa-message" style="margin-right:6px"></i> Atención en revisión</li>
      </ul></div>
    </div>
    <div class="footer-bottom"><p>&copy; 2026 HvacDirecto — Todos los derechos reservados.</p></div>
  </div></footer>`;
}

/* ── HOME PAGE SECTIONS ── */

function renderHero() {
  return `<section class="hero"><div class="container">
    <div class="hero-content">
      <h1>Encuentra el Sistema <span>HVAC Perfecto</span> para Tu Hogar</h1>
      <p>Precios de mayorista directo al público. Equipos certificados con garantía del fabricante.</p>
      <div class="hero-filters">
        <div class="hero-search-wrap">
          <label for="heroSearchInput">Buscar productos</label>
          <div class="search-bar hero-search" data-search-id="heroSearchInput">
            <input type="text" id="heroSearchInput" placeholder="Buscar productos en toda la tienda..." autocomplete="off" />
            <button id="heroSearchBtn"><i class="fas fa-search"></i></button>
            <ul class="search-suggestions" id="heroSearchSuggestions"></ul>
          </div>
        </div>
      </div>
    </div>
    <div class="hero-banner">
      <div class="hero-showcase">
        <div class="hero-showcase-head">
          <h3>Modelos destacados</h3>
          <p>Compara opciones por tecnologia y capacidad.</p>
        </div>
        <div class="hero-showcase-grid">
          <a href="#/brand/CARRIER" class="hero-product-tile">
            <img src="/images/PURON.png" alt="Carrier Puron X">
            <span>PURON X</span>
          </a>
          <a href="#/brand/CARRIER" class="hero-product-tile">
            <img src="/images/MAX.png" alt="Carrier Max">
            <span>MAX</span>
          </a>
          <a href="#/brand/CARRIER" class="hero-product-tile">
            <img src="/images/ULTRA.png" alt="Carrier Ultra">
            <span>ULTRA</span>
          </a>
        </div>
      </div>
    </div>
  </div></section>`;
}

function renderCategoriesGrid() {
  const cards = categories.map(c => `
    <a href="#/category/${c.id}" class="category-card">
      <div class="cat-icon"><i class="fas ${c.icon}"></i></div>
      <h3>${c.name}</h3>
      <p>${c.desc}</p>
    </a>`).join('');
  return `<section class="section"><div class="container">
    <div class="section-header"><h2>Categorías Principales</h2></div>
    <div class="categories-grid">${cards}</div>
  </div></section>`;
}

function renderAllProducts() {
  if (!products.length) return '';
  return `<section class="section"><div class="container">
    <div class="section-header"><h2>Productos Recomendados</h2></div>
    <div class="products-grid">${products.map(productCard).join('')}</div>
  </div></section>`;
}

function renderFavoritesSection() {
  const favoriteProducts = getProductsByIds(favorites);
  return renderShelfSection('Favoritos', favoriteProducts, {
    sectionId: 'favoritesSection',
    subtitle: 'Lo que guardaste para revisar después.',
    emptyIcon: 'fa-heart',
    emptyTitle: 'Aún no tienes favoritos',
    emptyText: 'Toca el corazón en cualquier producto para guardarlo aquí y compararlo después.',
    cta: '<a href="#/brands" style="display:inline-block;margin-top:14px;padding:10px 18px;border-radius:8px;background:var(--blue-primary);color:var(--white);font-weight:600;">Explorar catálogo</a>'
  });
}

function renderRecentlyViewedSection() {
  const recentProducts = getProductsByIds(getRecentlyViewedIds());
  return renderShelfSection('Vistos recientemente', recentProducts, {
    sectionId: 'recentSection',
    subtitle: 'Retoma donde lo dejaste.',
    emptyIcon: 'fa-clock-rotate-left',
    emptyTitle: 'Aún no has visto productos',
    emptyText: 'Abre cualquier producto para que aparezca aquí tu historial reciente.'
  });
}

function renderBrandsSection() {
  return `<section class="brands-section"><div class="container">
    <div class="section-header" style="justify-content:center"><h2>Comprar por Marca</h2></div>
    <div class="brands-grid">${brands.map(b => `<a href="#/brand/${encodeURIComponent(b)}" class="brand-logo">${b}</a>`).join('')}</div>
  </div></section>`;
}

/* ── PAGE RENDERERS ── */

function renderFavoritesPage() {
  const favoriteProducts = getProductsByIds(favorites);
  const user = getAuthUser();
  const name = user ? (user.firstName || user.name || 'Usuario') : null;
  return `
    <div class="breadcrumb"><a href="#/">Inicio</a><span>›</span><span>Favoritos</span></div>
    <div class="cat-hero"><div class="container">
      <div><h1>Favoritos</h1><p>${name ? `Lista de deseos de ${name}` : 'Productos que guardaste para revisar después.'}</p></div>
      <i class="fas fa-heart cat-hero-icon"></i>
    </div></div>
    <section class="section"><div class="container">
      ${favoriteProducts.length
        ? `<div class="products-grid">${favoriteProducts.map(p => {
            const { productCard } = window.__hvac || {};
            // re-import via global — handled by bindProductCards
            return `<div class="product-card" data-id="${p.id}">
              <div class="product-img"><img src="${p.image || ''}" alt="${p.name}" loading="lazy" /></div>
              <div class="product-info">
                <div class="product-brand">${p.brand}</div>
                <div class="product-name">${p.description || p.name}</div>
                <div class="product-pricing"><span class="price-current">$${Number(p.price).toLocaleString('es-MX', {minimumFractionDigits:2})}</span></div>
                <div class="product-actions">
                  <button class="btn-cart" data-id="${p.id}"><i class="fas fa-cart-plus"></i> Agregar</button>
                  <button class="btn-wish active" data-id="${p.id}" title="Quitar de favoritos"><i class="fas fa-heart"></i></button>
                </div>
              </div>
            </div>`;
          }).join('')}</div>`
        : `<div class="home-empty-state">
            <i class="fas fa-heart"></i>
            <h3>Aún no tienes favoritos</h3>
            <p>Toca el corazón en cualquier producto para guardarlo aquí y compararlo después.</p>
            <a href="#/brands" style="display:inline-block;margin-top:14px;padding:10px 22px;border-radius:8px;background:var(--blue-primary);color:var(--white);font-weight:600;">Explorar catálogo</a>
          </div>`}
    </div></section>`;
}

function renderAccountPage() {
  const user = getAuthUser();
  if (!user) {
    // Not logged in — redirect to login
    window.location.hash = '#/login';
    return '';
  }
  const name = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user.name || 'Usuario');
  return `
    <div class="breadcrumb"><a href="#/">Inicio</a><span>›</span><span>Mi cuenta</span></div>
    <section class="auth-page">
      <div class="container auth-register-shell">
        <div class="auth-panel auth-register-card">
          <div style="display:flex;align-items:center;gap:18px;margin-bottom:28px">
            <span style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--blue-primary),var(--blue-dark));display:flex;align-items:center;justify-content:center;color:var(--white);font-size:1.8rem;flex-shrink:0">
              <i class="fas fa-user"></i>
            </span>
            <div>
              <h1 style="font-size:1.6rem;margin-bottom:4px">${name}</h1>
              <p style="color:var(--gray-600);font-size:.9rem">${user.email || ''}</p>
            </div>
          </div>

          <div class="auth-section">
            <h2>Información de la cuenta</h2>
            <div style="display:grid;gap:14px">
              <div class="auth-field">
                <label>Nombre completo</label>
                <input type="text" value="${name}" disabled style="background:var(--gray-100);cursor:not-allowed;margin-top:6px" />
              </div>
              <div class="auth-field">
                <label>Correo electrónico</label>
                <input type="email" value="${user.email || ''}" disabled style="background:var(--gray-100);cursor:not-allowed;margin-top:6px" />
              </div>
            </div>
          </div>

          <div style="margin-top:28px;display:flex;gap:12px;flex-wrap:wrap">
            <a href="#/favorites" style="display:inline-flex;align-items:center;gap:8px;padding:11px 22px;border-radius:10px;background:var(--blue-light);color:var(--blue-primary);font-weight:600;font-size:.9rem">
              <i class="fas fa-heart"></i> Ver favoritos
            </a>
            <button id="accountLogoutBtn" style="display:inline-flex;align-items:center;gap:8px;padding:11px 22px;border-radius:10px;border:1px solid #fca5a5;color:#ef4444;background:transparent;font-weight:600;font-size:.9rem;cursor:pointer;font-family:inherit">
              <i class="fas fa-right-from-bracket"></i> Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </section>`;
}

function renderHomePage() {
  return renderHero() + renderCategoriesGrid() + renderFavoritesSection() + renderRecentlyViewedSection() + renderAllProducts() + renderBrandsSection();
}

/* ── ROUTER ── */

let _lastRoutePage = null;
function navigate() {
  const route = getRoute();
  const content = document.getElementById('pageContent');
  // Only scroll to top when navigating to a different main page
  if (route.page !== _lastRoutePage) {
    window.scrollTo(0, 0);
  }
  _lastRoutePage = route.page;

  if (route.page === 'category') {
    content.innerHTML = renderCategoryPage(route.id);
    bindCategoryPageEvents();
  } else if (route.page === 'subcategory') {
    content.innerHTML = renderSubcategoryPage(route.id, route.sub, route.brand, route.type);
    bindCategoryPageEvents();
  } else if (route.page === 'brand') {
    content.innerHTML = renderBrandPage(route.id);
    bindCategoryPageEvents();
  } else if (route.page === 'brands') {
    content.innerHTML = renderBrandsList();
    bindCategoryPageEvents();
  } else if (route.page === 'search') {
    content.innerHTML = renderSearchPage(route.query);
    bindCategoryPageEvents();
  } else if (route.page === 'login') {
    content.innerHTML = renderLoginPage();
    bindAuthEvents();
  } else if (route.page === 'register') {
    content.innerHTML = renderRegisterPage();
    bindAuthEvents();
  } else if (route.page === 'account') {
    content.innerHTML = renderAccountPage();
    const accLogout = document.getElementById('accountLogoutBtn');
    if (accLogout) {
      accLogout.addEventListener('click', () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.location.hash = '#/';
        location.reload();
      });
    }
  } else if (route.page === 'favorites') {
    content.innerHTML = renderFavoritesPage();
    bindProductCards();
  } else {
    content.innerHTML = renderHomePage();
    bindHomeEvents();
  }
}

function bindHomeEvents() {
  bindProductCards();
  bindGlobalSearch('heroSearchInput', 'heroSearchSuggestions', 'heroSearchBtn');
}

/* ── USER DROPDOWN ── */

function bindUserDropdown() {
  const trigger = document.getElementById('userMenuTrigger');
  const dropdown = document.getElementById('userDropdown');
  if (!trigger || !dropdown) return;

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = trigger.getAttribute('aria-expanded') === 'true';
    trigger.setAttribute('aria-expanded', String(!open));
    dropdown.classList.toggle('open', !open);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#userMenuWrap')) {
      trigger.setAttribute('aria-expanded', 'false');
      dropdown.classList.remove('open');
    }
  });

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      // Re-render header and re-bind
      document.querySelector('#app').innerHTML = `
        ${renderHeader()}
        ${renderNav()}
        <main id="pageContent"></main>
        ${renderFooter()}
        ${renderCartSidebar()}
        <div class="cart-overlay" id="cartOverlay"></div>
        <div class="modal-overlay" id="productModal"></div>
        <div class="modal-overlay" id="checkoutModal"></div>
      `;
      document.getElementById('cartToggle').addEventListener('click', toggleCart);
      document.getElementById('cartOverlay').addEventListener('click', toggleCart);
      document.getElementById('checkoutModal').addEventListener('click', e => { if (e.target.id === 'checkoutModal') closeCheckoutSummary(); });
      bindCartEvents();
      updateCartUI();
      bindUserDropdown();
      bindGlobalSearch('searchInput', 'searchSuggestions', 'searchBtn');
      window.location.hash = '#/';
      navigate();
    });
  }
}

/* ── INIT ── */

function initApp() {
  restoreCart();
  document.querySelector('#app').innerHTML = `
    ${renderHeader()}
    ${renderNav()}
    <main id="pageContent"></main>
    ${renderFooter()}
    ${renderCartSidebar()}
    <div class="cart-overlay" id="cartOverlay"></div>
    <div class="modal-overlay" id="productModal"></div>
    <div class="modal-overlay" id="checkoutModal"></div>
  `;

  // Global events (always active)
  document.getElementById('cartToggle').addEventListener('click', toggleCart);
  document.getElementById('cartOverlay').addEventListener('click', toggleCart);
  document.getElementById('checkoutModal').addEventListener('click', e => { if (e.target.id === 'checkoutModal') closeCheckoutSummary(); });
  bindCartEvents();
  updateCartUI();

  // User dropdown
  bindUserDropdown();

  bindGlobalSearch('searchInput', 'searchSuggestions', 'searchBtn');
  bindGlobalSearch('heroSearchInput', 'heroSearchSuggestions', 'heroSearchBtn');

  // Listen for route changes
  window.addEventListener('hashchange', navigate);
  navigate();
}

initApp();
