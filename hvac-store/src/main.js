import './style.css';
import { categories, brands, products } from './data.js';
import { productCard, formatPrice, renderCartSidebar, toggleCart, bindCartEvents, bindProductCards, addToCart, favorites, getRecentlyViewedIds, restoreCart, updateCartUI, closeCheckoutSummary, sendWhatsAppOrder } from './shared.js';
import { getRoute, renderCategoryPage, renderSubcategoryPage, renderBrandPage, renderSearchPage, renderBrandsList, renderLoginPage, renderRegisterPage, bindCategoryPageEvents, bindAuthEvents, renderProductPage, bindProductPageEvents } from './router.js';

function slugify(str) { return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

function brandRouteForCategory(catId, brand) {
  if (catId && brand) return `#/category/${catId}?brand=${encodeURIComponent(brand)}`;
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
    .map(product => ({ display: `${product.description || product.name} · ${product.brand}`, query: product.model || product.name }));
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
  const displayName = isLoggedIn ? (user.firstName || user.first_name || user.name || 'Mi cuenta') : null;

  const userArea = isLoggedIn
    ? `<div class="header-action user-menu-wrap" id="userMenuWrap">
        <button class="user-menu-trigger" id="userMenuTrigger" aria-expanded="false" aria-haspopup="true">
          <span class="user-avatar">${displayName.charAt(0).toUpperCase()}</span>
          <span class="user-menu-name">${displayName}</span>
          <i class="fas fa-chevron-down user-menu-arrow"></i>
        </button>
        <div class="user-dropdown" id="userDropdown" role="menu">
          <div class="user-dropdown-header">
            <span class="user-dropdown-avatar">${displayName.charAt(0).toUpperCase()}</span>
            <div>
              <strong>${displayName}</strong>
              <span>${user.email || ''}</span>
            </div>
          </div>
          <ul class="user-dropdown-list">
            <li><a href="#/account" role="menuitem"><i class="fas fa-sliders"></i> Mi cuenta</a></li>
            <li><a href="#/favorites" role="menuitem"><i class="fas fa-heart"></i> Favoritos</a></li>
            <li><a href="#/recent" role="menuitem"><i class="fas fa-clock-rotate-left"></i> Vistos recientemente</a></li>
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

function renderAccountLayout(activeTab, contentHTML) {
  const user = getAuthUser();
  if (!user) {
    window.location.hash = '#/login';
    return '';
  }
  const name = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim()
    : (user.name || 'Usuario');
  
  const favProds = getProductsByIds(favorites);
  const recentProds = getProductsByIds(getRecentlyViewedIds());
  
  return `
    <div class="breadcrumb"><a href="#/">Inicio</a><span>›</span><span>Mi cuenta</span></div>
    <div class="account-page" style="margin-top: 20px;">
      <div class="container">
        <div class="account-layout">
          <!-- Sidebar -->
          <aside class="account-sidebar">
            <div class="account-avatar">
              <span class="account-avatar-icon">${name.charAt(0).toUpperCase()}</span>
              <div>
                <strong>${name}</strong>
                <span>${user.email || ''}</span>
              </div>
            </div>
            <nav class="account-nav">
              <a href="#/account" class="account-nav-link ${activeTab === 'profile' ? 'active' : ''}">
                <i class="fas fa-sliders"></i> Perfil
              </a>
              <a href="#/favorites" class="account-nav-link ${activeTab === 'favorites' ? 'active' : ''}">
                <i class="fas fa-heart"></i> Favoritos
                <span class="account-nav-badge">${favProds.length}</span>
              </a>
              <a href="#/recent" class="account-nav-link ${activeTab === 'recent' ? 'active' : ''}">
                <i class="fas fa-clock-rotate-left"></i> Vistos recientemente
                <span class="account-nav-badge">${recentProds.length}</span>
              </a>
            </nav>
            <button id="accountLogoutBtn" class="account-logout-btn">
              <i class="fas fa-right-from-bracket"></i> Cerrar sesión
            </button>
          </aside>

          <!-- Main content -->
          <div class="account-content">
            ${contentHTML}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderProfileTab() {
  const user = getAuthUser();
  const name = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim()
    : (user.name || 'Usuario');
  return `
    <section class="account-section" id="account-profile" style="border:none;padding:0;margin:0">
      <h2 style="margin-bottom:20px"><i class="fas fa-sliders"></i> Información de perfil</h2>
      <div class="account-form-grid">
        <div class="auth-field">
          <label>Nombre completo</label>
          <input type="text" value="${name}" disabled />
        </div>
        <div class="auth-field">
          <label>Correo electrónico</label>
          <input type="email" value="${user.email || ''}" disabled />
        </div>
      </div>
      <p class="account-edit-note" style="margin-top:20px"><i class="fas fa-info-circle"></i> Para actualizar tus datos, contacta a soporte.</p>
    </section>
  `;
}

function renderFavoritesTab() {
  const favoriteProducts = getProductsByIds(favorites);
  return `
    <section class="account-section" id="account-favorites" style="border:none;padding:0;margin:0">
      <h2 style="margin-bottom:20px"><i class="fas fa-heart"></i> Mis Favoritos (${favoriteProducts.length})</h2>
      ${favoriteProducts.length
        ? `<div class="products-grid account-mini-grid">${favoriteProducts.map(productCard).join('')}</div>`
        : `<div class="account-empty" style="padding:40px 20px">
            <i class="fas fa-heart" style="font-size:2.5rem;color:var(--gray-300);margin-bottom:12px;display:block;text-align:center"></i>
            <p style="text-align:center;color:var(--gray-500)">Aún no tienes favoritos guardados.</p>
            <a href="#/" class="account-empty-link" style="display:inline-block;margin-top:14px;padding:8px 20px;border-radius:8px;background:var(--blue-primary);color:var(--white);font-weight:600;text-decoration:none">Explorar productos</a>
          </div>`}
    </section>
  `;
}

function renderRecentTab() {
  const recentProducts = getProductsByIds(getRecentlyViewedIds());
  return `
    <section class="account-section" id="account-recent" style="border:none;padding:0;margin:0">
      <h2 style="margin-bottom:20px"><i class="fas fa-clock-rotate-left"></i> Vistos recientemente (${recentProducts.length})</h2>
      ${recentProducts.length
        ? `<div class="products-grid account-mini-grid">${recentProducts.map(productCard).join('')}</div>`
        : `<div class="account-empty" style="padding:40px 20px">
            <i class="fas fa-clock-rotate-left" style="font-size:2.5rem;color:var(--gray-300);margin-bottom:12px;display:block;text-align:center"></i>
            <p style="text-align:center;color:var(--gray-500)">Aún no has visitado ningún producto.</p>
          </div>`}
    </section>
  `;
}

function renderAccountPage() {
  return renderAccountLayout('profile', renderProfileTab());
}

function renderFavoritesPage() {
  return renderAccountLayout('favorites', renderFavoritesTab());
}

function renderRecentPage() {
  return renderAccountLayout('recent', renderRecentTab());
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

  if (route.page === 'product') {
    content.innerHTML = renderProductPage(route.id);
    bindProductCards();
    bindProductPageEvents();
  } else if (route.page === 'category') {
    content.innerHTML = renderCategoryPage(route.id, route.brand || '');
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
    bindProductCards();
    bindAccountEvents();
  } else if (route.page === 'favorites') {
    content.innerHTML = renderFavoritesPage();
    bindProductCards();
    bindAccountEvents();
  } else if (route.page === 'recent') {
    content.innerHTML = renderRecentPage();
    bindProductCards();
    bindAccountEvents();
  } else {
    content.innerHTML = renderHomePage();
    bindHomeEvents();
  }
}

function bindAccountEvents() {
  const accLogout = document.getElementById('accountLogoutBtn');
  if (accLogout) {
    accLogout.addEventListener('click', () => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.hash = '#/';
      location.reload();
    });
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

function refreshHeader() {
  const oldHeader = document.querySelector('.header');
  if (!oldHeader) return;
  const temp = document.createElement('div');
  temp.innerHTML = renderHeader();
  oldHeader.replaceWith(temp.firstElementChild);
  bindGlobalSearch('searchInput', 'searchSuggestions', 'searchBtn');
  bindUserDropdown();
}

window.addEventListener('hvac:auth:changed', refreshHeader);

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
    <!-- Botón flotante WhatsApp -->
    <a href="https://wa.me/528110238465?text=${encodeURIComponent('Hola, necesito ayuda con un producto de HvacDirecto 👋')}" target="_blank" rel="noopener noreferrer" class="wa-float" id="waFloat" title="Chatea con nosotros">
      <i class="fab fa-whatsapp"></i>
      <span class="wa-float-label">¿Necesitas ayuda?</span>
    </a>
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
