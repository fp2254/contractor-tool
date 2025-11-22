// --------------------------
// SUPABASE CLIENT
// --------------------------
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// GLOBAL STATE
let currentUser = null;
let pendingPhotos = []; // File objects before upload
let currentInvoiceItems = [];

// INIT
document.addEventListener("DOMContentLoaded", () => {
  wireAuthUI();
  wireDashboardUI();
  wireInvoiceUI();
  wireCalculatorUI();
  wireSettingsUI();
  wireReferralsUI();
  checkSession();
});

// --------------------------
// AUTH UI
// --------------------------
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
}

// --------------------------
// DASHBOARD / NAV
// --------------------------
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
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  const screenEl = document.getElementById(`screen-${screenId}`);
  if (screenEl) {
    screenEl.classList.add("active");
  }
}

function toggleTheme() {
  // Simple placeholder – you can expand to real light vs dark later
  showToast("Theme toggle placeholder (dark only for now).");
}

// --------------------------
// INITIAL DATA LOAD
// --------------------------
async function loadInitialData() {
  await Promise.all([
    loadClients(),
    loadInvoices(),
    loadEstimates(),
    loadSettings(),
    loadReferralSummary(),
  ]);
}

// --------------------------
// INVOICE UI + HELPER
// --------------------------
function wireInvoiceUI() {
  document
    .getElementById("btn-add-line-item")
    .addEventListener("click", addLineItemRow);

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
    .addEventListener("click", () => {
      showScreen("clients");
    });

  addLineItemRow(); // start with one row
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
  row.querySelector(".li-desc").addEventListener("input", () => {});

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
  document.getElementById("helper-profit").textContent = formatCurrency(profit);
  document.getElementById("helper-margin").textContent = margin.toFixed(1);

  document
    .getElementById("helper-results")
    .classList.remove("hidden");

  // store last helper total in dataset
  document
    .getElementById("helper-results")
    .setAttribute("data-total", total.toString());
}

function applyHelperTotal() {
  const results = document.getElementById("helper-results");
  const total = parseFloat(results.getAttribute("data-total") || "0");
  if (!total) return;
  // simple: put a single line item = "Job total"
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

  const clientId = document.getElementById("invoice-client").value;
  const date = document.getElementById("invoice-date").value;
  const notes = document.getElementById("invoice-notes").value;
  const items = getLineItemsFromUI();

  if (!clientId) {
    errorEl.textContent = "Select a client.";
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
    const res = await fetch(`${API_BASE_URL}/api/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        client_id: clientId,
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
    // Upload photos
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

// Upload photos to backend (which will use Supabase Storage)
async function uploadInvoicePhotos(invoiceId, files) {
  const formData = new FormData();
  formData.append("invoiceId", invoiceId);
  files.forEach((f) => formData.append("photos", f));

  const res = await fetch(`${API_BASE_URL}/api/invoices/${invoiceId}/photos`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!res.ok) {
    console.error("Photo upload failed");
  }
}

// --------------------------
// CALCULATOR SCREEN
// --------------------------
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

      document.getElementById("calc-total").textContent = formatCurrency(
        result.total
      );
      document.getElementById("calc-profit").textContent = formatCurrency(
        result.profit
      );
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

// --------------------------
// CLIENTS
// --------------------------
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

  await fetch(`${API_BASE_URL}/api/clients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name, phone, email, address }),
  });

  document.getElementById("client-form").reset();
  await loadClients();
}

async function loadClients() {
  const res = await fetch(`${API_BASE_URL}/api/clients`, {
    credentials: "include",
  });
  const data = await res.json();
  const list = document.getElementById("clients-list");
  const select = document.getElementById("invoice-client");
  list.innerHTML = "";
  select.innerHTML = `<option value="">Select client</option>`;

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

    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    select.appendChild(opt);
  });
}

// --------------------------
// INVOICES & ESTIMATES
// --------------------------
async function loadInvoices() {
  const res = await fetch(`${API_BASE_URL}/api/invoices`, {
    credentials: "include",
  });
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
    list.appendChild(item);
  });
}

async function loadEstimates() {
  const res = await fetch(`${API_BASE_URL}/api/estimates`, {
    credentials: "include",
  });
  if (!res.ok) return;
  const data = await res.json();
  const list = document.getElementById("estimates-list");
  list.innerHTML = "";

  (data || []).forEach((est) => {
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `
      <div class="list-item-header">
        <strong>Estimate #${est.number || est.id}</strong>
        <span>${formatCurrency(est.total || 0)}</span>
      </div>
      <div class="list-item-sub">${est.client_name || ""}</div>
      <div class="list-item-sub">
        ${est.date || ""} • ${est.status || "draft"}
      </div>
    `;
    list.appendChild(item);
  });
}

// --------------------------
// SETTINGS & LOGO
// --------------------------
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
  const res = await fetch(`${API_BASE_URL}/api/profile`, {
    credentials: "include",
  });
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

  // Logo upload if selected
  if (selectedLogoFile) {
    const formData = new FormData();
    formData.append("logo", selectedLogoFile);

    const resLogo = await fetch(`${API_BASE_URL}/api/profile/logo`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    const logoData = await resLogo.json();
    if (resLogo.ok && logoData.logo_url) {
      payload.logo_url = logoData.logo_url;
    }
  }

  const res = await fetch(`${API_BASE_URL}/api/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    msg.textContent = "Failed to save settings.";
    return;
  }
  msg.textContent = "Settings saved.";
}

// --------------------------
// REFERRALS FRONTEND
// --------------------------
function wireReferralsUI() {
  // Already wired copy button in wireSettingsUI
}

async function loadReferralSummary() {
  const res = await fetch(`${API_BASE_URL}/api/referrals/summary`, {
    credentials: "include",
  });
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

// --------------------------
// STRIPE CHECKOUT HELPER
// --------------------------
async function startCheckout(planCode, addonCodes = []) {
  const res = await fetch(`${API_BASE_URL}/api/stripe/create-checkout-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
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

// --------------------------
// UTILS
// --------------------------
function formatCurrency(amount) {
  const n = Number(amount) || 0;
  return `$${n.toFixed(2)}`;
}

let toastTimeout = null;
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
