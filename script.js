// --------------------------
// CONFIG
// --------------------------
const SUPABASE_URL = "https://uafgyteczukkgmxfbeil.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZmd5dGVjenVra2dteGZiZWlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNDEyODQsImV4cCI6MjA3ODgxNzI4NH0.tiddA-ORf1b3ZnQOxGEOgq3rJW-BJe3MMD7QahvDFO4";

const STRIPE_PUBLISHABLE_KEY = "pk_live_51SRDaxBQnHmahVblkIfGBpeLtjSfXZn2r277Wcf7FicFPmjbbPnPgRCtle9c9j4HxX9gxZ9kTv0IepOfKmmZQ06900fSEnjjEo"; // pk_test_...
const PLAN_IDS = {
  monthly: "monthly",
  yearly: "yearly",
  lifetime: "lifetime"
};

// Init Supabase + Stripe
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let stripe = null;

// Current user + localStorage prefix
let currentUser = null;
let LS_PREFIX = null;
let appInitialized = false;

// DOM cache
const authWrapper = document.getElementById("auth-wrapper");
const loginScreen = document.getElementById("login-screen");
const signupScreen = document.getElementById("signup-screen");
const resetScreen = document.getElementById("reset-screen");

const mainApp = document.getElementById("main-app");
const paywallWrapper = document.getElementById("paywall-wrapper");

const loginEmailInput = document.getElementById("login-email");
const loginPasswordInput = document.getElementById("login-password");
const loginBtn = document.getElementById("login-btn");
const loginMessage = document.getElementById("login-message");

const signupEmailInput = document.getElementById("signup-email");
const signupPasswordInput = document.getElementById("signup-password");
const signupBtn = document.getElementById("signup-btn");
const signupMessage = document.getElementById("signup-message");

const resetEmailInput = document.getElementById("reset-email");
const resetBtn = document.getElementById("reset-btn");
const resetMessage = document.getElementById("reset-message");

const goSignupBtn = document.getElementById("go-signup");
const goLoginFromSignupBtn = document.getElementById("go-login-from-signup");
const goResetBtn = document.getElementById("go-reset");
const goLoginFromResetBtn = document.getElementById("go-login-from-reset");

const logoutBtn = document.getElementById("logout-btn");
const paywallLogoutBtn = document.getElementById("paywall-logout");
const currentUserEmailSpan = document.getElementById("current-user-email");
const membershipTag = document.getElementById("membership-tag");
const paywallMessage = document.getElementById("paywall-message");

const navButtons = document.querySelectorAll(".nav-item");
const appScreens = document.querySelectorAll(".app-screen");

// Dashboard stats
const statTotalInvoices = document.getElementById("stat-total-invoices");
const statTotalClients = document.getElementById("stat-total-clients");
const statLastBackup = document.getElementById("stat-last-backup");

// Quick actions
const quickNewInvoiceBtn = document.getElementById("quick-new-invoice");
const quickViewInvoicesBtn = document.getElementById("quick-view-invoices");
const quickBusinessBtn = document.getElementById("quick-business");

// Business form
const bizNameInput = document.getElementById("biz-name");
const bizOwnerInput = document.getElementById("biz-owner");
const bizPhoneInput = document.getElementById("biz-phone");
const bizEmailInput = document.getElementById("biz-email");
const bizAddressInput = document.getElementById("biz-address");
const bizLogoInput = document.getElementById("biz-logo");
const bizLogoPreviewWrapper = document.getElementById("biz-logo-preview-wrapper");
const bizLogoPreview = document.getElementById("biz-logo-preview");
const removeLogoBtn = document.getElementById("remove-logo-btn");
const saveBusinessBtn = document.getElementById("save-business-btn");
const businessMessage = document.getElementById("business-message");

// Client form
const clientListEl = document.getElementById("client-list");
const noClientsMsg = document.getElementById("no-clients-msg");
const addClientBtn = document.getElementById("add-client-btn");
const clientForm = document.getElementById("client-form");
const clientIdInput = document.getElementById("client-id");
const clientNameInput = document.getElementById("client-name");
const clientEmailInput = document.getElementById("client-email");
const clientPhoneInput = document.getElementById("client-phone");
const clientAddressInput = document.getElementById("client-address");
const clientNotesInput = document.getElementById("client-notes");
const saveClientBtn = document.getElementById("save-client-btn");
const deleteClientBtn = document.getElementById("delete-client-btn");
const clientMessage = document.getElementById("client-message");

// Invoice form
const invoiceForm = document.getElementById("invoice-form");
const invoiceNumberInput = document.getElementById("invoice-number");
const invoiceDateInput = document.getElementById("invoice-date");
const invoiceDueInput = document.getElementById("invoice-due");
const invoiceClientSelect = document.getElementById("invoice-client");
const invoiceClientAddress = document.getElementById("invoice-client-address");
const addItemBtn = document.getElementById("add-item-btn");
const invoiceItemsContainer = document.getElementById("invoice-items");
const invoiceNotesInput = document.getElementById("invoice-notes");
const invoicePhotosInput = document.getElementById("invoice-photos");
const invoicePhotoPreview = document.getElementById("invoice-photo-preview");
const subtotalDisplay = document.getElementById("subtotal-display");
const taxInput = document.getElementById("tax-input");
const discountInput = document.getElementById("discount-input");
const totalDisplay = document.getElementById("total-display");
const resetInvoiceFormBtn = document.getElementById("reset-invoice-form");

// Invoice list
const invoiceTableBody = document.getElementById("invoice-table-body");
const noInvoicesMsg = document.getElementById("no-invoices-msg");
const refreshInvoiceListBtn = document.getElementById("refresh-invoice-list");

// Backup
const backupBtn = document.getElementById("backup-btn");
const restoreFileInput = document.getElementById("restore-file");
const restoreBtn = document.getElementById("restore-btn");
const backupMessage = document.getElementById("backup-message");

// Modal
const invoiceViewModal = document.getElementById("invoice-view-modal");
const invoiceViewBody = document.getElementById("invoice-view-body");
const closeInvoiceModalBtn = document.getElementById("close-invoice-modal");
const printInvoiceBtn = document.getElementById("print-invoice-btn");

// Paywall plan buttons
const planButtons = document.querySelectorAll(".plan-card .btn");

// --------------------------
// LOCAL STORAGE HELPERS
// --------------------------
function lsKey(key) {
  if (!LS_PREFIX) return key;
  return `${LS_PREFIX}_${key}`;
}

function loadLocal(key, defaultVal) {
  try {
    const raw = localStorage.getItem(lsKey(key));
    if (!raw) return defaultVal;
    return JSON.parse(raw);
  } catch (e) {
    console.error("loadLocal error", e);
    return defaultVal;
  }
}

function saveLocal(key, value) {
  try {
    localStorage.setItem(lsKey(key), JSON.stringify(value));
  } catch (e) {
    console.error("saveLocal error", e);
  }
}

// Membership stored per user locally
function getMembership() {
  return loadLocal("membership", null);
}

function setMembership(membership) {
  saveLocal("membership", membership);
  updateMembershipTag();
}

function updateMembershipTag() {
  const membership = getMembership();
  if (!membership) {
    membershipTag.classList.add("hidden");
    return;
  }
  membershipTag.classList.remove("hidden");
  membershipTag.textContent = membership.label || "Member";
}

// Business data
function getBusiness() {
  return loadLocal("business", {
    name: "",
    owner: "",
    phone: "",
    email: "",
    address: "",
    logoDataUrl: null
  });
}

function saveBusiness(data) {
  saveLocal("business", data);
}

// Clients
function getClients() {
  return loadLocal("clients", []);
}

function saveClients(list) {
  saveLocal("clients", list);
}

// Invoices
function getInvoices() {
  return loadLocal("invoices", []);
}

function saveInvoices(list) {
  saveLocal("invoices", list);
}

// Settings
function getSettings() {
  return loadLocal("settings", {
    lastBackup: null
  });
}

function saveSettings(settings) {
  saveLocal("settings", settings);
}

// --------------------------
// UI HELPERS
// --------------------------
function showAuthScreen(name) {
  loginScreen.classList.add("hidden");
  signupScreen.classList.add("hidden");
  resetScreen.classList.add("hidden");

  if (name === "login") loginScreen.classList.remove("hidden");
  if (name === "signup") signupScreen.classList.remove("hidden");
  if (name === "reset") resetScreen.classList.remove("hidden");
}

function showPaywall() {
  authWrapper.classList.add("hidden");
  mainApp.classList.add("hidden");
  paywallWrapper.classList.remove("hidden");
}

function showMainApp() {
  authWrapper.classList.add("hidden");
  paywallWrapper.classList.add("hidden");
  mainApp.classList.remove("hidden");
}

function setNavActive(screenId) {
  navButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.screen === screenId);
  });
  appScreens.forEach((screen) => {
    screen.classList.toggle("hidden", screen.id !== screenId);
  });
}

function formatMoney(value) {
  if (isNaN(value) || value === null) return "$0.00";
  return "$" + value.toFixed(2);
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString();
}

function showModal() {
  invoiceViewModal.classList.remove("hidden");
}

function hideModal() {
  invoiceViewModal.classList.add("hidden");
}

// --------------------------
// AUTH SECTION
// --------------------------
async function handleLogin() {
  loginMessage.textContent = "";
  const email = loginEmailInput.value.trim();
  const password = loginPasswordInput.value;

  if (!email || !password) {
    loginMessage.textContent = "Enter email and password.";
    return;
  }
  loginMessage.textContent = "Logging in...";

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    loginMessage.textContent = error.message || "Login failed.";
    return;
  }

  currentUser = data.user;
  LS_PREFIX = `tradebase_${currentUser.id}`;
  currentUserEmailSpan.textContent = currentUser.email || "";
  loginMessage.textContent = "";
  await onAuthReady();
}

async function handleSignup() {
  signupMessage.textContent = "";
  const email = signupEmailInput.value.trim();
  const password = signupPasswordInput.value;

  if (!email || !password) {
    signupMessage.textContent = "Enter email and password.";
    return;
  }
  signupMessage.textContent = "Creating account...";

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password
  });

  if (error) {
    signupMessage.textContent = error.message || "Signup failed.";
    return;
  }

  signupMessage.classList.add("success");
  signupMessage.textContent = "Check your email to confirm your account.";
}

async function handleResetPassword() {
  resetMessage.textContent = "";
  const email = resetEmailInput.value.trim();
  if (!email) {
    resetMessage.textContent = "Enter your email.";
    return;
  }
  resetMessage.textContent = "Sending reset email...";

  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: "YOUR_DOMAIN"
  });

  if (error) {
    resetMessage.textContent = error.message || "Failed to send reset email.";
    return;
  }

  resetMessage.classList.add("success");
  resetMessage.textContent = "If that email exists, a reset link has been sent.";
}

async function handleLogout() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  LS_PREFIX = null;
  membershipTag.classList.add("hidden");
  currentUserEmailSpan.textContent = "";
  appInitialized = false;
  showAuthScreen("login");
  authWrapper.classList.remove("hidden");
  mainApp.classList.add("hidden");
  paywallWrapper.classList.add("hidden");
}

// Called once Supabase session is known
async function onAuthReady() {
  if (currentUser) {
    LS_PREFIX = `tradebase_${currentUser.id}`;
    currentUserEmailSpan.textContent = currentUser.email || "";
  }

  if (!stripe) {
    stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
  }

  // Check for Stripe Checkout return
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get("session_id");
  if (sessionId) {
    try {
      paywallMessage.textContent = "Verifying payment...";
      const res = await fetch(`/checkout-session?session_id=${encodeURIComponent(sessionId)}`);
      const data = await res.json();
      if (data.success) {
        setMembership({
          plan: data.planType,
          label:
            data.planType === "monthly"
              ? "Monthly Member"
              : data.planType === "yearly"
              ? "Yearly Member"
              : "Lifetime Member",
          lastUpdated: new Date().toISOString()
        });
        paywallMessage.classList.add("success");
        paywallMessage.textContent = "Payment verified. Unlocking your toolkit...";
      } else {
        paywallMessage.textContent = data.message || "Could not verify payment.";
      }
    } catch (err) {
      console.error("verify error", err);
      paywallMessage.textContent = "Error verifying payment.";
    } finally {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  const membership = getMembership();
  updateMembershipTag();

  if (!membership) {
    showPaywall();
  } else {
    showMainApp();
    if (!appInitialized) {
      initAppDataAndUI();
      appInitialized = true;
    }
  }
}

// --------------------------
// PAYWALL / STRIPE
// --------------------------
async function startCheckout(planKey) {
  paywallMessage.textContent = "";
  const membership = getMembership();
  if (membership && membership.plan === planKey) {
    paywallMessage.classList.add("success");
    paywallMessage.textContent = "You already have this plan.";
    return;
  }

  try {
    paywallMessage.textContent = "Redirecting to secure checkout...";
    const res = await fetch("/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planKey,
        email: currentUser?.email || ""
      })
    });
    const data = await res.json();
    if (!data || !data.url) {
      paywallMessage.textContent = data.message || "Failed to create checkout session.";
      return;
    }

    window.location.href = data.url;
  } catch (err) {
    console.error("checkout error", err);
    paywallMessage.textContent = "Error starting checkout.";
  }
}

// --------------------------
// APP DATA / UI INIT
// --------------------------
function initAppDataAndUI() {
  // Nav
  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const screenId = btn.dataset.screen;
      setNavActive(screenId);
    });
  });

  // Default screen
  setNavActive("dashboard-screen");

  // Quick actions
  quickNewInvoiceBtn.addEventListener("click", () => setNavActive("new-invoice-screen"));
  quickViewInvoicesBtn.addEventListener("click", () => setNavActive("invoices-screen"));
  quickBusinessBtn.addEventListener("click", () => setNavActive("business-screen"));

  // Business
  loadBusinessIntoForm();
  bizLogoInput.addEventListener("change", handleBizLogoChange);
  removeLogoBtn.addEventListener("click", () => {
    const biz = getBusiness();
    biz.logoDataUrl = null;
    saveBusiness(biz);
    renderBizLogoPreview(biz.logoDataUrl);
  });
  saveBusinessBtn.addEventListener("click", (e) => {
    e.preventDefault();
    saveBusinessFromForm();
  });

  // Clients
  renderClientList();
  addClientBtn.addEventListener("click", () => {
    clearClientForm();
  });
  clientForm.addEventListener("submit", handleSaveClient);
  deleteClientBtn.addEventListener("click", handleDeleteClient);

  // Invoices
  setupInvoiceForm();
  refreshInvoiceList();
  refreshInvoiceListBtn.addEventListener("click", refreshInvoiceList);

  // Backup / restore
  backupBtn.addEventListener("click", handleBackup);
  restoreBtn.addEventListener("click", handleRestore);

  // Modal
  closeInvoiceModalBtn.addEventListener("click", hideModal);
  printInvoiceBtn.addEventListener("click", () => {
    window.print();
  });

  // Stats
  updateStats();
}

// --------------------------
// BUSINESS PROFILE
// --------------------------
function loadBusinessIntoForm() {
  const biz = getBusiness();
  bizNameInput.value = biz.name || "";
  bizOwnerInput.value = biz.owner || "";
  bizPhoneInput.value = biz.phone || "";
  bizEmailInput.value = biz.email || "";
  bizAddressInput.value = biz.address || "";
  renderBizLogoPreview(biz.logoDataUrl);
}

function renderBizLogoPreview(logoDataUrl) {
  if (logoDataUrl) {
    bizLogoPreviewWrapper.classList.remove("hidden");
    bizLogoPreview.src = logoDataUrl;
  } else {
    bizLogoPreviewWrapper.classList.add("hidden");
    bizLogoPreview.src = "";
  }
}

function handleBizLogoChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const biz = getBusiness();
    biz.logoDataUrl = reader.result;
    saveBusiness(biz);
    renderBizLogoPreview(biz.logoDataUrl);
  };
  reader.readAsDataURL(file);
}

function saveBusinessFromForm() {
  const biz = getBusiness();
  biz.name = bizNameInput.value.trim();
  biz.owner = bizOwnerInput.value.trim();
  biz.phone = bizPhoneInput.value.trim();
  biz.email = bizEmailInput.value.trim();
  biz.address = bizAddressInput.value.trim();
  saveBusiness(biz);
  businessMessage.classList.add("success");
  businessMessage.textContent = "Business profile saved.";
  setTimeout(() => (businessMessage.textContent = ""), 2000);
}

// --------------------------
// CLIENTS
// --------------------------
function renderClientList() {
  const clients = getClients();
  clientListEl.innerHTML = "";
  if (!clients.length) {
    noClientsMsg.classList.remove("hidden");
  } else {
    noClientsMsg.classList.add("hidden");
  }

  clients.forEach((client) => {
    const div = document.createElement("div");
    div.className = "client-list-item";
    div.textContent = client.name || "(No name)";
    div.dataset.id = client.id;
    div.addEventListener("click", () => {
      loadClientIntoForm(client.id);
    });
    clientListEl.appendChild(div);
  });

  populateInvoiceClientSelect();
  updateStats();
}

function populateInvoiceClientSelect() {
  const clients = getClients();
  invoiceClientSelect.innerHTML = "";
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Select client";
  invoiceClientSelect.appendChild(defaultOption);

  clients.forEach((client) => {
    const opt = document.createElement("option");
    opt.value = client.id;
    opt.textContent = client.name || "(No name)";
    invoiceClientSelect.appendChild(opt);
  });
}

function clearClientForm() {
  clientIdInput.value = "";
  clientNameInput.value = "";
  clientEmailInput.value = "";
  clientPhoneInput.value = "";
  clientAddressInput.value = "";
  clientNotesInput.value = "";
  clientMessage.textContent = "";
  const items = clientListEl.querySelectorAll(".client-list-item");
  items.forEach((el) => el.classList.remove("active"));
}

function loadClientIntoForm(id) {
  const clients = getClients();
  const client = clients.find((c) => c.id === id);
  if (!client) return;
  clientIdInput.value = client.id;
  clientNameInput.value = client.name || "";
  clientEmailInput.value = client.email || "";
  clientPhoneInput.value = client.phone || "";
  clientAddressInput.value = client.address || "";
  clientNotesInput.value = client.notes || "";

  const items = clientListEl.querySelectorAll(".client-list-item");
  items.forEach((el) => el.classList.toggle("active", el.dataset.id === id));
}

function handleSaveClient(e) {
  e.preventDefault();
  const id = clientIdInput.value || `client_${Date.now()}`;
  const clients = getClients();
  const existingIdx = clients.findIndex((c) => c.id === id);

  const clientData = {
    id,
    name: clientNameInput.value.trim(),
    email: clientEmailInput.value.trim(),
    phone: clientPhoneInput.value.trim(),
    address: clientAddressInput.value.trim(),
    notes: clientNotesInput.value.trim()
  };

  if (existingIdx >= 0) {
    clients[existingIdx] = clientData;
  } else {
    clients.push(clientData);
  }

  saveClients(clients);
  clientMessage.classList.add("success");
  clientMessage.textContent = "Client saved.";
  setTimeout(() => (clientMessage.textContent = ""), 2000);
  renderClientList();
}

function handleDeleteClient() {
  const id = clientIdInput.value;
  if (!id) return;
  const clients = getClients().filter((c) => c.id !== id);
  saveClients(clients);
  clearClientForm();
  renderClientList();
}

// --------------------------
// INVOICE FORM
// --------------------------
function setupInvoiceForm() {
  const today = new Date().toISOString().slice(0, 10);
  invoiceDateInput.value = today;
  invoiceDueInput.value = today;

  addItemRow();

  addItemBtn.addEventListener("click", addItemRow);
  invoiceItemsContainer.addEventListener("input", recalcInvoiceTotals);
  taxInput.addEventListener("input", recalcInvoiceTotals);
  discountInput.addEventListener("input", recalcInvoiceTotals);
  invoiceClientSelect.addEventListener("change", handleInvoiceClientChange);
  invoicePhotosInput.addEventListener("change", handleInvoicePhotosChange);
  resetInvoiceFormBtn.addEventListener("click", (e) => {
    e.preventDefault();
    clearInvoiceForm();
  });

  invoiceForm.addEventListener("submit", handleSaveInvoice);
}

function addItemRow() {
  const row = document.createElement("div");
  row.className = "invoice-item-row";

  const descInput = document.createElement("input");
  descInput.type = "text";
  descInput.placeholder = "Description";

  const qtyInput = document.createElement("input");
  qtyInput.type = "number";
  qtyInput.step = "0.01";
  qtyInput.placeholder = "1";

  const rateInput = document.createElement("input");
  rateInput.type = "number";
  rateInput.step = "0.01";
  rateInput.placeholder = "0.00";

  const totalSpan = document.createElement("span");
  totalSpan.className = "invoice-item-total";
  totalSpan.textContent = "$0.00";

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "btn ghost small";
  removeBtn.textContent = "✕";
  removeBtn.addEventListener("click", () => {
    row.remove();
    recalcInvoiceTotals();
  });

  row.appendChild(descInput);
  row.appendChild(qtyInput);
  row.appendChild(rateInput);
  row.appendChild(totalSpan);
  row.appendChild(removeBtn);

  invoiceItemsContainer.appendChild(row);
}

function getInvoiceItemsFromForm() {
  const rows = invoiceItemsContainer.querySelectorAll(".invoice-item-row");
  const items = [];
  rows.forEach((row) => {
    const [descInput, qtyInput, rateInput, totalSpan] = row.children;
    const description = descInput.value.trim();
    const quantity = parseFloat(qtyInput.value) || 0;
    const rate = parseFloat(rateInput.value) || 0;
    const total = quantity * rate;
    if (description || quantity || rate) {
      items.push({ description, quantity, rate, total });
    }
  });
  return items;
}

function recalcInvoiceTotals() {
  const items = getInvoiceItemsFromForm();
  let subtotal = 0;
  items.forEach((item, idx) => {
    subtotal += item.total;
    const row = invoiceItemsContainer.children[idx];
    const totalSpan = row.children[3];
    totalSpan.textContent = formatMoney(item.total);
  });

  const taxPercent = parseFloat(taxInput.value) || 0;
  const discount = parseFloat(discountInput.value) || 0;

  const taxAmount = (subtotal * taxPercent) / 100;
  const total = subtotal + taxAmount - discount;

  subtotalDisplay.textContent = formatMoney(subtotal);
  totalDisplay.textContent = formatMoney(total);
}

function handleInvoiceClientChange() {
  const selectedId = invoiceClientSelect.value;
  if (!selectedId) {
    invoiceClientAddress.value = "";
    return;
  }
  const clients = getClients();
  const client = clients.find((c) => c.id === selectedId);
  if (client) {
    invoiceClientAddress.value = client.address || "";
  }
}

function handleInvoicePhotosChange(e) {
  const files = Array.from(e.target.files || []);
  invoicePhotoPreview.innerHTML = "";
  if (!files.length) return;

  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = document.createElement("img");
      img.src = reader.result;
      invoicePhotoPreview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

function clearInvoiceForm() {
  invoiceNumberInput.value = "";
  const today = new Date().toISOString().slice(0, 10);
  invoiceDateInput.value = today;
  invoiceDueInput.value = today;
  invoiceClientSelect.value = "";
  invoiceClientAddress.value = "";
  invoiceNotesInput.value = "";
  taxInput.value = "";
  discountInput.value = "";
  invoicePhotoPreview.innerHTML = "";
  invoicePhotosInput.value = "";

  invoiceItemsContainer.innerHTML = "";
  addItemRow();
  recalcInvoiceTotals();
}

function handleSaveInvoice(e) {
  e.preventDefault();
  const clients = getClients();
  const invoices = getInvoices();

  const invoiceNumber = invoiceNumberInput.value.trim() || `INV-${Date.now()}`;
  const date = invoiceDateInput.value;
  const dueDate = invoiceDueInput.value;
  const clientId = invoiceClientSelect.value || null;
  const clientName =
    (clients.find((c) => c.id === clientId) || {}).name || "(No client)";
  const clientAddressText = invoiceClientAddress.value.trim();
  const items = getInvoiceItemsFromForm();

  if (!items.length) {
    alert("Add at least one line item.");
    return;
  }

  let photosDataUrls = [];
  const previewImgs = invoicePhotoPreview.querySelectorAll("img");
  previewImgs.forEach((img) => photosDataUrls.push(img.src));

  const subtotal = items.reduce((sum, it) => sum + it.total, 0);
  const taxPercent = parseFloat(taxInput.value) || 0;
  const discount = parseFloat(discountInput.value) || 0;
  const taxAmount = (subtotal * taxPercent) / 100;
  const total = subtotal + taxAmount - discount;

  const invoice = {
    id: `inv_${Date.now()}`,
    invoiceNumber,
    date,
    dueDate,
    clientId,
    clientName,
    clientAddress: clientAddressText,
    items,
    notes: invoiceNotesInput.value.trim(),
    taxPercent,
    discount,
    subtotal,
    total,
    photos: photosDataUrls,
    createdAt: new Date().toISOString()
  };

  invoices.push(invoice);
  saveInvoices(invoices);

  alert("Invoice saved.");
  clearInvoiceForm();
  refreshInvoiceList();
  updateStats();
}

// --------------------------
// INVOICE LIST + VIEW
// --------------------------
function refreshInvoiceList() {
  const invoices = getInvoices();
  invoiceTableBody.innerHTML = "";
  if (!invoices.length) {
    noInvoicesMsg.classList.remove("hidden");
  } else {
    noInvoicesMsg.classList.add("hidden");
  }

  invoices
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach((inv) => {
      const tr = document.createElement("tr");

      const tdNumber = document.createElement("td");
      tdNumber.textContent = inv.invoiceNumber;

      const tdClient = document.createElement("td");
      tdClient.textContent = inv.clientName || "";

      const tdDate = document.createElement("td");
      tdDate.textContent = formatDate(inv.date);

      const tdDue = document.createElement("td");
      tdDue.textContent = formatDate(inv.dueDate);

      const tdTotal = document.createElement("td");
      tdTotal.textContent = formatMoney(inv.total);

      const tdCreated = document.createElement("td");
      tdCreated.textContent = formatDate(inv.createdAt);

      const tdActions = document.createElement("td");
      const viewBtn = document.createElement("button");
      viewBtn.className = "btn ghost small";
      viewBtn.textContent = "View";
      viewBtn.addEventListener("click", () => {
        openInvoiceView(inv.id);
      });
      tdActions.appendChild(viewBtn);

      tr.appendChild(tdNumber);
      tr.appendChild(tdClient);
      tr.appendChild(tdDate);
      tr.appendChild(tdDue);
      tr.appendChild(tdTotal);
      tr.appendChild(tdCreated);
      tr.appendChild(tdActions);

      invoiceTableBody.appendChild(tr);
    });
}

function openInvoiceView(invoiceId) {
  const invoices = getInvoices();
  const inv = invoices.find((i) => i.id === invoiceId);
  if (!inv) return;

  const biz = getBusiness();

  invoiceViewBody.innerHTML = "";

  const header = document.createElement("div");
  header.className = "invoice-view-header";

  const bizBlock = document.createElement("div");
  bizBlock.className = "invoice-biz-block";
  const bizTitle = document.createElement("h2");
  bizTitle.textContent = biz.name || "Your Business";
  const ownerP = document.createElement("p");
  ownerP.textContent = biz.owner || "";
  const contactP = document.createElement("p");
  contactP.textContent = [biz.phone, biz.email].filter(Boolean).join(" · ");
  const addrP = document.createElement("p");
  addrP.textContent = biz.address || "";

  bizBlock.appendChild(bizTitle);
  if (ownerP.textContent) bizBlock.appendChild(ownerP);
  if (contactP.textContent) bizBlock.appendChild(contactP);
  if (addrP.textContent) bizBlock.appendChild(addrP);

  const rightBlock = document.createElement("div");
  rightBlock.style.display = "flex";
  rightBlock.style.flexDirection = "column";
  rightBlock.style.alignItems = "flex-end";
  rightBlock.style.gap = "0.4rem";

  if (biz.logoDataUrl) {
    const logoImg = document.createElement("img");
    logoImg.src = biz.logoDataUrl;
    logoImg.className = "invoice-logo";
    rightBlock.appendChild(logoImg);
  }

  const metaBlock = document.createElement("div");
  metaBlock.className = "invoice-meta-block";
  metaBlock.innerHTML = `
    <div><strong>Invoice #:</strong> ${inv.invoiceNumber}</div>
    <div><strong>Date:</strong> ${formatDate(inv.date)}</div>
    <div><strong>Due:</strong> ${formatDate(inv.dueDate)}</div>
    <div><strong>Total:</strong> ${formatMoney(inv.total)}</div>
  `;
  rightBlock.appendChild(metaBlock);

  header.appendChild(bizBlock);
  header.appendChild(rightBlock);
  invoiceViewBody.appendChild(header);

  const twoCol = document.createElement("div");
  twoCol.className = "invoice-two-col";

  const clientBlock = document.createElement("div");
  clientBlock.innerHTML = `
    <div><strong>Bill To:</strong></div>
    <div>${inv.clientName || ""}</div>
    <div>${(inv.clientAddress || "").replace(/\n/g, "<br>")}</div>
  `;

  const metaBlock2 = document.createElement("div");
  metaBlock2.innerHTML = `
    <div><strong>Created:</strong> ${formatDate(inv.createdAt)}</div>
  `;

  twoCol.appendChild(clientBlock);
  twoCol.appendChild(metaBlock2);
  invoiceViewBody.appendChild(twoCol);

  const table = document.createElement("table");
  table.className = "table";
  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>Description</th>
      <th>Qty</th>
      <th>Rate</th>
      <th>Total</th>
    </tr>
  `;
  const tbody = document.createElement("tbody");

  inv.items.forEach((item) => {
    const tr = document.createElement("tr");
    const tdDesc = document.createElement("td");
    tdDesc.textContent = item.description || "";
    const tdQty = document.createElement("td");
    tdQty.textContent = item.quantity;
    const tdRate = document.createElement("td");
    tdRate.textContent = formatMoney(item.rate);
    const tdTotal = document.createElement("td");
    tdTotal.textContent = formatMoney(item.total);
    tr.appendChild(tdDesc);
    tr.appendChild(tdQty);
    tr.appendChild(tdRate);
    tr.appendChild(tdTotal);
    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  invoiceViewBody.appendChild(table);

  const summary = document.createElement("div");
  summary.style.display = "flex";
  summary.style.justifyContent = "flex-end";
  summary.style.marginTop = "0.5rem";
  summary.style.fontSize = "0.9rem";

  const summaryInner = document.createElement("div");
  summaryInner.style.minWidth = "220px";
  summaryInner.innerHTML = `
    <div class="total-row"><span>Subtotal</span><span>${formatMoney(inv.subtotal)}</span></div>
    <div class="total-row"><span>Tax (${inv.taxPercent || 0}%)</span><span>${formatMoney(
    (inv.subtotal * (inv.taxPercent || 0)) / 100
  )}</span></div>
    <div class="total-row"><span>Discount</span><span>${formatMoney(inv.discount || 0)}</span></div>
    <div class="total-row total-row-strong"><span>Total</span><span>${formatMoney(
      inv.total
    )}</span></div>
  `;
  summary.appendChild(summaryInner);
  invoiceViewBody.appendChild(summary);

  if (inv.notes) {
    const notesBlock = document.createElement("div");
    notesBlock.className = "invoice-notes-block";
    notesBlock.innerHTML = `
      <strong>Notes</strong>
      <div>${inv.notes.replace(/\n/g, "<br>")}</div>
    `;
    invoiceViewBody.appendChild(notesBlock);
  }

  if (inv.photos && inv.photos.length) {
    const photosBlock = document.createElement("div");
    photosBlock.style.marginTop = "0.75rem";
    const title = document.createElement("strong");
    title.textContent = "Photos";
    photosBlock.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "invoice-photos-view";

    inv.photos.forEach((src) => {
      const img = document.createElement("img");
      img.src = src;
      img.style.width = "100%";
      img.style.borderRadius = "0.5rem";
      grid.appendChild(img);
    });

    photosBlock.appendChild(grid);
    invoiceViewBody.appendChild(photosBlock);
  }

  showModal();
}

// --------------------------
// BACKUP / RESTORE / STATS
// --------------------------
function handleBackup() {
  const business = getBusiness();
  const clients = getClients();
  const invoices = getInvoices();
  const settings = getSettings();
  const data = {
    business,
    clients,
    invoices,
    settings,
    exportedAt: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tradebase_backup.json";
  a.click();
  URL.revokeObjectURL(url);

  const settingsNew = { ...settings, lastBackup: new Date().toISOString() };
  saveSettings(settingsNew);
  backupMessage.classList.add("success");
  backupMessage.textContent = "Backup downloaded.";
  updateStats();
  setTimeout(() => (backupMessage.textContent = ""), 2000);
}

function handleRestore() {
  backupMessage.textContent = "";
  const file = restoreFileInput.files?.[0];
  if (!file) {
    backupMessage.textContent = "Select a backup file.";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || typeof data !== "object") throw new Error("Invalid backup file.");

      if (data.business) saveBusiness(data.business);
      if (data.clients) saveClients(data.clients);
      if (data.invoices) saveInvoices(data.invoices);
      if (data.settings) saveSettings(data.settings);

      backupMessage.classList.add("success");
      backupMessage.textContent = "Backup restored.";
      loadBusinessIntoForm();
      renderClientList();
      refreshInvoiceList();
      updateStats();
    } catch (err) {
      console.error("restore error", err);
      backupMessage.textContent = "Invalid backup file.";
    }
  };
  reader.readAsText(file);
}

function updateStats() {
  const invoices = getInvoices();
  const clients = getClients();
  const settings = getSettings();

  statTotalInvoices.textContent = invoices.length;
  statTotalClients.textContent = clients.length;
  if (settings.lastBackup) {
    statLastBackup.textContent = formatDate(settings.lastBackup);
  } else {
    statLastBackup.textContent = "Never";
  }
}

// --------------------------
// EVENT LISTENERS
// --------------------------
document.addEventListener("DOMContentLoaded", async () => {
  showAuthScreen("login");

  const { data } = await supabaseClient.auth.getUser();
  if (data && data.user) {
    currentUser = data.user;
    LS_PREFIX = `tradebase_${currentUser.id}`;
    currentUserEmailSpan.textContent = currentUser.email || "";
    await onAuthReady();
  } else {
    authWrapper.classList.remove("hidden");
  }

  goSignupBtn.addEventListener("click", () => showAuthScreen("signup"));
  goLoginFromSignupBtn.addEventListener("click", () => showAuthScreen("login"));
  goResetBtn.addEventListener("click", () => showAuthScreen("reset"));
  goLoginFromResetBtn.addEventListener("click", () => showAuthScreen("login"));

  loginBtn.addEventListener("click", (e) => {
    e.preventDefault();
    handleLogin();
  });

  signupBtn.addEventListener("click", (e) => {
    e.preventDefault();
    handleSignup();
  });

  resetBtn.addEventListener("click", (e) => {
    e.preventDefault();
    handleResetPassword();
  });

  logoutBtn.addEventListener("click", handleLogout);
  paywallLogoutBtn.addEventListener("click", handleLogout);

  planButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const planKey = btn.dataset.plan;
      startCheckout(planKey);
    });
  });
});