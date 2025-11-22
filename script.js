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
    logo_url: null
  },
  clients: [
    { id: 1, name: "John Smith", email: "john@example.com", phone: "(555) 234-5678", address: "456 Oak Ave" },
    { id: 2, name: "Sarah Johnson", email: "sarah@example.com", phone: "(555) 345-6789", address: "789 Pine St" },
    { id: 3, name: "Mike Davis", email: "mike@example.com", phone: "(555) 456-7890", address: "321 Elm Dr" }
  ],
  invoices: [
    { 
      id: 1, 
      invoice_number: "INV-1001",
      client_name: "John Smith",
      date: "2025-11-15",
      subtotal: 850.00,
      tax: 72.25,
      total: 922.25,
      notes: "Water heater replacement",
      created_at: "2025-11-15T10:00:00Z"
    },
    { 
      id: 2, 
      invoice_number: "INV-1002",
      client_name: "Sarah Johnson",
      date: "2025-11-18",
      subtotal: 450.00,
      tax: 38.25,
      total: 488.25,
      notes: "Kitchen sink repair",
      created_at: "2025-11-18T14:30:00Z"
    }
  ],
  quotes: [
    {
      id: 1,
      quote_number: "QUO-2001",
      client_name: "Mike Davis",
      date: "2025-11-20",
      subtotal: 2400.00,
      tax: 204.00,
      total: 2604.00,
      notes: "Bathroom renovation estimate",
      created_at: "2025-11-20T09:00:00Z"
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
  document.getElementById("btn-logout").classList.remove("hidden");
  
  sb.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      showScreen("dashboard");
      loadInitialData();
    } else {
      document.getElementById("app-container").classList.add("hidden");
      document.getElementById("auth-container").classList.remove("hidden");
      showScreen("subscription");
    }
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
    "settings-business-name", "settings-address", "settings-phone",
    "settings-email", "settings-tax", "settings-markup",
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
}

async function loadDemoData() {
  renderDemoClients();
  renderDemoInvoices();
  renderDemoQuotes();
  renderDemoReferrals();
  renderDemoSettings();
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
  
  invoicesList.innerHTML = DEMO_DATA.invoices.map(inv => `
    <div class="list-item">
      <div>
        <strong>${inv.invoice_number}</strong> · ${inv.client_name}
        <div class="item-meta">${inv.date} · Total: $${inv.total.toFixed(2)}</div>
        ${inv.notes ? `<div class="item-meta">${inv.notes}</div>` : ''}
      </div>
    </div>
  `).join('');
}

function renderDemoQuotes() {
  const quotesList = document.getElementById("quotes-list");
  if (!quotesList) return;
  
  quotesList.innerHTML = DEMO_DATA.quotes.map(quote => `
    <div class="list-item">
      <div>
        <strong>${quote.quote_number}</strong> · ${quote.client_name}
        <div class="item-meta">${quote.date} · Total: $${quote.total.toFixed(2)}</div>
        ${quote.notes ? `<div class="item-meta">${quote.notes}</div>` : ''}
      </div>
    </div>
  `).join('');
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
    "settings-business-name": DEMO_DATA.profile.business_name,
    "settings-address": DEMO_DATA.profile.address,
    "settings-phone": DEMO_DATA.profile.phone,
    "settings-email": DEMO_DATA.profile.email,
    "settings-tax": DEMO_DATA.profile.tax_rate,
    "settings-markup": DEMO_DATA.profile.markup_rate
  };
  
  Object.entries(fields).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el && value) el.value = value;
  });
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
      if (screen) showScreen(screen);
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
    item.className = "list-item";
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
    
    const downloadBtn = document.createElement("button");
    downloadBtn.className = "btn-sm";
    downloadBtn.textContent = "Download";
    downloadBtn.style.marginTop = "8px";
    downloadBtn.onclick = () => downloadInvoice(inv);
    item.appendChild(downloadBtn);
    
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
      item.className = "list-item";
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
      
      const downloadBtn = document.createElement("button");
      downloadBtn.className = "btn-sm";
      downloadBtn.textContent = "Download";
      downloadBtn.style.marginTop = "8px";
      downloadBtn.onclick = () => downloadQuote(quote);
      item.appendChild(downloadBtn);
      
      list.appendChild(item);
    });
  } catch (error) {
    console.error("Error loading quotes:", error);
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
      
      const stripeConnectCheckbox = document.getElementById("addon-stripe-connect");
      if (!isLifetimePlan && stripeConnectCheckbox && stripeConnectCheckbox.checked) {
        addons.push("connect_stripe");
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
