const TOKEN_KEY = 'lauralsHavenAdminToken';
const API_BASE = 'http://localhost:3001';
window.LH_API_BASE = API_BASE;
const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

const state = {
  summary: null,
  orders: []
};

function getApiBase() {
  return API_BASE;
}

function apiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBase()}${normalizedPath}`;
}

const elements = {
  totalRevenue: document.getElementById('totalRevenue'),
  totalOrders: document.getElementById('totalOrders'),
  pendingOrders: document.getElementById('pendingOrders'),
  deliveredOrders: document.getElementById('deliveredOrders'),
  ordersTable: document.getElementById('ordersTable'),
  popularItems: document.getElementById('popularItems'),
  refreshButton: document.getElementById('refreshButton'),
  adminAuth: document.getElementById('adminAuth'),
  dashboardShell: document.getElementById('dashboardShell'),
  adminLoginForm: document.getElementById('adminLoginForm'),
  adminPassword: document.getElementById('adminPassword'),
  authError: document.getElementById('authError')
};

function isAuthorized() {
  return Boolean(sessionStorage.getItem(TOKEN_KEY));
}

function authHeaders(extra = {}) {
  return { ...extra, Authorization: `Bearer ${sessionStorage.getItem(TOKEN_KEY) || ''}` };
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function showAuthScreen(message = '') {
  sessionStorage.removeItem(TOKEN_KEY);
  if (elements.authError) {
    elements.authError.textContent = message;
  }
  elements.dashboardShell.classList.add('hidden-shell');
  elements.adminAuth.classList.remove('hidden-shell');
}

function unlockAdmin() {
  elements.adminAuth.classList.add('hidden-shell');
  elements.dashboardShell.classList.remove('hidden-shell');
}

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function formatTime(value) {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  } catch (error) {
    return '—';
  }
}

function renderSummary(summary) {
  if (!summary) return;

  elements.totalRevenue.textContent = formatCurrency(summary.totalRevenue || 0);
  elements.totalOrders.textContent = String(summary.totalOrders || 0);
  elements.pendingOrders.textContent = String(summary.pendingOrders || 0);
  elements.deliveredOrders.textContent = String(summary.deliveredOrders || 0);

  const items = Array.isArray(summary.popularItems) ? summary.popularItems : [];
  if (!items.length) {
    elements.popularItems.innerHTML = '<li class="empty-state">No sales activity yet.</li>';
    return;
  }

  elements.popularItems.innerHTML = items
    .map(
      (item, index) => `
        <li>
          <div>
            <strong>${index + 1}. ${esc(item.name)}</strong>
          </div>
          <span class="count-badge">${esc(item.quantity)}</span>
        </li>
      `
    )
    .join('');
}

function renderOrders(orders) {
  if (!Array.isArray(orders) || !orders.length) {
    elements.ordersTable.innerHTML = '<div class="empty-state">No orders have been placed yet.</div>';
    return;
  }

  elements.ordersTable.innerHTML = orders
    .map((order) => {
      const status = ['pending', 'accepted', 'ready', 'cooking', 'rejected', 'completed', 'delivered'].includes(order.status) ? order.status : 'pending';
      const itemList = Array.isArray(order.items) ? order.items.map((item) => `${item.name} × ${item.qty}`).join(', ') : 'No items';
      const orderId = esc(order.id);

      return `
        <div class="order-row">
          <div>
            <div class="order-name">${esc(order.customerName || 'Guest')}</div>
            <div class="secondary-text">${esc(order.phone || 'No phone')} • ${esc(order.email || 'No email')}</div>
          </div>
          <div>
            <div class="secondary-text">Order</div>
            <div class="order-name">${orderId}</div>
          </div>
          <div>
            <div class="secondary-text">Created</div>
            <div>${formatTime(order.createdAt)}</div>
          </div>
          <div>
            <div class="secondary-text">Items</div>
            <div>${esc(itemList.slice(0, 40))}${itemList.length > 40 ? '…' : ''}</div>
          </div>
          <div>
            <div class="secondary-text">Total</div>
            <strong>${formatCurrency(order.total || 0)}</strong>
          </div>
          <div>
            <span class="status-pill ${status}">${status}</span>
            <div class="action-group" style="margin-top: 10px;">
              ${status === 'pending' ? '<button class="accept" data-order-id="' + orderId + '" data-status="accepted">Accept</button>' : ''}
              ${status === 'accepted' ? '<button class="ready" data-order-id="' + orderId + '" data-status="ready">Ready</button>' : ''}
              ${status === 'ready' ? '<button class="deliver" data-order-id="' + orderId + '" data-status="delivered">Deliver</button>' : ''}
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

async function loadDashboard() {
  try {
    const [summaryResponse, ordersResponse] = await Promise.all([
      fetch(apiUrl('/api/admin/summary'), { cache: 'no-store', headers: authHeaders() }),
      fetch(apiUrl('/api/orders'), { cache: 'no-store', headers: authHeaders() })
    ]);

    if (summaryResponse.status === 401 || ordersResponse.status === 401) {
      showAuthScreen('Session expired. Please sign in again.');
      return;
    }

    const summaryData = await summaryResponse.json();
    const ordersData = await ordersResponse.json();

    state.summary = summaryData.summary || {};
    state.orders = Array.isArray(ordersData.orders) ? ordersData.orders : [];

    renderSummary(state.summary);
    renderOrders(state.orders);
  } catch (error) {
    console.error('Failed to load dashboard data:', error);
    elements.ordersTable.innerHTML = '<div class="empty-state">The admin service is temporarily unavailable.</div>';
  }
}

async function updateStatus(orderId, status) {
  try {
    const response = await fetch(apiUrl(`/api/orders/${encodeURIComponent(orderId)}/status`), {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to update order status.');
    }

    await loadDashboard();
  } catch (error) {
    console.error(error);
    alert(error.message || 'Unable to update order status.');
  }
}

document.addEventListener('click', (event) => {
  const actionButton = event.target.closest('[data-order-id]');
  if (!actionButton) return;

  const { orderId, status } = actionButton.dataset;
  if (orderId && status) {
    updateStatus(orderId, status);
  }
});

if (elements.adminLoginForm) {
  elements.adminLoginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const password = elements.adminPassword.value.trim();
    elements.adminPassword.value = '';

    try {
      const response = await fetch(apiUrl('/api/admin/summary'), {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${password}` }
      });

      if (response.ok) {
        sessionStorage.setItem(TOKEN_KEY, password);
        unlockAdmin();
        loadDashboard();
        return;
      }

      showAuthScreen(response.status === 503 ? 'Admin access is not configured on the server.' : 'Incorrect password. Please try again.');
    } catch (error) {
      showAuthScreen('The admin service is unreachable. Please try again.');
    }
  });
}

if (elements.refreshButton) {
  elements.refreshButton.addEventListener('click', loadDashboard);
}

if (!isAuthorized()) {
  showAuthScreen();
} else {
  unlockAdmin();
  loadDashboard();
}
