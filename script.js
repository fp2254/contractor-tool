// SERVICE WORKER REGISTRATION
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('ServiceWorker registered:', registration.scope);
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            if (confirm('New version available! Reload to update?')) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          }
        });
      });
    } catch (error) {
      console.error('ServiceWorker registration failed:', error);
    }
  });
}

// SUPABASE CLIENT
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// GLOBAL STATE
let currentUser = null;
let pendingPhotos = [];
let toastTimeout = null;
let tourMode = false;
let isOnline = navigator.onLine;
let isSyncing = false;
let isAdminUser = false;
let aiEnabled = false;

// TEMPLATE INIT
document.addEventListener('DOMContentLoaded', () => {
  // Language is initialized in languages.js DOMContentLoaded
  // Profile preferences will update language in onLoggedIn() if different
  setTemplate(currentTemplate);
});

// DEMO DATA FOR TOUR MODE
const DEMO_DATA = {
  profile: {
    business_name: "ABC Plumbing & Heating",
    address: "123 Main Street, Denver, CO 80202",
    phone: "(555) 123-4567",
    email: "contact@abcplumbing.com",
    tax_rate: 8.5,
    markup_rate: 25,
    logo_url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='80' viewBox='0 0 200 80'%3E%3Crect width='200' height='80' fill='%232563eb'/%3E%3Ctext x='100' y='45' font-family='Arial, sans-serif' font-size='24' font-weight='bold' fill='white' text-anchor='middle'%3EABC Plumbing%3C/text%3E%3C/svg%3E",
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
  },
  inventory: [
    {
      id: 1,
      name: "PVC Pipe 2\"",
      description: "Standard 2-inch PVC pipe for plumbing",
      quantity: 45,
      unit_price: 3.50,
      category: "Plumbing Supplies",
      unit_type: "linft",
      low_stock_threshold: 50,
      created_at: "2025-11-01T10:00:00Z"
    },
    {
      id: 2,
      name: "Copper Fittings Assorted",
      description: "1/2\" and 3/4\" elbows, tees, couplings",
      quantity: 8,
      unit_price: 12.00,
      category: "Plumbing Supplies",
      unit_type: "box",
      low_stock_threshold: 10,
      created_at: "2025-11-02T10:00:00Z"
    },
    {
      id: 3,
      name: "Water Heater 50gal",
      description: "Standard 50-gallon residential water heater",
      quantity: 2,
      unit_price: 550.00,
      category: "Major Appliances",
      unit_type: "each",
      low_stock_threshold: 3,
      created_at: "2025-11-03T10:00:00Z"
    },
    {
      id: 4,
      name: "Teflon Tape",
      description: "Thread seal tape for pipe fittings",
      quantity: 24,
      unit_price: 0.75,
      category: "Small Parts",
      unit_type: "roll",
      low_stock_threshold: 15,
      created_at: "2025-11-04T10:00:00Z"
    },
    {
      id: 5,
      name: "Drain Cleaner Pro",
      description: "Heavy-duty enzymatic drain cleaner",
      quantity: 6,
      unit_price: 18.50,
      category: "Chemicals",
      unit_type: "gallon",
      low_stock_threshold: 12,
      created_at: "2025-11-05T10:00:00Z"
    },
    {
      id: 6,
      name: "Sink Strainer Baskets",
      description: "Stainless steel kitchen sink strainers",
      quantity: 15,
      unit_price: 8.25,
      category: "Kitchen Parts",
      unit_type: "each",
      low_stock_threshold: 5,
      created_at: "2025-11-06T10:00:00Z"
    },
    {
      id: 7,
      name: "Flexible Supply Lines",
      description: "Braided stainless steel water supply lines",
      quantity: 32,
      unit_price: 6.00,
      category: "Plumbing Supplies",
      unit_type: "each",
      low_stock_threshold: 20,
      created_at: "2025-11-07T10:00:00Z"
    },
    {
      id: 8,
      name: "Solder Wire 95/5",
      description: "Lead-free solder for copper fittings",
      quantity: 3,
      unit_price: 22.00,
      category: "Tools & Materials",
      unit_type: "lb",
      low_stock_threshold: 5,
      created_at: "2025-11-08T10:00:00Z"
    },
    {
      id: 9,
      name: "Toilet Wax Rings",
      description: "Standard toilet wax ring seals with bolts",
      quantity: 18,
      unit_price: 3.25,
      category: "Bathroom Parts",
      unit_type: "each",
      low_stock_threshold: 10,
      created_at: "2025-11-09T10:00:00Z"
    },
    {
      id: 10,
      name: "Pipe Insulation Foam",
      description: "3/4\" foam pipe insulation tubes",
      quantity: 28,
      unit_price: 2.50,
      category: "Insulation",
      unit_type: "linft",
      low_stock_threshold: 25,
      created_at: "2025-11-10T10:00:00Z"
    }
  ]
};

// BASIC REF PARSING (store ?ref= in localStorage for future)
(function storeRefFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  if (ref) {
    localStorage.setItem("tb_referrer_code", ref);
  }
})();

// OFFLINE HELPERS
function generateOfflineId() {
  return 'offline_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function isOfflineId(id) {
  return typeof id === 'string' && id.startsWith('offline_');
}

async function saveOffline(storeName, data, endpoint, method = 'POST') {
  if (!currentUser) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) {
      throw new Error('Not authenticated');
    }
    currentUser = session.user;
  }
  
  data.user_id = currentUser.id;
  
  if (storeName === 'invoices') {
    await tradebaseDB.saveInvoice(data);
  } else if (storeName === 'quotes') {
    await tradebaseDB.saveQuote(data);
  } else if (storeName === 'clients') {
    await tradebaseDB.saveClient(data);
  } else if (storeName === 'inventory') {
    await tradebaseDB.saveInventory(data);
  }
  
  await tradebaseDB.addToSyncQueue({
    endpoint,
    method,
    data,
    storeName,
    localId: data.id
  });
}

// OFFLINE/SYNC SYSTEM
async function initializeOfflineSupport() {
  try {
    await tradebaseDB.init();
    console.log('IndexedDB initialized');
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if (navigator.serviceWorker?.addEventListener) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SYNC_REQUESTED') {
          syncPendingChanges();
        }
      });
    }
    
    updateOnlineStatus();
    
    if (navigator.onLine) {
      syncPendingChanges();
    }
  } catch (error) {
    console.error('Failed to initialize offline support:', error);
  }
}

function handleOnline() {
  isOnline = true;
  updateOnlineStatus();
  syncPendingChanges();
}

function handleOffline() {
  isOnline = false;
  updateOnlineStatus();
}

function updateOnlineStatus() {
  const indicator = document.getElementById('online-status-indicator');
  if (!indicator) return;
  
  if (isOnline) {
    indicator.innerHTML = '<i class="fas fa-wifi"></i> Online';
    indicator.className = 'online-status online';
  } else {
    indicator.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline';
    indicator.className = 'online-status offline';
  }
  
  if (isSyncing) {
    indicator.innerHTML = '<i class="fas fa-sync fa-spin"></i> Syncing...';
    indicator.className = 'online-status syncing';
  }
}

async function syncPendingChanges() {
  if (!isOnline || isSyncing) return;
  
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) {
    console.log('No session, skipping sync');
    return;
  }
  
  try {
    isSyncing = true;
    updateOnlineStatus();
    
    const pending = await tradebaseDB.getPendingSyncs();
    console.log(`Syncing ${pending.length} pending changes...`);
    
    let failedCount = 0;
    let syncedCount = 0;
    
    for (const item of pending) {
      try {
        let payload = { ...item.data };
        
        if (item.method === 'POST') {
          delete payload.id;
          delete payload.user_id;
          delete payload.created_at;
          delete payload.updated_at;
        }
        
        const response = await apiFetch(item.endpoint, {
          method: item.method,
          body: JSON.stringify(payload)
        });
        
        if (response.ok) {
          let serverData = null;
          
          if (response.status !== 204 && response.headers.get('content-length') !== '0') {
            try {
              serverData = await response.json();
            } catch (e) {
              console.log('No JSON body in response');
            }
          }
          
          if (item.method === 'POST' && item.localId && isOfflineId(item.localId) && serverData?.id) {
            await tradebaseDB.delete(item.storeName, item.localId);
            
            const updatedData = { ...item.data, id: serverData.id, ...serverData };
            
            if (item.storeName === 'invoices') {
              await tradebaseDB.saveInvoice(updatedData);
            } else if (item.storeName === 'quotes') {
              await tradebaseDB.saveQuote(updatedData);
            } else if (item.storeName === 'clients') {
              await tradebaseDB.saveClient(updatedData);
            } else if (item.storeName === 'inventory') {
              await tradebaseDB.saveInventory(updatedData);
            }
          }
          
          await tradebaseDB.markSyncComplete(item.id);
          syncedCount++;
        } else {
          await tradebaseDB.markSyncFailed(item.id, `HTTP ${response.status}`);
          failedCount++;
        }
      } catch (error) {
        await tradebaseDB.markSyncFailed(item.id, error.message);
        failedCount++;
      }
    }
    
    await tradebaseDB.clearCompletedSyncs();
    
    if (failedCount > 0) {
      showToast(`⚠️ ${failedCount} change(s) failed to sync. Will retry later.`, 'error');
    } else if (syncedCount > 0) {
      showToast(`✓ ${syncedCount} change(s) synced successfully`, 'success');
    }
    
    console.log('Sync complete');
  } catch (error) {
    console.error('Sync failed:', error);
    showToast('⚠️ Sync failed. Will retry when online.', 'error');
  } finally {
    isSyncing = false;
    updateOnlineStatus();
  }
}

document.addEventListener("DOMContentLoaded", async () => {
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
  wireJobsUI();
  wireNotificationsUI();
  wireVoiceRecording();
  wireTourMode();
  wirePlansModal();
  wireAIDoAllMenu();
  wireAdminPanel();
  
  // Check tour mode and session - these will update language if needed
  checkTourMode();
  await checkSession();
  
  updateTrialBanner();
  await initializeOfflineSupport();
  
  // Wire up template chooser modal close button
  const closeTemplateChooserBtn = document.getElementById("close-template-chooser");
  if (closeTemplateChooserBtn) {
    closeTemplateChooserBtn.addEventListener("click", closeTemplateChooser);
  }
  
  // Close template chooser when clicking outside
  const templateChooserModal = document.getElementById("template-chooser-modal");
  if (templateChooserModal) {
    templateChooserModal.addEventListener("click", (e) => {
      if (e.target === templateChooserModal) {
        closeTemplateChooser();
      }
    });
  }
  
  // Wire up email invoice modal close buttons
  const closeEmailModalBtn = document.getElementById("close-email-modal");
  const cancelEmailModalBtn = document.getElementById("cancel-email-modal");
  if (closeEmailModalBtn) {
    closeEmailModalBtn.addEventListener("click", closeEmailInvoiceModal);
  }
  if (cancelEmailModalBtn) {
    cancelEmailModalBtn.addEventListener("click", closeEmailInvoiceModal);
  }
  
  // Close email modal when clicking outside
  const emailInvoiceModal = document.getElementById("email-invoice-modal");
  if (emailInvoiceModal) {
    emailInvoiceModal.addEventListener("click", (e) => {
      if (e.target === emailInvoiceModal) {
        closeEmailInvoiceModal();
      }
    });
  }
  
  // Wire up email invoice form submission
  const emailInvoiceForm = document.getElementById("email-invoice-form");
  if (emailInvoiceForm) {
    emailInvoiceForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      if (tourMode) {
        showToast(t('tour.email_disabled'));
        return;
      }
      
      const invoiceId = emailInvoiceForm.getAttribute('data-invoice-id');
      const recipientEmail = document.getElementById('email-recipient-email').value;
      const recipientName = document.getElementById('email-recipient-name').value;
      
      if (invoiceId && recipientEmail && recipientName) {
        await sendInvoiceEmail(invoiceId, recipientEmail, recipientName);
      }
    });
  }
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
  const tryDemoBtn = document.getElementById("btn-try-demo");
  const exitTourBtn = document.getElementById("btn-exit-tour");
  
  if (takeTourBtn) {
    takeTourBtn.addEventListener("click", enterTourMode);
  }
  
  if (tryDemoBtn) {
    tryDemoBtn.addEventListener("click", enterTourMode);
  }
  
  if (exitTourBtn) {
    exitTourBtn.addEventListener("click", exitTourMode);
  }
}

function wirePlansModal() {
  const viewPlansBtn = document.getElementById("btn-view-all-plans");
  const closePlansBtn = document.getElementById("close-plans-modal");
  const plansModal = document.getElementById("plans-modal");
  
  if (viewPlansBtn) {
    viewPlansBtn.addEventListener("click", () => {
      plansModal.classList.add("active");
    });
  }
  
  if (closePlansBtn) {
    closePlansBtn.addEventListener("click", () => {
      plansModal.classList.remove("active");
    });
  }
  
  if (plansModal) {
    plansModal.addEventListener("click", (e) => {
      if (e.target === plansModal) {
        plansModal.classList.remove("active");
      }
    });
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
    
    // Set language and update picker
    setLanguage(currentLanguage);
    updateLanguagePickerValue();
    
    loadDemoData();
    checkAIStatus();
    renderTemplateShowcase();
    showScreen("dashboard");
  }
}

function enterTourMode() {
  tourMode = true;
  sessionStorage.setItem("tb_tour_mode", "true");
  renderTemplateShowcase();
  
  document.getElementById("auth-container").classList.add("hidden");
  document.getElementById("app-container").classList.remove("hidden");
  document.getElementById("tour-banner").classList.remove("hidden");
  document.getElementById("trial-banner").classList.add("hidden");
  document.getElementById("btn-logout").classList.add("hidden");
  document.getElementById("screen-container").classList.add("tour-mode");
  
  // Set language and update picker
  setLanguage(currentLanguage);
  updateLanguagePickerValue();
  
  loadDemoData();
  checkAIStatus();
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

function showDemoVoiceNote() {
  const btnRecord = document.getElementById("btn-record-voice");
  const btnStop = document.getElementById("btn-stop-voice");
  const btnCancel = document.getElementById("btn-cancel-voice");
  const timer = document.getElementById("voice-timer");
  
  if (!btnRecord) return;
  
  btnRecord.classList.add("hidden");
  btnStop.classList.remove("hidden");
  btnCancel.classList.remove("hidden");
  timer.style.display = "inline";
  timer.textContent = "0:00";
  
  showToast("🎤 Demo: Recording voice note...");
  
  let seconds = 0;
  const interval = setInterval(() => {
    seconds++;
    timer.textContent = `0:${seconds.toString().padStart(2, '0')}`;
    if (seconds >= 3) {
      clearInterval(interval);
      btnRecord.classList.remove("hidden");
      btnStop.classList.add("hidden");
      btnCancel.classList.add("hidden");
      timer.style.display = "none";
      showToast("🎉 Demo: Voice note saved! Sign up to use voice notes in your jobs.");
    }
  }, 1000);
}

function showDemoFormVoice(formType) {
  const btn = document.getElementById(`btn-${formType}-voice`);
  if (!btn) return;
  
  const originalText = btn.textContent;
  const originalBg = btn.style.backgroundColor;
  
  btn.textContent = "⏹ Recording...";
  btn.style.backgroundColor = "#ef4444";
  
  showToast("🎤 Demo: 'Quote for Smith Electric, panel upgrade at 456 Oak Ave, $1200'");
  
  setTimeout(() => {
    btn.textContent = "🔄 Parsing...";
    btn.style.backgroundColor = "#f59e0b";
    showToast("🔄 Demo: AI transcribing and parsing your voice...");
  }, 2000);
  
  setTimeout(() => {
    btn.textContent = originalText;
    btn.style.backgroundColor = originalBg;
    
    if (formType === 'quote') {
      document.getElementById("quote-client-name").value = "Smith Electric";
      document.getElementById("quote-notes").value = "Panel upgrade at 456 Oak Ave";
      showToast("✅ Demo: Form filled! Client: Smith Electric, Amount: $1,200");
    } else if (formType === 'invoice') {
      document.getElementById("invoice-client-name").value = "Smith Electric";
      document.getElementById("invoice-notes").value = "Panel upgrade completed at 456 Oak Ave";
      showToast("✅ Demo: Form filled! Client: Smith Electric, Amount: $1,200");
    }
  }, 4000);
}

function showDemoAIVoiceQuote() {
  showToast("🎤 Demo: Recording voice... 'Quote for John Smith, electrical work at 123 Main St, $850'");
  
  setTimeout(() => {
    showToast("🔄 Demo: AI transcribing audio with Whisper...");
  }, 2000);
  
  setTimeout(() => {
    showToast("✅ Demo: Quote created for John Smith - $850 electrical work!");
    
    const demoQuote = {
      id: "demo-ai-" + Date.now(),
      quote_number: "Q-AI-001",
      client_name: "John Smith",
      quote_date: new Date().toISOString().split('T')[0],
      status: "draft",
      subtotal: 850.00,
      tax: 72.25,
      total: 922.25,
      notes: "Electrical panel upgrade - Created via AI Voice Quote",
      items: [
        { description: "Electrical panel upgrade", quantity: 1, unit_price: 650, total: 650 },
        { description: "Labor (2 hours)", quantity: 2, unit_price: 100, total: 200 }
      ]
    };
    
    viewDemoQuoteDetail(demoQuote);
    showToast("🎉 This is how Voice Quote Creator works! Sign up to try it yourself.");
  }, 6000);
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
  
  renderDashboardStats(DEMO_DATA.invoices);
  applyLanguage(); // Apply translations to stat labels
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
      <button class="btn-convert-quote" disabled style="opacity: 0.6;">
        <i class="fa-solid fa-file-invoice"></i> <span data-i18n="quote.convert_to_invoice">Convert to Invoice</span>
      </button>
      <button class="btn-sm" id="share-demo-quote-btn">
        <i class="fa-solid fa-share-nodes"></i> Send Quote
      </button>
      <button class="btn-sm" onclick="showScreen('quotes')">
        <i class="fa-solid fa-arrow-left"></i> Back to List
      </button>
    </div>
  `;
  
  setTimeout(() => {
    document.getElementById('share-demo-quote-btn')?.addEventListener('click', () => shareQuote(quote));
    applyLanguage();
  }, 0);
  
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
  
  // Set language selector
  const langSelect = document.getElementById("settings-language");
  if (langSelect) langSelect.value = currentLanguage;
  
  // Set template selector
  const templateSelect = document.getElementById("settings-template");
  if (templateSelect) templateSelect.value = currentTemplate;
  
  if (DEMO_DATA.profile.stripe_connect_enabled) {
    const statusCard = document.getElementById("payment-collection-status");
    if (statusCard) statusCard.classList.remove("hidden");
  }
}

async function previewTemplateInModal(templateId) {
  const modal = document.getElementById("template-preview-modal");
  const content = document.getElementById("template-preview-content");
  const closeBtn = document.getElementById("close-template-preview");
  
  if (!modal || !content) return;
  
  const originalTemplate = currentTemplate;
  setTemplate(templateId);
  
  let logoUrl = DEMO_DATA.profile.logo_url;
  
  if (!tourMode && currentUser) {
    try {
      const res = await apiFetch("/api/profile");
      if (res.ok) {
        const profile = await res.json();
        if (profile.logo_url) {
          logoUrl = profile.logo_url;
        }
      }
    } catch (err) {
      console.log("Could not load user logo for preview");
    }
  }
  
  const sampleInvoice = {
    ...DEMO_DATA.invoices[0],
    business_name: DEMO_DATA.profile.business_name,
    address: DEMO_DATA.profile.address,
    phone: DEMO_DATA.profile.phone,
    email: DEMO_DATA.profile.email,
    logo_url: logoUrl,
    invoice_footer: "Thank you for your business!"
  };
  
  const tempDiv = document.createElement('div');
  tempDiv.id = 'temp-invoice-render';
  tempDiv.style.cssText = 'position: absolute; left: -9999px;';
  document.body.appendChild(tempDiv);
  
  if (currentTemplate === 'basic_clean') {
    tempDiv.innerHTML = renderBasicClean(sampleInvoice, 'INVOICE', 'number', 'date');
  } else if (currentTemplate === 'modern_pro') {
    tempDiv.innerHTML = renderModernPro(sampleInvoice, 'INVOICE', 'number', 'date');
  } else if (currentTemplate === 'color_accent') {
    tempDiv.innerHTML = renderColorAccent(sampleInvoice, 'INVOICE', 'number', 'date');
  } else if (currentTemplate === 'big_total') {
    tempDiv.innerHTML = renderBigTotal(sampleInvoice, 'INVOICE', 'number', 'date');
  }
  
  content.innerHTML = tempDiv.innerHTML;
  document.body.removeChild(tempDiv);
  
  modal.style.display = 'block';
  
  setTemplate(originalTemplate);
  
  const closeModal = () => {
    modal.style.display = 'none';
    closeBtn.removeEventListener('click', closeModal);
    modal.removeEventListener('click', handleOutsideClick);
  };
  
  const handleOutsideClick = (e) => {
    if (e.target === modal) {
      closeModal();
    }
  };
  
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', handleOutsideClick);
}

function renderTemplateShowcase() {
  const container = document.getElementById("screen-dashboard");
  if (!container) return;
  
  const showcase = document.createElement("div");
  showcase.style.cssText = "margin: 30px 0; padding: 20px; border-top: 2px solid var(--border); border-bottom: 2px solid var(--border); background: var(--card);";
  showcase.innerHTML = `
    <h3 style="margin-top: 0; margin-bottom: 15px;">📄 Invoice Templates - Click to Preview</h3>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 15px;">
      <div style="padding: 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.1)';" onmouseout="this.style.transform=''; this.style.boxShadow='';" onclick="previewTemplateInModal('basic_clean');">
        <strong>Basic Clean</strong>
        <p style="font-size: 12px; color: var(--muted); margin: 5px 0 0 0;">Black & white classic</p>
      </div>
      <div style="padding: 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.1)';" onmouseout="this.style.transform=''; this.style.boxShadow='';" onclick="previewTemplateInModal('modern_pro');">
        <strong>Modern Pro</strong>
        <p style="font-size: 12px; color: var(--muted); margin: 5px 0 0 0;">Bold headers, clean</p>
      </div>
      <div style="padding: 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.1)';" onmouseout="this.style.transform=''; this.style.boxShadow='';" onclick="previewTemplateInModal('color_accent');">
        <strong>Color Accent</strong>
        <p style="font-size: 12px; color: var(--muted); margin: 5px 0 0 0;">Blue official header</p>
      </div>
      <div style="padding: 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.1)';" onmouseout="this.style.transform=''; this.style.boxShadow='';" onclick="previewTemplateInModal('big_total');">
        <strong>Big Total</strong>
        <p style="font-size: 12px; color: var(--muted); margin: 5px 0 0 0;">Emphasizes total</p>
      </div>
    </div>
  `;
  
  const dashboardTiles = container.querySelector(".tile-grid");
  if (dashboardTiles && !document.getElementById("template-showcase")) {
    showcase.id = "template-showcase";
    dashboardTiles.insertAdjacentElement("afterend", showcase);
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
  
  // Forgot password handler
  const forgotPasswordLink = document.getElementById("forgot-password-link");
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", async (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email").value.trim();
      const errorEl = document.getElementById("login-error");
      
      if (!email) {
        errorEl.textContent = "Please enter your email address first";
        return;
      }
      
      try {
        const { error } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/app"
        });
        
        if (error) {
          errorEl.textContent = error.message;
        } else {
          errorEl.style.color = "var(--success)";
          errorEl.textContent = "Password reset email sent! Check your inbox.";
          setTimeout(() => {
            errorEl.style.color = "";
            errorEl.textContent = "";
          }, 5000);
        }
      } catch (err) {
        console.error("Password reset error:", err);
        errorEl.textContent = "Failed to send reset email";
      }
    });
  }
  
  // Language selector on auth screen
  const langSelect = document.getElementById("auth-language-select");
  if (langSelect) {
    langSelect.value = currentLanguage;
    langSelect.addEventListener("change", (e) => {
      setLanguage(e.target.value);
      applyLanguage();
    });
  }
  
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
  
  // Terms of Service modal handlers
  const showTosLink = document.getElementById("show-tos-link");
  const tosModal = document.getElementById("tos-modal");
  const closeTosModal = document.getElementById("close-tos-modal");
  const acceptTosBtn = document.getElementById("accept-tos-btn");
  
  if (showTosLink && tosModal) {
    showTosLink.addEventListener("click", (e) => {
      e.preventDefault();
      tosModal.style.display = "block";
      document.body.style.overflow = "hidden";
    });
  }
  
  if (closeTosModal && tosModal) {
    closeTosModal.addEventListener("click", () => {
      tosModal.style.display = "none";
      document.body.style.overflow = "";
    });
  }
  
  if (acceptTosBtn && tosModal) {
    acceptTosBtn.addEventListener("click", () => {
      tosModal.style.display = "none";
      document.body.style.overflow = "";
      // Auto-check the TOS checkbox
      const tosCheckbox = document.getElementById("signup-tos");
      if (tosCheckbox) tosCheckbox.checked = true;
    });
  }
  
  // Close TOS modal when clicking outside
  if (tosModal) {
    tosModal.addEventListener("click", (e) => {
      if (e.target === tosModal) {
        tosModal.style.display = "none";
        document.body.style.overflow = "";
      }
    });
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  const tradeType = document.getElementById("signup-trade")?.value || '';
  const tosChecked = document.getElementById("signup-tos")?.checked;
  const errorEl = document.getElementById("signup-error");
  errorEl.textContent = "";

  // Validate trade selection
  if (!tradeType) {
    errorEl.textContent = "Please select your trade.";
    return;
  }

  // Validate TOS acceptance
  if (!tosChecked) {
    errorEl.textContent = "Please agree to the Terms of Service.";
    return;
  }

  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) {
    errorEl.textContent = error.message;
    return;
  }

  // Save trade type to profile after signup
  if (data && data.user && data.user.id) {
    try {
      // Store trade type in profile
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          trade_type: tradeType,
          tos_accepted_at: new Date().toISOString()
        })
      });
    } catch (err) {
      console.error("Error saving trade type:", err);
    }
    
    // Send confirmation email via Resend
    try {
      const res = await fetch("/api/send-signup-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, userId: data.user.id })
      });
      if (!res.ok) {
        console.warn("Failed to send confirmation email via Resend");
      }
    } catch (err) {
      console.error("Error sending confirmation email:", err);
    }
  }

  // Sign out immediately to prevent auto-login before email confirmation
  await sb.auth.signOut();
  
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
    // User has a valid session - log them in
    // email_confirmed_at being set means they confirmed their email
    currentUser = data.user;
    await onLoggedIn();
  }
}

async function onLoggedIn() {
  document.getElementById("auth-container").classList.add("hidden");
  document.getElementById("app-container").classList.remove("hidden");
  
  // Load user preferences
  try {
    const res = await apiFetch("/api/profile");
    if (res.ok) {
      const profile = await res.json();
      if (profile?.preferred_language && profile.preferred_language !== currentLanguage) {
        setLanguage(profile.preferred_language);
      }
      if (profile?.preferred_template && profile.preferred_template !== currentTemplate) {
        setTemplate(profile.preferred_template);
      }
    }
  } catch (err) {
    console.error("Error loading preferences:", err);
  }
  
  // Update language picker to show current language
  updateLanguagePickerValue();
  
  // Check admin and AI status BEFORE loading data (so tiles render correctly)
  await checkAdminStatus();
  await checkAIStatus();
  
  await loadInitialData();
  await updateTrialBanner();
  wireSubscriptionUI();
  applyLanguage();
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
        } else if (screen === "quotes") {
          loadQuotes();
        } else if (screen === "invoices") {
          loadInvoices();
        } else if (screen === "admin") {
          loadAdminUsers();
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
  
  // Language selector in app header
  const appLangSelect = document.getElementById("app-language-select");
  if (appLangSelect) {
    // Don't set value here - it will be set in onLoggedIn/tour mode functions
    appLangSelect.addEventListener("change", (e) => {
      setLanguage(e.target.value);
      // Save preference to profile (also updates dropdown value)
      saveLanguagePreference(e.target.value);
    });
  }
}

function updateLanguagePickerValue() {
  const appLangSelect = document.getElementById("app-language-select");
  if (appLangSelect && currentLanguage) {
    appLangSelect.value = currentLanguage;
  }
}

async function saveLanguagePreference(lang) {
  if (tourMode) return;
  try {
    // Only send the language field - upsert will merge with existing data
    await apiFetch("/api/profile", {
      method: "POST",
      body: JSON.stringify({ preferred_language: lang }),
    });
  } catch (err) {
    console.error("Failed to save language preference:", err);
  }
}

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((s) =>
    s.classList.remove("active")
  );
  const el = document.getElementById(`screen-${screenId}`);
  if (el) el.classList.add("active");
  
  // Apply translations when switching screens to ensure all text is in correct language
  applyLanguage();
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
    <input type="text" class="li-desc" placeholder="${t('invoice.line_description_placeholder')}" value="${item.description}" />
    <input type="number" class="li-qty" min="0" step="0.1" value="${item.qty}" placeholder="${t('invoice.line_qty_placeholder')}" />
    <input type="number" class="li-price" min="0" step="0.01" value="${item.price}" placeholder="${t('invoice.line_price_placeholder')}" />
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
  const template = document.getElementById("invoice-template-select").value || "basic_clean";
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

  const invoiceData = {
    client_id: null,
    client_name: clientName,
    date,
    notes,
    template,
    subtotal,
    tax,
    total,
    items,
    status: 'draft',
    payment_status: 'unpaid',
    created_at: new Date().toISOString()
  };

  try {
    if (!navigator.onLine) {
      const offlineId = generateOfflineId();
      invoiceData.id = offlineId;
      invoiceData.number = `INV-${Date.now()}`;
      
      await saveOffline('invoices', invoiceData, '/api/invoices', 'POST');
      
      showToast("📱 Invoice saved offline. Will sync when online.");
      await loadInvoices();
      showScreen("invoices");
      
      pendingPhotos = [];
      document.getElementById("photo-preview").innerHTML = "";
      document.getElementById("invoice-photos").value = "";
      return;
    }

    const res = await apiFetch("/api/invoices", {
      method: "POST",
      body: JSON.stringify(invoiceData),
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || "Failed to save invoice.";
      return;
    }

    const invoiceId = data.id;
    
    invoiceData.id = invoiceId;
    invoiceData.number = data.number;
    await tradebaseDB.saveInvoice(invoiceData);

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
    console.error("Invoice save error:", err);
    errorEl.textContent = "Error saving invoice: " + (err.message || err);
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

  const clientData = {
    name,
    phone,
    email,
    address,
    created_at: new Date().toISOString()
  };

  try {
    if (!navigator.onLine) {
      clientData.id = generateOfflineId();
      await saveOffline('clients', clientData, '/api/clients', 'POST');
      showToast("📱 Client saved offline. Will sync when online.");
      document.getElementById("client-form").reset();
      await loadClients();
      return;
    }

    const res = await apiFetch("/api/clients", {
      method: "POST",
      body: JSON.stringify(clientData),
    });
    
    if (res.ok) {
      const data = await res.json();
      clientData.id = data.id;
      await tradebaseDB.saveClient(clientData);
      showToast("Client added!");
    }

    document.getElementById("client-form").reset();
    await loadClients();
  } catch (error) {
    console.error('Error adding client:', error);
    showToast('Error adding client', 'error');
  }
}

async function loadClients() {
  if (tourMode) return;
  
  const list = document.getElementById("clients-list");
  const invoiceDatalist = document.getElementById("client-datalist");
  const quoteDatalist = document.getElementById("quote-client-datalist");
  
  list.innerHTML = "";
  if (invoiceDatalist) invoiceDatalist.innerHTML = "";
  if (quoteDatalist) quoteDatalist.innerHTML = "";

  let clients = [];
  
  if (!currentUser) {
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) {
      currentUser = session.user;
    }
  }
  
  if (currentUser) {
    const localClients = await tradebaseDB.getClients(currentUser.id);
    clients = localClients || [];
  }
  
  if (navigator.onLine) {
    try {
      const res = await apiFetch("/api/clients");
      const apiClients = await res.json();
      
      if (apiClients && Array.isArray(apiClients)) {
        for (const client of apiClients) {
          await tradebaseDB.saveClient(client);
        }
        
        const mergedMap = new Map();
        apiClients.forEach(client => mergedMap.set(client.id, client));
        clients.forEach(client => {
          if (!mergedMap.has(client.id)) {
            mergedMap.set(client.id, client);
          }
        });
        clients = Array.from(mergedMap.values());
      }
    } catch (error) {
      console.log('Using offline clients:', error.message);
    }
  }

  clients.forEach((c) => {
    const item = document.createElement("div");
    item.className = "list-item";
    
    const isOffline = isOfflineId(c.id);
    const offlineBadge = isOffline ? '<span style="font-size: 11px; color: var(--warning);">📱</span>' : '';
    
    item.innerHTML = `
      <div class="list-item-header">
        <strong>${c.name}${offlineBadge}</strong>
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
  });
}

// INVOICES & ESTIMATES LISTS

let currentInvoiceTab = 'active';
let currentQuoteTab = 'active';

function switchInvoiceTab(tab) {
  currentInvoiceTab = tab;
  document.getElementById('tab-invoices-active').classList.toggle('active', tab === 'active');
  document.getElementById('tab-invoices-archived').classList.toggle('active', tab === 'archived');
  loadInvoices(tab === 'archived');
}

function switchQuoteTab(tab) {
  currentQuoteTab = tab;
  document.getElementById('tab-quotes-active').classList.toggle('active', tab === 'active');
  document.getElementById('tab-quotes-archived').classList.toggle('active', tab === 'archived');
  loadQuotes(tab === 'archived');
}

async function archiveInvoice(invoiceId) {
  try {
    const res = await apiFetch(`/api/invoices/${invoiceId}/archive`, { method: 'POST' });
    if (res.ok) {
      showToast('Invoice archived');
      loadInvoices(currentInvoiceTab === 'archived');
      showScreen('invoices');
    } else {
      showToast('Failed to archive invoice');
    }
  } catch (err) {
    console.error('Error archiving invoice:', err);
    showToast('Failed to archive invoice');
  }
}

async function unarchiveInvoice(invoiceId) {
  try {
    const res = await apiFetch(`/api/invoices/${invoiceId}/unarchive`, { method: 'POST' });
    if (res.ok) {
      showToast('Invoice restored');
      loadInvoices(true);
    } else {
      showToast('Failed to restore invoice');
    }
  } catch (err) {
    console.error('Error unarchiving invoice:', err);
    showToast('Failed to restore invoice');
  }
}

async function deleteInvoice(invoiceId) {
  if (!confirm('Are you sure you want to permanently delete this invoice? This cannot be undone.')) {
    return;
  }
  try {
    const res = await apiFetch(`/api/invoices/${invoiceId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Invoice deleted');
      loadInvoices(true);
    } else {
      showToast('Failed to delete invoice');
    }
  } catch (err) {
    console.error('Error deleting invoice:', err);
    showToast('Failed to delete invoice');
  }
}

async function archiveQuote(quoteId) {
  try {
    const res = await apiFetch(`/api/quotes/${quoteId}/archive`, { method: 'POST' });
    if (res.ok) {
      showToast('Quote archived');
      loadQuotes(currentQuoteTab === 'archived');
      showScreen('quotes');
    } else {
      showToast('Failed to archive quote');
    }
  } catch (err) {
    console.error('Error archiving quote:', err);
    showToast('Failed to archive quote');
  }
}

async function unarchiveQuote(quoteId) {
  try {
    const res = await apiFetch(`/api/quotes/${quoteId}/unarchive`, { method: 'POST' });
    if (res.ok) {
      showToast('Quote restored');
      loadQuotes(true);
    } else {
      showToast('Failed to restore quote');
    }
  } catch (err) {
    console.error('Error unarchiving quote:', err);
    showToast('Failed to restore quote');
  }
}

async function deleteQuote(quoteId) {
  if (!confirm('Are you sure you want to permanently delete this quote? This cannot be undone.')) {
    return;
  }
  try {
    const res = await apiFetch(`/api/quotes/${quoteId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Quote deleted');
      loadQuotes(true);
    } else {
      showToast('Failed to delete quote');
    }
  } catch (err) {
    console.error('Error deleting quote:', err);
    showToast('Failed to delete quote');
  }
}

async function loadInvoices(showArchived = false) {
  if (tourMode) return;
  
  const list = document.getElementById("invoices-list");
  list.innerHTML = "";
  
  let invoices = [];
  
  if (!currentUser) {
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) {
      currentUser = session.user;
    }
  }
  
  if (currentUser && !showArchived) {
    const localInvoices = await tradebaseDB.getInvoices(currentUser.id);
    invoices = localInvoices || [];
  }
  
  if (navigator.onLine) {
    try {
      const url = showArchived ? "/api/invoices?archived=true" : "/api/invoices";
      const res = await apiFetch(url);
      const apiInvoices = await res.json();
      
      if (apiInvoices && Array.isArray(apiInvoices)) {
        if (!showArchived) {
          for (const inv of apiInvoices) {
            await tradebaseDB.saveInvoice(inv);
          }
          
          const mergedMap = new Map();
          apiInvoices.forEach(inv => mergedMap.set(inv.id, inv));
          invoices.forEach(inv => {
            if (!mergedMap.has(inv.id)) {
              mergedMap.set(inv.id, inv);
            }
          });
          invoices = Array.from(mergedMap.values());
        } else {
          invoices = apiInvoices;
        }
      }
    } catch (error) {
      console.log('Using offline invoices:', error.message);
    }
  }

  invoices.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  if (!invoices.length) {
    list.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--muted);">
      ${showArchived ? 'No archived invoices' : 'No invoices yet. Create one to get started!'}
    </div>`;
    if (!showArchived) renderDashboardStats([]);
    return;
  }

  invoices.forEach((inv) => {
    const item = document.createElement("div");
    item.className = "list-item clickable";
    item.style.cursor = "pointer";
    
    const isOffline = isOfflineId(inv.id);
    const offlineBadge = isOffline ? '<span style="font-size: 11px; color: var(--warning); margin-left: 4px;">📱 Offline</span>' : '';
    
    if (showArchived) {
      item.innerHTML = `
        <div class="list-item-header">
          <strong>Invoice #${inv.number || inv.id}</strong>
          <span>${formatCurrency(inv.total || 0)}</span>
        </div>
        <div class="list-item-sub">${inv.client_name || ""}</div>
        <div class="list-item-sub">${inv.date || ""} • ${inv.status || "draft"}</div>
        <div style="display: flex; gap: 8px; margin-top: 8px;">
          <button class="btn-sm" onclick="event.stopPropagation(); unarchiveInvoice('${inv.id}')">
            <i class="fa-solid fa-box-open"></i> Restore
          </button>
          <button class="btn-sm" style="background: var(--danger); color: white;" onclick="event.stopPropagation(); deleteInvoice('${inv.id}')">
            <i class="fa-solid fa-trash"></i> Delete
          </button>
        </div>
      `;
    } else {
      item.innerHTML = `
        <div class="list-item-header">
          <strong>Invoice #${inv.number || inv.id}${offlineBadge}</strong>
          <span>${formatCurrency(inv.total || 0)}</span>
        </div>
        <div class="list-item-sub">${inv.client_name || ""}</div>
        <div class="list-item-sub">
          ${inv.date || ""} • ${inv.status || "draft"}
        </div>
      `;
      item.onclick = () => viewInvoiceDetail(inv.id);
    }
    
    list.appendChild(item);
  });
  
  if (!showArchived) {
    renderDashboardStats(invoices);
  }
  applyLanguage();
}

async function loadQuotes(showArchived = false) {
  if (tourMode) return;
  
  const list = document.getElementById("quotes-list");
  if (!list) return;
  list.innerHTML = "";
  
  let quotes = [];
  
  if (navigator.onLine) {
    try {
      const url = showArchived ? "/api/quotes?archived=true" : "/api/quotes";
      const res = await apiFetch(url);
      if (res.ok) {
        quotes = await res.json() || [];
      }
    } catch (error) {
      console.error('Failed to load quotes:', error);
    }
  }

  if (!quotes.length) {
    list.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--muted);">
      ${showArchived ? 'No archived quotes' : 'No quotes yet. Create one to get started!'}
    </div>`;
    return;
  }

  quotes.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  quotes.forEach((quote) => {
    const item = document.createElement("div");
    item.className = "list-item clickable";
    item.style.cursor = "pointer";
    
    if (showArchived) {
      item.innerHTML = `
        <div class="list-item-header">
          <strong>Quote #${quote.quote_number || quote.id}</strong>
          <span>${formatCurrency(quote.total || 0)}</span>
        </div>
        <div class="list-item-sub">${quote.client_name || ""} • ${quote.quote_date || ""}</div>
        <div class="list-item-sub">${quote.status || "draft"}</div>
        <div style="display: flex; gap: 8px; margin-top: 8px;">
          <button class="btn-sm" onclick="event.stopPropagation(); unarchiveQuote('${quote.id}')">
            <i class="fa-solid fa-box-open"></i> Restore
          </button>
          <button class="btn-sm" style="background: var(--danger); color: white;" onclick="event.stopPropagation(); deleteQuote('${quote.id}')">
            <i class="fa-solid fa-trash"></i> Delete
          </button>
        </div>
      `;
    } else {
      item.innerHTML = `
        <div class="list-item-header">
          <strong>Quote #${quote.quote_number || quote.id}</strong>
          <span>${formatCurrency(quote.total || 0)}</span>
        </div>
        <div class="list-item-sub">${quote.client_name || ""} • ${quote.quote_date || ""}</div>
        <div class="list-item-sub">
          ${quote.status || "draft"}
        </div>
      `;
      item.onclick = () => viewQuoteDetail(quote.id);
    }
    
    list.appendChild(item);
  });
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
                <td style="text-align: center;">${item.qty || item.quantity || 1}</td>
                <td style="text-align: right;">${formatCurrency(item.unit_price || item.price || 0)}</td>
                <td style="text-align: right;">${formatCurrency(item.line_total || item.total || 0)}</td>
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
        <button class="btn-sm" id="send-email-invoice-btn" data-invoice-id="${invoice.id}" style="background: var(--accent); color: var(--text-inverse);">
          <i class="fa-solid fa-envelope"></i> <span data-i18n="invoice.send_email">Send Email</span>
        </button>
        <button class="btn-sm" id="send-text-invoice-btn" data-invoice-id="${invoice.id}" data-client-phone="${invoice.client?.phone || ''}" data-total="${invoice.total || 0}" style="background: #22c55e; color: white;">
          <i class="fa-solid fa-comment-sms"></i> Send Text
        </button>
        <button class="btn-sm" id="download-invoice-btn" data-invoice-id="${invoice.id}">
          <i class="fa-solid fa-download"></i> Download
        </button>
        <button class="btn-sm" onclick="archiveInvoice('${invoice.id}')" style="background: var(--muted); color: white;">
          <i class="fa-solid fa-box-archive"></i> Archive
        </button>
        <button class="btn-sm" onclick="showScreen('invoices')">
          <i class="fa-solid fa-arrow-left"></i> Back to List
        </button>
      </div>
    `;
    
    // Wire up download button
    const downloadBtn = document.getElementById('download-invoice-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        const invoiceId = downloadBtn.getAttribute('data-invoice-id');
        openTemplateChooserForInvoice({id: invoiceId});
      });
    }
    
    // Wire up send email button
    const sendEmailBtn = document.getElementById('send-email-invoice-btn');
    if (sendEmailBtn) {
      sendEmailBtn.addEventListener('click', () => {
        openEmailInvoiceModal(invoice);
      });
    }
    
    // Wire up send text button
    const sendTextBtn = document.getElementById('send-text-invoice-btn');
    if (sendTextBtn) {
      sendTextBtn.addEventListener('click', () => {
        sendInvoiceSMS(invoice);
      });
    }
    
    // Re-apply translations to dynamically added buttons
    applyLanguage();
    
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
        <button class="btn-convert-quote" id="convert-quote-btn-${quote.id}" data-quote-id="${quote.id}" ${tourMode ? 'disabled style="opacity: 0.6;"' : ''}>
          <i class="fa-solid fa-file-invoice"></i> <span data-i18n="quote.convert_to_invoice">Convert to Invoice</span>
        </button>
        <button class="btn-sm" id="share-quote-btn-${quote.id}">
          <i class="fa-solid fa-share-nodes"></i> Send Quote
        </button>
        <button class="btn-sm" id="download-quote-btn" data-quote-id="${quote.id}">
          <i class="fa-solid fa-download"></i> Download PDF
        </button>
        <button class="btn-sm" onclick="archiveQuote('${quote.id}')" style="background: var(--muted); color: white;">
          <i class="fa-solid fa-box-archive"></i> Archive
        </button>
        <button class="btn-sm" onclick="showScreen('quotes')">
          <i class="fa-solid fa-arrow-left"></i> Back to List
        </button>
      </div>
    `;
    
    // Wire up convert button
    const convertBtn = document.getElementById(`convert-quote-btn-${quote.id}`);
    if (convertBtn && !tourMode) {
      convertBtn.addEventListener('click', () => {
        const quoteId = convertBtn.getAttribute('data-quote-id');
        convertQuoteToInvoice(quoteId);
      });
    }
    
    // Wire up download button
    const downloadBtn = document.getElementById('download-quote-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        const quoteId = downloadBtn.getAttribute('data-quote-id');
        openTemplateChooserForQuote({id: quoteId});
      });
    }
    
    document.getElementById(`share-quote-btn-${quote.id}`)?.addEventListener('click', () => shareQuote(quote));
    
    // Re-apply translations
    applyLanguage();
    
    showScreen('quote-detail');
  } catch (error) {
    console.error("Error loading quote details:", error);
    showToast("Failed to load quote details");
  }
}

async function convertQuoteToInvoice(quoteId) {
  if (tourMode) {
    showToast(t('tour.convert_disabled'));
    return;
  }
  
  console.log("Converting quote to invoice, quoteId:", quoteId);
  
  try {
    // Fetch the quote data
    console.log("Fetching quote data...");
    const res = await apiFetch(`/api/quotes/${quoteId}`);
    console.log("API response status:", res.status);
    
    const data = await res.json();
    console.log("Quote data received:", data);
    
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch quote');
    }
    
    const quote = data;
    
    // Switch to invoice form
    console.log("Switching to new-invoice screen...");
    showScreen('new-invoice');
    
    // Clear existing line items
    const lineItemsContainer = document.getElementById("line-items");
    if (!lineItemsContainer) {
      throw new Error("Line items container not found");
    }
    lineItemsContainer.innerHTML = "";
    console.log("Cleared line items");
    
    // Pre-fill client name
    const clientNameEl = document.getElementById("invoice-client-name");
    if (clientNameEl) {
      clientNameEl.value = quote.client_name || (quote.client ? quote.client.name : '');
      console.log("Set client name:", clientNameEl.value);
    }
    
    // Pre-fill date (use today's date)
    const dateEl = document.getElementById("invoice-date");
    if (dateEl) {
      dateEl.value = new Date().toISOString().split('T')[0];
      console.log("Set date:", dateEl.value);
    }
    
    // Pre-fill notes
    const notesEl = document.getElementById("invoice-notes");
    if (notesEl && quote.notes) {
      notesEl.value = quote.notes;
    }
    
    // Pre-fill line items
    console.log("Quote items:", quote.items);
    if (quote.items && quote.items.length > 0) {
      quote.items.forEach((item, index) => {
        console.log(`Adding line item ${index}:`, item);
        // Guard against missing fields
        if (!item.description && !item.quantity && !item.unit_price) {
          console.log("Skipping empty item");
          return; // Skip empty items
        }
        addLineItemRow({
          description: item.description || '',
          qty: item.quantity || 1,
          price: item.unit_price || 0
        });
      });
    } else {
      // Add one empty line item if no items
      console.log("No items, adding empty row");
      addLineItemRow();
    }
    
    // Update totals - recalculate to ensure accuracy
    console.log("Updating totals...");
    updateInvoiceTotals();
    
    // Focus on first input
    if (clientNameEl) {
      clientNameEl.focus();
    }
    
    // Show success toast
    console.log("Conversion successful!");
    showToast(t('quote.converted_success'));
  } catch (error) {
    console.error("Error converting quote to invoice:", error);
    console.error("Error stack:", error.stack);
    showToast("Failed to convert quote to invoice: " + error.message);
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

// Send Invoice via SMS (opens native Messages app)
async function sendInvoiceSMS(invoice) {
  try {
    let paymentLink = invoice.payment_link;
    
    // Generate payment link if not exists
    if (!paymentLink && invoice.payment_status !== 'paid') {
      showToast("Generating payment link...");
      const res = await apiFetch(`/api/invoices/${invoice.id}/payment-link`, {
        method: 'POST',
      });
      
      if (res.ok) {
        const data = await res.json();
        paymentLink = data.payment_link;
      } else {
        showToast("Could not generate payment link, sending without it");
      }
    }
    
    // Build message
    const businessName = userProfile?.business_name || "Your business";
    const total = formatCurrency(invoice.total || 0);
    const invoiceViewLink = `https://trade-base.biz/view/invoice/${invoice.id}`;
    
    let message = `Invoice from ${businessName} for ${total}.`;
    message += `\n\nView invoice: ${invoiceViewLink}`;
    
    if (paymentLink && invoice.payment_status !== 'paid') {
      message += `\n\nPay now: ${paymentLink}`;
    }
    
    // Get client phone (cleaned)
    const clientPhone = (invoice.client?.phone || '').replace(/[^0-9+]/g, '');
    
    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Build SMS URL - format differs for iOS vs Android
    // iOS requires sms:phone?&body= format, Android uses sms:phone?body=
    let smsUrl;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (clientPhone) {
      if (isIOS) {
        // iOS format: sms:phone?&body=message (needs the ?& before body)
        smsUrl = `sms:${clientPhone}?&body=${encodedMessage}`;
      } else {
        // Android format: sms:phone?body=message
        smsUrl = `sms:${clientPhone}?body=${encodedMessage}`;
      }
    } else {
      // No phone number - let user choose recipient
      smsUrl = `sms:?body=${encodedMessage}`;
    }
    
    // Open native SMS app
    window.location.href = smsUrl;
    
  } catch (error) {
    console.error("Error sending invoice SMS:", error);
    showToast("Failed to open messaging app");
  }
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
          <span>${t('payments.active')}</span>
        </div>
      `;
      messageEl.textContent = t('payments.enabled_message');
    } else {
      statusEl.innerHTML = `
        <div class="status-badge" style="background: rgba(158, 158, 158, 0.15); color: #9E9E9E; border: 1px solid rgba(158, 158, 158, 0.3);">
          <i class="fa-solid fa-circle-xmark"></i>
          <span>${t('payments.not_enabled')}</span>
        </div>
      `;
      messageEl.innerHTML = `
        <p style="margin-bottom: 16px;">${t('payments.connect_message')}</p>
        <button id="btn-enable-payment-collection" class="btn-primary" style="min-height: 44px;">
          <i class="fa-solid fa-credit-card"></i> ${t('payments.enable_button')}
        </button>
      `;
      
      // Add event listener for enable button
      const enableBtn = document.getElementById('btn-enable-payment-collection');
      if (enableBtn) {
        enableBtn.addEventListener('click', async () => {
          try {
            enableBtn.disabled = true;
            enableBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${t('payments.enabling')}`;
            
            const res = await apiFetch('/api/stripe-connect/enable', {
              method: 'POST'
            });
            
            if (res.ok) {
              // Success! Reload the payment screen data
              await loadPaymentScreenData();
            } else {
              const error = await res.json();
              alert('Failed to enable payment collection: ' + (error.error || 'Unknown error'));
              enableBtn.disabled = false;
              enableBtn.innerHTML = `<i class="fa-solid fa-credit-card"></i> ${t('payments.enable_button')}`;
            }
          } catch (error) {
            console.error('Error enabling payment collection:', error);
            alert('Failed to enable payment collection. Please try again.');
            enableBtn.disabled = false;
            enableBtn.innerHTML = `<i class="fa-solid fa-credit-card"></i> ${t('payments.enable_button')}`;
          }
        });
      }
    }
    
    await loadPaymentStats();
  } catch (error) {
    console.error("Error loading payment screen data:", error);
  }
}

function calculateMonthlyStats(invoicesArray = []) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  let invoicedMonth = 0;
  let paidMonth = 0;
  let outstanding = 0;
  
  invoicesArray.forEach(invoice => {
    // Fallback to invoice.date if created_at is missing
    const dateStr = invoice.created_at || invoice.date;
    if (!dateStr) return; // Skip if no date available
    
    const createdDate = new Date(dateStr);
    if (isNaN(createdDate.getTime())) return; // Guard against invalid dates
    
    const isCurrentMonth = createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
    
    if (isCurrentMonth) {
      invoicedMonth += invoice.total || 0;
      
      if (invoice.payment_status === 'paid') {
        paidMonth += invoice.total || 0;
      }
    }
    
    if (invoice.payment_status === 'unpaid' || invoice.payment_status === 'pending') {
      outstanding += invoice.total || 0;
    }
  });
  
  return {
    invoicedMonth,
    paidMonth,
    outstanding
  };
}

function renderDashboardStats(invoicesArray = []) {
  const stats = calculateMonthlyStats(invoicesArray);
  
  const invoicedMonthEl = document.getElementById('stat-invoiced-month');
  const paidMonthEl = document.getElementById('stat-paid-month');
  const outstandingEl = document.getElementById('stat-outstanding');
  
  if (invoicedMonthEl) {
    invoicedMonthEl.textContent = `$${stats.invoicedMonth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  if (paidMonthEl) {
    paidMonthEl.textContent = `$${stats.paidMonth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  if (outstandingEl) {
    outstandingEl.textContent = `$${stats.outstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

  document.getElementById("business-name").value = profile.business_name || "";
  document.getElementById("business-phone").value = profile.business_phone || "";
  document.getElementById("business-email").value = profile.business_email || "";
  document.getElementById("business-address").value = profile.business_address || "";

  document.getElementById("settings-language").value = profile.preferred_language || "en";
  document.getElementById("settings-template").value = profile.preferred_template || "basic_clean";

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
  msg.textContent = "Saving...";
  msg.style.color = "var(--muted)";

  const selectedLang = document.getElementById("settings-language").value;
  const selectedTemplate = document.getElementById("settings-template").value;
  
  if (setLanguage(selectedLang)) {
    applyLanguage();
  }
  if (setTemplate(selectedTemplate)) {
    // Template will be applied when downloading next invoice
  }

  const payload = {
    business_name: document.getElementById("business-name").value,
    business_phone: document.getElementById("business-phone").value,
    business_email: document.getElementById("business-email").value,
    business_address: document.getElementById("business-address").value,
    preferred_language: selectedLang,
    preferred_template: selectedTemplate,
  };

  if (selectedLogoFile) {
    try {
      const formData = new FormData();
      formData.append("logo", selectedLogoFile);

      const resLogo = await apiFetch("/api/profile/logo", {
        method: "POST",
        body: formData,
      });
      const logoData = await resLogo.json();
      
      if (!resLogo.ok) {
        console.error("Logo upload failed:", logoData);
        msg.textContent = "Failed to upload logo: " + (logoData.error || "Unknown error");
        msg.style.color = "var(--danger)";
        return;
      }
      
      if (logoData.logo_url) {
        payload.logo_url = logoData.logo_url;
      }
    } catch (err) {
      console.error("Logo upload error:", err);
      msg.textContent = "Failed to upload logo. Please try again.";
      msg.style.color = "var(--danger)";
      return;
    }
  }

  try {
    const res = await apiFetch("/api/profile", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    
    if (!res.ok) {
      console.error("Profile save failed:", data);
      msg.textContent = "Failed to save: " + (data.error || "Unknown error");
      msg.style.color = "var(--danger)";
      return;
    }
    
    msg.textContent = "Settings saved!";
    msg.style.color = "var(--success)";
    selectedLogoFile = null;
  } catch (err) {
    console.error("Profile save error:", err);
    msg.textContent = "Failed to save settings. Please try again.";
    msg.style.color = "var(--danger)";
  }
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
    
    const invoiceForTemplate = {
      ...invoiceData,
      business_name: profile?.business_name,
      address: profile?.address,
      phone: profile?.phone,
      email: profile?.email,
      logo_url: profile?.logo_url,
      invoice_footer: profile?.invoice_footer,
      items: (invoiceData.items || []).map(item => ({
        description: item.description,
        qty: item.qty || 1,
        price: item.unit_price || 0,
        total: item.line_total || 0
      }))
    };
    
    renderInvoiceTemplate(invoiceForTemplate, false);
    
    const template = document.getElementById("invoice-template");
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

// TEMPLATE CHOOSER FOR DOWNLOADS

function openTemplateChooserForInvoice(invoice) {
  const modal = document.getElementById("template-chooser-modal");
  const grid = document.getElementById("template-chooser-grid");
  
  const templates = [
    { id: 'basic_clean', name: 'Basic Clean', desc: 'Classic black & white contractor PDF style' },
    { id: 'modern_pro', name: 'Modern Pro', desc: 'Bold headings, clean professional layout' },
    { id: 'color_accent', name: 'Color Accent Header', desc: 'Blue/gray header for official appearance' },
    { id: 'big_total', name: 'Big Total', desc: 'Emphasizes the total amount prominently' }
  ];
  
  grid.innerHTML = templates.map(template => `
    <div class="template-card" data-invoice-id="${invoice.id}" data-template-id="${template.id}" data-type="invoice" style="cursor: pointer; border: 2px solid var(--border); border-radius: 8px; padding: 20px; background: var(--tile); transition: all 0.2s;">
      <h3 style="margin: 0 0 8px 0; color: var(--text); font-size: 16px;">${template.name}</h3>
      <p style="margin: 0; color: var(--muted); font-size: 13px;">${template.desc}</p>
      <div style="margin-top: 12px; padding: 8px; background: var(--bg); border-radius: 4px; text-align: center; color: var(--primary); font-size: 12px; font-weight: 600;">
        CLICK TO PREVIEW
      </div>
    </div>
  `).join('');
  
  // Add event listeners to template cards
  grid.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', () => {
      const invoiceId = card.getAttribute('data-invoice-id');
      const templateId = card.getAttribute('data-template-id');
      previewInvoiceTemplate({id: invoiceId}, templateId);
    });
  });
  
  modal.style.display = 'block';
  applyLanguage();
}

function openTemplateChooserForQuote(quote) {
  const modal = document.getElementById("template-chooser-modal");
  const grid = document.getElementById("template-chooser-grid");
  const title = modal.querySelector('h2');
  
  title.setAttribute('data-i18n', 'template.choose_template');
  title.textContent = 'Choose Quote Template';
  
  const templates = [
    { id: 'basic_clean', name: 'Basic Clean', desc: 'Classic black & white contractor PDF style' },
    { id: 'modern_pro', name: 'Modern Pro', desc: 'Bold headings, clean professional layout' },
    { id: 'color_accent', name: 'Color Accent Header', desc: 'Blue/gray header for official appearance' },
    { id: 'big_total', name: 'Big Total', desc: 'Emphasizes the total amount prominently' }
  ];
  
  grid.innerHTML = templates.map(template => `
    <div class="template-card" data-quote-id="${quote.id}" data-template-id="${template.id}" data-type="quote" style="cursor: pointer; border: 2px solid var(--border); border-radius: 8px; padding: 20px; background: var(--tile); transition: all 0.2s;">
      <h3 style="margin: 0 0 8px 0; color: var(--text); font-size: 16px;">${template.name}</h3>
      <p style="margin: 0; color: var(--muted); font-size: 13px;">${template.desc}</p>
      <div style="margin-top: 12px; padding: 8px; background: var(--bg); border-radius: 4px; text-align: center; color: var(--primary); font-size: 12px; font-weight: 600;">
        CLICK TO PREVIEW
      </div>
    </div>
  `).join('');
  
  // Add event listeners to template cards
  grid.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', () => {
      const quoteId = card.getAttribute('data-quote-id');
      const templateId = card.getAttribute('data-template-id');
      previewQuoteTemplate({id: quoteId}, templateId);
    });
  });
  
  modal.style.display = 'block';
  applyLanguage();
}

function closeTemplateChooser() {
  const modal = document.getElementById("template-chooser-modal");
  modal.style.display = 'none';
}

// EMAIL INVOICE MODAL

function openEmailInvoiceModal(invoice) {
  const modal = document.getElementById('email-invoice-modal');
  const form = document.getElementById('email-invoice-form');
  const emailInput = document.getElementById('email-recipient-email');
  const nameInput = document.getElementById('email-recipient-name');
  const preview = document.getElementById('email-modal-preview');
  
  if (!modal || !form || !emailInput || !nameInput || !preview) return;
  
  // Auto-fill from client data if available
  if (invoice.client) {
    emailInput.value = invoice.client.email || '';
    nameInput.value = invoice.client.name || '';
  } else {
    emailInput.value = '';
    nameInput.value = invoice.client_name || '';
  }
  
  // Set placeholder for missing email
  if (!emailInput.value) {
    emailInput.placeholder = t('invoice.no_client_email') || 'No client email saved - enter email address';
  } else {
    emailInput.placeholder = '';
  }
  
  // Set preview text
  preview.innerHTML = `<strong>Invoice #${invoice.number || invoice.id}</strong> · Total: ${formatCurrency(invoice.total || 0)}`;
  
  // Store invoice data for form submission
  form.setAttribute('data-invoice-id', invoice.id);
  
  modal.style.display = 'block';
  applyLanguage();
}

function closeEmailInvoiceModal() {
  const modal = document.getElementById('email-invoice-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

async function sendInvoiceEmail(invoiceId, recipientEmail, recipientName) {
  if (!recipientEmail || !recipientEmail.trim()) {
    showToast(t('invoice.email_required'), 'error');
    return;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipientEmail.trim())) {
    showToast(t('invoice.email_invalid'), 'error');
    return;
  }
  
  try {
    const res = await apiFetch(`/api/invoices/${invoiceId}/send-email`, {
      method: 'POST',
      body: JSON.stringify({
        recipientEmail: recipientEmail.trim(),
        recipientName: recipientName ? recipientName.trim() : ''
      })
    });
    
    if (res.ok) {
      showToast(t('invoice.email_sent_success'));
      closeEmailInvoiceModal();
    } else {
      const error = await res.json();
      showToast(error.error || t('invoice.email_sent_error'), 'error');
    }
  } catch (error) {
    console.error('Error sending invoice email:', error);
    showToast(t('invoice.email_sent_error'), 'error');
  }
}

async function previewInvoiceTemplate(invoice, templateId) {
  const modal = document.getElementById("template-preview-modal");
  const content = document.getElementById("template-preview-content");
  const closeBtn = document.getElementById("close-template-preview");
  
  if (!modal || !content) return;
  
  closeTemplateChooser();
  
  try {
    const [invoiceRes, profileRes] = await Promise.all([
      apiFetch(`/api/invoices/${invoice.id}`),
      apiFetch("/api/profile")
    ]);
    
    const invoiceData = await invoiceRes.json();
    const profile = await profileRes.json();
    
    const invoiceForTemplate = {
      ...invoiceData,
      business_name: profile?.business_name,
      address: profile?.address,
      phone: profile?.phone,
      email: profile?.email,
      logo_url: profile?.logo_url,
      invoice_footer: profile?.invoice_footer,
      items: (invoiceData.items || []).map(item => ({
        description: item.description,
        qty: item.qty || 1,
        price: item.unit_price || 0,
        total: item.line_total || 0
      }))
    };
    
    const originalTemplate = currentTemplate;
    setTemplate(templateId);
    
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = 'position: absolute; left: -9999px;';
    document.body.appendChild(tempDiv);
    
    if (templateId === 'basic_clean') {
      tempDiv.innerHTML = renderBasicClean(invoiceForTemplate, 'INVOICE', 'number', 'date');
    } else if (templateId === 'modern_pro') {
      tempDiv.innerHTML = renderModernPro(invoiceForTemplate, 'INVOICE', 'number', 'date');
    } else if (templateId === 'color_accent') {
      tempDiv.innerHTML = renderColorAccent(invoiceForTemplate, 'INVOICE', 'number', 'date');
    } else if (templateId === 'big_total') {
      tempDiv.innerHTML = renderBigTotal(invoiceForTemplate, 'INVOICE', 'number', 'date');
    }
    
    content.innerHTML = tempDiv.innerHTML + `
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #ddd;">
        <button id="download-preview-btn" data-invoice-id="${invoice.id}" data-template-id="${templateId}" style="background: #4CAF50; color: white; border: none; padding: 12px 30px; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
          <i class="fa-solid fa-download"></i> Download This Version
        </button>
      </div>
    `;
    document.body.removeChild(tempDiv);
    
    // Add event listener for download button
    const downloadBtn = document.getElementById('download-preview-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        const invId = downloadBtn.getAttribute('data-invoice-id');
        const tmpId = downloadBtn.getAttribute('data-template-id');
        downloadInvoiceWithTemplate({id: invId}, tmpId);
      });
    }
    
    modal.style.display = 'block';
    setTemplate(originalTemplate);
    
    const closeModal = () => {
      modal.style.display = 'none';
      closeBtn.removeEventListener('click', closeModal);
      modal.removeEventListener('click', handleOutsideClick);
    };
    
    const handleOutsideClick = (e) => {
      if (e.target === modal) {
        closeModal();
      }
    };
    
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', handleOutsideClick);
    
  } catch (err) {
    console.error("Preview error:", err);
    showToast("Failed to preview invoice");
  }
}

async function previewQuoteTemplate(quote, templateId) {
  const modal = document.getElementById("template-preview-modal");
  const content = document.getElementById("template-preview-content");
  const closeBtn = document.getElementById("close-template-preview");
  
  if (!modal || !content) return;
  
  closeTemplateChooser();
  
  try {
    const res = await apiFetch(`/api/quotes/${quote.id}`);
    if (!res.ok) {
      showToast("Failed to load quote details");
      return;
    }
    const quoteData = await res.json();
    
    const resProfile = await apiFetch("/api/profile");
    const profile = resProfile.ok ? await resProfile.json() : null;
    
    const quoteForTemplate = {
      ...quoteData,
      number: quoteData.quote_number,
      date: quoteData.quote_date,
      business_name: profile?.business_name,
      address: profile?.address,
      phone: profile?.phone,
      email: profile?.email,
      logo_url: profile?.logo_url,
      invoice_footer: profile?.invoice_footer,
      items: (quoteData.items || []).map(item => ({
        description: item.description,
        qty: item.quantity || 1,
        price: item.unit_price || 0,
        total: item.total || 0
      }))
    };
    
    const originalTemplate = currentTemplate;
    setTemplate(templateId);
    
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = 'position: absolute; left: -9999px;';
    document.body.appendChild(tempDiv);
    
    if (templateId === 'basic_clean') {
      tempDiv.innerHTML = renderBasicClean(quoteForTemplate, 'QUOTE', 'number', 'date');
    } else if (templateId === 'modern_pro') {
      tempDiv.innerHTML = renderModernPro(quoteForTemplate, 'QUOTE', 'number', 'date');
    } else if (templateId === 'color_accent') {
      tempDiv.innerHTML = renderColorAccent(quoteForTemplate, 'QUOTE', 'number', 'date');
    } else if (templateId === 'big_total') {
      tempDiv.innerHTML = renderBigTotal(quoteForTemplate, 'QUOTE', 'number', 'date');
    }
    
    content.innerHTML = tempDiv.innerHTML + `
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #ddd;">
        <button id="download-preview-btn" data-quote-id="${quote.id}" data-template-id="${templateId}" style="background: #4CAF50; color: white; border: none; padding: 12px 30px; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
          <i class="fa-solid fa-download"></i> Download This Version
        </button>
      </div>
    `;
    document.body.removeChild(tempDiv);
    
    // Add event listener for download button
    const downloadBtn = document.getElementById('download-preview-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        const qteId = downloadBtn.getAttribute('data-quote-id');
        const tmpId = downloadBtn.getAttribute('data-template-id');
        downloadQuoteWithTemplate({id: qteId}, tmpId);
      });
    }
    
    modal.style.display = 'block';
    setTemplate(originalTemplate);
    
    const closeModal = () => {
      modal.style.display = 'none';
      closeBtn.removeEventListener('click', closeModal);
      modal.removeEventListener('click', handleOutsideClick);
    };
    
    const handleOutsideClick = (e) => {
      if (e.target === modal) {
        closeModal();
      }
    };
    
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', handleOutsideClick);
    
  } catch (err) {
    console.error("Preview error:", err);
    showToast("Failed to preview quote");
  }
}

async function downloadInvoiceWithTemplate(invoice, templateId) {
  const previewModal = document.getElementById("template-preview-modal");
  if (previewModal) previewModal.style.display = 'none';
  
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
    
    const invoiceForTemplate = {
      ...invoiceData,
      business_name: profile?.business_name,
      address: profile?.address,
      phone: profile?.phone,
      email: profile?.email,
      logo_url: profile?.logo_url,
      invoice_footer: profile?.invoice_footer,
      items: (invoiceData.items || []).map(item => ({
        description: item.description,
        qty: item.qty || 1,
        price: item.unit_price || 0,
        total: item.line_total || 0
      }))
    };
    
    const originalTemplate = currentTemplate;
    setTemplate(templateId);
    
    renderInvoiceTemplate(invoiceForTemplate, false);
    
    const template = document.getElementById("invoice-template");
    template.style.left = "0";
    template.style.top = "0";
    
    const canvas = await html2canvas(template, {
      backgroundColor: "#ffffff",
      scale: 2
    });
    
    template.style.left = "-9999px";
    setTemplate(originalTemplate);
    
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

async function downloadQuoteWithTemplate(quote, templateId) {
  closeTemplateChooser();
  
  try {
    if (typeof html2canvas === 'undefined') {
      showToast("Download feature loading, please try again in a moment");
      return;
    }
    
    showToast("Generating quote...");
    
    const res = await apiFetch(`/api/quotes/${quote.id}`);
    if (!res.ok) {
      showToast("Failed to load quote details");
      return;
    }
    const quoteData = await res.json();
    
    const resProfile = await apiFetch("/api/profile");
    const profile = resProfile.ok ? await resProfile.json() : null;
    
    const quoteForTemplate = {
      ...quoteData,
      number: quoteData.quote_number,
      date: quoteData.quote_date,
      business_name: profile?.business_name,
      address: profile?.address,
      phone: profile?.phone,
      email: profile?.email,
      logo_url: profile?.logo_url,
      invoice_footer: profile?.invoice_footer,
      items: (quoteData.items || []).map(item => ({
        description: item.description,
        qty: item.quantity || 1,
        price: item.unit_price || 0,
        total: item.total || 0
      }))
    };
    
    const originalTemplate = currentTemplate;
    setTemplate(templateId);
    
    renderInvoiceTemplate(quoteForTemplate, true);
    
    const template = document.getElementById("invoice-template");
    template.style.left = "0";
    template.style.top = "0";
    
    const canvas = await html2canvas(template, {
      backgroundColor: "#ffffff",
      scale: 2
    });
    
    template.style.left = "-9999px";
    setTemplate(originalTemplate);
    
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
  
  const newInvoiceBtn = document.getElementById("btn-new-invoice");
  if (newInvoiceBtn) {
    newInvoiceBtn.addEventListener("click", () => {
      showScreen("new-invoice");
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
  const notes = document.getElementById("quote-notes").value;
  const template = document.getElementById("quote-template").value || "basic_clean";
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

  const quoteData = {
    client_name: clientName,
    quote_date: quoteDate,
    quote_number: `QT-${Date.now()}`,
    notes,
    template,
    subtotal,
    tax,
    total,
    items,
    status: "draft",
    created_at: new Date().toISOString()
  };

  try {
    if (!navigator.onLine) {
      const offlineId = generateOfflineId();
      quoteData.id = offlineId;
      
      await saveOffline('quotes', quoteData, '/api/quotes', 'POST');
      
      showToast("📱 Quote saved offline. Will sync when online.");
      document.getElementById("quote-form").reset();
      clearQuoteLineItems();
      showScreen("quotes");
      await loadQuotes();
      return;
    }

    const res = await apiFetch("/api/quotes", {
      method: "POST",
      body: JSON.stringify(quoteData),
    });

    if (res.ok) {
      const data = await res.json();
      quoteData.id = data.id;
      
      try {
        await tradebaseDB.saveQuote(quoteData);
      } catch (dbErr) {
        console.warn("IndexedDB save failed (non-critical):", dbErr);
      }
      
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
    console.error("Quote submit error:", err);
    console.error("Error details:", JSON.stringify(err, null, 2));
    errorEl.textContent = err.message || "An error occurred.";
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
    <input type="text" placeholder="${t('quote.line_description_placeholder')}" class="item-desc" value="${data.description || ""}" />
    <input type="number" placeholder="${t('quote.line_qty_placeholder')}" class="item-qty" value="${data.qty || 1}" min="0" step="0.01" />
    <input type="number" placeholder="${t('quote.line_price_placeholder')}" class="item-price" value="${data.unit_price || 0}" min="0" step="0.01" />
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

  const addQuoteItemBtn = document.getElementById("btn-add-quote-line-item");
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
    
    const quoteForTemplate = {
      ...quoteData,
      number: quoteData.quote_number,
      date: quoteData.quote_date,
      business_name: profile?.business_name,
      address: profile?.address,
      phone: profile?.phone,
      email: profile?.email,
      logo_url: profile?.logo_url,
      invoice_footer: profile?.invoice_footer,
      items: (quoteData.items || []).map(item => ({
        description: item.description,
        qty: item.quantity || 1,
        price: item.unit_price || 0,
        total: item.total || 0
      }))
    };
    
    renderInvoiceTemplate(quoteForTemplate, true);
    
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

async function shareQuote(quote) {
  try {
    showToast("Generating quote image...");
    
    const quoteNumber = quote.quote_number || (quote.id ? quote.id.slice(0, 8) : 'N/A');
    const clientName = quote.client_name || (quote.client ? quote.client.name : 'N/A');
    
    // Get user's profile for business info
    let profile = {};
    try {
      const profileRes = await apiFetch('/api/profile');
      if (profileRes.ok) {
        profile = await profileRes.json();
      }
    } catch (e) {
      console.log("Could not load profile for share");
    }
    
    // Generate a professional quote image using the template system
    const quoteData = {
      ...quote,
      quote_number: quoteNumber,
      client_name: clientName,
      profile: profile
    };
    
    // Create off-screen template (use renderInvoiceTemplate with isQuote=true)
    const template = document.createElement("div");
    template.className = "quote-template-print";
    template.innerHTML = renderInvoiceTemplate(quoteData, true);
    template.style.position = "absolute";
    template.style.left = "-9999px";
    template.style.width = "800px";
    template.style.backgroundColor = "#ffffff";
    document.body.appendChild(template);
    
    // Wait for rendering
    await new Promise(r => setTimeout(r, 100));
    
    // Generate canvas
    template.style.left = "0";
    template.style.top = "0";
    
    const canvas = await html2canvas(template, {
      backgroundColor: "#ffffff",
      scale: 2
    });
    
    document.body.removeChild(template);
    
    // Convert to blob for sharing
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const file = new File([blob], `Quote-${quoteNumber}.png`, { type: 'image/png' });
    
    // Check if we can share files
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: `Quote #${quoteNumber}`,
        text: `Quote for ${clientName}`
      });
      showToast("Quote shared!");
    } else if (navigator.share) {
      // Fallback: download the image first, then offer to share text
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Quote-${quoteNumber}.png`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Quote image downloaded! You can attach it to your message.");
    } else {
      // Desktop fallback - just download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Quote-${quoteNumber}.png`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Quote image downloaded!");
    }
  } catch (err) {
    console.error("Share error:", err);
    showToast("Failed to generate quote image");
  }
}

// JOBS MANAGEMENT

let allJobs = [];
let currentJob = null;

function wireJobsUI() {
  const btnNewJob = document.getElementById("btn-new-job");
  if (btnNewJob) {
    btnNewJob.addEventListener("click", () => {
      document.getElementById("job-form-title").textContent = "New Job";
      document.getElementById("job-id").value = "";
      document.getElementById("job-form").reset();
      showScreen("job-form");
    });
  }

  const jobForm = document.getElementById("job-form");
  if (jobForm) {
    jobForm.addEventListener("submit", handleJobSubmit);
  }

  const jobsSearch = document.getElementById("jobs-search");
  if (jobsSearch) {
    jobsSearch.addEventListener("input", debounce(() => filterAndRenderJobs(), 300));
  }

  const jobsFilter = document.getElementById("jobs-filter");
  if (jobsFilter) {
    jobsFilter.addEventListener("change", () => filterAndRenderJobs());
  }

  const tileJobs = document.querySelector('[data-screen="jobs"]');
  if (tileJobs) {
    tileJobs.addEventListener("click", loadJobs);
  }

  const btnEditJob = document.getElementById("btn-edit-job");
  if (btnEditJob) {
    btnEditJob.addEventListener("click", () => {
      if (!currentJob) return;
      document.getElementById("job-form-title").textContent = "Edit Job";
      document.getElementById("job-id").value = currentJob.id;
      document.getElementById("job-client-name").value = currentJob.client_name || "";
      document.getElementById("job-address").value = currentJob.address || "";
      document.getElementById("job-type").value = currentJob.job_type || "";
      document.getElementById("job-notes").value = currentJob.notes || "";
      showScreen("job-form");
    });
  }

  const btnCloseJob = document.getElementById("btn-close-job");
  if (btnCloseJob) {
    btnCloseJob.addEventListener("click", async () => {
      if (!currentJob) return;
      await updateJobStatus(currentJob.id, "closed");
    });
  }

  const btnArchiveJob = document.getElementById("btn-archive-job");
  if (btnArchiveJob) {
    btnArchiveJob.addEventListener("click", async () => {
      if (!currentJob) return;
      await updateJobStatus(currentJob.id, "archived");
    });
  }

  const btnDeleteJob = document.getElementById("btn-delete-job");
  if (btnDeleteJob) {
    btnDeleteJob.addEventListener("click", handleJobDelete);
  }
}

async function loadJobs() {
  if (tourMode) {
    allJobs = [
      { id: 1, client_name: "John Smith", address: "123 Main St", job_type: "Electrical", status: "open", created_at: new Date().toISOString() },
      { id: 2, client_name: "Jane Doe", address: "456 Oak Ave", job_type: "Plumbing", status: "closed", created_at: new Date(Date.now() - 86400000).toISOString() }
    ];
    renderJobsList(allJobs);
    updateJobStats();
    return;
  }

  try {
    const res = await apiFetch("/api/jobs");
    if (res.ok) {
      allJobs = await res.json();
      renderJobsList(allJobs);
      updateJobStats();
    } else {
      showToast("Failed to load jobs");
    }
  } catch (err) {
    console.error("Error loading jobs:", err);
    showToast("Error loading jobs");
  }
}

function filterAndRenderJobs() {
  const searchTerm = document.getElementById("jobs-search")?.value?.toLowerCase() || "";
  const statusFilter = document.getElementById("jobs-filter")?.value || "all";

  let filtered = allJobs;

  if (statusFilter !== "all") {
    filtered = filtered.filter(job => job.status === statusFilter);
  }

  if (searchTerm) {
    filtered = filtered.filter(job =>
      (job.client_name || "").toLowerCase().includes(searchTerm) ||
      (job.address || "").toLowerCase().includes(searchTerm) ||
      (job.job_type || "").toLowerCase().includes(searchTerm)
    );
  }

  renderJobsList(filtered);
}

function renderJobsList(jobs) {
  const list = document.getElementById("jobs-list");
  const emptyState = document.getElementById("jobs-empty-state");

  if (!list) return;

  if (!jobs || jobs.length === 0) {
    list.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  list.innerHTML = jobs.map(job => {
    const statusColor = job.status === "open" ? "var(--primary)" :
                        job.status === "closed" ? "#4CAF50" : "var(--muted)";
    const statusIcon = job.status === "open" ? "fa-folder-open" :
                       job.status === "closed" ? "fa-check-circle" : "fa-box-archive";
    const dateStr = job.created_at ? new Date(job.created_at).toLocaleDateString() : "-";

    return `
      <div class="list-item" data-job-id="${job.id}">
        <div class="list-item-info" style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid ${statusIcon}" style="color: ${statusColor}; font-size: 18px;"></i>
            <div>
              <strong>${job.client_name || "Unnamed Job"}</strong>
              <div style="font-size: 13px; color: var(--muted);">
                ${job.address ? `<i class="fa-solid fa-map-marker-alt"></i> ${job.address}` : ""}
                ${job.job_type ? `<span style="margin-left: 10px;"><i class="fa-solid fa-wrench"></i> ${job.job_type}</span>` : ""}
              </div>
              <div style="font-size: 12px; color: var(--muted); margin-top: 4px;">
                <i class="fa-solid fa-calendar"></i> ${dateStr}
              </div>
            </div>
          </div>
        </div>
        <button class="btn-icon" onclick="viewJobDetail(${job.id})">
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    `;
  }).join("");
}

function updateJobStats() {
  const openCount = allJobs.filter(j => j.status === "open").length;
  const closedCount = allJobs.filter(j => j.status === "closed").length;
  const totalCount = allJobs.length;

  const elOpen = document.getElementById("jobs-open-count");
  const elClosed = document.getElementById("jobs-closed-count");
  const elTotal = document.getElementById("jobs-total-count");

  if (elOpen) elOpen.textContent = openCount;
  if (elClosed) elClosed.textContent = closedCount;
  if (elTotal) elTotal.textContent = totalCount;
}

async function viewJobDetail(jobId) {
  if (tourMode) {
    currentJob = allJobs.find(j => j.id === jobId);
    renderJobDetail(currentJob);
    showScreen("job-detail");
    return;
  }

  try {
    const res = await apiFetch(`/api/jobs/${jobId}`);
    if (res.ok) {
      currentJob = await res.json();
      renderJobDetail(currentJob);
      showScreen("job-detail");
    } else {
      showToast("Failed to load job details");
    }
  } catch (err) {
    console.error("Error loading job:", err);
    showToast("Error loading job");
  }
}

function renderJobDetail(job) {
  if (!job) return;

  document.getElementById("job-detail-title").textContent = job.folder_name || job.client_name || "Job Details";
  document.getElementById("job-detail-client").textContent = job.client_name || "-";
  document.getElementById("job-detail-address").textContent = job.address || "-";
  document.getElementById("job-detail-type").textContent = job.job_type || "-";
  document.getElementById("job-detail-notes").textContent = job.notes || "No notes";
  document.getElementById("job-detail-date").textContent = job.created_at ? new Date(job.created_at).toLocaleDateString() : "-";

  const statusEl = document.getElementById("job-detail-status");
  if (statusEl) {
    statusEl.textContent = (job.status || "open").charAt(0).toUpperCase() + (job.status || "open").slice(1);
    statusEl.className = "status-badge";
    if (job.status === "open") statusEl.style.color = "var(--primary)";
    else if (job.status === "closed") statusEl.style.color = "#4CAF50";
    else statusEl.style.color = "var(--muted)";
  }

  const btnClose = document.getElementById("btn-close-job");
  if (btnClose) {
    btnClose.style.display = job.status === "closed" ? "none" : "inline-flex";
  }

  renderJobLinkedItems(job);
}

function renderJobLinkedItems(job) {
  const invoicesList = document.getElementById("job-invoices-list");
  const invoicesEmpty = document.getElementById("job-invoices-empty");
  const quotesList = document.getElementById("job-quotes-list");
  const quotesEmpty = document.getElementById("job-quotes-empty");
  const voiceNotesList = document.getElementById("job-voice-notes-list");
  const voiceNotesEmpty = document.getElementById("job-voice-notes-empty");

  if (job.invoices && job.invoices.length > 0) {
    if (invoicesEmpty) invoicesEmpty.style.display = "none";
    if (invoicesList) {
      invoicesList.innerHTML = job.invoices.map(inv => `
        <div class="list-item" onclick="viewInvoiceDetail(${inv.id})">
          <span><strong>${inv.invoice_number || "Invoice"}</strong> - ${formatCurrency(inv.total || 0)}</span>
          <span class="status-badge" style="color: ${inv.payment_status === 'paid' ? '#4CAF50' : '#F44336'};">${inv.payment_status || 'unpaid'}</span>
        </div>
      `).join("");
    }
  } else {
    if (invoicesList) invoicesList.innerHTML = "";
    if (invoicesEmpty) invoicesEmpty.style.display = "block";
  }

  if (job.quotes && job.quotes.length > 0) {
    if (quotesEmpty) quotesEmpty.style.display = "none";
    if (quotesList) {
      quotesList.innerHTML = job.quotes.map(q => `
        <div class="list-item" onclick="viewQuoteDetail(${q.id})">
          <span><strong>${q.quote_number || "Quote"}</strong> - ${formatCurrency(q.total || 0)}</span>
          <span class="status-badge">${q.status || 'draft'}</span>
        </div>
      `).join("");
    }
  } else {
    if (quotesList) quotesList.innerHTML = "";
    if (quotesEmpty) quotesEmpty.style.display = "block";
  }

  if (job.voice_notes && job.voice_notes.length > 0) {
    if (voiceNotesEmpty) voiceNotesEmpty.style.display = "none";
    if (voiceNotesList) {
      voiceNotesList.innerHTML = job.voice_notes.map(vn => `
        <div class="list-item">
          <span><i class="fa-solid fa-microphone"></i> ${new Date(vn.created_at).toLocaleDateString()}</span>
          <span style="color: var(--muted); font-size: 12px;">${vn.transcript ? vn.transcript.substring(0, 50) + '...' : 'No transcript'}</span>
        </div>
      `).join("");
    }
  } else {
    if (voiceNotesList) voiceNotesList.innerHTML = "";
    if (voiceNotesEmpty) voiceNotesEmpty.style.display = "block";
  }
}

async function handleJobSubmit(e) {
  e.preventDefault();

  const jobId = document.getElementById("job-id").value;
  const payload = {
    client_name: document.getElementById("job-client-name").value.trim(),
    address: document.getElementById("job-address").value.trim(),
    job_type: document.getElementById("job-type").value,
    notes: document.getElementById("job-notes").value.trim()
  };

  if (!payload.client_name) {
    showToast("Client name is required");
    return;
  }

  if (tourMode) {
    showToast(jobId ? "Job updated!" : "Job created!");
    showScreen("jobs");
    return;
  }

  try {
    let res;
    if (jobId) {
      res = await apiFetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } else {
      res = await apiFetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      showToast(jobId ? "Job updated!" : "Job created!");
      await loadJobs();
      showScreen("jobs");
    } else {
      const err = await res.json();
      showToast(err.error || "Failed to save job");
    }
  } catch (err) {
    console.error("Error saving job:", err);
    showToast("Error saving job");
  }
}

async function updateJobStatus(jobId, newStatus) {
  if (tourMode) {
    showToast(`Job marked as ${newStatus}!`);
    showScreen("jobs");
    return;
  }

  try {
    const res = await apiFetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });

    if (res.ok) {
      showToast(`Job marked as ${newStatus}!`);
      await loadJobs();
      showScreen("jobs");
    } else {
      showToast("Failed to update job status");
    }
  } catch (err) {
    console.error("Error updating job:", err);
    showToast("Error updating job");
  }
}

async function handleJobDelete() {
  if (!currentJob) return;

  if (!confirm("Are you sure you want to delete this job? This action cannot be undone.")) {
    return;
  }

  if (tourMode) {
    showToast("Job deleted!");
    showScreen("jobs");
    return;
  }

  try {
    const res = await apiFetch(`/api/jobs/${currentJob.id}`, {
      method: "DELETE"
    });

    if (res.ok) {
      showToast("Job deleted!");
      await loadJobs();
      showScreen("jobs");
    } else {
      showToast("Failed to delete job");
    }
  } catch (err) {
    console.error("Error deleting job:", err);
    showToast("Error deleting job");
  }
}

// Debounce helper for search input
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// NOTIFICATION CENTER

let allNotifications = [];

function wireNotificationsUI() {
  const btnNotifications = document.getElementById("btn-notifications");
  const notificationDropdown = document.getElementById("notification-dropdown");
  const btnMarkAllRead = document.getElementById("btn-mark-all-read");

  if (btnNotifications) {
    btnNotifications.addEventListener("click", (e) => {
      e.stopPropagation();
      notificationDropdown?.classList.toggle("hidden");
      if (!notificationDropdown?.classList.contains("hidden")) {
        loadNotifications();
      }
    });
  }

  if (btnMarkAllRead) {
    btnMarkAllRead.addEventListener("click", markAllNotificationsRead);
  }

  document.addEventListener("click", (e) => {
    const container = document.getElementById("notification-container");
    if (container && !container.contains(e.target)) {
      notificationDropdown?.classList.add("hidden");
    }
  });
}

async function loadNotifications() {
  if (tourMode) {
    allNotifications = [
      { id: 1, title: "Welcome to TradeBase!", content: "Thank you for joining. Start by creating your first quote!", message_type: "success", is_read: false, created_at: new Date().toISOString() },
      { id: 2, title: "Trial Reminder", content: "Your 14-day free trial has started. Enjoy all features!", message_type: "info", is_read: false, created_at: new Date(Date.now() - 86400000).toISOString() }
    ];
    renderNotifications(allNotifications);
    updateNotificationBadge();
    return;
  }

  try {
    const res = await apiFetch("/api/messages");
    if (res.ok) {
      allNotifications = await res.json();
      renderNotifications(allNotifications);
      updateNotificationBadge();
    }
  } catch (err) {
    console.error("Error loading notifications:", err);
  }
}

function renderNotifications(notifications) {
  const list = document.getElementById("notification-list");
  if (!list) return;

  if (!notifications || notifications.length === 0) {
    list.innerHTML = '<div class="notification-empty">No new notifications</div>';
    return;
  }

  list.innerHTML = notifications.map(notification => {
    const iconClass = getNotificationIconClass(notification.message_type);
    const iconName = getNotificationIcon(notification.message_type);
    const timeAgo = formatTimeAgo(notification.created_at);

    return `
      <div class="notification-item ${notification.is_read ? '' : 'unread'}" data-notification-id="${notification.id}" onclick="markNotificationRead(${notification.id})">
        <div class="notification-icon ${iconClass}">
          <i class="fa-solid ${iconName}"></i>
        </div>
        <div class="notification-content">
          <div class="notification-title">${notification.title}</div>
          <div class="notification-message">${notification.content}</div>
          <div class="notification-time">${timeAgo}</div>
        </div>
      </div>
    `;
  }).join("");
}

function getNotificationIconClass(type) {
  switch (type) {
    case "success": return "success";
    case "warning": return "warning";
    case "promo": return "promo";
    default: return "info";
  }
}

function getNotificationIcon(type) {
  switch (type) {
    case "success": return "fa-check-circle";
    case "warning": return "fa-exclamation-triangle";
    case "promo": return "fa-gift";
    default: return "fa-info-circle";
  }
}

function formatTimeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

function updateNotificationBadge() {
  const badge = document.getElementById("notification-badge");
  if (!badge) return;

  const unreadCount = allNotifications.filter(n => !n.is_read).length;

  if (unreadCount > 0) {
    badge.textContent = unreadCount > 99 ? "99+" : unreadCount;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}

async function markNotificationRead(notificationId) {
  if (tourMode) {
    const notification = allNotifications.find(n => n.id === notificationId);
    if (notification) {
      notification.is_read = true;
      renderNotifications(allNotifications);
      updateNotificationBadge();
    }
    return;
  }

  try {
    await apiFetch(`/api/messages/${notificationId}/read`, {
      method: "PATCH"
    });

    const notification = allNotifications.find(n => n.id === notificationId);
    if (notification) {
      notification.is_read = true;
      renderNotifications(allNotifications);
      updateNotificationBadge();
    }
  } catch (err) {
    console.error("Error marking notification as read:", err);
  }
}

async function markAllNotificationsRead() {
  if (tourMode) {
    allNotifications.forEach(n => n.is_read = true);
    renderNotifications(allNotifications);
    updateNotificationBadge();
    showToast("All notifications marked as read");
    return;
  }

  try {
    for (const notification of allNotifications.filter(n => !n.is_read)) {
      await apiFetch(`/api/messages/${notification.id}/read`, {
        method: "PATCH"
      });
      notification.is_read = true;
    }
    renderNotifications(allNotifications);
    updateNotificationBadge();
    showToast("All notifications marked as read");
  } catch (err) {
    console.error("Error marking all notifications as read:", err);
  }
}

// Fetch notifications on session start
async function checkAndLoadNotifications() {
  if (currentUser && !tourMode) {
    await loadNotifications();
  }
}

// VOICE RECORDING & TRANSCRIPTION

let mediaRecorder;
let recordingChunks = [];
let recordingTimer = null;
let recordingSeconds = 0;
let currentJobId = null;

function wireVoiceRecording() {
  const btnRecord = document.getElementById("btn-record-voice");
  const btnStop = document.getElementById("btn-stop-voice");
  const btnCancel = document.getElementById("btn-cancel-voice");

  if (btnRecord) {
    btnRecord.addEventListener("click", startJobVoiceRecording);
  }
  if (btnStop) {
    btnStop.addEventListener("click", stopVoiceRecording);
  }
  if (btnCancel) {
    btnCancel.addEventListener("click", cancelVoiceRecording);
  }
}

async function startJobVoiceRecording() {
  if (tourMode) {
    showDemoVoiceNote();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    recordingChunks = [];
    recordingSeconds = 0;

    mediaRecorder.addEventListener("dataavailable", (e) => {
      recordingChunks.push(e.data);
    });

    mediaRecorder.start();

    document.getElementById("btn-record-voice").classList.add("hidden");
    document.getElementById("btn-stop-voice").classList.remove("hidden");
    document.getElementById("btn-cancel-voice").classList.remove("hidden");
    document.getElementById("voice-timer").style.display = "inline";

    recordingTimer = setInterval(() => {
      recordingSeconds++;
      const mins = Math.floor(recordingSeconds / 60);
      const secs = recordingSeconds % 60;
      document.getElementById("voice-timer").textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }, 1000);

    showToast("Recording...");
  } catch (err) {
    console.error("Microphone error:", err);
    showToast("Microphone access denied");
  }
}

function stopVoiceRecording() {
  if (!mediaRecorder) return;

  mediaRecorder.stop();
  clearInterval(recordingTimer);

  mediaRecorder.addEventListener("stop", async () => {
    const audioBlob = new Blob(recordingChunks, { type: "audio/wav" });
    await uploadVoiceNote(audioBlob, recordingSeconds);
    
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    resetVoiceUI();
  });
}

function cancelVoiceRecording() {
  if (!mediaRecorder) return;

  mediaRecorder.stop();
  mediaRecorder.stream.getTracks().forEach(track => track.stop());
  clearInterval(recordingTimer);
  recordingChunks = [];
  resetVoiceUI();
  showToast("Recording cancelled");
}

function resetVoiceUI() {
  document.getElementById("btn-record-voice").classList.remove("hidden");
  document.getElementById("btn-stop-voice").classList.add("hidden");
  document.getElementById("btn-cancel-voice").classList.add("hidden");
  document.getElementById("voice-timer").style.display = "none";
  recordingSeconds = 0;
}

async function uploadVoiceNote(audioBlob, duration) {
  if (tourMode) {
    showToast("Voice notes disabled in demo mode");
    return;
  }

  try {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.wav");
    formData.append("job_id", currentJobId);
    formData.append("duration", duration);

    const res = await fetch("/api/voice-notes", {
      method: "POST",
      headers: { "Authorization": `Bearer ${currentUser?.access_token}` },
      body: formData
    });

    if (res.ok) {
      const data = await res.json();
      showToast("Voice note saved!");
      await loadJobDetail(currentJobId);
    } else {
      showToast("Failed to save voice note");
    }
  } catch (err) {
    console.error("Error uploading voice note:", err);
    showToast("Error uploading voice note");
  }
}

// REFERRAL STATS & INVITE TRACKING

async function loadReferralStats() {
  if (tourMode) {
    document.getElementById("referral-count").textContent = "3";
    document.getElementById("referral-month").textContent = "$120.00";
    document.getElementById("referral-lifetime").textContent = "$2,400.00";
    return;
  }

  try {
    const res = await apiFetch("/api/invites/stats");
    if (res.ok) {
      const stats = await res.json();
      document.getElementById("referral-count").textContent = stats.invites_sent;
      
      const badgeEl = document.getElementById("referral-badge");
      if (badgeEl) {
        if (stats.badge === "None") {
          badgeEl.classList.add("hidden");
        } else {
          badgeEl.classList.remove("hidden");
          badgeEl.textContent = `🏆 ${stats.badge}`;
          if (stats.badge === "Champion") badgeEl.style.color = "#fbbf24";
          else if (stats.badge === "Ambassador") badgeEl.style.color = "#a78bfa";
          else if (stats.badge === "Team Builder") badgeEl.style.color = "#60a5fa";
          else if (stats.badge === "First Referral") badgeEl.style.color = "#34d399";
        }
      }

      if (stats.bonus_days > 0) {
        showToast(`You've unlocked ${stats.bonus_days} bonus trial days!`);
      }
    }
  } catch (err) {
    console.error("Error loading referral stats:", err);
  }
}

async function sendInvite() {
  const emailInput = document.getElementById("invite-email");
  if (!emailInput) return;

  const email = emailInput.value;
  if (!email) {
    showToast("Please enter an email address");
    return;
  }

  try {
    const res = await apiFetch("/api/invites/send", {
      method: "POST",
      body: JSON.stringify({ email })
    });

    if (res.ok) {
      const data = await res.json();
      showToast(`Invite sent! You've sent ${data.invites_sent} invites.`);
      if (data.bonus_unlocked) {
        showToast(`🎉 Bonus unlocked: +${data.bonus_unlocked} days!`);
      }
      emailInput.value = "";
      await loadReferralStats();
    }
  } catch (err) {
    console.error("Error sending invite:", err);
    showToast("Failed to send invite");
  }
}

// ADMIN PANEL

let adminUsersList = [];
let selectedAdminUser = null;

function wireAdminPanel() {
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === "A") {
      e.preventDefault();
      if (isAdminUser && currentUser) {
        showScreen("admin");
        loadAdminUsers();
        showToast("Welcome to Admin Panel");
      } else {
        console.log("Admin access denied");
      }
    }
  });
}

async function loadAdminUsers() {
  if (!currentUser) return;

  try {
    const res = await apiFetch("/api/admin/users");
    if (res.ok) {
      const users = await res.json();
      adminUsersList = users;
      const list = document.getElementById("admin-users-list");
      if (list) {
        list.innerHTML = users.map(u => `
          <div class="list-item" onclick="selectAdminUser('${u.id}', '${u.email}')" style="cursor: pointer;">
            <div>${u.email}</div>
            <div style="font-size: 12px; color: var(--muted);">Joined ${new Date(u.created_at).toLocaleDateString()}</div>
          </div>
        `).join("");
      }
    }
  } catch (err) {
    console.error("Error loading admin users:", err);
  }
}

function toggleUserSearch(show) {
  const container = document.getElementById("admin-user-search-container");
  const sendBtn = document.getElementById("admin-send-btn");
  
  if (container) {
    container.style.display = show ? "block" : "none";
  }
  
  if (!show) {
    clearSelectedUser();
    if (sendBtn) sendBtn.textContent = "Send to All Users";
  }
}

function filterAdminUserList() {
  const searchInput = document.getElementById("admin-user-search");
  const resultsDiv = document.getElementById("admin-user-search-results");
  
  if (!searchInput || !resultsDiv) return;
  
  const query = searchInput.value.toLowerCase().trim();
  
  if (!query) {
    resultsDiv.style.display = "none";
    return;
  }
  
  const filtered = adminUsersList.filter(u => 
    u.email.toLowerCase().includes(query)
  ).slice(0, 10);
  
  if (filtered.length === 0) {
    resultsDiv.innerHTML = '<div style="padding: 12px; color: var(--muted);">No users found</div>';
  } else {
    resultsDiv.innerHTML = filtered.map(u => `
      <div class="list-item" style="cursor: pointer; padding: 10px 12px;" onclick="selectAdminUser('${u.id}', '${u.email}')">
        <div>${u.email}</div>
      </div>
    `).join("");
  }
  
  resultsDiv.style.display = "block";
}

function selectAdminUser(userId, email) {
  selectedAdminUser = { id: userId, email: email };
  
  const searchInput = document.getElementById("admin-user-search");
  const resultsDiv = document.getElementById("admin-user-search-results");
  const selectedDiv = document.getElementById("admin-selected-user");
  const selectedEmail = document.getElementById("admin-selected-user-email");
  const sendBtn = document.getElementById("admin-send-btn");
  
  if (searchInput) searchInput.value = "";
  if (resultsDiv) resultsDiv.style.display = "none";
  if (selectedDiv) selectedDiv.style.display = "block";
  if (selectedEmail) selectedEmail.textContent = email;
  if (sendBtn) sendBtn.textContent = `Send to ${email}`;
  
  // Scroll the selected user panel into view
  if (selectedDiv) selectedDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
  showToast(`Selected: ${email}`);
}

function clearSelectedUser() {
  selectedAdminUser = null;
  
  const searchInput = document.getElementById("admin-user-search");
  const selectedDiv = document.getElementById("admin-selected-user");
  const sendBtn = document.getElementById("admin-send-btn");
  const recipientRadio = document.querySelector('input[name="admin-recipient"][value="all"]');
  
  if (searchInput) searchInput.value = "";
  if (selectedDiv) selectedDiv.style.display = "none";
  
  const isSpecificSelected = document.querySelector('input[name="admin-recipient"][value="specific"]')?.checked;
  if (sendBtn) {
    sendBtn.textContent = isSpecificSelected ? "Select a user first" : "Send to All Users";
  }
}

async function enableAIForUser() {
  if (!selectedAdminUser) {
    showToast("Please select a user first");
    return;
  }
  
  try {
    const res = await apiFetch("/api/admin/enable-ai", {
      method: "POST",
      body: JSON.stringify({ 
        target_user_id: selectedAdminUser.id, 
        enabled: true 
      })
    });
    
    if (res.ok) {
      showToast(`AI enabled for ${selectedAdminUser.email}!`);
    } else {
      showToast("Failed to enable AI - check admin access");
    }
  } catch (err) {
    console.error("Error enabling AI:", err);
    showToast("Failed to enable AI");
  }
}

async function grantLifetimeToUser() {
  if (!selectedAdminUser) {
    showToast("Please select a user first");
    return;
  }
  
  try {
    const res = await apiFetch("/api/admin/grant-lifetime", {
      method: "POST",
      body: JSON.stringify({ email: selectedAdminUser.email })
    });
    
    if (res.ok) {
      showToast(`Lifetime membership granted to ${selectedAdminUser.email}!`);
    } else {
      const data = await res.json();
      showToast(data.error || "Failed to grant lifetime");
    }
  } catch (err) {
    console.error("Error granting lifetime:", err);
    showToast("Failed to grant lifetime membership");
  }
}

async function sendAdminMessage() {
  const titleEl = document.getElementById("admin-message-title");
  const contentEl = document.getElementById("admin-message-content");
  const typeEl = document.getElementById("admin-message-type");
  const isSpecific = document.querySelector('input[name="admin-recipient"][value="specific"]')?.checked;

  if (!titleEl || !contentEl) return;

  const title = titleEl.value;
  const content = contentEl.value;
  const message_type = typeEl?.value || "info";

  if (!title || !content) {
    showToast("Please fill in title and message");
    return;
  }

  if (isSpecific && !selectedAdminUser) {
    showToast("Please select a user first");
    return;
  }

  try {
    const payload = { 
      title, 
      content, 
      message_type, 
      target_users: isSpecific && selectedAdminUser ? [selectedAdminUser.id] : null 
    };

    const res = await apiFetch("/api/admin/send-message", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const recipient = isSpecific ? selectedAdminUser.email : "all users";
      showToast(`Message sent to ${recipient}!`);
      titleEl.value = "";
      contentEl.value = "";
      clearSelectedUser();
      document.querySelector('input[name="admin-recipient"][value="all"]').checked = true;
      toggleUserSearch(false);
    } else {
      showToast("Failed to send message - check admin access");
    }
  } catch (err) {
    console.error("Error sending admin message:", err);
    showToast("Failed to send message");
  }
}

// Check admin status after user logs in
async function checkAdminStatus() {
  const adminTile = document.getElementById("admin-tile-dashboard");
  const adminSettingsCard = document.getElementById("admin-settings-card");
  
  function setAdminUI(isAdmin) {
    if (adminTile) adminTile.style.display = isAdmin ? "flex" : "none";
    if (adminSettingsCard) adminSettingsCard.style.display = isAdmin ? "block" : "none";
  }
  
  if (!currentUser) {
    isAdminUser = false;
    setAdminUI(false);
    return;
  }

  try {
    const res = await apiFetch("/api/admin/check");
    const data = await res.json();
    console.log("Admin check response:", data);
    
    if (res.ok) {
      isAdminUser = data.is_admin;
      console.log("Is admin:", isAdminUser);
      setAdminUI(isAdminUser);
    } else {
      console.log("Admin check failed:", data);
      isAdminUser = false;
      setAdminUI(false);
    }
  } catch (err) {
    console.error("Admin check error:", err);
    isAdminUser = false;
    setAdminUI(false);
  }
}

// AI SUBSCRIPTION FUNCTIONS

async function checkAIStatus() {
  if (tourMode) {
    aiEnabled = true;
    updateAIUI({ ai_enabled: true, ai_plan: "monthly" });
    return;
  }

  if (!currentUser) {
    aiEnabled = false;
    updateAIUI();
    return;
  }

  try {
    const res = await apiFetch("/api/ai/status");
    if (res.ok) {
      const data = await res.json();
      aiEnabled = data.ai_enabled;
      updateAIUI(data);
    }
  } catch (err) {
    console.log("Error checking AI status:", err);
    aiEnabled = false;
    updateAIUI();
  }
}

function updateAIUI(data = {}) {
  const inactiveSection = document.getElementById("ai-status-inactive");
  const activeSection = document.getElementById("ai-status-active");
  const planDisplay = document.getElementById("ai-plan-display");
  const voiceRecorder = document.getElementById("voice-recorder");

  if (aiEnabled) {
    inactiveSection?.classList.add("hidden");
    activeSection?.classList.remove("hidden");
    voiceRecorder?.classList.remove("hidden");
    if (planDisplay && data.ai_plan) {
      planDisplay.textContent = data.ai_plan === "yearly" ? "Yearly" : "Monthly";
    }
  } else {
    inactiveSection?.classList.remove("hidden");
    activeSection?.classList.add("hidden");
    voiceRecorder?.classList.add("hidden");
  }
}

async function subscribeToAI(plan) {
  if (tourMode) {
    showToast("🚀 Sign up for a free trial to unlock AI Tools! Exit the demo to get started.");
    document.getElementById("btn-exit-tour")?.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  try {
    showToast("Redirecting to checkout...");
    const res = await apiFetch("/api/ai/subscribe", {
      method: "POST",
      body: JSON.stringify({ plan })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } else {
      const err = await res.json();
      showToast(err.error || "Failed to start checkout");
    }
  } catch (err) {
    console.error("Error subscribing to AI:", err);
    showToast("Failed to start AI subscription");
  }
}

function cancelAISubscription() {
  const modal = document.getElementById("cancel-ai-modal");
  const input = document.getElementById("cancel-ai-confirm-input");
  const confirmBtn = document.getElementById("cancel-ai-confirm-btn");
  
  if (modal && input && confirmBtn) {
    input.value = "";
    confirmBtn.disabled = true;
    confirmBtn.classList.add("disabled");
    modal.classList.add("active");
  }
}

function closeCancelAIModal() {
  const modal = document.getElementById("cancel-ai-modal");
  if (modal) {
    modal.classList.remove("active");
  }
}

function validateCancelAIInput() {
  const input = document.getElementById("cancel-ai-confirm-input");
  const confirmBtn = document.getElementById("cancel-ai-confirm-btn");
  
  if (input && confirmBtn) {
    const isValid = input.value.toLowerCase().trim() === "cancel";
    confirmBtn.disabled = !isValid;
    confirmBtn.classList.toggle("disabled", !isValid);
  }
}

async function confirmCancelAISubscription() {
  const input = document.getElementById("cancel-ai-confirm-input");
  
  if (input.value.toLowerCase().trim() !== "cancel") {
    showToast("Please type 'cancel' to confirm");
    return;
  }
  
  closeCancelAIModal();

  try {
    const res = await apiFetch("/api/ai/cancel", {
      method: "POST"
    });

    if (res.ok) {
      aiEnabled = false;
      updateAIUI();
      showToast("AI subscription canceled");
    } else {
      const err = await res.json();
      showToast(err.error || "Failed to cancel subscription");
    }
  } catch (err) {
    console.error("Error canceling AI subscription:", err);
    showToast("Failed to cancel AI subscription");
  }
}

// AI DO-ALL MENU
function wireAIDoAllMenu() {
  const doAllBtn = document.getElementById("btn-ai-do-all");
  const doAllMenu = document.getElementById("ai-do-all-menu");
  
  if (doAllBtn && doAllMenu) {
    doAllBtn.addEventListener("click", toggleAIDoAllMenu);
    
    document.addEventListener("click", (e) => {
      if (!doAllBtn.contains(e.target) && !doAllMenu.contains(e.target)) {
        closeAIDoAllMenu();
      }
    });
    
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeAIDoAllMenu();
      }
    });
  }
}

function toggleAIDoAllMenu() {
  const menu = document.getElementById("ai-do-all-menu");
  const btn = document.getElementById("btn-ai-do-all");
  
  if (menu && btn) {
    const isHidden = menu.classList.contains("hidden");
    if (isHidden) {
      menu.classList.remove("hidden");
      btn.classList.add("active");
    } else {
      menu.classList.add("hidden");
      btn.classList.remove("active");
    }
  }
}

function closeAIDoAllMenu() {
  const menu = document.getElementById("ai-do-all-menu");
  const btn = document.getElementById("btn-ai-do-all");
  
  if (menu && btn) {
    menu.classList.add("hidden");
    btn.classList.remove("active");
  }
}

// AI VOICE INVENTORY
async function startAIVoiceInventory() {
  closeAIDoAllMenu();
  
  if (tourMode) {
    showDemoAIVoiceInventory();
    return;
  }
  
  if (!aiEnabled) {
    showToast("AI subscription required. Enable in Settings.");
    return;
  }
  
  if (isRecording) {
    showToast("Already recording");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const chunks = [];

    showVoiceTranscriptModal("inventory");

    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/wav" });
      stream.getTracks().forEach(track => track.stop());
      await completeVoiceInventoryWorkflow(blob);
    };

    mediaRecorder.start();
    isRecording = true;
    window.currentMediaRecorder = mediaRecorder;
    window.currentVoiceStream = stream;

    window.voiceTimeout = setTimeout(() => {
      if (isRecording) {
        stopVoiceRecording();
      }
    }, 60000);

  } catch (err) {
    console.error("Microphone error:", err);
    showToast("Microphone access denied. Please allow microphone access.");
    hideVoiceTranscriptModal();
  }
}

async function completeVoiceInventoryWorkflow(audioBlob) {
  try {
    updateVoiceModalStatus("Transcribing audio...");
    
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.wav");
    
    const transcribeRes = await apiFetch("/api/ai/transcribe", {
      method: "POST",
      body: formData
    });
    
    if (!transcribeRes.ok) {
      throw new Error("Failed to transcribe audio");
    }
    
    const { transcript } = await transcribeRes.json();
    updateVoiceModalTranscript(transcript);
    updateVoiceModalStatus("Parsing inventory item...");
    
    const parseRes = await apiFetch("/api/ai/parse-inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript })
    });
    
    if (!parseRes.ok) {
      throw new Error("Failed to parse inventory data");
    }
    
    const parsed = await parseRes.json();
    updateVoiceModalStatus("Creating inventory item...");
    
    const itemData = {
      name: parsed.name || "Voice Item",
      quantity: parsed.quantity || 1,
      unit_price: parsed.unit_price || 0,
      category: parsed.category || "Other",
      notes: parsed.notes || ""
    };
    
    const saveRes = await apiFetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(itemData)
    });
    
    if (!saveRes.ok) {
      throw new Error("Failed to save inventory item");
    }
    
    hideVoiceTranscriptModal();
    showToast(`Added: ${itemData.quantity}x ${itemData.name} @ ${formatCurrency(itemData.unit_price)}`);
    await loadInventory();
    showScreen("inventory");
    
  } catch (error) {
    console.error("Voice inventory error:", error);
    hideVoiceTranscriptModal();
    showToast("Failed to add inventory item: " + error.message);
  }
}

function showDemoAIVoiceInventory() {
  showToast("Demo: Voice Add to Inventory");
  
  setTimeout(() => {
    showToast("Recording: '50 copper fittings, quarter inch, 2 dollars each'");
  }, 1000);
  
  setTimeout(() => {
    showToast("Demo: Added 50x 1/4\" Copper Fittings @ $2.00 each");
  }, 3000);
}

// AI VOICE INVOICE
async function startAIVoiceInvoice() {
  closeAIDoAllMenu();
  
  if (tourMode) {
    showDemoAIVoiceInvoice();
    return;
  }
  
  if (!aiEnabled) {
    showToast("AI subscription required. Enable in Settings.");
    return;
  }
  
  if (isRecording) {
    showToast("Already recording");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const chunks = [];

    showVoiceTranscriptModal("invoice");

    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/wav" });
      stream.getTracks().forEach(track => track.stop());
      await completeVoiceInvoiceWorkflow(blob);
    };

    mediaRecorder.start();
    isRecording = true;
    window.currentMediaRecorder = mediaRecorder;
    window.currentVoiceStream = stream;

    window.voiceTimeout = setTimeout(() => {
      if (isRecording) {
        stopVoiceRecording();
      }
    }, 60000);

  } catch (err) {
    console.error("Microphone error:", err);
    showToast("Microphone access denied. Please allow microphone access.");
    hideVoiceTranscriptModal();
  }
}

async function completeVoiceInvoiceWorkflow(audioBlob) {
  try {
    updateVoiceModalStatus("Transcribing audio...");
    
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.wav");
    
    const transcribeRes = await apiFetch("/api/ai/transcribe", {
      method: "POST",
      body: formData
    });
    
    if (!transcribeRes.ok) {
      throw new Error("Failed to transcribe audio");
    }
    
    const { transcript } = await transcribeRes.json();
    updateVoiceModalTranscript(transcript);
    updateVoiceModalStatus("Parsing invoice details...");
    
    const parseRes = await apiFetch("/api/ai/parse-quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript })
    });
    
    if (!parseRes.ok) {
      throw new Error("Failed to parse invoice data");
    }
    
    const parsed = await parseRes.json();
    updateVoiceModalStatus("Creating invoice...");
    
    let clientName = parsed.client_name || "";
    let clientId = null;
    
    if (clientName) {
      const clientRes = await apiFetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: clientName,
          address: parsed.address || "",
          email: "",
          phone: ""
        })
      });
      
      if (clientRes.ok) {
        const clientData = await clientRes.json();
        clientId = clientData.id;
      }
    }
    
    if (!clientName) {
      clientName = "Voice Invoice Client";
    }
    
    const lineItems = parsed.line_items && parsed.line_items.length > 0 
      ? parsed.line_items.map(item => ({
          description: item.description || parsed.job_type || "Service",
          qty: item.quantity || 1,
          unit_price: item.unit_price || 0,
          line_total: (item.quantity || 1) * (item.unit_price || 0)
        }))
      : [{
          description: parsed.job_type || "Service",
          qty: 1,
          unit_price: 0,
          line_total: 0
        }];
    
    const subtotal = lineItems.reduce((sum, item) => sum + item.line_total, 0);
    
    const invoiceData = {
      client_id: clientId,
      client_name: clientName,
      date: new Date().toISOString().split("T")[0],
      notes: parsed.notes || "",
      template: "basic_clean",
      subtotal: subtotal,
      tax: 0,
      total: subtotal,
      items: lineItems,
      status: "draft"
    };
    
    const res = await apiFetch("/api/invoices", {
      method: "POST",
      body: JSON.stringify(invoiceData)
    });
    
    if (!res.ok) {
      throw new Error("Failed to create invoice");
    }
    
    hideVoiceTranscriptModal();
    showToast(`Invoice created for ${clientName} - ${formatCurrency(subtotal)}`);
    await loadInvoices();
    showScreen("invoices");
    
  } catch (error) {
    console.error("Voice invoice error:", error);
    hideVoiceTranscriptModal();
    showToast("Failed to create invoice: " + error.message);
  }
}

function showDemoAIVoiceInvoice() {
  showToast("Demo: Voice Invoice Creator");
  
  setTimeout(() => {
    showToast("Recording: 'Invoice for Smith residence, water heater install, 850 dollars'");
  }, 1000);
  
  setTimeout(() => {
    showToast("Demo: Created invoice #INV-1001 for $850.00");
  }, 3000);
}

// AI VOICE CLIENT
async function startAIVoiceClient() {
  closeAIDoAllMenu();
  
  if (tourMode) {
    showDemoAIVoiceClient();
    return;
  }
  
  if (!aiEnabled) {
    showToast("AI subscription required. Enable in Settings.");
    return;
  }
  
  if (isRecording) {
    showToast("Already recording");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const chunks = [];

    showVoiceTranscriptModal("client");

    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/wav" });
      stream.getTracks().forEach(track => track.stop());
      await completeVoiceClientWorkflow(blob);
    };

    mediaRecorder.start();
    isRecording = true;
    window.currentMediaRecorder = mediaRecorder;
    window.currentVoiceStream = stream;

    window.voiceTimeout = setTimeout(() => {
      if (isRecording) {
        stopVoiceRecording();
      }
    }, 60000);

  } catch (err) {
    console.error("Microphone error:", err);
    showToast("Microphone access denied. Please allow microphone access.");
    hideVoiceTranscriptModal();
  }
}

async function completeVoiceClientWorkflow(audioBlob) {
  try {
    updateVoiceModalStatus("Transcribing audio...");
    
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.wav");
    
    const transcribeRes = await apiFetch("/api/ai/transcribe", {
      method: "POST",
      body: formData
    });
    
    if (!transcribeRes.ok) {
      throw new Error("Failed to transcribe audio");
    }
    
    const { transcript } = await transcribeRes.json();
    updateVoiceModalTranscript(transcript);
    updateVoiceModalStatus("Parsing client info...");
    
    const parseRes = await apiFetch("/api/ai/parse-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript })
    });
    
    if (!parseRes.ok) {
      throw new Error("Failed to parse client data");
    }
    
    const parsed = await parseRes.json();
    updateVoiceModalStatus("Creating client...");
    
    if (!parsed.name) {
      throw new Error("Could not extract client name from voice");
    }
    
    const clientData = {
      name: parsed.name,
      email: parsed.email || "",
      phone: parsed.phone || "",
      address: parsed.address || "",
      notes: parsed.notes || ""
    };
    
    const saveRes = await apiFetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clientData)
    });
    
    if (!saveRes.ok) {
      throw new Error("Failed to save client");
    }
    
    hideVoiceTranscriptModal();
    showToast(`Added client: ${clientData.name}`);
    await loadClients();
    showScreen("clients");
    
  } catch (error) {
    console.error("Voice client error:", error);
    hideVoiceTranscriptModal();
    showToast("Failed to add client: " + error.message);
  }
}

function showDemoAIVoiceClient() {
  showToast("Demo: Voice Add Client");
  
  setTimeout(() => {
    showToast("Recording: 'New client John Smith, phone 555-123-4567, email john@example.com'");
  }, 1000);
  
  setTimeout(() => {
    showToast("Demo: Added client John Smith to your list");
  }, 3000);
}

// AI VOICE QUOTE FLOW - Complete do-it-all feature with transcript modal
async function startAIVoiceQuoteFlow() {
  closeAIDoAllMenu();
  
  if (tourMode) {
    showDemoAIVoiceQuote();
    return;
  }

  if (!aiEnabled) {
    showToast("AI subscription required. Enable in Settings.");
    return;
  }

  if (isRecording) {
    showToast("Already recording");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const chunks = [];

    // Show the transcript modal
    showVoiceTranscriptModal();

    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/wav" });
      stream.getTracks().forEach(track => track.stop());
      await completeVoiceQuoteWorkflowWithModal(blob);
    };

    mediaRecorder.start();
    isRecording = true;
    window.currentMediaRecorder = mediaRecorder;
    window.currentVoiceStream = stream;

    // Auto-stop after 60 seconds (increased from 30)
    window.voiceTimeout = setTimeout(() => {
      if (isRecording) {
        stopVoiceRecording();
      }
    }, 60000);

  } catch (err) {
    console.error("Microphone error:", err);
    showToast("Microphone access denied. Please allow microphone access.");
    hideVoiceTranscriptModal();
  }
}

// Voice Transcript Modal Functions
function showVoiceTranscriptModal(type = "quote") {
  const modal = document.getElementById("voice-transcript-modal");
  if (modal) {
    modal.classList.add("active");
    
    let instructions = "";
    switch (type) {
      case "inventory":
        instructions = "Say: '50 copper fittings, quarter inch, 2 dollars each'";
        break;
      case "invoice":
        instructions = "Say: 'Invoice for [client] doing [job] for [amount]'";
        break;
      case "client":
        instructions = "Say: 'New client John Smith, phone 555-1234, email john@example.com'";
        break;
      default:
        instructions = "Say: 'Quote for [client] doing [job] at [address] for [amount]'";
    }
    
    updateVoiceStatus("recording", "Recording...", instructions);
    document.getElementById("voice-transcript-text").textContent = "Listening...";
    document.getElementById("btn-stop-voice").style.display = "inline-block";
    document.getElementById("btn-cancel-voice").style.display = "inline-block";
  }
}

function hideVoiceTranscriptModal() {
  const modal = document.getElementById("voice-transcript-modal");
  if (modal) {
    modal.classList.remove("active");
  }
}

function updateVoiceStatus(status, statusText, instructions) {
  const pulse = document.getElementById("voice-pulse");
  const statusTextEl = document.getElementById("voice-status-text");
  const instructionsEl = document.getElementById("voice-instructions");
  
  if (pulse) {
    pulse.className = "voice-pulse " + status;
  }
  if (statusTextEl) {
    statusTextEl.textContent = statusText;
  }
  if (instructionsEl && instructions) {
    instructionsEl.textContent = instructions;
  }
}

function updateVoiceTranscript(text) {
  const transcriptEl = document.getElementById("voice-transcript-text");
  if (transcriptEl) {
    transcriptEl.style.fontStyle = "normal";
    transcriptEl.textContent = text;
  }
}

function stopVoiceRecording() {
  if (window.voiceTimeout) {
    clearTimeout(window.voiceTimeout);
  }
  
  if (window.currentMediaRecorder && isRecording) {
    isRecording = false;
    window.currentMediaRecorder.stop();
    updateVoiceStatus("processing", "Processing...", "Transcribing your voice...");
    document.getElementById("btn-stop-voice").style.display = "none";
  }
}

function cancelVoiceRecording() {
  if (window.voiceTimeout) {
    clearTimeout(window.voiceTimeout);
  }
  
  isRecording = false;
  
  if (window.currentMediaRecorder) {
    try {
      window.currentMediaRecorder.stop();
    } catch (e) {}
  }
  
  if (window.currentVoiceStream) {
    window.currentVoiceStream.getTracks().forEach(track => track.stop());
  }
  
  hideVoiceTranscriptModal();
  showToast("Voice recording cancelled");
}

function stopVoiceAndCloseModal() {
  cancelVoiceRecording();
}

async function completeVoiceQuoteWorkflow(audioBlob) {
  if (!isRecording) return;
  isRecording = false;

  try {
    showToast("🎤 Transcribing...");

    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.wav");

    const res = await apiFetch("/api/ai/create-quote-full", {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      const err = await res.json();
      showToast(err.error || "Failed to create quote");
      return;
    }

    const result = await res.json();
    showToast(`✅ Quote created! #${result.quote_number} for ${result.client_name} - $${result.total.toFixed(2)}`);

    setTimeout(() => {
      goToScreen("quotes");
    }, 1000);
  } catch (err) {
    console.error("Voice quote workflow error:", err);
    showToast("Failed to create quote from voice");
  }
}

// New workflow with modal updates
async function completeVoiceQuoteWorkflowWithModal(audioBlob) {
  try {
    updateVoiceStatus("processing", "Transcribing...", "Converting your voice to text...");

    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.wav");

    // First, just transcribe to show the text
    const transcribeRes = await apiFetch("/api/ai/transcribe", {
      method: "POST",
      body: formData
    });

    if (!transcribeRes.ok) {
      const err = await transcribeRes.json();
      updateVoiceStatus("error", "Transcription Failed", err.error || "Could not understand audio");
      updateVoiceTranscript("Error: " + (err.error || "Failed to transcribe audio"));
      setTimeout(() => hideVoiceTranscriptModal(), 3000);
      return;
    }

    const { transcript } = await transcribeRes.json();
    
    // Show the transcript to user
    updateVoiceTranscript('"' + transcript + '"');
    updateVoiceStatus("processing", "Parsing...", "Extracting quote details...");

    // Now parse the transcript
    const parseRes = await apiFetch("/api/ai/parse-quote", {
      method: "POST",
      body: JSON.stringify({ transcript })
    });

    if (!parseRes.ok) {
      const err = await parseRes.json();
      updateVoiceStatus("error", "Parsing Failed", err.error || "Could not parse quote details");
      setTimeout(() => hideVoiceTranscriptModal(), 3000);
      return;
    }

    const parsed = await parseRes.json();
    
    // Show what was extracted
    let extractedInfo = `Client: ${parsed.client_name || 'Not found'}\n`;
    extractedInfo += `Job: ${parsed.job_type || 'Not specified'}\n`;
    extractedInfo += `Address: ${parsed.address || 'Not specified'}\n`;
    if (parsed.line_items && parsed.line_items.length > 0) {
      extractedInfo += `Items: ${parsed.line_items.length} line item(s)\n`;
      const total = parsed.line_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      extractedInfo += `Total: $${total.toFixed(2)}`;
    }
    
    updateVoiceTranscript(extractedInfo);
    updateVoiceStatus("processing", "Creating Quote...", "Saving to your quotes...");

    // Create the quote
    const quoteData = {
      transcript,
      parsed
    };

    const createRes = await apiFetch("/api/ai/create-quote-from-parsed", {
      method: "POST",
      body: JSON.stringify(quoteData)
    });

    if (!createRes.ok) {
      // Fall back to creating quote manually
      await createQuoteFromParsedData(parsed, transcript);
    } else {
      const result = await createRes.json();
      updateVoiceStatus("success", "Quote Created!", `Quote #${result.quote_number} - $${result.total.toFixed(2)}`);
      updateVoiceTranscript(`✅ Quote #${result.quote_number}\nClient: ${result.client_name}\nTotal: $${result.total.toFixed(2)}`);
      
      setTimeout(() => {
        hideVoiceTranscriptModal();
        goToScreen("quotes");
      }, 2000);
      return;
    }
    
  } catch (err) {
    console.error("Voice quote workflow error:", err);
    updateVoiceStatus("error", "Error", "Something went wrong");
    updateVoiceTranscript("Error: " + err.message);
    setTimeout(() => hideVoiceTranscriptModal(), 3000);
  }
}

// Create quote from parsed data using the standard API
async function createQuoteFromParsedData(parsed, transcript) {
  try {
    // Find or create client
    let clientId = null;
    let clientName = parsed.client_name || "Voice Quote Client";
    
    // Make sure clients array exists
    if (typeof clients === 'undefined' || !Array.isArray(clients)) {
      window.clients = [];
      // Try to load clients
      try {
        const clientsRes = await apiFetch("/api/clients");
        if (clientsRes.ok) {
          window.clients = await clientsRes.json();
        }
      } catch (e) {
        console.log("Could not load clients, will create new one");
      }
    }
    
    if (parsed.client_name) {
      const existingClient = (clients || []).find(c => 
        c.name && c.name.toLowerCase().includes(parsed.client_name.toLowerCase())
      );
      
      if (existingClient) {
        clientId = existingClient.id;
        clientName = existingClient.name;
      } else {
        // Create new client via API
        const clientRes = await apiFetch("/api/clients", {
          method: "POST",
          body: JSON.stringify({
            name: parsed.client_name,
            address: parsed.address || "",
            email: "",
            phone: ""
          })
        });
        
        if (clientRes.ok) {
          const newClient = await clientRes.json();
          clientId = newClient.id;
          if (Array.isArray(clients)) {
            clients.push(newClient);
          }
        }
      }
    } else {
      // No client name provided - create a generic one
      clientName = "Voice Quote Client";
    }

    // Build line items from parsed data
    const lineItems = parsed.line_items && parsed.line_items.length > 0 
      ? parsed.line_items.map(item => ({
          description: item.description || parsed.job_type || "Service",
          qty: item.quantity || 1,
          unit_price: item.unit_price || 0,
          line_total: (item.quantity || 1) * (item.unit_price || 0)
        }))
      : [{
          description: parsed.job_type || "Service",
          qty: 1,
          unit_price: 0,
          line_total: 0
        }];
    
    const subtotal = lineItems.reduce((sum, item) => sum + item.line_total, 0);
    const quoteNumber = `QT-${Date.now()}`;
    const clientAddress = parsed.address || "";
    
    // Only include actual notes, not the raw transcript
    const quoteNotes = parsed.notes && parsed.notes.trim() ? parsed.notes : "";
    
    // Create quote via API (same as normal quote creation)
    const quoteData = {
      client_id: clientId,
      client_name: clientName,
      client_address: clientAddress,
      client_email: "",
      quote_date: new Date().toISOString().split("T")[0],
      quote_number: quoteNumber,
      notes: quoteNotes,
      template: "basic_clean",
      subtotal: subtotal,
      tax: 0,
      total: subtotal,
      items: lineItems,
      status: "draft"
    };

    const res = await apiFetch("/api/quotes", {
      method: "POST",
      body: JSON.stringify(quoteData)
    });

    if (res.ok) {
      const result = await res.json();
      
      updateVoiceStatus("success", "Quote Created!", `Quote #${quoteNumber}`);
      updateVoiceTranscript(`✅ Quote #${quoteNumber}\nClient: ${clientName}\nTotal: $${subtotal.toFixed(2)}`);
      
      // Reload quotes list
      await loadQuotes();
      
      setTimeout(() => {
        hideVoiceTranscriptModal();
        goToScreen("quotes");
      }, 2000);
    } else {
      const errData = await res.json();
      throw new Error(errData.error || "Failed to save quote");
    }
  } catch (err) {
    console.error("Create quote error:", err);
    updateVoiceStatus("error", "Error", err.message || "Could not create quote");
    updateVoiceTranscript("Error: " + (err.message || "Could not create quote"));
    setTimeout(() => hideVoiceTranscriptModal(), 3000);
  }
}

// AI VOICE RECORDING FOR QUOTES/INVOICES
let voiceRecorder = null;
let isRecording = false;

async function startVoiceRecording(formType) {
  if (tourMode) {
    showDemoFormVoice(formType);
    return;
  }

  if (isRecording) {
    showToast("Already recording");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    voiceRecorder = new MediaRecorder(stream);
    const chunks = [];

    voiceRecorder.ondataavailable = (e) => chunks.push(e.data);
    voiceRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/wav" });
      stream.getTracks().forEach(track => track.stop());
      await transcribeAndParse(blob, formType);
    };

    voiceRecorder.start();
    isRecording = true;
    showToast("Recording... Tap again to stop");
    document.getElementById(`btn-${formType}-voice`).textContent = "⏹ Stop";
    document.getElementById(`btn-${formType}-voice`).style.backgroundColor = "#ef4444";
  } catch (err) {
    console.error("Microphone access error:", err);
    showToast("Microphone access denied. Please check browser permissions.");
  }
}

async function transcribeAndParse(audioBlob, formType) {
  if (!isRecording) return;

  isRecording = false;
  document.getElementById(`btn-${formType}-voice`).textContent = "🎤 Voice";
  document.getElementById(`btn-${formType}-voice`).style.backgroundColor = "#10b981";
  showToast("Transcribing...");

  try {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.wav");

    const transcribeRes = await apiFetch("/api/ai/transcribe", {
      method: "POST",
      body: formData
    });

    if (!transcribeRes.ok) {
      const err = await transcribeRes.json();
      showToast(err.error || "Transcription failed");
      return;
    }

    const { transcript } = await transcribeRes.json();
    showToast("Parsing...");

    const parseRes = await apiFetch("/api/ai/parse-quote", {
      method: "POST",
      body: JSON.stringify({ transcript })
    });

    if (!parseRes.ok) {
      const err = await parseRes.json();
      showToast(err.error || "Parsing failed");
      return;
    }

    const parsed = await parseRes.json();
    autoFillForm(formType, parsed, transcript);
  } catch (err) {
    console.error("AI error:", err);
    showToast("Failed to process audio");
  }
}

function autoFillForm(formType, parsed, transcript) {
  if (formType === "invoice") {
    const clientInput = document.getElementById("invoice-client-name");
    const notesInput = document.getElementById("invoice-notes");
    const lineItemsContainer = document.getElementById("line-items");

    if (parsed.client_name && clientInput) clientInput.value = parsed.client_name;
    if (parsed.notes && notesInput) {
      notesInput.value = (notesInput.value ? notesInput.value + "\n" : "") + parsed.notes;
    }

    if (parsed.line_items && Array.isArray(parsed.line_items)) {
      parsed.line_items.forEach(item => {
        addInvoiceLineItem(item.description, item.quantity || 1, item.unit_price || 0);
      });
    }

    showToast("Invoice fields auto-filled!");
  } else if (formType === "quote") {
    const clientInput = document.getElementById("quote-client-name");
    const notesInput = document.getElementById("quote-notes");
    const lineItemsContainer = document.getElementById("quote-line-items");

    if (parsed.client_name && clientInput) clientInput.value = parsed.client_name;
    if (parsed.notes && notesInput) {
      notesInput.value = (notesInput.value ? notesInput.value + "\n" : "") + parsed.notes;
    }

    if (parsed.line_items && Array.isArray(parsed.line_items)) {
      parsed.line_items.forEach(item => {
        addQuoteLineItem(item.description, item.quantity || 1, item.unit_price || 0);
      });
    }

    showToast("Quote fields auto-filled!");
  }
}

function addInvoiceLineItem(description = "", qty = 1, price = 0) {
  const container = document.getElementById("line-items");
  const id = Date.now();

  const html = `
    <div class="line-item" data-id="${id}">
      <input type="text" class="item-description" placeholder="Description" value="${description}" />
      <input type="number" class="item-qty" value="${qty}" min="1" />
      <input type="number" class="item-price" value="${price}" min="0" step="0.01" />
      <button type="button" class="btn-remove-item">Remove</button>
    </div>
  `;

  const elem = document.createElement("div");
  elem.innerHTML = html;
  container.appendChild(elem.firstElementChild);

  elem.querySelector(".btn-remove-item")?.addEventListener("click", (e) => {
    e.preventDefault();
    container.querySelector(`[data-id="${id}"]`)?.remove();
    updateInvoiceTotals();
  });

  updateInvoiceTotals();
}

function addQuoteLineItem(description = "", qty = 1, price = 0) {
  const container = document.getElementById("quote-line-items");
  const id = Date.now();

  const html = `
    <div class="line-item" data-id="${id}">
      <input type="text" class="item-description" placeholder="Description" value="${description}" />
      <input type="number" class="item-qty" value="${qty}" min="1" />
      <input type="number" class="item-price" value="${price}" min="0" step="0.01" />
      <button type="button" class="btn-remove-item">Remove</button>
    </div>
  `;

  const elem = document.createElement("div");
  elem.innerHTML = html;
  container.appendChild(elem.firstElementChild);

  elem.querySelector(".btn-remove-item")?.addEventListener("click", (e) => {
    e.preventDefault();
    container.querySelector(`[data-id="${id}"]`)?.remove();
    updateQuoteTotals();
  });

  updateQuoteTotals();
}

// INVENTORY MANAGEMENT

let inventoryFilterCategory = null;
let allInventoryItems = [];

function wireInventoryUI() {
  const btnNewInventory = document.getElementById("btn-new-inventory");
  if (btnNewInventory) {
    btnNewInventory.addEventListener("click", () => {
      document.getElementById("inventory-form-title").textContent = "Add Inventory Item";
      document.getElementById("inventory-item-id").value = "";
      document.getElementById("inventory-form").reset();
      document.getElementById("btn-delete-inventory").style.display = "none";
      
      if (inventoryFilterCategory) {
        document.getElementById("inventory-category").value = inventoryFilterCategory;
      }
      
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
  if (tourMode) {
    allInventoryItems = DEMO_DATA.inventory;
    renderInventoryList(allInventoryItems);
    return;
  }
  
  allInventoryItems = [];
  
  if (!currentUser) {
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) {
      currentUser = session.user;
    }
  }
  
  if (currentUser) {
    const localItems = await tradebaseDB.getInventory(currentUser.id);
    allInventoryItems = localItems || [];
  }
  
  if (navigator.onLine) {
    try {
      const res = await apiFetch("/api/inventory");
      if (res.ok) {
        const apiItems = await res.json();
        
        if (apiItems && Array.isArray(apiItems)) {
          for (const item of apiItems) {
            await tradebaseDB.saveInventory(item);
          }
          
          const mergedMap = new Map();
          apiItems.forEach(item => mergedMap.set(item.id, item));
          allInventoryItems.forEach(item => {
            if (!mergedMap.has(item.id)) {
              mergedMap.set(item.id, item);
            }
          });
          allInventoryItems = Array.from(mergedMap.values());
        }
      }
    } catch (err) {
      console.log('Using offline inventory:', err.message);
    }
  }

  renderInventoryList(allInventoryItems);
}

function filterInventoryByCategory(category) {
  inventoryFilterCategory = category;
  renderInventoryList(allInventoryItems);
}

function clearInventoryFilter() {
  inventoryFilterCategory = null;
  renderInventoryList(allInventoryItems);
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
    updateCategoryDatalist([]);
    updateCategoryDisplay([]);
    return;
  }

  let filteredItems = items;
  if (inventoryFilterCategory) {
    filteredItems = items.filter(item => item.category === inventoryFilterCategory);
  }

  emptyState.style.display = "none";

  let totalValue = 0;
  listContainer.innerHTML = "";
  
  if (inventoryFilterCategory) {
    const clearBtn = document.createElement("div");
    clearBtn.style.cssText = "margin-bottom: 16px; display: flex; align-items: center; gap: 8px;";
    clearBtn.innerHTML = `
      <span style="color: var(--muted); font-size: 14px;">
        <i class="fa-solid fa-filter"></i> Filtered by: <strong>${inventoryFilterCategory}</strong>
      </span>
      <button class="btn-secondary" style="padding: 4px 12px; font-size: 13px;" onclick="clearInventoryFilter()">
        <i class="fa-solid fa-xmark"></i> Clear Filter
      </button>
    `;
    listContainer.appendChild(clearBtn);
  }
  
  updateCategoryDatalist(items);
  updateCategoryDisplay(items);

  filteredItems.forEach((item) => {
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
            ${item.category ? `<span class="badge badge-category" style="font-size: 11px;"><i class="fa-solid fa-tag"></i> ${item.category}</span>` : ""}
          </div>
          ${item.description ? `<p style="color: var(--muted); margin: 4px 0; font-size: 14px;">${item.description}</p>` : ""}
          <div style="display: flex; gap: 16px; margin-top: 8px; font-size: 13px; color: var(--muted);">
            <span><i class="fa-solid fa-dollar-sign"></i> ${formatCurrency(unitPrice)} / ${item.unit_type || "each"}</span>
            ${itemValue > 0 ? `<span>Value: ${formatCurrency(itemValue)}</span>` : ""}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 24px; font-weight: bold; color: var(--primary);">${quantity}</div>
          <div style="font-size: 12px; color: var(--muted); margin-top: 2px;">${item.unit_type || "each"}</div>
          ${isLowStock ? '<div style="margin-top: 6px;"><span class="badge badge-danger" style="font-size: 11px;">⚠️ Low Stock</span></div>' : '<div style="margin-top: 6px;"><span class="badge badge-success" style="font-size: 11px;">✓ In Stock</span></div>'}
        </div>
      </div>
    `;

    card.addEventListener("click", () => editInventoryItem(item));
    listContainer.appendChild(card);
  });

  totalValueEl.textContent = formatCurrency(totalValue);
  itemCountEl.textContent = filteredItems.length;
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
    created_at: itemId ? undefined : new Date().toISOString()
  };

  try {
    if (!navigator.onLine) {
      if (itemId) {
        payload.id = itemId;
        await saveOffline('inventory', payload, `/api/inventory/${itemId}`, 'PATCH');
        showToast("📱 Item updated offline. Will sync when online.");
      } else {
        payload.id = generateOfflineId();
        await saveOffline('inventory', payload, '/api/inventory', 'POST');
        showToast("📱 Item saved offline. Will sync when online.");
      }
      showScreen("inventory");
      loadInventory();
      return;
    }

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

    const data = await res.json();
    payload.id = data.id;
    await tradebaseDB.saveInventory(payload);

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

function updateCategoryDatalist(items) {
  const datalist = document.getElementById("inventory-category-datalist");
  if (!datalist) return;

  const categories = new Set();
  items.forEach(item => {
    if (item.category && item.category.trim()) {
      categories.add(item.category.trim());
    }
  });

  datalist.innerHTML = "";
  Array.from(categories).sort().forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    datalist.appendChild(option);
  });
}

function updateCategoryDisplay(items) {
  const categoriesCard = document.getElementById("inventory-categories-card");
  const categoriesList = document.getElementById("inventory-categories-list");
  
  if (!categoriesCard || !categoriesList) return;

  const categories = new Set();
  items.forEach(item => {
    if (item.category && item.category.trim()) {
      categories.add(item.category.trim());
    }
  });

  if (categories.size === 0) {
    categoriesCard.style.display = "none";
    return;
  }

  categoriesCard.style.display = "block";
  categoriesList.innerHTML = "";

  Array.from(categories).sort().forEach(category => {
    const badge = document.createElement("span");
    badge.className = inventoryFilterCategory === category ? "badge badge-category active" : "badge badge-category";
    badge.style.cssText = "font-size: 13px; padding: 6px 12px;";
    badge.innerHTML = `<i class="fa-solid fa-tag"></i> ${category}`;
    badge.addEventListener("click", () => filterInventoryByCategory(category));
    categoriesList.appendChild(badge);
  });
}
