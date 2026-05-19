import { categories, brands, products } from './data.js';
import { productCard, formatPrice, bindProductCards, openProductModal, addToCart } from './shared.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function slugify(str) { return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

function getSubsubcategoryForProduct(p) {
  if (p.subsubcategory) return p.subsubcategory;
  if (p.category === 'mini-splits') return 'MURO';
  return '';
}

function subTypeRouteForCategory(catId, subSlug, typeSlug = '', brand = '') {
  const base = brand
    ? `#/category/${catId}/${subSlug}/${encodeURIComponent(brand)}`
    : `#/category/${catId}/${subSlug}`;
  if (!typeSlug) return base;
  return `${base}?type=${encodeURIComponent(typeSlug)}`;
}

function brandRouteForCategory(catId, brand, subSlug = '') {
  const category = categories.find(c => c.id === catId);
  const selectedSubSlug = subSlug || (category?.subs?.[0] ? slugify(category.subs[0]) : '');
  if (catId && selectedSubSlug) return `#/category/${catId}/${selectedSubSlug}/${encodeURIComponent(brand)}`;
  if (catId) return `#/category/${catId}`;
  return `#/brand/${encodeURIComponent(brand)}`;
}

function renderSidebarSearch(placeholder = 'Buscar en esta vista...') {
  return `
    <div class="sidebar-section sidebar-search">
      <h4>Buscar</h4>
      <input type="search" id="categorySearchInput" class="category-search-input" placeholder="${placeholder}" autocomplete="off" />
    </div>`;
}

function normalizeVoltage(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const compact = raw.replace(/\s+/g, '').toUpperCase();
  if (['110/1/60', '110V', '110'].includes(compact)) return '110 V';
  if (['220/1/60', '220V', '220'].includes(compact)) return '220 V';
  return raw;
}

function getFilterOptions(productsList) {
  return {
    brands: [...new Set(productsList.map(p => p.brand))].sort(),
    voltages: [...new Set(productsList.map(p => normalizeVoltage(p.voltage)).filter(Boolean))].sort(),
  };
}

function renderCatalogFilters(productsList, routeBrand = '') {
  const options = getFilterOptions(productsList);
  return `
    <div class="catalog-filters">
      <div class="catalog-filter">
        <label for="brandFilter">Marca</label>
        <select id="brandFilter">
          <option value="">Todas</option>
          ${options.brands.map(brand => `<option value="${brand}" ${brand === routeBrand ? 'selected' : ''}>${brand}</option>`).join('')}
        </select>
      </div>
      <div class="catalog-filter">
        <label for="voltageFilter">Voltaje</label>
        <select id="voltageFilter">
          <option value="">Todos</option>
          ${options.voltages.map(voltage => `<option value="${voltage}">${voltage}</option>`).join('')}
        </select>
      </div>
    </div>`;
}

function getVisibleProductsForRoute(route = getRoute()) {
  if (route.page === 'category') {
    return products.filter(p => p.category === route.id);
  }
  if (route.page === 'subcategory') {
    const cat = categories.find(c => c.id === route.id);
    if (!cat) return [];
    const subSlug = route.sub;
    const brand = route.brand || '';
    const type = route.type || '';
    const allSubProducts = products.filter(p => p.category === route.id && slugify(p.subcategory) === subSlug);
    const isMiniSplitSub = route.id === 'mini-splits' && ['inverter', 'no-inverter'].includes(subSlug);
    const currentTypeSlug = isMiniSplitSub ? slugify(type) : '';
    const typeFilteredProducts = currentTypeSlug
      ? allSubProducts.filter(p => slugify((p.subsubcategory || (p.category === 'mini-splits' ? 'MURO' : ''))) === currentTypeSlug)
      : allSubProducts;
    return typeFilteredProducts.filter(p => !brand || p.brand === brand);
  }
  if (route.page === 'brand') {
    return products.filter(p => p.brand === route.id);
  }
  return [];
}

export function getRoute() {
  const hash = window.location.hash.slice(1) || '/';
  const [pathPart, queryPart = ''] = hash.split('?');
  const parts = pathPart.split('/').filter(Boolean);
  const type = new URLSearchParams(queryPart).get('type') || '';
  if (parts[0] === 'login') return { page: 'login' };
  if (parts[0] === 'register') return { page: 'register' };
  if (parts[0] === 'brands') return { page: 'brands' };
  if (parts[0] === 'category' && parts[3]) return { page: 'subcategory', id: parts[1], sub: decodeURIComponent(parts[2]), brand: decodeURIComponent(parts[3]), type };
  if (parts[0] === 'category' && parts[2]) return { page: 'subcategory', id: parts[1], sub: decodeURIComponent(parts[2]), type };
  if (parts[0] === 'category' && parts[1]) return { page: 'category', id: parts[1] };
  if (parts[0] === 'brand' && parts[1]) return { page: 'brand', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 'search' && parts[1]) return { page: 'search', query: decodeURIComponent(parts[1]) };
  return { page: 'home' };
}

export function renderCategoryPage(catId) {
  const cat = categories.find(c => c.id === catId);
  if (!cat) return '<p>Categoría no encontrada</p>';
  const categoryProducts = products.filter(p => p.category === catId);
  const relatedBrands = [...new Set(categoryProducts.map(p => p.brand))];
  const route = getRoute();
  const currentBrand = route.brand || '';

  return `
    <div class="breadcrumb">
      <a href="#/">Inicio</a><span>›</span><span>${cat.name}</span>
    </div>
    <div class="cat-hero">
      <div class="container">
        <div><h1>${cat.name}</h1><p>${cat.desc}</p></div>
        <i class="fas ${cat.icon} cat-hero-icon"></i>
      </div>
    </div>
    <div class="cat-page-layout">
      <aside class="cat-sidebar">
        <h3>Subcategorías</h3>
        <ul>
          <li><a href="#/category/${catId}" class="active">Todos los ${cat.name} <span class="count">${categoryProducts.length}</span></a></li>
          ${cat.subs.map(s => `<li><a href="#/category/${catId}/${slugify(s)}">${s}</a></li>`).join('')}
        </ul>
        <div class="sidebar-section">
          <h4>Marcas en ${cat.name}</h4>
          <div class="sidebar-brands">
            ${relatedBrands.map(b => `<a href="${brandRouteForCategory(catId, b)}" class="${b === currentBrand ? 'active' : ''}">${b}</a>`).join('')}
          </div>
        </div>
        <div class="sidebar-section">
          <h4>Otras Categorías</h4>
          <ul>
            ${categories.filter(c => c.id !== catId).slice(0, 5).map(c =>
              `<li><a href="#/category/${c.id}"><i class="fas ${c.icon}" style="margin-right:6px;font-size:.75rem"></i>${c.name}
                <span class="count">${products.filter(p => p.category === c.id).length}</span></a></li>`
            ).join('')}
          </ul>
        </div>
      </aside>
      <div>
        <div class="cat-products-header">
          <h2>Mostrando ${categoryProducts.length} producto${categoryProducts.length !== 1 ? 's' : ''}</h2>
          <div class="cat-search">
            <input type="search" id="categorySearchInput" class="category-search-input" placeholder="Buscar productos en esta categoría..." autocomplete="off" />
          </div>
          <div class="cat-sort"><select id="sortSelect">
            <option value="default">Ordenar por</option>
            <option value="price-asc">Precio: Menor a Mayor</option>
            <option value="price-desc">Precio: Mayor a Menor</option>
            <option value="name">Nombre A-Z</option>
          </select></div>
        </div>
        ${renderCatalogFilters(categoryProducts)}
          <div class="products-grid" id="catProductsGrid">
          ${categoryProducts.length ? categoryProducts.map(productCard).join('') :
            '<div class="cat-no-products"><i class="fas fa-box-open"></i><p>No hay productos en esta categoría aún.</p></div>'}
        </div>
      </div>
    </div>`;
}

export function renderSubcategoryPage(catId, subSlug, brand = '', type = '') {
  const cat = categories.find(c => c.id === catId);
  if (!cat) return '<p>Categoría no encontrada</p>';
  const subName = cat.subs.find(s => slugify(s) === subSlug) || subSlug;
  const allSubProducts = products.filter(p => p.category === catId && slugify(p.subcategory) === subSlug);
  const isMiniSplitSub = catId === 'mini-splits' && ['inverter', 'no-inverter'].includes(subSlug);
  const miniSplitSubsubs = cat.subsubs || ['MURO', 'PISO-TECHO', 'TIPO DUCTO'];
  const currentTypeSlug = isMiniSplitSub ? slugify(type || '') : '';
  const typeFilteredProducts = currentTypeSlug
    ? allSubProducts.filter(p => slugify(getSubsubcategoryForProduct(p)) === currentTypeSlug)
    : allSubProducts;
  const catProducts = typeFilteredProducts.filter(p => (!brand || p.brand === brand));
  const relatedBrands = [...new Set(allSubProducts.map(p => p.brand))];
  const selectedTypeLabel = isMiniSplitSub && currentTypeSlug
    ? (miniSplitSubsubs.find(t => slugify(t) === currentTypeSlug) || type)
    : '';

  return `
    <div class="breadcrumb">
      <a href="#/">Inicio</a><span>›</span><a href="#/category/${catId}">${cat.name}</a><span>›</span><span>${subName}</span>${selectedTypeLabel ? `<span>›</span><span>${selectedTypeLabel}</span>` : ''}${brand ? `<span>›</span><span>${brand}</span>` : ''}
    </div>
    <div class="cat-hero">
      <div class="container">
        <div><h1>${subName}</h1><p>${cat.name} — ${cat.desc}</p></div>
        <i class="fas ${cat.icon} cat-hero-icon"></i>
      </div>
    </div>
    <div class="cat-page-layout">
      <aside class="cat-sidebar">
        <h3>Subcategorías</h3>
          <ul>
          <li><a href="#/category/${catId}">Todos los ${cat.name} <span class="count">${allSubProducts.length}</span></a></li>
          ${cat.subs.map(s => `<li><a href="#/category/${catId}/${slugify(s)}" class="${slugify(s) === subSlug ? 'active' : ''}">${s}</a></li>`).join('')}
        </ul>
        <div class="sidebar-section">
          ${isMiniSplitSub ? `
          <h4>Tipo de Unidad</h4>
          <div class="sidebar-brands">
            <a href="${subTypeRouteForCategory(catId, subSlug, '', brand)}" class="${currentTypeSlug ? '' : 'active'}">Todos <span class="count">${allSubProducts.length}</span></a>
            ${miniSplitSubsubs.map(t => {
              const tSlug = slugify(t);
              const count = allSubProducts.filter(p => slugify(getSubsubcategoryForProduct(p)) === tSlug).length;
              return `<a href="${subTypeRouteForCategory(catId, subSlug, tSlug, brand)}" class="${currentTypeSlug === tSlug ? 'active' : ''}">${t} <span class="count">${count}</span></a>`;
            }).join('')}
          </div>
          ` : ''}
        </div>
        <div class="sidebar-section">
          <h4>Marcas en ${cat.name}</h4>
          <div class="sidebar-brands">
            ${relatedBrands.map(b => `<a href="${subTypeRouteForCategory(catId, subSlug, currentTypeSlug, b)}" class="${b === brand ? 'active' : ''}">${b}</a>`).join('')}
          </div>
        </div>
        <div class="sidebar-section">
          <h4>Otras Categorías</h4>
          <ul>
            ${categories.filter(c => c.id !== catId).slice(0, 5).map(c =>
              `<li><a href="#/category/${c.id}"><i class="fas ${c.icon}" style="margin-right:6px;font-size:.75rem"></i>${c.name}
                <span class="count">${products.filter(p => p.category === c.id).length}</span></a></li>`
            ).join('')}
          </ul>
        </div>
      </aside>
      <div>
        <div class="cat-products-header">
          <h2>${subName}${selectedTypeLabel ? ` — ${selectedTypeLabel}` : ''}${brand ? ` — ${brand}` : ''} — ${catProducts.length} producto${catProducts.length !== 1 ? 's' : ''}</h2>
          <div class="cat-search">
            <input type="search" id="categorySearchInput" class="category-search-input" placeholder="Buscar productos en esta subcategoría..." autocomplete="off" />
          </div>
          <div class="cat-sort"><select id="sortSelect">
            <option value="default">Ordenar por</option>
            <option value="price-asc">Precio: Menor a Mayor</option>
            <option value="price-desc">Precio: Mayor a Menor</option>
            <option value="name">Nombre A-Z</option>
          </select></div>
        </div>
        ${renderCatalogFilters(catProducts, brand)}
        <div class="products-grid" id="catProductsGrid">
          ${catProducts.length ? catProducts.map(productCard).join('') :
            '<div class="cat-no-products"><i class="fas fa-box-open"></i><p>No hay productos en esta subcategoría aún.</p></div>'}
        </div>
      </div>
    </div>`;
}

export function renderBrandPage(brand) {
  const brandProducts = products.filter(p => p.brand === brand);
  return `
    <div class="breadcrumb">
      <a href="#/">Inicio</a><span>›</span><span>Marca: ${brand}</span>
    </div>
    <div class="cat-hero">
      <div class="container">
        <div><h1>Productos ${brand}</h1><p>${brandProducts.length} productos disponibles</p></div>
        <i class="fas fa-tags cat-hero-icon"></i>
      </div>
    </div>
    <div class="cat-page-layout">
      <aside class="cat-sidebar">
        <h3>Todas las Marcas</h3>
        ${renderSidebarSearch('Buscar productos por marca...')}
        <ul>
          ${brands.map(b => `<li><a href="${brandRouteForCategory('', b)}" class="${b === brand ? 'active' : ''}">${b}
            <span class="count">${products.filter(p => p.brand === b).length}</span></a></li>`).join('')}
        </ul>
      </aside>
      <div>
        <div class="cat-products-header">
          <h2>Mostrando ${brandProducts.length} producto${brandProducts.length !== 1 ? 's' : ''}</h2>
          <div class="cat-sort"><select id="sortSelect">
            <option value="default">Ordenar por</option>
            <option value="price-asc">Precio: Menor a Mayor</option>
            <option value="price-desc">Precio: Mayor a Menor</option>
          </select></div>
        </div>
        ${renderCatalogFilters(brandProducts, brand)}
        <div class="products-grid" id="catProductsGrid">
          ${brandProducts.length ? brandProducts.map(productCard).join('') :
            '<div class="cat-no-products"><i class="fas fa-box-open"></i><p>No hay productos de esta marca aún.</p></div>'}
        </div>
      </div>
    </div>`;
}

export function renderBrandsList() {
  return `
    <div class="breadcrumb">
      <a href="#/">Inicio</a><span>›</span><span>Marcas</span>
    </div>
    <div class="cat-hero">
      <div class="container">
        <div><h1>Marcas</h1><p>Explora por marca nuestros productos disponibles.</p></div>
        <i class="fas fa-tags cat-hero-icon"></i>
      </div>
    </div>
    <section class="section"><div class="container">
      <div class="section-header"><h2>Marcas</h2></div>
      <div class="brands-grid">${brands.map(b => `<a href="#/brand/${encodeURIComponent(b)}" class="brand-logo">${b}</a>`).join('')}</div>
    </div></section>`;
}

export function renderLoginPage() {
  return `
    <section class="auth-page">
      <div class="container auth-layout auth-login-layout">
        <div class="auth-panel auth-form-panel auth-login-panel">
          <h1>Ingresar</h1>
          <div class="auth-login-copy">
            <h2>Clientes registrados</h2>
            <p>Si ya tienes una cuenta, inicia sesión con tu correo electrónico.</p>
          </div>
          <form class="auth-form auth-login-form">
            <div class="auth-field">
              <label for="loginEmail">Correo electrónico <span>*</span></label>
              <input id="loginEmail" type="email" placeholder="tu@email.com" autocomplete="email" />
            </div>
            <div class="auth-field">
              <label for="loginPassword">Contraseña <span>*</span></label>
              <input id="loginPassword" type="password" placeholder="Tu contraseña" autocomplete="current-password" />
            </div>
            <label class="auth-checkline auth-login-check"><input id="showLoginPassword" type="checkbox" /> <span>Mostrar contraseña</span></label>
            <button type="submit" class="auth-primary-btn auth-login-btn">Ingresar</button>
            <a href="#" class="auth-login-forgot">¿Olvidaste tu contraseña?</a>
          </form>
        </div>
        <aside class="auth-panel auth-side-panel auth-login-side">
          <h2>Nuevos clientes</h2>
          <p>Crear una cuenta te permite comprar más rápido, guardar direcciones y revisar tus pedidos.</p>
          <a href="#/register" class="auth-secondary-btn auth-login-register-btn">Crear una cuenta</a>
        </aside>
      </div>
    </section>`;
}

export function renderRegisterPage() {
  return `
    <section class="auth-page">
      <div class="container auth-register-shell">
        <div class="auth-panel auth-register-card">
          <h1>Crear cuenta</h1>
          <p class="auth-subtitle">Completa tus datos para registrar una cuenta nueva.</p>

          <form class="auth-register-form">
            <div class="auth-section">
              <h2>Información personal</h2>
              <div class="auth-field">
                <label for="registerFirstName">Nombre <span>*</span></label>
                <input id="registerFirstName" type="text" autocomplete="given-name" />
              </div>
              <div class="auth-field">
                <label for="registerLastName">Apellido <span>*</span></label>
                <input id="registerLastName" type="text" autocomplete="family-name" />
              </div>
            </div>

            <div class="auth-section">
              <h2>Información de acceso</h2>
              <div class="auth-field">
                <label for="registerEmail">Email <span>*</span></label>
                <input id="registerEmail" type="email" autocomplete="email" />
              </div>
              <div class="auth-field">
                <label for="registerPassword">Contraseña <span>*</span></label>
                <input id="registerPassword" type="password" autocomplete="new-password" />
              </div>
              <div class="auth-field">
                <label for="registerConfirmPassword">Confirmar contraseña <span>*</span></label>
                <input id="registerConfirmPassword" type="password" autocomplete="new-password" />
              </div>
              <label class="auth-checkline"><input id="showRegisterPassword" type="checkbox" /> <span>Mostrar contraseña</span></label>
            </div>

            <button type="submit" class="auth-primary-btn auth-register-btn">Crear cuenta</button>
            <div class="auth-register-footer">
              <span>¿Ya tienes cuenta?</span>
              <a href="#/login">Ingresar</a>
            </div>
          </form>
        </div>
      </div>
    </section>`;
}

export function renderSearchPage(query) {
  const q = String(query || '').toLowerCase();
  const normalizeSearchString = str => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const qNorm = normalizeSearchString(q);
  const results = products.filter(p => {
    const haystack = [p.name, p.model, p.sku, p.description, p.brand, p.category, p.subcategory, p.btus]
      .filter(Boolean)
      .join(' ');
    return normalizeSearchString(haystack).includes(qNorm);
  });
  return `
    <div class="breadcrumb">
      <a href="#/">Inicio</a><span>›</span><span>Resultados para "${query}"</span>
    </div>
    <div class="cat-hero">
      <div class="container">
        <div><h1>Resultados para "${query}"</h1><p>${results.length} productos encontrados</p></div>
        <i class="fas fa-search cat-hero-icon"></i>
      </div>
    </div>
    <div class="cat-page-layout">
      <aside class="cat-sidebar">
        <h3>Categorías</h3>
        <ul>
          ${categories.map(c => `<li><a href="#/category/${c.id}"><i class="fas ${c.icon}" style="margin-right:6px;font-size:.75rem"></i>${c.name}
            <span class="count">${products.filter(p => p.category === c.id).length}</span></a></li>`).join('')}
        </ul>
      </aside>
      <div>
        <div class="cat-products-header"><h2>${results.length} resultado${results.length !== 1 ? 's' : ''}</h2></div>
        <div class="products-grid" id="catProductsGrid">
          ${results.length ? results.map(productCard).join('') :
            '<div class="cat-no-products"><i class="fas fa-search"></i><p>No se encontraron resultados.</p></div>'}
        </div>
      </div>
    </div>`;
}

export function bindCategoryPageEvents() {
  bindProductCards();
  const route = getRoute();
  const routeSearchKey = `hvac:categorySearch:${route.page}:${route.id || ''}:${route.sub || ''}:${route.brand || ''}:${route.type || ''}`;
  const baseProducts = getVisibleProductsForRoute(route);
  const sortSelect = document.getElementById('sortSelect');
  const searchInput = document.getElementById('categorySearchInput');
  const brandFilter = document.getElementById('brandFilter');
  const voltageFilter = document.getElementById('voltageFilter');
  const grid = document.getElementById('catProductsGrid');
  const resultsHeading = document.querySelector('.cat-products-header h2');

  if (searchInput) {
    const savedSearch = sessionStorage.getItem(routeSearchKey);
    if (savedSearch) searchInput.value = savedSearch;
  }

  const applyFilters = () => {
    if (!grid) return;
    const query = (searchInput?.value || '').trim().toLowerCase();
    const selectedBrand = (brandFilter?.value || '').trim();
    const selectedVoltage = (voltageFilter?.value || '').trim();
    const normalizeSearchString = str => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const qNorm = normalizeSearchString(query);
    let filtered = baseProducts.filter(p => {
      if (!query) return true;
      const haystack = [p.name, p.model, p.description, p.brand, p.category, p.subcategory, p.voltage, p.function]
        .filter(Boolean)
        .join(' ');
      return normalizeSearchString(haystack).includes(qNorm);
    }).filter(p => !selectedBrand || p.brand === selectedBrand)
      .filter(p => !selectedVoltage || normalizeVoltage(p.voltage) === selectedVoltage);

    const sortValue = sortSelect?.value || 'default';
    if (sortValue === 'price-asc') filtered.sort((a, b) => a.price - b.price);
    else if (sortValue === 'price-desc') filtered.sort((a, b) => b.price - a.price);
    else if (sortValue === 'name') filtered.sort((a, b) => (a.description || a.name).localeCompare(b.description || b.name));

    grid.innerHTML = filtered.length ? filtered.map(productCard).join('') : '<div class="cat-no-products"><i class="fas fa-search"></i><p>No se encontraron productos.</p></div>';
    if (resultsHeading) {
      resultsHeading.textContent = `Mostrando ${filtered.length} producto${filtered.length !== 1 ? 's' : ''}`;
    }
    bindProductCards();
  };

  if (sortSelect) {
    sortSelect.addEventListener('change', applyFilters);
  }
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      sessionStorage.setItem(routeSearchKey, searchInput.value);
      applyFilters();
    });
  }
  if (brandFilter) brandFilter.addEventListener('change', applyFilters);
  if (voltageFilter) voltageFilter.addEventListener('change', applyFilters);

  // Apply once on load so persisted searches are restored after refresh.
  if (searchInput?.value) applyFilters();
}

export function bindAuthEvents() {
  // Login form
  const loginForm = document.querySelector('.auth-login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (document.getElementById('loginEmail') || {}).value || '';
      const password = (document.getElementById('loginPassword') || {}).value || '';
      if (!email || !password) return window.alert('Completa correo y contraseña.');
      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const data = await res.json();
        if (!res.ok) return window.alert(data?.message || 'Error al iniciar sesión.');
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        window.alert('Inicio de sesión correcto.');
        window.location.hash = '#/';
      } catch (err) {
        console.error(err);
        window.alert('Error de red al iniciar sesión.');
      }
    });
  }

  // Show/hide password toggle for login
  const showLoginPwd = document.getElementById('showLoginPassword');
  if (showLoginPwd) {
    showLoginPwd.addEventListener('change', (e) => {
      const pwd = document.getElementById('loginPassword');
      if (pwd) pwd.type = e.currentTarget.checked ? 'text' : 'password';
    });
  }

  // Register form
  const registerForm = document.querySelector('.auth-register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const firstName = (document.getElementById('registerFirstName') || {}).value || '';
      const lastName = (document.getElementById('registerLastName') || {}).value || '';
      const email = (document.getElementById('registerEmail') || {}).value || '';
      const password = (document.getElementById('registerPassword') || {}).value || '';
      const confirm = (document.getElementById('registerConfirmPassword') || {}).value || '';
      if (!firstName || !lastName || !email || !password) return window.alert('Completa todos los campos obligatorios.');
      if (password !== confirm) return window.alert('Las contraseñas no coinciden.');
      try {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstName, lastName, email: email.trim(), password }),
        });
        const data = await res.json();
        if (!res.ok) return window.alert(data?.message || 'Error al registrar.');
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        window.alert('Registro correcto.');
        window.location.hash = '#/';
      } catch (err) {
        console.error(err);
        window.alert('Error de red al registrar.');
      }
    });
  }

  // Show/hide password toggle for register (affects both password fields)
  const showRegisterPwd = document.getElementById('showRegisterPassword');
  if (showRegisterPwd) {
    showRegisterPwd.addEventListener('change', (e) => {
      const p1 = document.getElementById('registerPassword');
      const p2 = document.getElementById('registerConfirmPassword');
      if (p1) p1.type = e.currentTarget.checked ? 'text' : 'password';
      if (p2) p2.type = e.currentTarget.checked ? 'text' : 'password';
    });
  }

  // Forgot password handler: try API endpoint, otherwise fallback to mailto to support
  const forgotLink = document.querySelector('.auth-login-forgot');
  if (forgotLink) {
    forgotLink.addEventListener('click', async (e) => {
      e.preventDefault();
      const defaultEmail = (document.getElementById('loginEmail') || {}).value || '';
      const email = window.prompt('Introduce tu correo para recuperar contraseña:', defaultEmail) || '';
      if (!email) return;
      const trimmed = email.trim();
      // Try calling backend forgot endpoint if available
      try {
        const resp = await fetch(`${API_BASE}/auth/forgot`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: trimmed })
        });
        if (resp.ok) {
          window.alert('Si el correo existe, recibirás instrucciones para recuperar la contraseña.');
          return;
        }
      } catch (err) {
        // ignore and fallback
      }
      // Fallback: open mail client addressed to support
      const subject = encodeURIComponent('Recuperar contraseña');
      const body = encodeURIComponent(`Necesito ayuda para recuperar mi contraseña. Mi correo: ${trimmed}`);
      window.location.href = `mailto:ventas@hvacdirecto.mx?subject=${subject}&body=${body}`;
    });
  }
}
