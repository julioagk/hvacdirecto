import { products, categories } from './data.js';

export let cart = [];
export let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
const RECENTLY_VIEWED_KEY = 'recentlyViewed';
const CART_STORAGE_KEY = 'cart';
export const WHATSAPP_NUMBER = '+528110238465';

export function restoreCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_STORAGE_KEY));
    cart = Array.isArray(saved)
      ? saved
          .filter(item => item && item.id != null && Number.isFinite(Number(item.qty)))
          .map(item => ({ id: String(item.id), qty: Math.max(1, Number(item.qty)) }))
      : [];
  } catch {
    cart = [];
  }
}

function saveCart() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

export function saveFavorites() {
  localStorage.setItem('favorites', JSON.stringify(favorites));
  updateFavoritesUI();
}

export function toggleFavorite(id) {
  const idx = favorites.indexOf(id);
  if (idx > -1) favorites.splice(idx, 1);
  else favorites.push(id);
  saveFavorites();
}

export function isFavorite(id) {
  return favorites.includes(id);
}

export function getRecentlyViewedIds() {
  try {
    return JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY)) || [];
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(id) {
  const next = [id, ...getRecentlyViewedIds().filter(itemId => itemId !== id)].slice(0, 8);
  localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
}

function updateFavoritesUI() {
  const badge = document.getElementById('favoritesCount');
  if (badge) badge.textContent = favorites.length;
}

export function formatPrice(n) {
  const num = Number(n);
  if (n === null || n === undefined || !isFinite(num)) return '';
  return 'US$ ' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function productCard(p) {
  const specs = [p.tons, p.seer, p.btus].filter(Boolean);
  const displayName = p.description || p.name;
  const isFav = isFavorite(p.id);
  return `<div class="product-card" data-id="${p.id}">
    <a href="#/product/${encodeURIComponent(p.id)}" class="product-card-link" title="Ver página del producto" onclick="event.stopPropagation()"><i class="fas fa-arrow-up-right-from-square"></i></a>
    <div class="product-img"><img src="${p.img}" alt="${displayName}" /></div>
    <div class="product-info">
      <div class="product-brand">${p.brand}</div>
      <h3 class="product-name">${displayName}</h3>
      <div class="product-specs">${specs.map(s => `<span>${s}</span>`).join('')}</div>
      <div class="product-pricing">
        <span class="price-current">${formatPrice(p.price)}</span>
      </div>
      <div class="product-actions">
        <button class="btn-cart" data-add="${p.id}"><i class="fas fa-cart-plus"></i> Agregar</button>
        <button class="btn-wish" data-fav="${p.id}"><i class="${isFav ? 'fas' : 'far'} fa-heart"></i></button>
      </div>
    </div>
  </div>`;
}

export function addToCart(id) {
  const sid = String(id);
  const existing = cart.find(c => c.id === sid);
  if (existing) existing.qty++;
  else cart.push({ id: sid, qty: 1 });
  updateCartUI();
  openCart();
}

export function updateCartUI() {
  const count = cart.reduce((s, c) => s + c.qty, 0);
  saveCart();
  const badge = document.getElementById('cartCount');
  if (badge) badge.textContent = count;
  const sidebar = document.getElementById('cartSidebar');
  if (sidebar) {
    const wasOpen = sidebar.classList.contains('active');
    sidebar.outerHTML = renderCartSidebar();
    if (wasOpen) document.getElementById('cartSidebar').classList.add('active');
    bindCartEvents();
  }
}

export function renderCartSidebar() {
  const items = cart.map(ci => {
    const p = products.find(x => x.id === ci.id);
    const displayName = p.description || p.name;
    return `<div class="cart-item">
      <div class="cart-item-img"><img src="${p.img}" alt="${displayName}" style="width:100%;height:100%;object-fit:contain" /></div>
      <div class="cart-item-info">
        <h4>${displayName}</h4>
        <span class="price">${formatPrice(p.price)}</span>
        <div class="cart-item-qty">
          <button data-qty-minus="${p.id}">−</button>
          <span>${ci.qty}</span>
          <button data-qty-plus="${p.id}">+</button>
        </div>
      </div>
      <button class="cart-item-remove" data-remove="${p.id}"><i class="fas fa-trash"></i></button>
    </div>`;
  }).join('');
  const total = cart.reduce((s, ci) => s + products.find(x => x.id === ci.id).price * ci.qty, 0);
  const empty = cart.length === 0;
  return `<aside class="cart-sidebar" id="cartSidebar">
    <div class="cart-header"><h3><i class="fas fa-shopping-cart"></i> Carrito (${cart.reduce((s,c)=>s+c.qty,0)})</h3>
      <button class="modal-close" id="cartClose"><i class="fas fa-times"></i></button>
    </div>
    <div class="cart-items">${empty ? '<div class="cart-empty"><i class="fas fa-cart-arrow-down"></i><p>Tu carrito está vacío</p></div>' : items}</div>
    ${!empty ? `<div class="cart-footer">
      <div class="cart-total"><span>Total:</span><span>${formatPrice(total)}</span></div>
      <button class="btn-checkout" id="cartWhatsAppBtn"><i class="fab fa-whatsapp"></i> Comprar por WhatsApp</button>
    </div>` : ''}
  </aside>`;
}

export function toggleCart() {
  const sidebar = document.getElementById('cartSidebar');
  const overlay = document.getElementById('cartOverlay');
  if (!sidebar || !overlay) return;
  const shouldOpen = !sidebar.classList.contains('active');
  sidebar.classList.toggle('active', shouldOpen);
  overlay.classList.toggle('active', shouldOpen);
  document.body.classList.toggle('cart-open', shouldOpen);
}

export function openCart() {
  const sidebar = document.getElementById('cartSidebar');
  const overlay = document.getElementById('cartOverlay');
  if (!sidebar || !overlay) return;
  sidebar.classList.add('active');
  overlay.classList.add('active');
  document.body.classList.add('cart-open');
}

export function closeCart() {
  const sidebar = document.getElementById('cartSidebar');
  const overlay = document.getElementById('cartOverlay');
  if (!sidebar || !overlay) return;
  sidebar.classList.remove('active');
  overlay.classList.remove('active');
  document.body.classList.remove('cart-open');
}

export function bindCartEvents() {
  document.querySelectorAll('[data-qty-plus]').forEach(b => b.addEventListener('click', () => {
    const ci = cart.find(c => c.id === String(b.dataset.qtyPlus));
    if (ci) { ci.qty++; updateCartUI(); }
  }));
  document.querySelectorAll('[data-qty-minus]').forEach(b => b.addEventListener('click', () => {
    const ci = cart.find(c => c.id === String(b.dataset.qtyMinus));
    if (ci) { ci.qty--; if (ci.qty <= 0) cart = cart.filter(c => c.id !== ci.id); updateCartUI(); }
  }));
  document.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => {
    cart = cart.filter(c => c.id !== String(b.dataset.remove)); updateCartUI();
  }));
  const checkout = document.getElementById('cartWhatsAppBtn');
  if (checkout) checkout.addEventListener('click', sendWhatsAppOrder);
  const close = document.getElementById('cartClose');
  if (close) close.addEventListener('click', toggleCart);
}

function buildCheckoutMessage() {
  const lines = cart.map(ci => {
    const product = products.find(x => x.id === ci.id);
    const displayName = product.description || product.name;
    const itemTotal = product.price * ci.qty;
    return `• *${ci.qty}x* ${displayName} (Modelo: ${product.model || 'N/A'}) - _${formatPrice(itemTotal)}_`;
  });
  
  const total = cart.reduce((s, ci) => s + products.find(x => x.id === ci.id).price * ci.qty, 0);
  
  const textMessage = [
    `📱 *NUEVO PEDIDO - HVACDIRECTO* 📱`,
    `----------------------------------------`,
    `*Productos solicitados:*`,
    lines.join('\n'),
    `----------------------------------------`,
    `💰 *TOTAL ESTIMADO:* *${formatPrice(total)}*`,
    `----------------------------------------`,
    `¡Hola! Vengo de la tienda en línea y me gustaría cotizar/comprar los equipos detallados arriba. ¿Me podrían indicar disponibilidad y el proceso de compra?`
  ].join('\n\n');

  // Structured lines for the premium HTML modal summary
  const displayLines = cart.map(ci => {
    const product = products.find(x => x.id === ci.id);
    const displayName = product.description || product.name;
    return {
      qty: ci.qty,
      name: displayName,
      price: formatPrice(product.price * ci.qty)
    };
  });

  return { lines: displayLines, total, text: textMessage };
}

function renderCheckoutSummary() {
  const modal = document.getElementById('checkoutModal');
  if (!modal) return '';
  const { lines, total, text } = buildCheckoutMessage();
  return `<div class="modal checkout-modal">
    <button class="modal-close" id="checkoutClose"><i class="fas fa-times"></i></button>
    <div class="modal-body checkout-body">
      <div class="checkout-summary-panel">
        <h2><i class="fas fa-receipt"></i> Resumen de compra</h2>
        <p>Por favor revisa los productos agregados antes de proceder.</p>
        <div class="checkout-lines">
          ${lines.map(item => `
            <div class="checkout-line">
              <div class="checkout-line-details">
                <span class="checkout-line-qty">${item.qty}x</span>
                <span class="checkout-line-name">${item.name}</span>
              </div>
              <span class="checkout-line-price">${item.price}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="checkout-actions-panel">
        <div class="checkout-total-box">
          <div class="checkout-total-row">
            <span>Método de compra</span>
            <span style="font-weight:600;color:var(--gray-800)">WhatsApp Directo</span>
          </div>
          <div class="checkout-total-row">
            <span>Envío</span>
            <span style="color:var(--orange-primary);font-weight:600">A cotizar</span>
          </div>
          <div class="checkout-total-row grand-total">
            <span>Total estimado</span>
            <strong>${formatPrice(total)}</strong>
          </div>
        </div>
        
        <button class="btn-checkout-whatsapp" id="checkoutWhatsAppBtn" ${WHATSAPP_NUMBER ? '' : 'disabled'}>
          <i class="fab fa-whatsapp"></i> ${WHATSAPP_NUMBER ? 'Enviar por WhatsApp' : 'WhatsApp no configurado'}
        </button>
        
        <button class="btn-checkout-copy" id="checkoutCopyBtn">
          <i class="fas fa-copy"></i> Copiar resumen
        </button>
        
        <div class="checkout-disclaimer">
          <i class="fab fa-whatsapp"></i>
          <span>Se abrirá WhatsApp para chatear con un agente de ventas.</span>
        </div>
        
        <textarea id="checkoutMessage" readonly style="position:absolute;left:-9999px;top:-9999px;">${text}</textarea>
      </div>
    </div>
  </div>`;
}

function bindCheckoutSummaryEvents() {
  const modal = document.getElementById('checkoutModal');
  if (!modal) return;
  const close = document.getElementById('checkoutClose');
  if (close) close.addEventListener('click', closeCheckoutSummary);
  modal.addEventListener('click', e => { if (e.target === modal) closeCheckoutSummary(); });

  const copyBtn = document.getElementById('checkoutCopyBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const text = document.getElementById('checkoutMessage')?.value || '';
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = 'Pedido copiado';
      } catch {
        window.alert('No se pudo copiar el pedido.');
      }
    });
  }

  const whatsappBtn = document.getElementById('checkoutWhatsAppBtn');
  if (whatsappBtn && WHATSAPP_NUMBER) {
    whatsappBtn.addEventListener('click', () => {
      const text = document.getElementById('checkoutMessage')?.value || '';
      const phone = WHATSAPP_NUMBER.replace(/\D/g, '');
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    });
  }
}

export function sendWhatsAppOrder() {
  if (!cart.length) {
    window.alert('Tu carrito está vacío.');
    return;
  }
  const { text } = buildCheckoutMessage();
  const phone = WHATSAPP_NUMBER.replace(/\D/g, '');
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
}

export function openCheckoutSummary() {
  if (!cart.length) {
    window.alert('Tu carrito está vacío.');
    return;
  }
  const modal = document.getElementById('checkoutModal');
  if (!modal) return;
  modal.innerHTML = renderCheckoutSummary();
  modal.classList.add('active');
  bindCheckoutSummaryEvents();
}

export function closeCheckoutSummary() {
  const modal = document.getElementById('checkoutModal');
  if (!modal) return;
  modal.classList.remove('active');
  modal.innerHTML = '';
}

export function openProductModal(id) {
  let p = products.find(x => x.id === id);
  // Fallback: match by model (case-insensitive) and prefer entries with price/img/brand
  if (!p) {
    const idLower = String(id).toLowerCase();
    const matches = products.filter(x => x.model && String(x.model).toLowerCase() === idLower);
    if (matches.length) p = matches.find(m => (m.price || m.img || m.brand)) || matches[0];
  }
  // If we found by id but it's missing details, try to find a sibling record with the same model that has data
  if (p && p.model) {
    if (!p.price || !p.img || !p.brand) {
      const alt = products.find(x => x.model && String(x.model).toLowerCase() === String(p.model).toLowerCase() && (x.price || x.img || x.brand));
      if (alt) p = alt;
    }
  }
  if (!p) return;
  recordRecentlyViewed(id);
  const cat = categories.find(c => c.id === p.category);
  const modal = document.getElementById('productModal');
  const displayName = p.description || p.name;
  const isFav = isFavorite(id);
  modal.innerHTML = `<div class="modal">
    <button class="modal-close" id="modalClose"><i class="fas fa-times"></i></button>
    <div class="modal-body">
      <div class="modal-gallery"><img src="${p.img}" alt="${displayName}" /></div>
      <div class="modal-details">
        <div class="product-brand">${p.brand}</div>
        <h2>${displayName}</h2>
        <div class="product-pricing">
          <span class="price-current">${formatPrice(p.price)}</span>
        </div>
        <ul class="modal-specs-list">
          ${p.model ? `<li><span>Modelo</span><span>${p.model}</span></li>` : ''}
          ${p.voltage ? `<li><span>Voltaje</span><span>${p.voltage}</span></li>` : ''}
          ${p.function ? `<li><span>Función</span><span>${p.function}</span></li>` : ''}
          <li><span>Categoría</span><span>${cat ? cat.name : ''}</span></li>
        </ul>
        <div class="modal-buttons">
          <button class="btn-cart" data-add="${p.id}"><i class="fas fa-cart-plus"></i> Agregar al Carrito</button>
          <button class="btn-wish" data-fav="${p.id}"><i class="${isFav ? 'fas' : 'far'} fa-heart"></i></button>
        </div>
        <a href="#/product/${encodeURIComponent(p.id)}" class="modal-detail-link" onclick="document.getElementById('productModal').classList.remove('active')">
          <i class="fas fa-arrow-up-right-from-square"></i> Ver página completa del producto
        </a>
      </div>
    </div>
  </div>`;
  modal.classList.add('active');
  document.getElementById('modalClose').addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
  modal.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => addToCart(b.dataset.add)));
  modal.querySelector('[data-fav]').addEventListener('click', e => {
    const button = e.currentTarget;
    const favoriteId = button.dataset.fav;
    toggleFavorite(favoriteId);
    button.querySelector('i').className = isFavorite(favoriteId) ? 'fas fa-heart' : 'far fa-heart';
  });
}

export function bindProductCards() {
  document.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    addToCart(b.dataset.add);
    b.textContent = '\u2713 Agregado';
    setTimeout(() => { b.innerHTML = '<i class="fas fa-cart-plus"></i> Agregar'; }, 1200);
  }));
  document.querySelectorAll('[data-fav]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const id = b.dataset.fav;
    toggleFavorite(id);
    const icon = b.querySelector('i');
    icon.className = isFavorite(id) ? 'fas fa-heart' : 'far fa-heart';
  }));
  document.querySelectorAll('.product-card-link').forEach(a => a.addEventListener('click', e => {
    e.stopPropagation();
  }));
  document.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('[data-add]') || e.target.closest('[data-fav]') || e.target.closest('.product-card-link')) return;
      openProductModal(card.dataset.id);
    });
  });
}
