// SUPABASE CLIENT
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// GLOBAL STATE
let currentUser = null;
let pendingPhotos = [];
let toastTimeout = null;
let tourMode = false;

// DEMO DATA FOR TOUR MODE
const DEMO_DATA = {
  profile: {
    business_name: "ABC Plumbing & Heating",
    address: "123 Main Street, Denver, CO 80202",
    phone: "(555) 123-4567",
    email: "contact@abcplumbing.com",
    tax_rate: 8.5,
    markup_rate: 25,
    logo_url: null,
    stripe_connect_enabled: true
  },
  clients: [
    { id: 1, name: "John Smith", email: "john@example.com", phone: "(555) 234-5678", address: "456 Oak Ave" },
    { id: 2, name: "Sarah Johnson", email: "sarah@example.com", phone: "(555) 345-6789", address: "789 Pine St" },
    { id: 3, name: "Mike Davis", email: "mike@example.com", phone: "(555) 456-7890", address: "321 Elm Dr" }
  ],
  invoices: [
    { 
      id: 1, 
      number: "INV-1001",
      client_name: "John Smith",
      client: { name: "John Smith", email: "john@example.com", phone: "(555) 234-5678", address: "456 Oak Ave" },
      date: "2025-11-15",
      status: "sent",
      payment_status: "paid",
      paid_at: "2025-11-16T10:30:00Z",
      payment_link: "https://pay.stripe.com/demo-link-001",
      subtotal: 850.00,
      tax: 72.25,
      total: 922.25,
      notes: "Water heater replacement - emergency service",
      created_at: "2025-11-15T10:00:00Z",
      items: [
        { description: "New Water Heater Unit", qty: 1, price: 550.00, total: 550.00 },
        { description: "Installation Labor", qty: 3, price: 100.00, total: 300.00 }
      ]
    },
    { 
      id: 2, 
      number: "INV-1002",
      client_name: "Sarah Johnson",
      client: { name: "Sarah Johnson", email: "sarah@example.com", phone: "(555) 345-6789", address: "789 Pine St" },
      date: "2025-11-18",
      status: "draft",
      payment_status: "unpaid",
      payment_link: "https://pay.stripe.com/demo-link-002",
      subtotal: 450.00,
      tax: 38.25,
      total: 488.25,
      notes: "Kitchen sink repair",
      created_at: "2025-11-18T14:30:00Z",
      items: [
        { description: "Kitchen Faucet Replacement", qty: 1, price: 250.00, total: 250.00 },
        { description: "Under-Sink Pipe Repair", qty: 1, price: 200.00, total: 200.00 }
      ]
    },
    { 
      id: 3, 
      number: "INV-1003",
      client_name: "Mike Davis",
      client: { name: "Mike Davis", email: "mike@example.com", phone: "(555) 456-7890", address: "321 Elm Dr" },
      date: "2025-11-20",
      status: "sent",
      payment_status: "pending",
      payment_link: null,
      subtotal: 325.00,
      tax: 27.63,
      total: 352.63,
      notes: "Drain cleaning service",
      created_at: "2025-11-20T09:00:00Z",
      items: [
        { description: "Main Line Drain Cleaning", qty: 1, price: 275.00, total: 275.00 },
        { description: "Camera Inspection", qty: 1, price: 50.00, total: 50.00 }
      ]
    }
  ],
  quotes: [
    {
      id: 1,
      quote_number: "QUO-2001",
      client_name: "Mike Davis",
      client: { name: "Mike Davis", email: "mike@example.com", phone: "(555) 456-7890", address: "321 Elm Dr" },
      quote_date: "2025-11-20",
      status: "sent",
      subtotal: 2400.00,
      tax: 204.00,
      total: 2604.00,
      notes: "Bathroom renovation estimate",
      created_at: "2025-11-20T09:00:00Z",
      items: [
        { description: "New Vanity & Fixtures", quantity: 1, unit_price: 1200.00, total: 1200.00 },
        { description: "Tile Installation", quantity: 50, unit_price: 15.00, total: 750.00 },
        { description: "Labor (3 days)", quantity: 3, unit_price: 150.00, total: 450.00 }
      ]
    }
  ],
  referral: {
    referral_code: "DEMO123",
    active_referrals: 3,
    monthly_earnings_cents: 1598,
    lifetime_earnings_cents: 4794,
    referrals: []
  }
};

// BASIC REF PARSING (store ?ref= in localStorage for future)
(function storeRefFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  if (ref) {
    localStorage.setItem("tb_referrer_code", ref);
  }
})();

document.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  wireAuthUI();
  wireDashboardUI();
  wireInvoiceUI();
  wireCalculatorUI();
  wireSettingsUI();
  wireReferralsUI();
  wireSubscriptionUI();
  wireQuotesUI();
  wireInventoryUI();
  wireTourMode();
  checkTourMode();
  checkSession();
  updateTrialBanner();
});

// API FETCH HELPER (sends JWT token in Authorization header)
async function apiFetch(path, options = {}) {
  const { data: { session } } = await sb.auth.getSession();
  
  if (session && session.user) {
    currentUser = session.user;
  }

  const headers = options.headers ? { ...options.headers } : {};

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...options,
    headers,
  });

  // Handle subscription required error
  if (response.status === 402) {
    showScreen("subscription");
    throw new Error("Subscription required");
  }

  return response;
}

// TOUR MODE

function wireTourMode() {
  const takeTourBtn = document.getElementById("btn-take-tour");
  const exitTourBtn = document.getElementById("btn-exit-tour");
  
  if (takeTourBtn) {
    takeTourBtn.addEventListener("click", enterTourMode);
  }
  
  if (exitTourBtn) {
    exitTourBtn.addEventListener("click", exitTourMode);
  }
}

function checkTourMode() {
  const tourFlag = sessionStorage.getItem("tb_tour_mode");
  if (tourFlag === "true") {
    tourMode = true;
    document.getElementById("auth-container").classList.add("hidden");
    document.getElementById("app-container").classList.remove("hidden");
    document.getElementById("tour-banner").classList.remove("hidden");
    document.getElementById("trial-banner").classList.add("hidden");
    document.getElementById("btn-logout").classList.add("hidden");
    document.getElementById("screen-container").classList.add("tour-mode");
    loadDemoData();
    showScreen("dashboard");
  }
}

function enterTourMode() {
  tourMode = true;
  sessionStorage.setItem("tb_tour_mode", "true");
  
  document.getElementById("auth-container").classList.add("hidden");
  document.getElementById("app-container").classList.remove("hidden");
  document.getElementById("tour-banner").classList.remove("hidden");
  document.getElementById("trial-banner").classList.add("hidden");
  document.getElementById("btn-logout").classList.add("hidden");
  document.getElementById("screen-container").classList.add("tour-mode");
  
  loadDemoData();
  showScreen("dashboard");
}

function exitTourMode() {
  tourMode = false;
  sessionStorage.removeItem("tb_tour_mode");
  
  clearDemoData();
  
  document.getElementById("tour-banner").classList.add("hidden");
  document.getElementById("screen-container").classList.remove("tour-mode");
  
  // Immediately show pricing page
  document.getElementById("app-container").classList.remove("hidden");
  document.getElementById("auth-container").classList.add("hidden");
  showScreen("subscription");
  updateLifetimeEarlyCount();
  
  // Then check if user is logged in and switch to dashboard if so
  sb.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      document.getElementById("btn-logout").classList.remove("hidden");
      showScreen("dashboard");
      loadInitialData();
    }
  }).catch(() => {
    // On error, stay on pricing page (already shown above)
  });
}

function clearDemoData() {
  const clientsList = document.getElementById("clients-list");
  const invoicesList = document.getElementById("invoices-list");
  const quotesList = document.getElementById("quotes-list");
  
  if (clientsList) clientsList.innerHTML = '';
  if (invoicesList) invoicesList.innerHTML = '';
  if (quotesList) quotesList.innerHTML = '';
  
  const fields = [
    "business-name", "business-address", "business-phone",
    "business-email", "business-tax", "business-markup",
    "referral-code", "active-referrals", "monthly-earnings", "lifetime-earnings"
  ];
  
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (el.tagName === 'INPUT') {
        el.value = '';
      } else {
        el.textContent = '';
      }
    }
  });
  
  const statusCard = document.getElementById("payment-collection-status");
  if (statusCard) statusCard.classList.add("hidden");
}

async function loadDemoData() {
  renderDemoClients();
  renderDemoInvoices();
  renderDemoQuotes();
  renderDemoReferrals();
  renderDemoSettings();
  renderDemoPaymentStats();
  renderDemoPaymentScreen();
}

function renderDemoPaymentStats() {
  const outstanding = 1708.88;
  const paidMonth = 922.25;  
  const pending = 352.63;
  
  const dashOutstanding = document.getElementById('dashboard-outstanding');
  const dashPaidMonth = document.getElementById('dashboard-paid-month');
  const dashPending = document.getElementById('dashboard-pending');
  
  if (dashOutstanding) dashOutstanding.textContent = `$${outstanding.toFixed(2)}`;
  if (dashPaidMonth) dashPaidMonth.textContent = `$${paidMonth.toFixed(2)}`;
  if (dashPending) dashPending.textContent = `$${pending.toFixed(2)}`;
  
  const outstanding2 = document.getElementById('payment-outstanding');
  const paidMonth2 = document.getElementById('payment-paid-month');
  const pending2 = document.getElementById('payment-pending');
  
  if (outstanding2) outstanding2.textContent = `$${outstanding.toFixed(2)}`;
  if (paidMonth2) paidMonth2.textContent = `$${paidMonth.toFixed(2)}`;
  if (pending2) pending2.textContent = `$${pending.toFixed(2)}`;
}

function renderDemoPaymentScreen() {
  const statusEl = document.getElementById('payment-connection-status');
  const messageEl = document.getElementById('payment-status-message');
  
  if (statusEl) {
    statusEl.innerHTML = `
      <div class="status-badge status-active">
        <i class="fa-solid fa-check-circle"></i>
        <span>Active</span>
      </div>
    `;
  }
  
  if (messageEl) {
    messageEl.textContent = "Payment collection is enabled. You can generate payment links for your invoices.";
  }
}

function renderDemoClients() {
  const clientsList = document.getElementById("clients-list");
  if (!clientsList) return;
  
  clientsList.innerHTML = DEMO_DATA.clients.map(client => `
    <div class="list-item">
      <div>
        <strong>${client.name}</strong>
        <div class="item-meta">
          ${client.phone ? client.phone + ' · ' : ''}${client.email || ''}
        </div>
        ${client.address ? `<div class="item-meta">${client.address}</div>` : ''}
      </div>
    </div>
  `).join('');
}

function renderDemoInvoices() {
  const invoicesList = document.getElementById("invoices-list");
  if (!invoicesList) return;
  
  invoicesList.innerHTML = '';
  
  DEMO_DATA.invoices.forEach(inv => {
    const item = document.createElement("div");
    item.className = "list-item clickable";
    item.style.cursor = "pointer";
    item.innerHTML = `
      <div class="list-item-header">
        <strong>Invoice #${inv.number}</strong>
        <span>$${inv.total.toFixed(2)}</span>
      </div>
      <div class="list-item-sub">${inv.client_name}</div>
      <div class="list-item-sub">
        ${inv.date} • ${inv.status} • 
        <span class="payment-status-badge ${inv.payment_status}">
          ${inv.payment_status.charAt(0).toUpperCase() + inv.payment_status.slice(1)}
        </span>
      </div>
    `;
    item.onclick = () => viewDemoInvoiceDetail(inv);
    invoicesList.appendChild(item);
  });
}

function renderDemoQuotes() {
  const quotesList = document.getElementById("quotes-list");
  if (!quotesList) return;
  
  quotesList.innerHTML = '';
  
  DEMO_DATA.quotes.forEach(quote => {
    const item = document.createElement("div");
    item.className = "list-item clickable";
    item.style.cursor = "pointer";
    item.innerHTML = `
      <div class="list-item-header">
        <strong>Quote #${quote.quote_number}</strong>
        <span>$${quote.total.toFixed(2)}</span>
      </div>
      <div class="list-item-sub">${quote.client_name} • ${quote.quote_date}</div>
      <div class="list-item-sub">${quote.status}</div>
    `;
    item.onclick = () => viewDemoQuoteDetail(quote);
    quotesList.appendChild(item);
  });
}

function viewDemoInvoiceDetail(invoice) {
  const titleEl = document.getElementById("invoice-detail-title");
  const contentEl = document.getElementById("invoice-detail-content");
  
  titleEl.textContent = `Invoice #${invoice.number}`;
  
  const paymentStatus = invoice.payment_status || 'unpaid';
  const paymentBadge = `<span class="payment-status-badge ${paymentStatus}">
    <i class="fa-solid ${paymentStatus === 'paid' ? 'fa-check-circle' : paymentStatus === 'pending' ? 'fa-clock' : 'fa-circle-xmark'}"></i>
    ${paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}
  </span>`;
  
  contentEl.innerHTML = `
    <div class="detail-header">
      <div class="detail-header-left">
        <h3>Invoice #${invoice.number}</h3>
        <p><strong>Date:</strong> ${invoice.date}</p>
        <p><strong>Status:</strong> ${invoice.status}</p>
        <p><strong>Payment:</strong> ${paymentBadge}</p>
      </div>
      <div class="detail-header-right">
        <p><strong>Client:</strong></p>
        <p>${invoice.client_name}</p>
        ${invoice.client ? `
          <p style="font-size: 13px; color: var(--muted); margin-top: 4px;">
            ${invoice.client.email || ''}<br>
            ${invoice.client.phone || ''}<br>
            ${invoice.client.address || ''}
          </p>
        ` : ''}
      </div>
    </div>
    
    ${invoice.notes ? `
      <div class="detail-section">
        <h4>Notes</h4>
        <p>${invoice.notes}</p>
      </div>
    ` : ''}
    
    <div class="detail-section">
      <h4>Line Items</h4>
      <table class="detail-items-table">
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: center;">Quantity</th>
            <th style="text-align: right;">Unit Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${(invoice.items || []).map(item => `
            <tr>
              <td>${item.description || ''}</td>
              <td style="text-align: center;">${item.qty || 1}</td>
              <td style="text-align: right;">${formatCurrency(item.price || 0)}</td>
              <td style="text-align: right;">${formatCurrency(item.total || 0)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="detail-totals">
        <div class="detail-totals-row">
          <span class="detail-totals-label">Subtotal:</span>
          <span class="detail-totals-value">${formatCurrency(invoice.subtotal || 0)}</span>
        </div>
        ${invoice.tax ? `
          <div class="detail-totals-row">
            <span class="detail-totals-label">Tax:</span>
            <span class="detail-totals-value">${formatCurrency(invoice.tax || 0)}</span>
          </div>
        ` : ''}
        <div class="detail-totals-row total">
          <span class="detail-totals-label">Total:</span>
          <span class="detail-totals-value">${formatCurrency(invoice.total || 0)}</span>
        </div>
      </div>
    </div>
    
    <div class="detail-actions">
      <button class="btn-sm" disabled style="opacity: 0.6;">
        <i class="fa-solid fa-link"></i> Payment Link (Demo)
      </button>
      <button class="btn-sm" onclick="showScreen('invoices')">
        <i class="fa-solid fa-arrow-left"></i> Back to List
      </button>
    </div>
  `;
  
  showScreen('invoice-detail');
}

function viewDemoQuoteDetail(quote) {
  const titleEl = document.getElementById("quote-detail-title");
  const contentEl = document.getElementById("quote-detail-content");
  
  titleEl.textContent = `Quote #${quote.quote_number}`;
  
  contentEl.innerHTML = `
    <div class="detail-header">
      <div class="detail-header-left">
        <h3>Quote #${quote.quote_number}</h3>
        <p><strong>Date:</strong> ${quote.quote_date}</p>
        <p><strong>Status:</strong> ${quote.status}</p>
      </div>
      <div class="detail-header-right">
        <p><strong>Client:</strong></p>
        <p>${quote.client_name}</p>
        ${quote.client ? `
          <p style="font-size: 13px; color: var(--muted); margin-top: 4px;">
            ${quote.client.email || ''}<br>
            ${quote.client.phone || ''}<br>
            ${quote.client.address || ''}
          </p>
        ` : ''}
      </div>
    </div>
    
    ${quote.notes ? `
      <div class="detail-section">
        <h4>Notes</h4>
        <p>${quote.notes}</p>
      </div>
    ` : ''}
    
    <div class="detail-section">
      <h4>Line Items</h4>
      <table class="detail-items-table">
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: center;">Quantity</th>
            <th style="text-align: right;">Unit Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${(quote.items || []).map(item => `
            <tr>
              <td>${item.description || ''}</td>
              <td style="text-align: center;">${item.quantity || 1}</td>
              <td style="text-align: right;">${formatCurrency(item.unit_price || 0)}</td>
              <td style="text-align: right;">${formatCurrency(item.total || 0)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="detail-totals">
        <div class="detail-totals-row">
          <span class="detail-totals-label">Subtotal:</span>
          <span class="detail-totals-value">${formatCurrency(quote.subtotal || 0)}</span>
        </div>
        ${quote.tax ? `
          <div class="detail-totals-row">
            <span class="detail-totals-label">Tax:</span>
            <span class="detail-totals-value">${formatCurrency(quote.tax || 0)}</span>
          </div>
        ` : ''}
        <div class="detail-totals-row total">
          <span class="detail-totals-label">Total:</span>
          <span class="detail-totals-value">${formatCurrency(quote.total || 0)}</span>
        </div>
      </div>
    </div>
    
    <div class="detail-actions">
      <button class="btn-sm" onclick="showScreen('quotes')">
        <i class="fa-solid fa-arrow-left"></i> Back to List
      </button>
    </div>
  `;
  
  showScreen('quote-detail');
}

function renderDemoReferrals() {
  const referralCode = document.getElementById("referral-code");
  const activeReferrals = document.getElementById("active-referrals");
  const monthlyEarnings = document.getElementById("monthly-earnings");
  const lifetimeEarnings = document.getElementById("lifetime-earnings");
  
  if (referralCode) referralCode.textContent = DEMO_DATA.referral.referral_code;
  if (activeReferrals) activeReferrals.textContent = DEMO_DATA.referral.active_referrals;
  if (monthlyEarnings) monthlyEarnings.textContent = `$${(DEMO_DATA.referral.monthly_earnings_cents / 100).toFixed(2)}`;
  if (lifetimeEarnings) lifetimeEarnings.textContent = `$${(DEMO_DATA.referral.lifetime_earnings_cents / 100).toFixed(2)}`;
}

function renderDemoSettings() {
  const fields = {
    "business-name": DEMO_DATA.profile.business_name,
    "business-address": DEMO_DATA.profile.address,
    "business-phone": DEMO_DATA.profile.phone,
    "business-email": DEMO_DATA.profile.email,
    "business-tax": DEMO_DATA.profile.tax_rate,
    "business-markup": DEMO_DATA.profile.markup_rate
  };
  
  Object.entries(fields).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el && value) el.value = value;
  });
  
  if (DEMO_DATA.profile.stripe_connect_enabled) {
    const statusCard = document.getElementById("payment-collection-status");
    if (statusCard) statusCard.classList.remove("hidden");
  }
}

// AUTH UI

function wireAuthUI() {
  const loginTab = document.getElementById("btn-show-login");
  const signupTab = document.getElementById("btn-show-signup");
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");

  loginTab.addEventListener("click", () => {
    loginTab.classList.add("active");
    signupTab.classList.remove("active");
    loginForm.classList.remove("hidden");
    signupForm.classList.add("hidden");
  });

  signupTab.addEventListener("click", () => {
    signupTab.classList.add("active");
    loginTab.classList.remove("active");
    signupForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
  });

  loginForm.addEventListener("submit", handleLogin);
  signupForm.addEventListener("submit", handleSignup);

  document.getElementById("btn-logout").addEventListener("click", handleLogout);
  
  const viewPricingLink = document.getElementById("view-pricing-link");
  if (viewPricingLink) {
    viewPricingLink.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("auth-container").classList.add("hidden");
      document.getElementById("app-container").classList.remove("hidden");
      showScreen("subscription");
      updateLifetimeEarlyCount();
    });
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  const errorEl = document.getElementById("signup-error");
  errorEl.textContent = "";

  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) {
    errorEl.textContent = error.message;
    return;
  }

  showToast("Check your email to confirm your account.");
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const errorEl = document.getElementById("login-error");
  errorEl.textContent = "";

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    errorEl.textContent = error.message;
    return;
  }

  currentUser = data.user;
  await onLoggedIn();
}

async function handleLogout() {
  await sb.auth.signOut();
  currentUser = null;
  document.getElementById("app-container").classList.add("hidden");
  document.getElementById("auth-container").classList.remove("hidden");
}

async function checkSession() {
  const { data } = await sb.auth.getUser();
  if (data && data.user) {
    currentUser = data.user;
    await onLoggedIn();
  }
}

async function onLoggedIn() {
  document.getElementById("auth-container").classList.add("hidden");
  document.getElementById("app-container").classList.remove("hidden");
  await loadInitialData();
  await updateTrialBanner();
  wireSubscriptionUI();
}

// DASHBOARD / NAV

function wireDashboardUI() {
  document.querySelectorAll(".tile").forEach((tile) => {
    tile.addEventListener("click", () => {
      const screen = tile.getAttribute("data-screen");
      if (screen) {
        showScreen(screen);
        if (screen === "payments") {
          loadPaymentScreenData();
        }
      }
    });
  });

  document.querySelectorAll(".btn-back").forEach((btn) => {
    btn.addEventListener("click", () => {
      const back = btn.getAttribute("data-back") || "dashboard";
      showScreen(back);
    });
  });

  document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
}

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((s) =>
    s.classList.remove("active")
  );
  const el = document.getElementById(`screen-${screenId}`);
  if (el) el.classList.add("active");
}

// INITIAL LOAD

async function loadInitialData() {
  await Promise.all([
    loadClients(),
    loadInvoices(),
    loadQuotes(),
    loadSettings(),
    loadReferralSummary(),
    loadPaymentStats(),
  ]);
  
  // Check for checkout success/cancel
  const params = new URLSearchParams(window.location.search);
  if (params.get("checkout") === "success") {
    showToast("Subscription activated! Welcome to TradeBase.");
    window.history.replaceState({}, '', '/');
  } else if (params.get("checkout") === "cancel") {
    showToast("Checkout canceled. You can subscribe anytime!");
    window.history.replaceState({}, '', '/');
  }
}

// INVOICE UI

function wireInvoiceUI() {
  document
    .getElementById("btn-add-line-item")
    .addEventListener("click", () => addLineItemRow());

  document
    .getElementById("invoice-form")
    .addEventListener("submit", handleInvoiceSubmit);

  document
    .getElementById("invoice-photos")
    .addEventListener("change", handlePhotoSelect);

  document
    .getElementById("btn-helper-calc")
    .addEventListener("click", runHelperCalc);

  document
    .getElementById("btn-helper-apply")
    .addEventListener("click", applyHelperTotal);

  document
    .getElementById("btn-add-client-inline")
    .addEventListener("click", () => showScreen("clients"));

  addLineItemRow();
}

function addLineItemRow(item = { description: "", qty: 1, price: 0 }) {
  const container = document.getElementById("line-items");
  const row = document.createElement("div");
  row.className = "line-item-row";

  row.innerHTML = `
    <input type="text" class="li-desc" placeholder="Description" value="${item.description}" />
    <input type="number" class="li-qty" min="0" step="0.1" value="${item.qty}" />
    <input type="number" class="li-price" min="0" step="0.01" value="${item.price}" />
    <button type="button" class="btn-remove-line">&times;</button>
  `;

  row.querySelector(".li-qty").addEventListener("input", updateInvoiceTotals);
  row.querySelector(".li-price").addEventListener("input", updateInvoiceTotals);

  row.querySelector(".btn-remove-line").addEventListener("click", () => {
    row.remove();
    updateInvoiceTotals();
  });

  container.appendChild(row);
  updateInvoiceTotals();
}

function getLineItemsFromUI() {
  const rows = document.querySelectorAll("#line-items .line-item-row");
  const items = [];
  rows.forEach((row) => {
    const desc = row.querySelector(".li-desc").value.trim();
    const qty = parseFloat(row.querySelector(".li-qty").value) || 0;
    const price = parseFloat(row.querySelector(".li-price").value) || 0;
    if (desc || qty || price) {
      items.push({
        description: desc || "Item",
        qty,
        unit_price: price,
        line_total: qty * price,
      });
    }
  });
  return items;
}

function updateInvoiceTotals() {
  const items = getLineItemsFromUI();
  let subtotal = 0;
  items.forEach((i) => (subtotal += i.line_total));

  const taxPercent =
    parseFloat(document.getElementById("helper-tax").value) || 0;
  const tax = subtotal * (taxPercent / 100);
  const total = subtotal + tax;

  document.getElementById("display-subtotal").textContent =
    formatCurrency(subtotal);
  document.getElementById("display-tax").textContent = formatCurrency(tax);
  document.getElementById("display-total").textContent = formatCurrency(total);
}

// Helper calc

function runHelperCalc() {
  const materials =
    parseFloat(document.getElementById("helper-materials").value) || 0;
  const hours = parseFloat(document.getElementById("helper-hours").value) || 0;
  const rate = parseFloat(document.getElementById("helper-rate").value) || 0;
  const markup =
    parseFloat(document.getElementById("helper-markup").value) || 0;
  const taxPercent =
    parseFloat(document.getElementById("helper-tax").value) || 0;

  const baseCost = materials + hours * rate;
  const withMarkup = baseCost * (1 + markup / 100);
  const tax = withMarkup * (taxPercent / 100);
  const total = withMarkup + tax;
  const profit = total - baseCost;
  const margin = total > 0 ? (profit / total) * 100 : 0;

  document.getElementById("helper-total").textContent = formatCurrency(total);
  document.getElementById("helper-profit").textContent =
    formatCurrency(profit);
  document.getElementById("helper-margin").textContent = margin.toFixed(1);

  const results = document.getElementById("helper-results");
  results.classList.remove("hidden");
  results.setAttribute("data-total", total.toString());
}

function applyHelperTotal() {
  const results = document.getElementById("helper-results");
  const total = parseFloat(results.getAttribute("data-total") || "0");
  if (!total) return;
  const container = document.getElementById("line-items");
  container.innerHTML = "";
  addLineItemRow({ description: "Job total", qty: 1, price: total });
  updateInvoiceTotals();
}

// Photos

function handlePhotoSelect(e) {
  const files = Array.from(e.target.files || []);
  pendingPhotos = files;
  const preview = document.getElementById("photo-preview");
  preview.innerHTML = "";
  files.forEach((file) => {
    const url = URL.createObjectURL(file);
    const img = document.createElement("img");
    img.src = url;
    img.className = "photo-thumb";
    preview.appendChild(img);
  });
}

// Submit invoice

async function handleInvoiceSubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById("invoice-error");
  errorEl.textContent = "";

  const clientName = document.getElementById("invoice-client-name").value.trim();
  const date = document.getElementById("invoice-date").value;
  const notes = document.getElementById("invoice-notes").value;
  const items = getLineItemsFromUI();

  if (!clientName) {
    errorEl.textContent = "Enter a client name.";
    return;
  }
  if (!items.length) {
    errorEl.textContent = "Add at least one line item.";
    return;
  }

  let subtotal = 0;
  items.forEach((i) => (subtotal += i.line_total));
  const taxPercent =
    parseFloat(document.getElementById("helper-tax").value) || 0;
  const tax = subtotal * (taxPercent / 100);
  const total = subtotal + tax;

  try {
    const res = await apiFetch("/api/invoices", {
      method: "POST",
      body: JSON.stringify({
        client_id: null,
        client_name: clientName,
        date,
        notes,
        subtotal,
        tax,
        total,
        items,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || "Failed to save invoice.";
      return;
    }

    const invoiceId = data.id;

    if (pendingPhotos.length) {
      await uploadInvoicePhotos(invoiceId, pendingPhotos);
      pendingPhotos = [];
      document.getElementById("photo-preview").innerHTML = "";
      document.getElementById("invoice-photos").value = "";
    }

    showToast("Invoice saved.");
    await loadInvoices();
    showScreen("invoices");
  } catch (err) {
    console.error(err);
    errorEl.textContent = "Error saving invoice.";
  }
}

async function uploadInvoicePhotos(invoiceId, files) {
  const formData = new FormData();
  files.forEach((f) => formData.append("photos", f));

  const res = await apiFetch(`/api/invoices/${invoiceId}/photos`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    console.error("Photo upload failed");
  }
}

// CALCULATOR SCREEN

function wireCalculatorUI() {
  document
    .getElementById("btn-calc-run")
    .addEventListener("click", () => {
      const materials =
        parseFloat(document.getElementById("calc-materials").value) || 0;
      const hours =
        parseFloat(document.getElementById("calc-hours").value) || 0;
      const rate =
        parseFloat(document.getElementById("calc-rate").value) || 0;
      const markup =
        parseFloat(document.getElementById("calc-markup").value) || 0;
      const taxPercent =
        parseFloat(document.getElementById("calc-tax").value) || 0;

      const result = calculateSuggestedPrice({
        materials,
        hours,
        rate,
        markup,
        tax: taxPercent,
      });

      document.getElementById("calc-total").textContent =
        formatCurrency(result.total);
      document.getElementById("calc-profit").textContent =
        formatCurrency(result.profit);
      document.getElementById("calc-margin").textContent =
        result.margin.toFixed(1);

      document
        .getElementById("calc-results")
        .classList.remove("hidden");
    });
}

function calculateSuggestedPrice({ materials, hours, rate, markup, tax }) {
  const baseCost = materials + hours * rate;
  const withMarkup = baseCost * (1 + markup / 100);
  const taxAmount = withMarkup * (tax / 100);
  const total = withMarkup + taxAmount;
  const profit = total - baseCost;
  const margin = total > 0 ? (profit / total) * 100 : 0;
  return { total, profit, margin };
}

// CLIENTS & SETTINGS

function wireSettingsUI() {
  document
    .getElementById("client-form")
    .addEventListener("submit", handleAddClient);

  document
    .getElementById("settings-form")
    .addEventListener("submit", handleSaveSettings);

  document
    .getElementById("business-logo")
    .addEventListener("change", handleLogoSelect);

  document
    .getElementById("btn-copy-referral")
    .addEventListener("click", copyReferralLink);
}

async function handleAddClient(e) {
  e.preventDefault();
  const name = document.getElementById("client-name").value.trim();
  const phone = document.getElementById("client-phone").value.trim();
  const email = document.getElementById("client-email").value.trim();
  const address = document.getElementById("client-address").value.trim();
  if (!name) return;

  await apiFetch("/api/clients", {
    method: "POST",
    body: JSON.stringify({ name, phone, email, address }),
  });

  document.getElementById("client-form").reset();
  await loadClients();
}

async function loadClients() {
  if (tourMode) return;
  
  const res = await apiFetch("/api/clients");
  const data = await res.json();
  const list = document.getElementById("clients-list");
  const invoiceDatalist = document.getElementById("client-datalist");
  const quoteDatalist = document.getElementById("quote-client-datalist");
  
  list.innerHTML = "";
  if (invoiceDatalist) invoiceDatalist.innerHTML = "";
  if (quoteDatalist) quoteDatalist.innerHTML = "";

  (data || []).forEach((c) => {
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `
      <div class="list-item-header">
        <strong>${c.name}</strong>
        <span>${c.phone || ""}</span>
      </div>
      <div class="list-item-sub">${c.email || ""}</div>
      <div class="list-item-sub">${c.address || ""}</div>
    `;
    list.appendChild(item);
    
    // Add to datalists for invoice and quote forms
    if (invoiceDatalist) {
      const option = document.createElement("option");
      option.value = c.name;
      invoiceDatalist.appendChild(option);
    }
    if (quoteDatalist) {
      const option = document.createElement("option");
      option.value = c.name;
      quoteDatalist.appendChild(option);
    }

    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    select.appendChild(opt);
  });
}

// INVOICES & ESTIMATES LISTS

async function loadInvoices() {
  if (tourMode) return;
  
  const res = await apiFetch("/api/invoices");
  const data = await res.json();
  const list = document.getElementById("invoices-list");
  list.innerHTML = "";

  (data || []).forEach((inv) => {
    const item = document.createElement("div");
    item.className = "list-item clickable";
    item.style.cursor = "pointer";
    item.innerHTML = `
      <div class="list-item-header">
        <strong>Invoice #${inv.number || inv.id}</strong>
        <span>${formatCurrency(inv.total || 0)}</span>
      </div>
      <div class="list-item-sub">${inv.client_name || ""}</div>
      <div class="list-item-sub">
        ${inv.date || ""} • ${inv.status || "draft"}
      </div>
    `;
    
    item.onclick = () => viewInvoiceDetail(inv.id);
    
    list.appendChild(item);
  });
}

async function loadQuotes() {
  if (tourMode) return;
  
  try {
    const res = await apiFetch("/api/quotes");
    if (!res.ok) return;
    const data = await res.json();
    const list = document.getElementById("quotes-list");
    list.innerHTML = "";

    (data || []).forEach((quote) => {
      const item = document.createElement("div");
      item.className = "list-item clickable";
      item.style.cursor = "pointer";
      item.innerHTML = `
        <div class="list-item-header">
          <strong>Quote #${quote.quote_number || quote.id.slice(0, 8)}</strong>
          <span>${formatCurrency(quote.total || 0)}</span>
        </div>
        <div class="list-item-sub">${quote.client_name || ""} • ${quote.quote_date || ""}</div>
        <div class="list-item-sub">
          ${quote.status || "draft"}
        </div>
      `;
      
      item.onclick = () => viewQuoteDetail(quote.id);
      
      list.appendChild(item);
    });
  } catch (error) {
    console.error("Error loading quotes:", error);
  }
}

// INVOICE & QUOTE DETAIL VIEWS

async function viewInvoiceDetail(invoiceId) {
  try {
    const res = await apiFetch(`/api/invoices/${invoiceId}`);
    const invoice = await res.json();
    
    const titleEl = document.getElementById("invoice-detail-title");
    const contentEl = document.getElementById("invoice-detail-content");
    
    titleEl.textContent = `Invoice #${invoice.number || invoice.id}`;
    
    const paymentStatus = invoice.payment_status || 'unpaid';
    const paymentBadge = `<span class="payment-status-badge ${paymentStatus}">
      <i class="fa-solid ${paymentStatus === 'paid' ? 'fa-check-circle' : paymentStatus === 'pending' ? 'fa-clock' : 'fa-circle-xmark'}"></i>
      ${paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}
    </span>`;
    
    contentEl.innerHTML = `
      <div class="detail-header">
        <div class="detail-header-left">
          <h3>Invoice #${invoice.number || invoice.id}</h3>
          <p><strong>Date:</strong> ${invoice.date || new Date().toLocaleDateString()}</p>
          <p><strong>Status:</strong> ${invoice.status || 'draft'}</p>
          <p><strong>Payment:</strong> ${paymentBadge}</p>
        </div>
        <div class="detail-header-right">
          <p><strong>Client:</strong></p>
          <p>${invoice.client_name || (invoice.client ? invoice.client.name : 'N/A')}</p>
          ${invoice.client ? `
            <p style="font-size: 13px; color: var(--muted); margin-top: 4px;">
              ${invoice.client.email || ''}<br>
              ${invoice.client.phone || ''}<br>
              ${invoice.client.address || ''}
            </p>
          ` : ''}
        </div>
      </div>
      
      ${invoice.notes ? `
        <div class="detail-section">
          <h4>Notes</h4>
          <p>${invoice.notes}</p>
        </div>
      ` : ''}
      
      <div class="detail-section">
        <h4>Line Items</h4>
        <table class="detail-items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: center;">Quantity</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${(invoice.items || []).map(item => `
              <tr>
                <td>${item.description || ''}</td>
                <td style="text-align: center;">${item.qty || 1}</td>
                <td style="text-align: right;">${formatCurrency(item.price || 0)}</td>
                <td style="text-align: right;">${formatCurrency(item.total || 0)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="detail-totals">
          <div class="detail-totals-row">
            <span class="detail-totals-label">Subtotal:</span>
            <span class="detail-totals-value">${formatCurrency(invoice.subtotal || 0)}</span>
          </div>
          ${invoice.tax ? `
            <div class="detail-totals-row">
              <span class="detail-totals-label">Tax:</span>
              <span class="detail-totals-value">${formatCurrency(invoice.tax || 0)}</span>
            </div>
          ` : ''}
          <div class="detail-totals-row total">
            <span class="detail-totals-label">Total:</span>
            <span class="detail-totals-value">${formatCurrency(invoice.total || 0)}</span>
          </div>
        </div>
      </div>
      
      <div class="detail-actions">
        <select id="invoice-payment-status-select" class="btn-sm" style="cursor: pointer;" onchange="updateInvoicePaymentStatus('${invoice.id}', this.value)">
          <option value="">Change Status...</option>
          <option value="unpaid" ${paymentStatus === 'unpaid' ? 'disabled' : ''}>Mark Unpaid</option>
          <option value="pending" ${paymentStatus === 'pending' ? 'disabled' : ''}>Mark Pending</option>
          <option value="paid" ${paymentStatus === 'paid' ? 'disabled' : ''}>Mark Paid</option>
        </select>
        ${invoice.payment_link ? `
          <button class="btn-sm" onclick="copyToClipboard('${invoice.payment_link}', 'Payment link copied!')">
            <i class="fa-solid fa-copy"></i> Copy Payment Link
          </button>
        ` : `
          <button class="btn-sm" onclick="generatePaymentLink('${invoice.id}')">
            <i class="fa-solid fa-link"></i> Generate Payment Link
          </button>
        `}
        <button class="btn-sm" onclick="downloadInvoice({id: '${invoice.id}'})">
          <i class="fa-solid fa-download"></i> Download
        </button>
        <button class="btn-sm" onclick="showScreen('invoices')">
          <i class="fa-solid fa-arrow-left"></i> Back to List
        </button>
      </div>
    `;
    
    showScreen('invoice-detail');
  } catch (error) {
    console.error("Error loading invoice details:", error);
    showToast("Failed to load invoice details");
  }
}

async function viewQuoteDetail(quoteId) {
  try {
    const res = await apiFetch(`/api/quotes/${quoteId}`);
    const quote = await res.json();
    
    const titleEl = document.getElementById("quote-detail-title");
    const contentEl = document.getElementById("quote-detail-content");
    
    titleEl.textContent = `Quote #${quote.quote_number || quote.id.slice(0, 8)}`;
    
    contentEl.innerHTML = `
      <div class="detail-header">
        <div class="detail-header-left">
          <h3>Quote #${quote.quote_number || quote.id.slice(0, 8)}</h3>
          <p><strong>Date:</strong> ${quote.quote_date || new Date().toLocaleDateString()}</p>
          <p><strong>Status:</strong> ${quote.status || 'draft'}</p>
          ${quote.due_date ? `<p><strong>Valid Until:</strong> ${quote.due_date}</p>` : ''}
        </div>
        <div class="detail-header-right">
          <p><strong>Client:</strong></p>
          <p>${quote.client_name || (quote.client ? quote.client.name : 'N/A')}</p>
          ${quote.client ? `
            <p style="font-size: 13px; color: var(--muted); margin-top: 4px;">
              ${quote.client.email || ''}<br>
              ${quote.client.phone || ''}<br>
              ${quote.client.address || ''}
            </p>
          ` : ''}
        </div>
      </div>
      
      ${quote.notes ? `
        <div class="detail-section">
          <h4>Notes</h4>
          <p>${quote.notes}</p>
        </div>
      ` : ''}
      
      <div class="detail-section">
        <h4>Line Items</h4>
        <table class="detail-items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: center;">Quantity</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${(quote.items || []).map(item => `
              <tr>
                <td>${item.description || ''}</td>
                <td style="text-align: center;">${item.quantity || 1}</td>
                <td style="text-align: right;">${formatCurrency(item.unit_price || 0)}</td>
                <td style="text-align: right;">${formatCurrency(item.total || 0)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="detail-totals">
          <div class="detail-totals-row">
            <span class="detail-totals-label">Subtotal:</span>
            <span class="detail-totals-value">${formatCurrency(quote.subtotal || 0)}</span>
          </div>
          ${quote.tax ? `
            <div class="detail-totals-row">
              <span class="detail-totals-label">Tax:</span>
              <span class="detail-totals-value">${formatCurrency(quote.tax || 0)}</span>
            </div>
          ` : ''}
          <div class="detail-totals-row total">
            <span class="detail-totals-label">Total:</span>
            <span class="detail-totals-value">${formatCurrency(quote.total || 0)}</span>
          </div>
        </div>
      </div>
      
      <div class="detail-actions">
        <button class="btn-sm" onclick="downloadQuote({id: '${quote.id}'})">
          <i class="fa-solid fa-download"></i> Download PDF
        </button>
        <button class="btn-sm" onclick="showScreen('quotes')">
          <i class="fa-solid fa-arrow-left"></i> Back to List
        </button>
      </div>
    `;
    
    showScreen('quote-detail');
  } catch (error) {
    console.error("Error loading quote details:", error);
    showToast("Failed to load quote details");
  }
}

// PAYMENT MANAGEMENT FUNCTIONS

async function updateInvoicePaymentStatus(invoiceId, status) {
  if (!status) return;
  
  try {
    const res = await apiFetch(`/api/invoices/${invoiceId}/payment-status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_status: status }),
    });
    
    if (res.ok) {
      showToast(`Invoice marked as ${status}`);
      viewInvoiceDetail(invoiceId);
    } else {
      const error = await res.json();
      showToast(error.error || "Failed to update status");
    }
  } catch (error) {
    console.error("Error updating payment status:", error);
    showToast("Failed to update payment status");
  }
}

async function generatePaymentLink(invoiceId) {
  try {
    showToast("Generating payment link...");
    
    const res = await apiFetch(`/api/invoices/${invoiceId}/payment-link`, {
      method: 'POST',
    });
    
    if (res.ok) {
      const data = await res.json();
      showToast("Payment link created!");
      viewInvoiceDetail(invoiceId);
    } else {
      const error = await res.json();
      showToast(error.error || "Failed to generate payment link");
    }
  } catch (error) {
    console.error("Error generating payment link:", error);
    showToast("Failed to generate payment link");
  }
}

function copyToClipboard(text, message = "Copied to clipboard!") {
  navigator.clipboard.writeText(text).then(() => {
    showToast(message);
  }).catch(err => {
    console.error("Failed to copy:", err);
    showToast("Failed to copy to clipboard");
  });
}

async function loadPaymentStats() {
  if (tourMode) return;
  
  try {
    const res = await apiFetch('/api/payments/stats');
    if (res.ok) {
      const stats = await res.json();
      
      const outstandingEl = document.getElementById('payment-outstanding');
      const paidMonthEl = document.getElementById('payment-paid-month');
      const pendingEl = document.getElementById('payment-pending');
      
      const dashOutstanding = document.getElementById('dashboard-outstanding');
      const dashPaidMonth = document.getElementById('dashboard-paid-month');
      const dashPending = document.getElementById('dashboard-pending');
      
      if (outstandingEl) outstandingEl.textContent = `$${stats.outstanding}`;
      if (paidMonthEl) paidMonthEl.textContent = `$${stats.paid_month}`;
      if (pendingEl) pendingEl.textContent = `$${stats.pending}`;
      
      if (dashOutstanding) dashOutstanding.textContent = `$${stats.outstanding}`;
      if (dashPaidMonth) dashPaidMonth.textContent = `$${stats.paid_month}`;
      if (dashPending) dashPending.textContent = `$${stats.pending}`;
    }
  } catch (error) {
    console.error("Error loading payment stats:", error);
  }
}

async function loadPaymentScreenData() {
  try {
    const profileRes = await apiFetch('/api/profile');
    const profile = await profileRes.json();
    
    const statusEl = document.getElementById('payment-connection-status');
    const messageEl = document.getElementById('payment-status-message');
    
    if (profile.stripe_connect_enabled) {
      statusEl.innerHTML = `
        <div class="status-badge status-active">
          <i class="fa-solid fa-check-circle"></i>
          <span>Active</span>
        </div>
      `;
      messageEl.textContent = "Payment collection is enabled. You can generate payment links for your invoices.";
    } else {
      statusEl.innerHTML = `
        <div class="status-badge" style="background: rgba(158, 158, 158, 0.15); color: #9E9E9E; border: 1px solid rgba(158, 158, 158, 0.3);">
          <i class="fa-solid fa-circle-xmark"></i>
          <span>Not Enabled</span>
        </div>
      `;
      messageEl.textContent = "Payment collection is not enabled on your account. This feature is included with Lifetime plans or available as a $4/month add-on for Monthly/Yearly plans.";
    }
    
    await loadPaymentStats();
  } catch (error) {
    console.error("Error loading payment screen data:", error);
  }
}

// SETTINGS & LOGO

let selectedLogoFile = null;

function handleLogoSelect(e) {
  const file = e.target.files?.[0];
  selectedLogoFile = file || null;
  const preview = document.getElementById("business-logo-preview");
  preview.innerHTML = "";
  if (file) {
    const url = URL.createObjectURL(file);
    const img = document.createElement("img");
    img.src = url;
    preview.appendChild(img);
  }
}

async function loadSettings() {
  if (tourMode) return;
  
  const res = await apiFetch("/api/profile");
  if (!res.ok) return;
  const profile = await res.json();
  if (!profile) return;

  document.getElementById("business-name").value =
    profile.business_name || "";
  document.getElementById("business-phone").value = profile.phone || "";
  document.getElementById("business-email").value = profile.email || "";
  document.getElementById("business-address").value = profile.address || "";
  document.getElementById("business-website").value = profile.website || "";
  document.getElementById("business-tax").value =
    profile.default_tax_percent || "";
  document.getElementById("business-markup").value =
    profile.default_markup_percent || "";
  document.getElementById("business-footer").value =
    profile.invoice_footer || "";

  if (profile.logo_url) {
    const preview = document.getElementById("business-logo-preview");
    preview.innerHTML = "";
    const img = document.createElement("img");
    img.src = profile.logo_url;
    preview.appendChild(img);
  }
}

async function handleSaveSettings(e) {
  e.preventDefault();
  const msg = document.getElementById("settings-message");
  msg.textContent = "";

  const payload = {
    business_name: document.getElementById("business-name").value,
    phone: document.getElementById("business-phone").value,
    email: document.getElementById("business-email").value,
    address: document.getElementById("business-address").value,
    website: document.getElementById("business-website").value,
    default_tax_percent:
      parseFloat(document.getElementById("business-tax").value) || null,
    default_markup_percent:
      parseFloat(document.getElementById("business-markup").value) || null,
    invoice_footer: document.getElementById("business-footer").value,
  };

  if (selectedLogoFile) {
    const formData = new FormData();
    formData.append("logo", selectedLogoFile);

    const resLogo = await apiFetch("/api/profile/logo", {
      method: "POST",
      body: formData,
    });
    const logoData = await resLogo.json();
    if (resLogo.ok && logoData.logo_url) {
      payload.logo_url = logoData.logo_url;
    }
  }

  const res = await apiFetch("/api/profile", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    msg.textContent = "Failed to save settings.";
    return;
  }
  msg.textContent = "Settings saved.";
}

// REFERRALS

function wireReferralsUI() {
  // Copy button wired in wireSettingsUI
}

async function loadReferralSummary() {
  if (tourMode) return;
  
  const res = await apiFetch("/api/referrals/summary");
  if (!res.ok) return;
  const data = await res.json();

  const origin = window.location.origin.replace(/\/$/, "");
  const referralLink = `${origin}/?ref=${data.referral_code || ""}`;

  document.getElementById("referral-link").value = referralLink;
  document.getElementById("referral-count").textContent =
    data.active_referrals || 0;
  document.getElementById("referral-month").textContent = formatCurrency(
    (data.monthly_earnings_cents || 0) / 100
  );
  document.getElementById("referral-lifetime").textContent = formatCurrency(
    (data.lifetime_earnings_cents || 0) / 100
  );

  const list = document.getElementById("referral-list");
  list.innerHTML = "";
  (data.referrals || []).forEach((r) => {
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `
      <div class="list-item-header">
        <strong>${r.email || "Referred user"}</strong>
        <span>${formatCurrency((r.total_earned_cents || 0) / 100)}</span>
      </div>
      <div class="list-item-sub">
        Status: ${r.status || "active"}
      </div>
    `;
    list.appendChild(item);
  });
}

function copyReferralLink() {
  const input = document.getElementById("referral-link");
  input.select();
  input.setSelectionRange(0, 99999);
  document.execCommand("copy");
  showToast("Referral link copied.");
}

// STRIPE CHECKOUT

async function startCheckout(planCode, addonCodes = []) {
  const res = await apiFetch("/api/stripe/create-checkout-session", {
    method: "POST",
    body: JSON.stringify({ plan: planCode, addons: addonCodes }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("Checkout error:", data);
    showToast("Could not start checkout.");
    return;
  }

  const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
  await stripe.redirectToCheckout({ sessionId: data.sessionId });
}

// UTILS

function formatCurrency(amount) {
  const n = Number(amount) || 0;
  return `$${n.toFixed(2)}`;
}

function showToast(message) {
  if (!message) return;
  if (toastTimeout) clearTimeout(toastTimeout);

  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = message;
  document.body.appendChild(t);

  toastTimeout = setTimeout(() => {
    t.remove();
  }, 2600);
}

// THEME TOGGLE

function loadTheme() {
  const savedTheme = localStorage.getItem("tb_theme") || "dark";
  const root = document.documentElement;
  
  if (savedTheme === "light") {
    root.setAttribute("data-theme", "light");
  } else {
    root.removeAttribute("data-theme");
  }
  
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const root = document.documentElement;
  const currentTheme = root.getAttribute("data-theme");
  const newTheme = currentTheme === "light" ? "dark" : "light";
  
  if (newTheme === "light") {
    root.setAttribute("data-theme", "light");
  } else {
    root.removeAttribute("data-theme");
  }
  
  localStorage.setItem("tb_theme", newTheme);
  updateThemeIcon(newTheme);
  showToast(`Switched to ${newTheme} mode`);
}

function updateThemeIcon(theme) {
  const icon = document.querySelector("#theme-toggle i");
  if (icon) {
    if (theme === "light") {
      icon.className = "fa-solid fa-sun";
    } else {
      icon.className = "fa-solid fa-moon";
    }
  }
}

// INVOICE DOWNLOAD

async function downloadInvoice(invoice) {
  try {
    if (typeof html2canvas === 'undefined') {
      showToast("Download feature loading, please try again in a moment");
      return;
    }
    
    showToast("Generating invoice...");
    
    const [invoiceRes, profileRes] = await Promise.all([
      apiFetch(`/api/invoices/${invoice.id}`),
      apiFetch("/api/profile")
    ]);
    
    const invoiceData = await invoiceRes.json();
    const profile = await profileRes.json();
    
    const template = document.getElementById("invoice-template");
    const logo = document.getElementById("invoice-logo");
    const businessInfo = document.getElementById("invoice-business-info");
    const clientInfo = document.getElementById("invoice-client-info");
    const details = document.getElementById("invoice-details");
    const itemsBody = document.getElementById("invoice-items-body");
    const totals = document.getElementById("invoice-totals");
    const footer = document.getElementById("invoice-footer");
    
    if (profile && profile.logo_url) {
      logo.src = profile.logo_url;
      logo.style.display = "block";
    } else {
      logo.style.display = "none";
    }
    
    businessInfo.innerHTML = (profile && profile.business_name) ? `
      <strong>${profile.business_name || ""}</strong><br>
      ${profile.phone || ""}<br>
      ${profile.email || ""}<br>
      ${profile.address || ""}
    ` : "";
    
    clientInfo.innerHTML = invoiceData.client ? `
      <strong>Bill To:</strong><br>
      ${invoiceData.client.name}<br>
      ${invoiceData.client.phone || ""}<br>
      ${invoiceData.client.email || ""}<br>
      ${invoiceData.client.address || ""}
    ` : "";
    
    details.innerHTML = `
      <strong>Invoice #:</strong> ${invoiceData.number || invoiceData.id}<br>
      <strong>Date:</strong> ${invoiceData.date || new Date().toLocaleDateString()}<br>
      <strong>Status:</strong> ${invoiceData.status || "draft"}<br>
      ${invoiceData.notes ? `<br><strong>Notes:</strong> ${invoiceData.notes}` : ""}
    `;
    
    itemsBody.innerHTML = "";
    (invoiceData.items || []).forEach((item) => {
      const row = document.createElement("tr");
      row.style.borderBottom = "1px solid #ddd";
      row.innerHTML = `
        <td style="padding: 10px; color: #000 !important;">${item.description}</td>
        <td style="padding: 10px; text-align: center; color: #000 !important;">${item.qty}</td>
        <td style="padding: 10px; text-align: right; color: #000 !important;">${formatCurrency(item.unit_price)}</td>
        <td style="padding: 10px; text-align: right; color: #000 !important;">${formatCurrency(item.line_total)}</td>
      `;
      itemsBody.appendChild(row);
    });
    
    totals.innerHTML = `
      <div style="margin-bottom: 5px;"><strong>Subtotal:</strong> ${formatCurrency(invoiceData.subtotal || 0)}</div>
      <div style="margin-bottom: 5px;"><strong>Tax:</strong> ${formatCurrency(invoiceData.tax || 0)}</div>
      <div style="font-size: 16px; margin-top: 10px;"><strong>Total:</strong> ${formatCurrency(invoiceData.total || 0)}</div>
    `;
    
    footer.innerHTML = (profile && profile.invoice_footer) ? profile.invoice_footer : "";
    
    template.style.left = "0";
    template.style.top = "0";
    
    const canvas = await html2canvas(template, {
      backgroundColor: "#ffffff",
      scale: 2
    });
    
    template.style.left = "-9999px";
    
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${invoiceData.number || invoiceData.id}.png`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Invoice downloaded!");
    });
    
  } catch (err) {
    console.error("Download error:", err);
    showToast("Failed to download invoice");
  }
}

// SUBSCRIPTION & TRIAL BANNER

async function updateTrialBanner() {
  try {
    const res = await apiFetch("/api/profile");
    if (!res.ok) return;
    const profile = await res.json();
    if (!profile) return;

    const banner = document.getElementById("trial-banner");
    const bannerText = document.getElementById("trial-banner-text");

    if (profile.subscription_status === "active") {
      banner.classList.add("hidden");
      return;
    }

    if (profile.trial_ends_at) {
      const trialEnd = new Date(profile.trial_ends_at);
      const now = new Date();
      const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));

      if (daysLeft > 0) {
        banner.classList.remove("hidden");
        bannerText.textContent = `Free trial: ${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining`;
      } else {
        banner.classList.add("hidden");
      }
    }
  } catch (error) {
    console.error("Error updating trial banner:", error);
  }
}

function wireSubscriptionUI() {
  const subscribeButtons = document.querySelectorAll(".btn-subscribe");
  subscribeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const plan = btn.getAttribute("data-plan");
      const addons = [];
      
      const isLifetimePlan = plan === "lifetime_early" || plan === "lifetime_regular";
      
      if (isLifetimePlan) {
        addons.push("connect_stripe");
      } else {
        const stripeConnectCheckbox = document.getElementById("addon-stripe-connect");
        if (stripeConnectCheckbox && stripeConnectCheckbox.checked) {
          addons.push("connect_stripe");
        }
      }
      
      startCheckout(plan, addons);
    });
  });

  const subscribeNowBtn = document.getElementById("btn-subscribe-now");
  if (subscribeNowBtn) {
    subscribeNowBtn.addEventListener("click", () => {
      showScreen("subscription");
    });
  }
  
  const newQuoteBtn = document.getElementById("btn-new-quote");
  if (newQuoteBtn) {
    newQuoteBtn.addEventListener("click", () => {
      showScreen("new-quote");
    });
  }
  
  updateLifetimeEarlyCount();
}

async function updateLifetimeEarlyCount() {
  try {
    const res = await apiFetch("/api/profile/lifetime-count");
    if (res.ok) {
      const data = await res.json();
      const remaining = Math.max(0, 500 - (data.count || 0));
      const el = document.getElementById("lifetime-early-remaining");
      if (el) {
        el.textContent = remaining;
        
        const earlyBirdBtn = document.querySelector('[data-plan="lifetime_early"]');
        if (remaining <= 0 && earlyBirdBtn) {
          earlyBirdBtn.disabled = true;
          earlyBirdBtn.textContent = "Sold Out";
        }
      }
    }
  } catch (error) {
    console.error("Error fetching lifetime count:", error);
    const el = document.getElementById("lifetime-early-remaining");
    if (el) el.textContent = "500";
  }
}

// QUOTES FUNCTIONALITY

async function handleQuoteSubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById("quote-error");
  errorEl.textContent = "";

  const clientName = document.getElementById("quote-client-name").value.trim();
  const quoteDate = document.getElementById("quote-date").value;
  const quoteNumber = document.getElementById("quote-number").value.trim();
  const notes = document.getElementById("quote-notes").value;
  const items = getQuoteLineItemsFromUI();

  if (!clientName) {
    errorEl.textContent = "Enter a client name.";
    return;
  }
  if (!items.length) {
    errorEl.textContent = "Add at least one line item.";
    return;
  }

  let subtotal = 0;
  items.forEach((i) => (subtotal += i.line_total));
  const taxPercent = parseFloat(document.getElementById("quote-tax").value) || 0;
  const tax = subtotal * (taxPercent / 100);
  const total = subtotal + tax;

  try {
    const res = await apiFetch("/api/quotes", {
      method: "POST",
      body: JSON.stringify({
        client_name: clientName,
        quote_date: quoteDate,
        quote_number: quoteNumber,
        notes,
        subtotal,
        tax,
        total,
        items,
        status: "draft"
      }),
    });

    if (res.ok) {
      showToast("Quote created!");
      document.getElementById("quote-form").reset();
      clearQuoteLineItems();
      showScreen("quotes");
      await loadQuotes();
    } else {
      const data = await res.json();
      errorEl.textContent = data.error || "Failed to create quote.";
    }
  } catch (err) {
    errorEl.textContent = "An error occurred.";
  }
}

function getQuoteLineItemsFromUI() {
  const container = document.getElementById("quote-line-items");
  const rows = Array.from(container.querySelectorAll(".line-item-row"));
  return rows.map((row) => {
    const desc = row.querySelector(".item-desc").value.trim();
    const qty = parseFloat(row.querySelector(".item-qty").value) || 0;
    const price = parseFloat(row.querySelector(".item-price").value) || 0;
    return {
      description: desc,
      qty,
      unit_price: price,
      line_total: qty * price,
    };
  });
}

function clearQuoteLineItems() {
  const container = document.getElementById("quote-line-items");
  container.innerHTML = "";
  addQuoteLineItemRow();
}

function addQuoteLineItemRow(data = {}) {
  const container = document.getElementById("quote-line-items");
  const row = document.createElement("div");
  row.className = "line-item-row";
  row.innerHTML = `
    <input type="text" placeholder="Description" class="item-desc" value="${data.description || ""}" />
    <input type="number" placeholder="Qty" class="item-qty" value="${data.qty || 1}" min="0" step="0.01" />
    <input type="number" placeholder="Price" class="item-price" value="${data.unit_price || 0}" min="0" step="0.01" />
    <button type="button" class="btn-sm" onclick="this.parentElement.remove(); updateQuoteTotals()">Remove</button>
  `;
  container.appendChild(row);

  row.querySelectorAll("input").forEach((inp) => {
    inp.addEventListener("input", updateQuoteTotals);
  });
}

function updateQuoteTotals() {
  const items = getQuoteLineItemsFromUI();
  let subtotal = 0;
  items.forEach((i) => (subtotal += i.line_total));

  const taxPercent = parseFloat(document.getElementById("quote-tax").value) || 0;
  const tax = subtotal * (taxPercent / 100);
  const total = subtotal + tax;

  document.getElementById("quote-subtotal").textContent = formatCurrency(subtotal);
  document.getElementById("quote-tax-amount").textContent = formatCurrency(tax);
  document.getElementById("quote-total").textContent = formatCurrency(total);
}

function wireQuotesUI() {
  const quoteForm = document.getElementById("quote-form");
  if (quoteForm) {
    quoteForm.addEventListener("submit", handleQuoteSubmit);
  }

  const addQuoteItemBtn = document.getElementById("btn-add-quote-item");
  if (addQuoteItemBtn) {
    addQuoteItemBtn.addEventListener("click", () => addQuoteLineItemRow());
  }

  const quoteTaxInput = document.getElementById("quote-tax");
  if (quoteTaxInput) {
    quoteTaxInput.addEventListener("input", updateQuoteTotals);
  }
}

// QUOTE DOWNLOAD

async function downloadQuote(quote) {
  try {
    const res = await apiFetch(`/api/quotes/${quote.id}`);
    if (!res.ok) {
      showToast("Failed to load quote details");
      return;
    }
    const quoteData = await res.json();
    
    const resProfile = await apiFetch("/api/profile");
    const profile = resProfile.ok ? await resProfile.json() : null;
    
    const template = document.getElementById("invoice-download-template");
    const logo = document.getElementById("invoice-logo");
    const businessInfo = document.getElementById("invoice-business-info");
    const clientInfo = document.getElementById("invoice-client-info");
    const details = document.getElementById("invoice-details");
    const itemsBody = document.getElementById("invoice-items-body");
    const totals = document.getElementById("invoice-totals");
    const footer = document.getElementById("invoice-footer");
    
    if (profile && profile.logo_url) {
      logo.innerHTML = `<img src="${profile.logo_url}" alt="Logo" style="max-width: 150px; max-height: 80px;">`;
    } else {
      logo.innerHTML = "";
    }
    
    businessInfo.innerHTML = profile ? `
      <strong>${profile.business_name || ""}</strong><br>
      ${profile.phone || ""}<br>
      ${profile.email || ""}<br>
      ${profile.address || ""}<br>
      ${profile.website || ""}
    ` : "";
    
    clientInfo.innerHTML = quoteData.client ? `
      ${quoteData.client.name}<br>
      ${quoteData.client.phone || ""}<br>
      ${quoteData.client.email || ""}<br>
      ${quoteData.client.address || ""}
    ` : (quoteData.client_name ? quoteData.client_name : "");
    
    details.innerHTML = `
      <strong>Quote #:</strong> ${quoteData.quote_number || quoteData.id.slice(0, 8)}<br>
      <strong>Date:</strong> ${quoteData.quote_date || new Date().toLocaleDateString()}<br>
      <strong>Status:</strong> ${quoteData.status || "draft"}<br>
      ${quoteData.notes ? `<br><strong>Notes:</strong> ${quoteData.notes}` : ""}
    `;
    
    itemsBody.innerHTML = "";
    (quoteData.items || []).forEach((item) => {
      const row = document.createElement("tr");
      row.style.borderBottom = "1px solid #ddd";
      row.innerHTML = `
        <td style="padding: 10px; color: #000 !important;">${item.description}</td>
        <td style="padding: 10px; text-align: center; color: #000 !important;">${item.quantity}</td>
        <td style="padding: 10px; text-align: right; color: #000 !important;">${formatCurrency(item.unit_price)}</td>
        <td style="padding: 10px; text-align: right; color: #000 !important;">${formatCurrency(item.total)}</td>
      `;
      itemsBody.appendChild(row);
    });
    
    totals.innerHTML = `
      <div style="margin-bottom: 5px;"><strong>Subtotal:</strong> ${formatCurrency(quoteData.subtotal || 0)}</div>
      <div style="margin-bottom: 5px;"><strong>Tax:</strong> ${formatCurrency(quoteData.tax || 0)}</div>
      <div style="font-size: 16px; margin-top: 10px;"><strong>Total:</strong> ${formatCurrency(quoteData.total || 0)}</div>
    `;
    
    footer.innerHTML = (profile && profile.invoice_footer) ? profile.invoice_footer : "";
    
    template.style.left = "0";
    template.style.top = "0";
    
    const canvas = await html2canvas(template, {
      backgroundColor: "#ffffff",
      scale: 2
    });
    
    template.style.left = "-9999px";
    
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quote-${quoteData.quote_number || quoteData.id}.png`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Quote downloaded!");
    });
    
  } catch (err) {
    console.error("Download error:", err);
    showToast("Failed to download quote");
  }
}

// INVENTORY MANAGEMENT

function wireInventoryUI() {
  const btnNewInventory = document.getElementById("btn-new-inventory");
  if (btnNewInventory) {
    btnNewInventory.addEventListener("click", () => {
      document.getElementById("inventory-form-title").textContent = "Add Inventory Item";
      document.getElementById("inventory-item-id").value = "";
      document.getElementById("inventory-form").reset();
      document.getElementById("btn-delete-inventory").style.display = "none";
      showScreen("inventory-form");
    });
  }

  const inventoryForm = document.getElementById("inventory-form");
  if (inventoryForm) {
    inventoryForm.addEventListener("submit", handleInventorySubmit);
  }

  const btnDeleteInventory = document.getElementById("btn-delete-inventory");
  if (btnDeleteInventory) {
    btnDeleteInventory.addEventListener("click", handleInventoryDelete);
  }

  const tileInventory = document.querySelector('[data-screen="inventory"]');
  if (tileInventory) {
    tileInventory.addEventListener("click", loadInventory);
  }
}

async function loadInventory() {
  try {
    const res = await apiFetch("/api/inventory");
    if (!res.ok) {
      console.error("Error loading inventory:", await res.text());
      return;
    }

    const items = await res.json();
    renderInventoryList(items);
  } catch (err) {
    console.error("Error loading inventory:", err);
  }
}

function renderInventoryList(items) {
  const listContainer = document.getElementById("inventory-list");
  const emptyState = document.getElementById("inventory-empty-state");
  const totalValueEl = document.getElementById("inventory-total-value");
  const itemCountEl = document.getElementById("inventory-item-count");

  if (!items || items.length === 0) {
    listContainer.innerHTML = "";
    emptyState.style.display = "block";
    totalValueEl.textContent = "$0.00";
    itemCountEl.textContent = "0";
    return;
  }

  emptyState.style.display = "none";

  let totalValue = 0;
  listContainer.innerHTML = "";

  items.forEach((item) => {
    const quantity = parseFloat(item.quantity) || 0;
    const unitPrice = parseFloat(item.unit_price) || 0;
    const itemValue = quantity * unitPrice;
    totalValue += itemValue;

    const threshold = parseFloat(item.low_stock_threshold) || 0;
    const isLowStock = threshold > 0 && quantity <= threshold;

    const card = document.createElement("div");
    card.className = "list-item";
    card.style.cursor = "pointer";
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <strong style="font-size: 16px;">${item.name || "Unnamed Item"}</strong>
            ${isLowStock ? '<span class="badge badge-danger" style="font-size: 11px;">⚠️ Low Stock</span>' : '<span class="badge badge-success" style="font-size: 11px;">✓ In Stock</span>'}
          </div>
          ${item.description ? `<p style="color: var(--muted); margin: 4px 0; font-size: 14px;">${item.description}</p>` : ""}
          <div style="display: flex; gap: 16px; margin-top: 8px; font-size: 14px; color: var(--muted);">
            ${item.category ? `<span><i class="fa-solid fa-tag"></i> ${item.category}</span>` : ""}
            <span><i class="fa-solid fa-box"></i> ${quantity} ${item.unit_type || "each"}</span>
            <span><i class="fa-solid fa-dollar-sign"></i> ${formatCurrency(unitPrice)} / ${item.unit_type || "each"}</span>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 20px; font-weight: bold; color: var(--primary);">${formatCurrency(itemValue)}</div>
          <div style="font-size: 12px; color: var(--muted); margin-top: 2px;">Total Value</div>
        </div>
      </div>
    `;

    card.addEventListener("click", () => editInventoryItem(item));
    listContainer.appendChild(card);
  });

  totalValueEl.textContent = formatCurrency(totalValue);
  itemCountEl.textContent = items.length;
}

function editInventoryItem(item) {
  document.getElementById("inventory-form-title").textContent = "Edit Inventory Item";
  document.getElementById("inventory-item-id").value = item.id;
  document.getElementById("inventory-name").value = item.name || "";
  document.getElementById("inventory-description").value = item.description || "";
  document.getElementById("inventory-quantity").value = item.quantity || 0;
  document.getElementById("inventory-unit-price").value = item.unit_price || 0;
  document.getElementById("inventory-category").value = item.category || "";
  document.getElementById("inventory-unit-type").value = item.unit_type || "each";
  document.getElementById("inventory-low-stock").value = item.low_stock_threshold || 0;
  document.getElementById("btn-delete-inventory").style.display = "inline-block";
  showScreen("inventory-form");
}

async function handleInventorySubmit(e) {
  e.preventDefault();

  const itemId = document.getElementById("inventory-item-id").value;
  const name = document.getElementById("inventory-name").value.trim();
  const description = document.getElementById("inventory-description").value.trim();
  const quantity = parseFloat(document.getElementById("inventory-quantity").value) || 0;
  const unit_price = parseFloat(document.getElementById("inventory-unit-price").value) || 0;
  const category = document.getElementById("inventory-category").value;
  const unit_type = document.getElementById("inventory-unit-type").value;
  const low_stock_threshold = parseFloat(document.getElementById("inventory-low-stock").value) || 0;

  if (!name) {
    showToast("Please enter an item name");
    return;
  }

  const payload = {
    name,
    description,
    quantity,
    unit_price,
    category,
    unit_type,
    low_stock_threshold,
  };

  try {
    let res;
    if (itemId) {
      res = await apiFetch(`/api/inventory/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    } else {
      res = await apiFetch("/api/inventory", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }

    if (!res.ok) {
      const errText = await res.text();
      showToast(`Error: ${errText}`);
      return;
    }

    showToast(itemId ? "Item updated!" : "Item added!");
    showScreen("inventory");
    loadInventory();
  } catch (err) {
    console.error("Error saving inventory item:", err);
    showToast("Failed to save item");
  }
}

async function handleInventoryDelete() {
  const itemId = document.getElementById("inventory-item-id").value;
  if (!itemId) return;

  if (!confirm("Delete this inventory item?")) return;

  try {
    const res = await apiFetch(`/api/inventory/${itemId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      showToast("Failed to delete item");
      return;
    }

    showToast("Item deleted!");
    showScreen("inventory");
    loadInventory();
  } catch (err) {
    console.error("Error deleting inventory item:", err);
    showToast("Failed to delete item");
  }
}
