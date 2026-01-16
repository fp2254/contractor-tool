// BUILD VERSION - Used for cache busting
const BUILD_VERSION = 136;
window.__BUILD_VERSION__ = BUILD_VERSION;
console.log('[Skippy Stack] Build version:', BUILD_VERSION);

// Global error handler to prevent uncaught errors from breaking the app
window.onerror = function(message, source, lineno, colno, error) {
  console.error('[Global Error]', message, 'at', source, lineno, colno);
  console.error('[Global Error] Stack:', error?.stack);
  // Don't let errors propagate and break UI
  return true;
};

window.addEventListener('unhandledrejection', function(event) {
  console.error('[Unhandled Promise Rejection]', event.reason);
  event.preventDefault();
});

// DEBUG PANEL STATE (TEMPORARY)
window.debugState = {
  lastSaveResult: null,
  lastError: null,
  lastSyncError: null
};

function showDebugPanel() {
  const panel = document.getElementById('debug-panel');
  if (panel) {
    panel.style.display = 'block';
    refreshDebugPanel();
  }
}

async function refreshDebugPanel() {
  try {
    const userEl = document.getElementById('debug-user');
    const countEl = document.getElementById('debug-local-count');
    const saveEl = document.getElementById('debug-last-save');
    const errorEl = document.getElementById('debug-last-error');
    
    // Get current user
    const userId = currentUser?.id || 'not logged in';
    if (userEl) userEl.textContent = `user_id: ${userId.substring(0, 8)}...`;
    
    // Get local invoice count
    if (currentUser) {
      const invoices = await tradebaseDB.getInvoices(currentUser.id);
      const unsynced = invoices?.filter(i => i.sync_status === 'unsynced') || [];
      if (countEl) countEl.textContent = `local: ${invoices?.length || 0} (${unsynced.length} unsynced)`;
    } else {
      if (countEl) countEl.textContent = 'local: N/A (not logged in)';
    }
    
    // Show last save result
    if (saveEl) saveEl.textContent = `save: ${window.debugState.lastSaveResult || '--'}`;
    
    // Show last error
    const lastErr = window.debugState.lastError || window.debugState.lastSyncError;
    if (errorEl) errorEl.textContent = `error: ${lastErr || 'none'}`;
  } catch (e) {
    console.error('[Debug Panel]', e);
  }
}

// Triple-tap on header to show debug panel
document.addEventListener('click', (() => {
  let tapCount = 0;
  let lastTap = 0;
  return (e) => {
    const now = Date.now();
    if (now - lastTap < 500) {
      tapCount++;
      if (tapCount >= 3) {
        showDebugPanel();
        tapCount = 0;
      }
    } else {
      tapCount = 1;
    }
    lastTap = now;
  };
})());

// API_BASE_URL - use config.js value or default to same-origin for local dev
// In production, config.js sets this to the correct API domain
if (typeof window.API_BASE_URL === 'undefined') {
  window.API_BASE_URL = "";
}
console.log('[Skippy Stack] API_BASE_URL:', JSON.stringify(window.API_BASE_URL));

// Automatic version check and cache bust
(async function checkVersionAndBust() {
  try {
    const res = await fetch('/api/version', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const serverVersion = data.version;
      console.log('[Version Check] Client:', BUILD_VERSION, 'Server:', serverVersion);
      
      if (serverVersion > BUILD_VERSION) {
        console.log('[Version Check] Stale code detected! Forcing cache clear...');
        
        // Unregister all service workers
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) {
            await reg.unregister();
          }
        }
        
        // Clear all caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          for (const name of cacheNames) {
            await caches.delete(name);
          }
        }
        
        // Force hard reload
        window.location.reload(true);
        return;
      }
    }
  } catch (e) {
    console.log('[Version Check] Could not check version:', e);
  }
})();

// SERVICE WORKER REGISTRATION - DISABLED (self-destruct mode)
// Re-enable once caching issues are resolved
if (false && 'serviceWorker' in navigator) {
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
let editingInvoiceId = null;
let editingQuoteId = null;

function toggleMoreOptions(btn) {
  btn.classList.toggle('expanded');
  const section = btn.nextElementSibling;
  if (section && section.classList.contains('more-options-section')) {
    section.classList.toggle('expanded');
  }
}

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
      invoice_number: "INV-1001",
      client_name: "John Smith",
      client: { name: "John Smith", email: "john@example.com", phone: "(555) 234-5678", address: "456 Oak Ave" },
      issue_date: "2025-11-15",
      status: "sent",
      payment_status: "paid",
      paid_at: "2025-11-16T10:30:00Z",
      payment_url: "https://pay.stripe.com/demo-link-001",
      subtotal: 850.00,
      tax_amount: 72.25,
      total: 922.25,
      notes: "Water heater replacement - emergency service",
      created_at: "2025-11-15T10:00:00Z",
      items: [
        { description: "New Water Heater Unit", quantity: 1, unit_price: 550.00, total: 550.00 },
        { description: "Installation Labor", quantity: 3, unit_price: 100.00, total: 300.00 }
      ]
    },
    { 
      id: 2, 
      invoice_number: "INV-1002",
      client_name: "Sarah Johnson",
      client: { name: "Sarah Johnson", email: "sarah@example.com", phone: "(555) 345-6789", address: "789 Pine St" },
      issue_date: "2025-11-18",
      status: "draft",
      payment_status: "unpaid",
      payment_url: "https://pay.stripe.com/demo-link-002",
      subtotal: 450.00,
      tax_amount: 38.25,
      total: 488.25,
      notes: "Kitchen sink repair",
      created_at: "2025-11-18T14:30:00Z",
      items: [
        { description: "Kitchen Faucet Replacement", quantity: 1, unit_price: 250.00, total: 250.00 },
        { description: "Under-Sink Pipe Repair", quantity: 1, unit_price: 200.00, total: 200.00 }
      ]
    },
    { 
      id: 3, 
      invoice_number: "INV-1003",
      client_name: "Mike Davis",
      client: { name: "Mike Davis", email: "mike@example.com", phone: "(555) 456-7890", address: "321 Elm Dr" },
      issue_date: "2025-11-20",
      status: "sent",
      payment_status: "pending",
      payment_url: null,
      subtotal: 325.00,
      tax_amount: 27.63,
      total: 352.63,
      notes: "Drain cleaning service",
      created_at: "2025-11-20T09:00:00Z",
      items: [
        { description: "Main Line Drain Cleaning", quantity: 1, unit_price: 275.00, total: 275.00 },
        { description: "Camera Inspection", quantity: 1, unit_price: 50.00, total: 50.00 }
      ]
    }
  ],
  quotes: [
    {
      id: 1,
      quote_number: "QUO-2001",
      client_name: "Mike Davis",
      client: { name: "Mike Davis", email: "mike@example.com", phone: "(555) 456-7890", address: "321 Elm Dr" },
      issue_date: "2025-11-20",
      status: "sent",
      subtotal: 2400.00,
      tax_amount: 204.00,
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
        
        // SANITIZE UUID FIELDS - convert empty strings to null before sending to server
        const uuidFields = ['client_id', 'job_id', 'address_id', 'customer_id', 'org_id', 'quote_id', 'invoice_id'];
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        uuidFields.forEach(field => {
          if (payload[field] !== undefined) {
            if (!payload[field] || payload[field] === "" || !isValidUUID.test(payload[field])) {
              console.log(`[SYNC] Sanitizing ${field}: "${payload[field]}" -> null`);
              payload[field] = null;
            }
          }
        });
        
        // Ensure items array exists and is valid for invoices/quotes
        if ((item.storeName === 'invoices' || item.storeName === 'quotes') && !Array.isArray(payload.items)) {
          console.log(`[SYNC] Converting items to empty array (was ${typeof payload.items})`);
          payload.items = [];
        }
        
        console.log(`[SYNC] Sending to ${item.endpoint}:`, JSON.stringify(payload, null, 2));
        
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

// OFFLINE-FIRST: Sync unsynced invoices to server
async function syncInvoicesManually() {
  if (!navigator.onLine) {
    showToast('You are offline. Connect to sync invoices.', 'warning');
    return;
  }
  
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) {
    showToast('Please log in to sync invoices.', 'error');
    return;
  }
  const userId = session.user.id;
  
  const syncBtn = document.getElementById('btn-sync-invoices');
  const syncIcon = document.getElementById('sync-icon');
  if (syncBtn) syncBtn.classList.add('syncing');
  
  try {
    const unsyncedInvoices = await tradebaseDB.getUnsyncedInvoices(userId);
    console.log(`[SYNC] Found ${unsyncedInvoices.length} unsynced invoices`);
    
    if (!unsyncedInvoices.length) {
      showToast('All invoices are already synced!', 'success');
      return;
    }
    
    let syncedCount = 0;
    let failedCount = 0;
    
    for (const invoice of unsyncedInvoices) {
      try {
        // Build sync payload - explicitly include items array
        const syncPayload = {
          client_id: invoice.client_id,
          client_name: invoice.client_name,
          client_address: invoice.client_address,
          issue_date: invoice.issue_date,
          notes: invoice.notes,
          template: invoice.template,
          payment_url: invoice.payment_url,
          subtotal: invoice.subtotal,
          tax_amount: invoice.tax_amount,
          total: invoice.total,
          status: invoice.status || 'draft',
          payment_status: invoice.payment_status || 'unpaid',
          items: invoice.items || [] // CRITICAL: Include line items!
        };
        
        // Sanitize UUID fields
        const uuidFields = ['client_id', 'job_id'];
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        uuidFields.forEach(field => {
          if (syncPayload[field] && !isValidUUID.test(syncPayload[field])) {
            syncPayload[field] = null;
          }
        });
        
        console.log(`[SYNC] Syncing invoice with ${syncPayload.items?.length || 0} line items`);
        console.log('[SYNC] Full payload:', JSON.stringify(syncPayload, null, 2));
        
        const res = await apiFetch('/api/invoices', {
          method: 'POST',
          body: JSON.stringify(syncPayload)
        });
        
        if (res.ok) {
          const data = await res.json();
          await tradebaseDB.markInvoiceSynced(invoice.id, data.id);
          syncedCount++;
          console.log(`[SYNC] Invoice ${invoice.id} synced as ${data.id}`);
          window.debugState.lastSyncError = null;
        } else {
          const errText = await res.text();
          console.error(`[SYNC] Failed to sync invoice ${invoice.id}: HTTP ${res.status}`, errText);
          window.debugState.lastSyncError = `HTTP ${res.status}: ${errText.substring(0, 80)}`;
          await tradebaseDB.markInvoiceSyncFailed(invoice.id, `HTTP ${res.status}: ${errText.substring(0, 100)}`);
          failedCount++;
        }
      } catch (err) {
        console.error(`[SYNC] Exception syncing invoice ${invoice.id}:`, err);
        window.debugState.lastSyncError = `Exception: ${err.message}`;
        await tradebaseDB.markInvoiceSyncFailed(invoice.id, err.message);
        failedCount++;
      }
    }
    
    if (syncedCount > 0) {
      showToast(`Synced ${syncedCount} invoice(s) to cloud!`, 'success');
    }
    if (failedCount > 0) {
      showToast(`${failedCount} invoice(s) failed to sync`, 'error');
    }
    
    // Refresh invoice list to show updated sync status
    await loadInvoices();
    updateSyncBadge();
    
  } catch (err) {
    console.error('[SYNC] Error:', err);
    showToast('Sync failed: ' + err.message, 'error');
  } finally {
    if (syncBtn) syncBtn.classList.remove('syncing');
  }
}

// Update the sync count badge
async function updateSyncBadge() {
  const badge = document.getElementById('sync-count-badge');
  if (!badge) return;
  
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) {
      badge.style.display = 'none';
      return;
    }
    
    const unsyncedCount = await tradebaseDB.getUnsyncedCount(session.user.id);
    if (unsyncedCount > 0) {
      badge.textContent = unsyncedCount;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  } catch (err) {
    console.error('[updateSyncBadge] Error:', err);
    badge.style.display = 'none';
  }
}

// Check for unsynced invoices before logout
async function checkUnsyncedBeforeLogout() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) return true; // Allow logout if no session
    
    const unsyncedCount = await tradebaseDB.getUnsyncedCount(session.user.id);
    if (unsyncedCount > 0) {
      const proceed = confirm(
        `You have ${unsyncedCount} invoice(s) not synced to the cloud.\n\n` +
        `If you log out now, these invoices will only exist on this device.\n\n` +
        `Do you want to log out anyway?`
      );
      return proceed;
    }
    return true;
  } catch (err) {
    console.error('[checkUnsyncedBeforeLogout] Error:', err);
    return true; // Allow logout on error
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // Update visible build version on dashboard - fetch dynamic BUILD_ID from server
  const buildVersionEl = document.getElementById('build-version');
  if (buildVersionEl) {
    try {
      const versionRes = await fetch('/api/version', { cache: 'no-store' });
      if (versionRes.ok) {
        const versionData = await versionRes.json();
        buildVersionEl.textContent = `Build v${versionData.version} | ${versionData.buildId}`;
        console.log('[BUILD_ID] Displaying:', versionData.buildId);
      } else {
        buildVersionEl.textContent = `Build v${BUILD_VERSION}`;
      }
    } catch (e) {
      buildVersionEl.textContent = `Build v${BUILD_VERSION}`;
    }
  }
  
  loadTheme();
  wireLandingPageUI();
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
  wireQuickPayModal();
  wireAIDoAllMenu();
  wireAdminPanel();
  initCalendar();
  
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
      const submitBtn = emailInvoiceForm.querySelector('button[type="submit"]');
      
      if (invoiceId && recipientEmail && recipientName) {
        // Show sending state
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="spinner-small"></span> Sending...';
        }
        
        await sendInvoiceEmail(invoiceId, recipientEmail, recipientName, submitBtn);
      }
    });
  }
});

// API FETCH HELPER (sends JWT token in Authorization header)
async function apiFetch(path, options = {}) {
  let session;
  
  // First attempt to get session
  try {
    const result = await sb.auth.getSession();
    session = result?.data?.session;
  } catch (sessionErr) {
    console.warn('[apiFetch] getSession failed:', sessionErr.message);
  }
  
  // If no session, try refreshing (handles Safari/iOS transient token loss)
  if (!session?.access_token) {
    try {
      const { data: refreshData, error: refreshError } = await sb.auth.refreshSession();
      if (!refreshError && refreshData?.session) {
        session = refreshData.session;
        console.log('[apiFetch] Session refreshed successfully');
      }
    } catch (refreshErr) {
      console.warn('[apiFetch] Session refresh failed:', refreshErr.message);
    }
  }
  
  if (session?.user) {
    currentUser = session.user;
  }

  const headers = options.headers ? { ...options.headers } : {};

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const apiBase = window.API_BASE_URL || API_BASE_URL || "";
  const fullUrl = `${apiBase}${path}`;
  
  const response = await fetch(fullUrl, {
    credentials: "include",
    ...options,
    headers,
  });

  // Handle error responses - but NEVER trigger logout
  if (!response.ok) {
    let errorText = '';
    let errorDetail = null;
    try {
      errorText = await response.text();
      try {
        errorDetail = JSON.parse(errorText);
      } catch (parseErr) {
        // Not JSON, use raw text
      }
    } catch (e) {
      errorText = `${response.status} ${response.statusText}`;
    }
    
    // Log errors for debugging but don't spam console
    if (response.status >= 500) {
      console.error('[apiFetch] Server error:', response.status, errorText.substring(0, 200));
    } else if (response.status === 401) {
      console.warn('[apiFetch] Auth error - token may need refresh');
      // NOTE: Do NOT logout on 401 - session might be transiently invalid
    }
    
    // For non-special status codes, throw with actual error detail
    // This lets the calling code handle the error gracefully
    if (response.status !== 402 && response.status !== 429) {
      const errorMessage = errorDetail?.error || errorDetail?.message || errorText || `${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }
  }

  // Handle subscription required error
  if (response.status === 402) {
    showScreen("subscription");
    throw new Error("Subscription required");
  }
  
  // Handle AI usage limit reached
  if (response.status === 429) {
    try {
      const errData = await response.clone().json();
      if (errData.needsUpgrade) {
        showToast(`AI limit reached! ${errData.actionsUsed}/${errData.actionsLimit} actions used. Resets ${new Date(errData.resetDate).toLocaleDateString()}.`);
        throw new Error(errData.message || "AI action limit reached");
      }
    } catch (e) {
      // If it's not our AI limit error, just throw generic
      showToast("Too many requests. Please try again later.");
      throw new Error("Rate limit exceeded");
    }
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
    const initials = getInitials(inv.client_name);
    const paymentStatus = inv.payment_status || 'unpaid';
    const statusIcon = paymentStatus === 'paid' ? '🟢' : paymentStatus === 'pending' ? '🟡' : '🔴';
    const statusLabel = paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1);
    
    const item = document.createElement("div");
    item.className = "list-item clickable";
    item.style.cursor = "pointer";
    item.innerHTML = `
      <div class="list-item-simple">
        <div class="client-avatar">${initials}</div>
        <div class="list-item-info">
          <div class="list-item-name">${inv.client_name}</div>
          <div class="list-item-meta">INV #${inv.invoice_number} • ${statusIcon} ${statusLabel}</div>
        </div>
        <div class="list-item-amount">$${inv.total.toFixed(2)}</div>
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
    const initials = getInitials(quote.client_name);
    const status = quote.status || 'draft';
    const statusIcon = status === 'accepted' ? '🟢' : status === 'sent' ? '🟡' : '⚪';
    const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
    
    const item = document.createElement("div");
    item.className = "list-item clickable";
    item.style.cursor = "pointer";
    item.innerHTML = `
      <div class="list-item-simple">
        <div class="client-avatar">${initials}</div>
        <div class="list-item-info">
          <div class="list-item-name">${quote.client_name}</div>
          <div class="list-item-meta">QUO #${quote.quote_number} • ${statusIcon} ${statusLabel}</div>
        </div>
        <div class="list-item-amount">$${quote.total.toFixed(2)}</div>
      </div>
    `;
    item.onclick = () => viewDemoQuoteDetail(quote);
    quotesList.appendChild(item);
  });
}

function viewDemoInvoiceDetail(invoice) {
  const titleEl = document.getElementById("invoice-detail-title");
  const contentEl = document.getElementById("invoice-detail-content");
  
  titleEl.textContent = `Invoice #${invoice.invoice_number}`;
  
  const paymentStatus = invoice.payment_status || 'unpaid';
  const paymentBadge = `<span class="payment-status-badge ${paymentStatus}">
    <i class="fa-solid ${paymentStatus === 'paid' ? 'fa-check-circle' : paymentStatus === 'pending' ? 'fa-clock' : 'fa-circle-xmark'}"></i>
    ${paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}
  </span>`;
  
  contentEl.innerHTML = `
    <div class="detail-header">
      <div class="detail-header-left">
        <h3>Invoice #${invoice.invoice_number}</h3>
        <p><strong>Date:</strong> ${invoice.issue_date}</p>
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
          <span class="detail-totals-value">${formatCurrency(invoice.subtotal || 0)}</span>
        </div>
        ${invoice.tax_amount ? `
          <div class="detail-totals-row">
            <span class="detail-totals-label">Tax:</span>
            <span class="detail-totals-value">${formatCurrency(invoice.tax_amount || 0)}</span>
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
        <p><strong>Date:</strong> ${quote.issue_date}</p>
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
        ${quote.tax_amount ? `
          <div class="detail-totals-row">
            <span class="detail-totals-label">Tax:</span>
            <span class="detail-totals-value">${formatCurrency(quote.tax_amount || 0)}</span>
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

// LANDING PAGE UI
function wireLandingPageUI() {
  const landingPage = document.getElementById("landing-page");
  const authContainer = document.getElementById("auth-container");
  
  if (!landingPage) return;
  
  // Show auth form with signup tab active
  function showSignup() {
    landingPage.classList.add("hidden");
    authContainer.classList.remove("hidden");
    document.getElementById("btn-show-signup").click();
  }
  
  // Show auth form with login tab active
  function showLogin() {
    landingPage.classList.add("hidden");
    authContainer.classList.remove("hidden");
    document.getElementById("btn-show-login").click();
  }
  
  // Back to landing page
  const backBtn = document.getElementById("btn-back-to-landing");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      authContainer.classList.add("hidden");
      landingPage.classList.remove("hidden");
    });
  }
  
  // Nav buttons
  const loginBtn = document.getElementById("lp-login-btn");
  const signupBtn = document.getElementById("lp-signup-btn");
  
  if (loginBtn) loginBtn.addEventListener("click", showLogin);
  if (signupBtn) signupBtn.addEventListener("click", showSignup);
  
  // Hero CTA
  const heroCta = document.getElementById("lp-hero-cta");
  if (heroCta) heroCta.addEventListener("click", showSignup);
  
  // Final CTA
  const finalCta = document.getElementById("lp-final-cta");
  if (finalCta) finalCta.addEventListener("click", showSignup);
  
  // Pricing buttons
  document.querySelectorAll(".lp-pricing-btn[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      showSignup();
    });
  });
  
  // FAQ accordion
  document.querySelectorAll(".lp-faq-question").forEach(btn => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".lp-faq-item");
      const isActive = item.classList.contains("active");
      
      // Close all
      document.querySelectorAll(".lp-faq-item").forEach(i => i.classList.remove("active"));
      
      // Open clicked if wasn't active
      if (!isActive) {
        item.classList.add("active");
      }
    });
  });
  
  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#lp-"]').forEach(anchor => {
    anchor.addEventListener("click", function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
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
  if (data && data.user && data.user.id && data.session) {
    try {
      // Store trade type in profile - use apiFetch with auth token
      const profileRes = await fetch("/api/profile", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${data.session.access_token}`
        },
        body: JSON.stringify({ 
          trade_type: tradeType,
          tos_accepted_at: new Date().toISOString()
        })
      });
      if (!profileRes.ok) {
        console.error("Profile creation failed:", await profileRes.text());
      }
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
  // Check for unsynced invoices before logout
  const canLogout = await checkUnsyncedBeforeLogout();
  if (!canLogout) {
    return; // User chose not to logout
  }
  
  // Clear all cached data to prevent cross-account data leakage
  try {
    await tradebaseDB.clearAll();
  } catch (err) {
    console.log("Could not clear local cache:", err.message || err);
  }
  
  // Clear any cached global state
  paymentLinksCache = [];
  aiEnabled = false;
  isAdminUser = false;
  
  await sb.auth.signOut();
  currentUser = null;
  document.getElementById("app-container").classList.add("hidden");
  document.getElementById("auth-container").classList.add("hidden");
  const landingPage = document.getElementById("landing-page");
  if (landingPage) landingPage.classList.remove("hidden");
}

async function checkSession() {
  // First attempt to get user
  let userData = null;
  
  try {
    const { data } = await sb.auth.getUser();
    userData = data?.user;
  } catch (e) {
    console.log('[checkSession] getUser failed, attempting refresh:', e.message);
  }
  
  // If no user, try refreshing the session (handles Safari/iOS transient issues)
  if (!userData) {
    try {
      const { data: refreshData, error: refreshError } = await sb.auth.refreshSession();
      if (!refreshError && refreshData?.session?.user) {
        userData = refreshData.session.user;
        console.log('[checkSession] Session refreshed successfully');
      }
    } catch (refreshErr) {
      console.log('[checkSession] Session refresh failed:', refreshErr.message);
    }
  }
  
  // Only proceed to login if we have a valid user
  if (userData) {
    currentUser = userData;
    await onLoggedIn();
  }
  // NOTE: Do NOT log out or show landing page here - only checkSession on initial load
  // Transient session loss should not force logout
}

async function onLoggedIn() {
  const landingPage = document.getElementById("landing-page");
  if (landingPage) landingPage.classList.add("hidden");
  document.getElementById("auth-container").classList.add("hidden");
  document.getElementById("app-container").classList.remove("hidden");
  
  // Load user preferences - auto-create profile if it doesn't exist
  try {
    const res = await apiFetch("/api/profile");
    if (res.ok) {
      const profile = await res.json();
      
      // If no profile exists, create one with trial
      if (!profile) {
        console.log("No profile found, creating one with trial...");
        const createRes = await apiFetch("/api/profile", {
          method: "POST",
          body: JSON.stringify({})
        });
        if (createRes.ok) {
          const newProfile = await createRes.json();
          console.log("Profile created with trial:", newProfile);
        } else {
          console.error("Failed to create profile");
        }
      } else {
        // Apply existing preferences
        if (profile.preferred_language && profile.preferred_language !== currentLanguage) {
          setLanguage(profile.preferred_language);
        }
        if (profile.preferred_template && profile.preferred_template !== currentTemplate) {
          setTemplate(profile.preferred_template);
        }
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

// QUICK PAY FUNCTIONS
let quickPayMethod = null;

function wireQuickPayModal() {
  const quickPayBtn = document.getElementById("btn-quick-pay");
  const closeBtn = document.getElementById("close-quick-pay-modal");
  const modal = document.getElementById("quick-pay-modal");
  const form = document.getElementById("quick-pay-form");
  
  if (quickPayBtn) {
    quickPayBtn.addEventListener("click", openQuickPayModal);
  }
  
  if (closeBtn) {
    closeBtn.addEventListener("click", closeQuickPayModal);
  }
  
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeQuickPayModal();
    });
  }
  
  if (form) {
    form.addEventListener("submit", handleQuickPaySubmit);
  }
}

function openQuickPayModal() {
  if (tourMode) {
    showToast("Quick Pay is disabled in demo mode");
    return;
  }
  
  const modal = document.getElementById("quick-pay-modal");
  if (modal) {
    modal.style.display = "block";
    document.getElementById("quick-pay-amount").value = "";
    document.getElementById("quick-pay-description").value = "";
    document.getElementById("quick-pay-phone").value = "";
    document.getElementById("quick-pay-email").value = "";
    document.getElementById("quick-pay-name").value = "";
    quickPayMethod = null;
    document.getElementById("quick-pay-phone-field").style.display = "none";
    document.getElementById("quick-pay-email-field").style.display = "none";
    document.getElementById("quick-pay-submit-section").style.display = "none";
    document.getElementById("quick-pay-method-text").classList.remove("active");
    document.getElementById("quick-pay-method-email").classList.remove("active");
    
    // Populate payment links dropdown
    populateQuickPayLinkSelector();
  }
}

function populateQuickPayLinkSelector() {
  const select = document.getElementById("quick-pay-link-select");
  const warning = document.getElementById("quick-pay-no-links-warning");
  if (!select) return;
  
  select.innerHTML = '<option value="">-- Select payment link --</option>';
  
  if (paymentLinksCache.length === 0) {
    warning.style.display = "block";
    return;
  }
  
  warning.style.display = "none";
  
  paymentLinksCache.forEach(link => {
    const providerName = link.provider.charAt(0).toUpperCase() + link.provider.slice(1);
    const displayLabel = link.label || providerName;
    const option = document.createElement("option");
    option.value = link.url;
    option.textContent = `${displayLabel}${link.is_default ? ' (Default)' : ''}`;
    if (link.is_default) option.selected = true;
    select.appendChild(option);
  });
}

function populateInvoiceLinkSelector(selectedUrl = null) {
  const select = document.getElementById("invoice-payment-link-select");
  const warning = document.getElementById("invoice-no-links-warning");
  if (!select) return;
  
  select.innerHTML = '<option value="">-- No payment link --</option>';
  
  if (paymentLinksCache.length === 0) {
    if (warning) warning.style.display = "block";
    return;
  }
  
  if (warning) warning.style.display = "none";
  
  paymentLinksCache.forEach(link => {
    const providerName = link.provider.charAt(0).toUpperCase() + link.provider.slice(1);
    const displayLabel = link.label || providerName;
    const option = document.createElement("option");
    option.value = link.url;
    option.textContent = `${displayLabel}${link.is_default ? ' (Default)' : ''}`;
    if (selectedUrl && link.url === selectedUrl) {
      option.selected = true;
    } else if (!selectedUrl && link.is_default) {
      option.selected = true;
    }
    select.appendChild(option);
  });
}

function closeQuickPayModal() {
  const modal = document.getElementById("quick-pay-modal");
  if (modal) modal.style.display = "none";
}

function showQuickPayLinkPopup(paymentLink, phone, message) {
  const existingPopup = document.getElementById("quick-pay-link-popup");
  if (existingPopup) existingPopup.remove();
  
  const popup = document.createElement("div");
  popup.id = "quick-pay-link-popup";
  popup.className = "modal active";
  popup.style.cssText = "display:flex; align-items:center; justify-content:center; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:9999;";
  popup.innerHTML = `
    <div style="background:var(--bg-card); padding:24px; border-radius:12px; max-width:400px; width:90%; text-align:center;">
      <h3 style="margin:0 0 16px; color:var(--text-primary);">Payment Link Created!</h3>
      <p style="color:var(--text-secondary); margin-bottom:16px;">Copy the message below and send it via text:</p>
      <textarea readonly style="width:100%; height:100px; padding:12px; border-radius:8px; border:1px solid var(--border); background:var(--bg-input); color:var(--text-primary); resize:none; font-size:14px;">${message}</textarea>
      <div style="display:flex; gap:12px; margin-top:16px;">
        <button onclick="copyQuickPayMessage()" style="flex:1; padding:12px; background:var(--accent); color:white; border:none; border-radius:8px; cursor:pointer; font-weight:600;">
          <i class="fa-solid fa-copy"></i> Copy Message
        </button>
        <button onclick="closeQuickPayLinkPopup()" style="flex:1; padding:12px; background:var(--bg-secondary); color:var(--text-primary); border:1px solid var(--border); border-radius:8px; cursor:pointer;">
          Close
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(popup);
  popup.addEventListener("click", (e) => {
    if (e.target === popup) closeQuickPayLinkPopup();
  });
}

function copyQuickPayMessage() {
  const textarea = document.querySelector("#quick-pay-link-popup textarea");
  if (textarea) {
    navigator.clipboard.writeText(textarea.value).then(() => {
      showToast("Message copied! Paste it in your texting app.");
    }).catch(() => {
      textarea.select();
      document.execCommand("copy");
      showToast("Message copied! Paste it in your texting app.");
    });
  }
}

function closeQuickPayLinkPopup() {
  const popup = document.getElementById("quick-pay-link-popup");
  if (popup) popup.remove();
}

function setQuickPayMethod(method) {
  quickPayMethod = method;
  const textBtn = document.getElementById("quick-pay-method-text");
  const emailBtn = document.getElementById("quick-pay-method-email");
  const phoneField = document.getElementById("quick-pay-phone-field");
  const emailField = document.getElementById("quick-pay-email-field");
  const submitSection = document.getElementById("quick-pay-submit-section");
  
  textBtn.classList.toggle("active", method === "text");
  emailBtn.classList.toggle("active", method === "email");
  textBtn.style.background = method === "text" ? "var(--accent)" : "";
  textBtn.style.color = method === "text" ? "white" : "";
  emailBtn.style.background = method === "email" ? "var(--accent)" : "";
  emailBtn.style.color = method === "email" ? "white" : "";
  
  phoneField.style.display = method === "text" ? "block" : "none";
  emailField.style.display = method === "email" ? "block" : "none";
  submitSection.style.display = "block";
}

async function handleQuickPaySubmit(e) {
  e.preventDefault();
  
  const amount = parseFloat(document.getElementById("quick-pay-amount").value);
  const description = document.getElementById("quick-pay-description").value.trim();
  const selectedPaymentLink = document.getElementById("quick-pay-link-select").value;
  
  if (!amount || amount <= 0) {
    showToast("Please enter a valid amount");
    return;
  }
  
  if (!selectedPaymentLink) {
    showToast("Please select a payment link");
    return;
  }
  
  if (!quickPayMethod) {
    showToast("Please select how to send the payment link");
    return;
  }
  
  const submitBtn = document.querySelector("#quick-pay-submit-section button");
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
  
  try {
    const message = `Hi! Here's your payment link for $${amount.toFixed(2)}${description ? ` (${description})` : ''}: ${selectedPaymentLink}`;
    
    if (quickPayMethod === "text") {
      const phone = document.getElementById("quick-pay-phone").value.trim();
      if (!phone) {
        showToast("Please enter a phone number");
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Payment Request';
        return;
      }
      
      // Try multiple methods to open SMS
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      
      // iOS uses different SMS URL format
      const smsUrl = isIOS 
        ? `sms:${phone}&body=${encodeURIComponent(message)}`
        : `sms:${phone}?body=${encodeURIComponent(message)}`;
      
      if (isMobile) {
        // On mobile, use location.href which works better for SMS links
        window.location.href = smsUrl;
        closeQuickPayModal();
        showToast("Opening your messaging app...");
      } else {
        // On desktop, show a popup with the link to copy
        closeQuickPayModal();
        showQuickPayLinkPopup(selectedPaymentLink, phone, message);
      }
      
    } else if (quickPayMethod === "email") {
      const email = document.getElementById("quick-pay-email").value.trim();
      const name = document.getElementById("quick-pay-name").value.trim();
      
      if (!email || !name) {
        showToast("Please enter email and name");
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Payment Request';
        return;
      }
      
      // Send email via server
      const res = await apiFetch("/api/quick-pay", {
        method: "POST",
        body: JSON.stringify({ amount, description, sendMethod: "email", email, name, payment_url: selectedPaymentLink })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send email");
      }
      
      const data = await res.json();
      
      if (data.sendResult?.sent) {
        closeQuickPayModal();
        showToast(`Payment request sent to ${email}!`);
      } else {
        showToast("Email failed to send. You can copy the link: " + selectedPaymentLink);
      }
    }
  } catch (err) {
    console.error("Quick pay error:", err);
    showToast(err.message || "Failed to send payment request");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Payment Request';
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

// Toggle More Tools section on dashboard
function toggleMoreTools() {
  const toggle = document.getElementById('more-tools-toggle');
  const secondary = document.getElementById('secondary-tiles');
  if (toggle && secondary) {
    toggle.classList.toggle('expanded');
    secondary.classList.toggle('expanded');
  }
}

function showScreen(screenId) {
  // Exit multi-select mode when changing screens
  if (typeof exitMultiSelectMode === 'function' && typeof multiSelectMode !== 'undefined' && multiSelectMode) {
    exitMultiSelectMode();
  }
  
  document.querySelectorAll(".screen").forEach((s) =>
    s.classList.remove("active")
  );
  const el = document.getElementById(`screen-${screenId}`);
  if (el) el.classList.add("active");
  
  // Apply translations when switching screens to ensure all text is in correct language
  applyLanguage();
  
  // Load calendar events when navigating to calendar screen
  if (screenId === "calendar") {
    loadCalendarEvents();
  }
  
  // Load activity log when navigating to activity-log screen
  if (screenId === "activity-log") {
    showActivityLog();
  }
}

// INITIAL LOAD

async function loadInitialData() {
  await Promise.all([
    loadClients(),
    loadInvoices(),
    loadQuotes(),
    loadSettings(),
    loadPaymentLinks(),
    loadReferralSummary(),
    loadPaymentStats(),
  ]);
  
  // Check for checkout success/cancel
  const params = new URLSearchParams(window.location.search);
  if (params.get("checkout") === "success") {
    showToast("Subscription activated! Welcome to Skippy Stack.");
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
    .addEventListener("click", openInlineAddClientModal);
    
  // Wire up inline client modal
  document.getElementById("close-inline-client-modal")?.addEventListener("click", closeInlineAddClientModal);
  document.getElementById("cancel-inline-client")?.addEventListener("click", closeInlineAddClientModal);
  document.getElementById("inline-client-form")?.addEventListener("submit", handleInlineAddClient);
  
  // Wire up client selection to auto-populate details
  document.getElementById("invoice-client-name")?.addEventListener("change", handleClientSelection);

  // Wire up invoice preview toggle
  const invoicePreviewToggle = document.getElementById("btn-invoice-preview-toggle");
  if (invoicePreviewToggle) {
    invoicePreviewToggle.addEventListener("click", toggleInvoicePreview);
  }

  // Wire up live preview updates
  document.getElementById("invoice-client-name").addEventListener("input", updateInvoicePreview);
  document.getElementById("invoice-date").addEventListener("change", updateInvoicePreview);
  const templateSelect = document.getElementById("invoice-template-select");
  if (templateSelect) {
    templateSelect.addEventListener("change", updateInvoicePreview);
  }
  document.getElementById("invoice-notes").addEventListener("input", updateInvoicePreview);

  // Wire up sync button for offline-first invoice syncing
  const syncBtn = document.getElementById("btn-sync-invoices");
  if (syncBtn) {
    syncBtn.addEventListener("click", syncInvoicesManually);
  }

  addLineItemRow();
}

function getSavedLineItems() {
  try {
    return JSON.parse(localStorage.getItem('tb_saved_line_items') || '[]');
  } catch {
    return [];
  }
}

function saveLineItem(description, price) {
  if (!description || !price) return;
  const items = getSavedLineItems();
  const existingIndex = items.findIndex(i => i.description.toLowerCase() === description.toLowerCase());
  if (existingIndex >= 0) {
    items[existingIndex].price = price;
    items[existingIndex].count = (items[existingIndex].count || 1) + 1;
  } else {
    items.push({ description, price, count: 1 });
  }
  items.sort((a, b) => (b.count || 1) - (a.count || 1));
  localStorage.setItem('tb_saved_line_items', JSON.stringify(items.slice(0, 50)));
}

function saveLineItemsFromUI() {
  const rows = document.querySelectorAll("#line-items .line-item-row, #quote-line-items .quote-line-item-row");
  rows.forEach(row => {
    const descInput = row.querySelector(".li-desc, .qli-desc");
    const priceInput = row.querySelector(".li-price, .qli-price");
    if (descInput && priceInput) {
      const desc = descInput.value.trim();
      const price = parseFloat(priceInput.value) || 0;
      if (desc && price > 0) saveLineItem(desc, price);
    }
  });
}

function addLineItemRow(item = { description: "", quantity: 1, unit_price: 0 }) {
  const container = document.getElementById("line-items");
  const row = document.createElement("div");
  row.className = "line-item-row";

  row.innerHTML = `
    <div class="li-desc-wrapper">
      <input type="text" class="li-desc" placeholder="${t('invoice.line_description_placeholder')}" value="${item.description}" autocomplete="off" />
      <div class="line-item-suggest hidden"></div>
    </div>
    <input type="number" class="li-qty" min="0" step="0.1" value="${item.quantity}" placeholder="${t('invoice.line_qty_placeholder')}" />
    <input type="number" class="li-price" min="0" step="0.01" value="${item.unit_price}" placeholder="${t('invoice.line_price_placeholder')}" />
    <button type="button" class="btn-remove-line">&times;</button>
  `;

  const descInput = row.querySelector(".li-desc");
  const suggestBox = row.querySelector(".line-item-suggest");
  const priceInput = row.querySelector(".li-price");
  
  descInput.addEventListener("input", () => {
    const query = descInput.value.trim().toLowerCase();
    if (query.length < 2) {
      suggestBox.classList.add("hidden");
      return;
    }
    const saved = getSavedLineItems();
    const matches = saved.filter(i => i.description.toLowerCase().includes(query)).slice(0, 5);
    if (matches.length === 0) {
      suggestBox.classList.add("hidden");
      return;
    }
    suggestBox.innerHTML = matches.map(m => `
      <div class="suggest-item" data-desc="${m.description}" data-price="${m.price}">
        <span class="suggest-desc">${m.description}</span>
        <span class="suggest-price">${formatCurrency(m.price)}</span>
      </div>
    `).join('');
    suggestBox.classList.remove("hidden");
    
    suggestBox.querySelectorAll(".suggest-item").forEach(el => {
      el.addEventListener("click", () => {
        descInput.value = el.dataset.desc;
        priceInput.value = el.dataset.price;
        suggestBox.classList.add("hidden");
        updateInvoiceTotals();
      });
    });
  });
  
  descInput.addEventListener("blur", () => {
    setTimeout(() => suggestBox.classList.add("hidden"), 150);
  });

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
        quantity: qty,
        unit_price: price,
        total: qty * price,
      });
    }
  });
  return items;
}

function updateInvoiceTotals() {
  const items = getLineItemsFromUI();
  let subtotal = 0;
  items.forEach((i) => (subtotal += i.total));

  const taxPercent =
    parseFloat(document.getElementById("helper-tax").value) || 0;
  const tax = subtotal * (taxPercent / 100);
  const total = subtotal + tax;

  document.getElementById("display-subtotal").textContent =
    formatCurrency(subtotal);
  document.getElementById("display-tax").textContent = formatCurrency(tax);
  document.getElementById("display-total").textContent = formatCurrency(total);
  
  // Update live preview if visible
  updateInvoicePreview();
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

// Loading state helper
function setButtonLoading(button, isLoading, originalText = null) {
  if (!button) return;
  if (isLoading) {
    button.disabled = true;
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
  } else {
    button.disabled = false;
    button.innerHTML = button.dataset.originalText || originalText || 'Save';
  }
}

// Submit invoice - v118 CLEAN REWRITE
// Minimal, reliable invoice save. One request. One response. No side effects.

async function handleInvoiceSubmit(e) {
  e.preventDefault();
  
  const errorEl = document.getElementById("invoice-error");
  const submitBtn = document.querySelector('#invoice-form button[type="submit"]');
  
  errorEl.textContent = "";
  setButtonLoading(submitBtn, true);

  try {
    // Get form values
    const clientName = document.getElementById("invoice-client-name").value.trim();
    const clientAddress = document.getElementById("invoice-client-address")?.value.trim() || null;
    const issueDate = document.getElementById("invoice-date").value || new Date().toISOString().split('T')[0];
    const notes = document.getElementById("invoice-notes").value.trim() || null;
    const template = document.getElementById("invoice-template-select")?.value || "basic_clean";
    const paymentUrl = document.getElementById("invoice-payment-url")?.value.trim() || null;
    
    // Basic validation
    if (!clientName) {
      errorEl.textContent = "Enter a client name.";
      setButtonLoading(submitBtn, false);
      return;
    }

    // Calculate totals from line items UI
    const items = getLineItemsFromUI();
    let subtotal = 0;
    items.forEach(i => subtotal += (i.total || 0));
    const taxPercent = parseFloat(document.getElementById("helper-tax")?.value) || 0;
    const taxAmount = subtotal * (taxPercent / 100);
    const total = subtotal + taxAmount;

    // Get client_id if selected (optional, must be valid UUID)
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const rawClientId = selectedClientData?.id || null;
    const clientId = (rawClientId && UUID_REGEX.test(rawClientId)) ? rawClientId : null;

    // Build payload - matches backend spec exactly
    // v126 FIX: Include items array so line items are saved to database!
    const payload = {
      client_id: clientId,
      job_id: null,
      client_name: clientName,
      client_address: clientAddress,
      issue_date: issueDate,
      notes: notes,
      template: template,
      payment_url: paymentUrl,
      subtotal: subtotal,
      tax_amount: taxAmount,
      total: total,
      items: items  // CRITICAL: This was missing - line items weren't being saved!
    };

    // v126 FIX: Check if editing existing invoice - use PUT for updates, POST for creates
    const isUpdate = !!editingInvoiceId;
    const url = isUpdate ? `/api/invoices/${editingInvoiceId}` : "/api/invoices";
    const method = isUpdate ? "PUT" : "POST";
    
    console.log(`[INVOICE v126] ${method} to ${url}:`, payload);

    // Single API call
    const res = await apiFetch(url, {
      method: method,
      body: JSON.stringify(payload)
    });

    // Handle response (200 for update, 201 for create)
    if (res.ok) {
      const data = await res.json();
      console.log(`[INVOICE v126] ${isUpdate ? 'Updated' : 'Created'}:`, data.invoice_number || data.id);
      
      // Clear any error state immediately on success
      errorEl.textContent = "";
      
      showToast(isUpdate ? "Invoice updated!" : "Invoice saved!");
      resetInvoiceForm();
      
      // Secondary requests in isolated try/catch - failures here should NOT show as save errors
      try {
        await loadInvoices();
      } catch (refreshErr) {
        console.warn('[INVOICE v126] Refresh failed (invoice was saved):', refreshErr);
      }
      
      showScreen("invoices");
    } else {
      // Error response
      let errorMsg = "Failed to save invoice. Please try again.";
      try {
        const errData = await res.json();
        if (errData.error) {
          // Sanitize server errors - don't expose technical details
          errorMsg = errData.error.includes('getaddrinfo') || errData.error.includes('ECONNREFUSED') 
            ? "Connection issue. Please try again." 
            : errData.error;
        }
      } catch (parseErr) {
        errorMsg = `Server error. Please try again.`;
      }
      errorEl.textContent = errorMsg;
      console.error('[INVOICE v118] Error:', errorMsg);
    }
  } catch (err) {
    console.error('[INVOICE v129] Exception:', err);
    // v129: Show actual error for debugging - will sanitize after we identify the issue
    errorEl.textContent = `Error: ${err.message || 'Unknown error'}`;
  } finally {
    setButtonLoading(submitBtn, false);
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

// EDIT INVOICE
function editInvoice(invoice) {
  editingInvoiceId = invoice.id;
  
  // IMPORTANT: Call showScreen FIRST because it calls applyLanguage() 
  // which would overwrite our custom title/button text
  showScreen('new-invoice');
  
  // Populate form fields AFTER showScreen
  document.getElementById("invoice-client-name").value = invoice.client_name || (invoice.client ? invoice.client.name : '');
  const addressField = document.getElementById("invoice-client-address");
  if (addressField) {
    addressField.value = invoice.client_address || (invoice.client ? invoice.client.address : '') || '';
  }
  document.getElementById("invoice-date").value = invoice.issue_date || new Date().toISOString().split('T')[0];
  document.getElementById("invoice-notes").value = invoice.notes || '';
  
  // Set template if exists
  const templateSelect = document.getElementById("invoice-template-select");
  if (templateSelect && invoice.template) {
    templateSelect.value = invoice.template;
  }
  
  // Populate and set payment link selector
  populateInvoiceLinkSelector(invoice.payment_url || null);
  
  // Set payment URL if exists
  const paymentUrlField = document.getElementById("invoice-payment-url");
  if (paymentUrlField) {
    paymentUrlField.value = invoice.payment_url || '';
  }
  
  // Clear existing line items and add invoice items
  const container = document.getElementById("line-items");
  container.innerHTML = "";
  
  const items = invoice.items || [];
  if (items.length > 0) {
    items.forEach(item => {
      addLineItemRow({
        description: item.description || '',
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0
      });
    });
  } else {
    addLineItemRow();
  }
  
  // Update totals
  updateInvoiceTotals();
  
  // Update form title AFTER showScreen (so applyLanguage doesn't overwrite it)
  const formTitle = document.querySelector('#new-invoice .screen-title');
  if (formTitle) {
    formTitle.textContent = `Edit Invoice #${invoice.invoice_number || invoice.id}`;
  }
  
  // Update submit button text AFTER showScreen
  const submitBtn = document.querySelector('#invoice-form button[type="submit"]');
  if (submitBtn) {
    submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Update Invoice';
  }
}

// Reset invoice form to create mode
function resetInvoiceForm() {
  editingInvoiceId = null;
  selectedClientData = null;
  document.getElementById("invoice-client-name").value = '';
  const addressField = document.getElementById("invoice-client-address");
  if (addressField) addressField.value = '';
  document.getElementById("invoice-date").value = new Date().toISOString().split('T')[0];
  document.getElementById("invoice-notes").value = '';
  
  // Reset payment URL field
  const paymentUrlField = document.getElementById("invoice-payment-url");
  if (paymentUrlField) {
    paymentUrlField.value = '';
  }
  
  // Reset payment link selector to default
  populateInvoiceLinkSelector(null);
  
  const container = document.getElementById("line-items");
  container.innerHTML = "";
  addLineItemRow();
  
  const formTitle = document.querySelector('#new-invoice .screen-title');
  if (formTitle) {
    formTitle.textContent = t('invoice.new_invoice') || 'New Invoice';
  }
  
  const submitBtn = document.querySelector('#invoice-form button[type="submit"]');
  if (submitBtn) {
    submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> ' + (t('invoice.save') || 'Save Invoice');
  }
  
  updateInvoiceTotals();
}

// EDIT QUOTE
function editQuote(quote) {
  editingQuoteId = quote.id;
  
  // IMPORTANT: Call showScreen FIRST because it calls applyLanguage() 
  // which would overwrite our custom title/button text
  showScreen('new-quote');
  
  // Populate form fields AFTER showScreen
  document.getElementById("quote-client-name").value = quote.client_name || (quote.client ? quote.client.name : '');
  document.getElementById("quote-date").value = quote.issue_date || new Date().toISOString().split('T')[0];
  document.getElementById("quote-notes").value = quote.notes || '';
  
  // Set valid until date if exists
  const validUntilEl = document.getElementById("quote-valid-until");
  if (validUntilEl && quote.due_date) {
    validUntilEl.value = quote.due_date;
  }
  
  // Set template if exists
  const templateSelect = document.getElementById("quote-template-select");
  if (templateSelect && quote.template) {
    templateSelect.value = quote.template;
  }
  
  // Clear existing line items and add quote items
  const container = document.getElementById("quote-line-items");
  container.innerHTML = "";
  
  const items = quote.items || [];
  if (items.length > 0) {
    items.forEach(item => {
      addQuoteLineItemRow({
        description: item.description || '',
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0
      });
    });
  } else {
    addQuoteLineItemRow();
  }
  
  // Update totals
  updateQuoteTotals();
  
  // Update form title AFTER showScreen (so applyLanguage doesn't overwrite it)
  const formTitle = document.querySelector('#new-quote .screen-title');
  if (formTitle) {
    formTitle.textContent = `Edit Quote #${quote.quote_number || quote.id}`;
  }
  
  // Update submit button text AFTER showScreen
  const submitBtn = document.querySelector('#quote-form button[type="submit"]');
  if (submitBtn) {
    submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Update Quote';
  }
}

// Reset quote form to create mode
function resetQuoteForm() {
  editingQuoteId = null;
  document.getElementById("quote-client-name").value = '';
  document.getElementById("quote-date").value = new Date().toISOString().split('T')[0];
  document.getElementById("quote-notes").value = '';
  
  const validUntilEl = document.getElementById("quote-valid-until");
  if (validUntilEl) validUntilEl.value = '';
  
  const container = document.getElementById("quote-line-items");
  container.innerHTML = "";
  addQuoteLineItemRow();
  
  const formTitle = document.querySelector('#new-quote .screen-title');
  if (formTitle) {
    formTitle.textContent = t('quote.new_quote') || 'New Quote';
  }
  
  const submitBtn = document.querySelector('#quote-form button[type="submit"]');
  if (submitBtn) {
    submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> ' + (t('quote.save') || 'Save Quote');
  }
  
  updateQuoteTotals();
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
      
      // Show "Add as Line Item" button if we came from quote context
      const useInQuoteBtn = document.getElementById("btn-calc-use-in-quote");
      if (useInQuoteBtn && calendarFromContext === 'quote') {
        useInQuoteBtn.style.display = "block";
      }
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
  
  // Wire up payment link button
  const addPaymentLinkBtn = document.getElementById("btn-add-payment-link");
  if (addPaymentLinkBtn) {
    addPaymentLinkBtn.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      showAddPaymentLinkModal();
    });
  }
  
  // Wire up warranty checkboxes for invoice and quote forms
  wireWarrantyCheckbox("invoice");
  wireWarrantyCheckbox("quote");
}

function wireWarrantyCheckbox(formType) {
  const checkbox = document.getElementById(`${formType}-include-warranty`);
  const container = document.getElementById(`${formType}-warranty-container`);
  const textarea = document.getElementById(`${formType}-warranty-text`);
  
  if (!checkbox || !container || !textarea) return;
  
  const updatePreview = formType === 'invoice' ? updateInvoicePreview : updateQuotePreview;
  
  checkbox.addEventListener("change", async () => {
    if (checkbox.checked) {
      container.classList.remove("hidden");
      // Load default warranty text from profile if textarea is empty
      if (!textarea.value.trim()) {
        try {
          const res = await apiFetch("/api/profile");
          if (res.ok) {
            const profile = await res.json();
            if (profile?.default_warranty_text) {
              textarea.value = profile.default_warranty_text;
            }
          }
        } catch (err) {
          console.log("Could not load default warranty text");
        }
      }
    } else {
      container.classList.add("hidden");
    }
    // Update preview to show/hide warranty text
    updatePreview();
  });
  
  // Also update preview when warranty text is edited
  textarea.addEventListener("input", updatePreview);
}

// Store selected client data for invoice/quote
let selectedClientData = null;

// Inline Add Client Modal functions
function openInlineAddClientModal() {
  const modal = document.getElementById("inline-add-client-modal");
  const form = document.getElementById("inline-client-form");
  
  // Pre-fill name from invoice form if typed
  const invoiceClientName = document.getElementById("invoice-client-name")?.value.trim();
  if (invoiceClientName) {
    document.getElementById("inline-client-name").value = invoiceClientName;
  } else {
    form.reset();
  }
  
  modal.style.display = "block";
}

function closeInlineAddClientModal() {
  const modal = document.getElementById("inline-add-client-modal");
  modal.style.display = "none";
}

async function handleInlineAddClient(e) {
  e.preventDefault();
  
  const name = document.getElementById("inline-client-name").value.trim();
  const email = document.getElementById("inline-client-email").value.trim();
  const phone = document.getElementById("inline-client-phone").value.trim();
  const address = document.getElementById("inline-client-address").value.trim();
  
  if (!name) {
    showToast("Client name is required");
    return;
  }
  
  const clientData = {
    name,
    phone,
    email,
    address,
    created_at: new Date().toISOString()
  };
  
  try {
    const res = await apiFetch("/api/clients", {
      method: "POST",
      body: JSON.stringify(clientData),
    });
    
    if (res.ok) {
      const data = await res.json();
      clientData.id = data.id;
      await tradebaseDB.saveClient(clientData);
      
      // Update the invoice form with the new client
      document.getElementById("invoice-client-name").value = name;
      selectedClientData = clientData;
      
      // Reload clients datalist
      await loadClients();
      
      closeInlineAddClientModal();
      showToast("Client added!");
      
      // Update preview
      updateInvoicePreview();
    } else {
      const errData = await res.json();
      showToast(`Failed: ${errData.error || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    console.error('Error adding client:', error);
    showToast('Error adding client: ' + error.message, 'error');
  }
}

// Handle client selection from datalist - auto-populate email/phone/address
async function handleClientSelection(e) {
  const clientName = e.target.value.trim();
  const addressSelect = document.getElementById("invoice-address-select");
  const addressInput = document.getElementById("invoice-client-address");
  
  // Reset address dropdown
  if (addressSelect) {
    addressSelect.innerHTML = '<option value="">-- Select a saved address --</option>';
    addressSelect.style.display = "none";
  }
  
  if (!clientName) {
    selectedClientData = null;
    return;
  }
  
  // Find client in local cache or API
  try {
    const res = await apiFetch("/api/clients");
    if (res.ok) {
      const clients = await res.json();
      const matchedClient = clients.find(c => c.name === clientName);
      
      if (matchedClient) {
        selectedClientData = matchedClient;
        console.log("Client selected:", selectedClientData);
        showToast(`Client loaded: ${matchedClient.name}`);
        
        // Load client's property addresses
        try {
          const addrRes = await apiFetch(`/api/clients/${matchedClient.id}/addresses`);
          if (addrRes.ok) {
            const addresses = await addrRes.json();
            
            if (addresses.length > 0) {
              // Show dropdown with saved addresses - use escapeHtml for XSS prevention
              addressSelect.innerHTML = '<option value="">-- Select a saved address --</option>';
              
              // Add default address from client record if exists
              if (matchedClient.address) {
                addressSelect.innerHTML += `<option value="${escapeHtml(matchedClient.address)}">Default: ${escapeHtml(matchedClient.address)}</option>`;
              }
              
              // Add property addresses
              addresses.forEach(addr => {
                addressSelect.innerHTML += `<option value="${escapeHtml(addr.address)}" ${addr.is_default ? 'selected' : ''}>${escapeHtml(addr.label)}: ${escapeHtml(addr.address)}</option>`;
              });
              
              addressSelect.innerHTML += '<option value="__custom__">Enter custom address...</option>';
              addressSelect.style.display = "block";
              
              // Auto-select default if available
              const defaultAddr = addresses.find(a => a.is_default);
              if (defaultAddr) {
                addressInput.value = defaultAddr.address;
              } else if (matchedClient.address) {
                addressInput.value = matchedClient.address;
              }
            } else if (matchedClient.address) {
              // No additional addresses, just use default
              addressInput.value = matchedClient.address;
            }
          }
        } catch (addrErr) {
          console.log("Could not load addresses:", addrErr);
          if (matchedClient.address) {
            addressInput.value = matchedClient.address;
          }
        }
      } else {
        selectedClientData = { name: clientName };
      }
    }
  } catch (err) {
    console.log("Could not lookup client:", err);
    selectedClientData = { name: clientName };
  }
  
  updateInvoicePreview();
}

// Handle address dropdown selection
function handleAddressSelectChange() {
  const addressSelect = document.getElementById("invoice-address-select");
  const addressInput = document.getElementById("invoice-client-address");
  
  if (!addressSelect || !addressInput) return;
  
  const selectedValue = addressSelect.value;
  
  if (selectedValue === "__custom__") {
    // Clear input and focus for manual entry
    addressInput.value = "";
    addressInput.focus();
  } else if (selectedValue) {
    // Fill in selected address
    addressInput.value = selectedValue;
  }
  
  updateInvoicePreview();
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
      document.getElementById("client-form").reset();
      await loadClients();
    } else {
      const errData = await res.json();
      console.error('Client save error:', errData);
      const errMsg = errData.hint || errData.details || errData.error || 'Unknown error';
      showToast(`Failed: ${errMsg}`, 'error');
    }
  } catch (error) {
    console.error('Error adding client:', error);
    showToast('Error adding client: ' + error.message, 'error');
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
    // First check ALL cached clients for stale data (not just current user's)
    const allCachedClients = await tradebaseDB.getAllClientsRaw() || [];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const hasStaleData = allCachedClients.some(c => !uuidRegex.test(c.id));
    
    if (hasStaleData) {
      console.log('Auto-purging stale client cache with non-UUID IDs...', allCachedClients.length, 'clients found');
      await tradebaseDB.clear('clients'); // Clear entire store
      clients = []; // Reset to empty, let API be source of truth
    } else {
      const localClients = await tradebaseDB.getClients(currentUser.id);
      clients = localClients || [];
    }
  }
  
  if (navigator.onLine) {
    try {
      const res = await apiFetch("/api/clients");
      const apiClients = await res.json();
      
      if (apiClients && Array.isArray(apiClients)) {
        // Clear local cache and replace with API data (source of truth)
        await tradebaseDB.clearClients(currentUser.id);
        for (const client of apiClients) {
          await tradebaseDB.saveClient(client);
        }
        // Use only API clients - they are the source of truth
        clients = apiClients;
      }
    } catch (error) {
      console.log('Using offline clients:', error.message);
    }
  }

  if (!clients.length) {
    list.innerHTML = `<div class="empty-state">
      <i class="fa-solid fa-user-plus empty-state-icon"></i>
      <p class="empty-state-title">No clients yet</p>
      <p class="empty-state-desc">Add your first client using the form above</p>
    </div>`;
    return;
  }

  clients.forEach((c) => {
    const isOffline = isOfflineId(c.id);
    const offlineBadge = isOffline ? '<span style="font-size: 11px; color: var(--warning);">📱</span>' : '';
    
    const content = `
      <div class="list-item-header">
        <strong>${c.name}${offlineBadge}</strong>
        <span>${c.phone || ""}</span>
      </div>
      <div class="list-item-sub">${c.email || ""}</div>
      <div class="list-item-sub">${c.address || ""}</div>
    `;
    
    const actions = [
      { icon: "fa-solid fa-pen", label: "Edit", class: "edit-action", handler: () => editClient(c.id) },
      { icon: "fa-solid fa-trash", label: "Delete", class: "delete-action", handler: () => {
        showDeleteConfirmModal("client", c.name, () => deleteClient(c.id));
      }}
    ];
    
    const itemMeta = { type: "client", id: c.id, data: c };
    const item = createSwipeableItem(content, actions, () => editClient(c.id), itemMeta);
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
      // Remove from local IndexedDB cache so it doesn't show in active list
      await tradebaseDB.deleteInvoice(invoiceId);
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
    console.log('Deleting invoice:', invoiceId);
    const res = await apiFetch(`/api/invoices/${invoiceId}`, { method: 'DELETE' });
    if (res.ok) {
      // Also delete from local IndexedDB storage
      await tradebaseDB.deleteInvoice(invoiceId);
      showToast('Invoice deleted');
      loadInvoices(currentInvoiceTab === 'archived');
    } else {
      const errorData = await res.json().catch(() => ({}));
      console.error('Delete failed:', res.status, errorData);
      showToast(errorData.error || 'Failed to delete invoice');
    }
  } catch (err) {
    console.error('Error deleting invoice:', err);
    showToast('Network error - check connection');
  }
}

async function archiveQuote(quoteId) {
  try {
    const res = await apiFetch(`/api/quotes/${quoteId}/archive`, { method: 'POST' });
    if (res.ok) {
      // Remove from local IndexedDB cache so it doesn't show in active list
      await tradebaseDB.deleteQuote(quoteId);
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
      // Also delete from local IndexedDB storage
      await tradebaseDB.deleteQuote(quoteId);
      showToast('Quote deleted');
      loadQuotes(currentQuoteTab === 'archived');
    } else {
      const errorData = await res.json().catch(() => ({}));
      showToast(errorData.error || 'Failed to delete quote');
    }
  } catch (err) {
    console.error('Error deleting quote:', err);
    showToast('Failed to delete quote');
  }
}

async function loadInvoices(showArchived = false) {
  if (tourMode) return;
  
  const list = document.getElementById("invoices-list");
  if (!list) {
    console.error('[loadInvoices] invoices-list element not found');
    return;
  }
  
  // Show loading state immediately
  list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading...</p></div>';
  
  let invoices = [];
  
  try {
    if (!currentUser) {
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user) {
        currentUser = session.user;
      }
    }
    
    if (currentUser && !showArchived) {
      // OFFLINE-FIRST: Load local invoices first (including unsynced ones)
      try {
        const allCachedInvoices = await tradebaseDB.getAllInvoicesRaw() || [];
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const localIdRegex = /^local_\d+_[a-z0-9]+$/i; // Valid local offline IDs
        
        // Only purge truly stale data (old integer IDs), NOT local_ prefixed IDs
        const hasStaleData = allCachedInvoices.some(inv => {
          const id = inv.id;
          const isValidUUID = uuidRegex.test(id);
          const isValidLocalId = localIdRegex.test(id);
          const isStale = !isValidUUID && !isValidLocalId;
          // Also check client_id if present (but only if it's not null/empty)
          const hasStaleClientId = inv.client_id && inv.client_id !== '' && !uuidRegex.test(inv.client_id);
          return isStale || hasStaleClientId;
        });
        
        if (hasStaleData) {
          console.log('[loadInvoices] Auto-purging stale invoice cache with invalid IDs...', allCachedInvoices.length, 'invoices found');
          await tradebaseDB.clear('invoices'); // Clear entire store
          invoices = []; // Reset to empty, let API be source of truth
        } else {
          const localInvoices = await tradebaseDB.getInvoices(currentUser.id);
          invoices = localInvoices || [];
          console.log(`[loadInvoices] Loaded ${invoices.length} invoices from local store (user: ${currentUser.id})`);
        }
      } catch (cacheErr) {
        console.error('[loadInvoices] Cache error:', cacheErr);
        invoices = [];
      }
    }
    
    if (navigator.onLine) {
      try {
        const url = showArchived ? "/api/invoices?archived=true" : "/api/invoices";
        const res = await apiFetch(url);
        const apiInvoices = await res.json();
        
        if (apiInvoices && Array.isArray(apiInvoices)) {
          if (!showArchived && currentUser) {
            // OFFLINE-FIRST: Preserve local unsynced invoices, merge with server data
            try {
              const localInvoices = await tradebaseDB.getInvoices(currentUser.id) || [];
              const unsyncedLocal = localInvoices.filter(inv => inv.sync_status === 'unsynced');
              
              // Update synced invoices from server (they are source of truth for synced data)
              for (const inv of apiInvoices) {
                inv.sync_status = 'synced';
                inv.remote_id = inv.id;
                await tradebaseDB.saveInvoice(inv);
              }
              
              // Build merged list: server invoices + local unsynced invoices
              const serverIds = new Set(apiInvoices.map(inv => inv.id));
              const uniqueUnsynced = unsyncedLocal.filter(inv => !serverIds.has(inv.id) && !serverIds.has(inv.remote_id));
              
              invoices = [...apiInvoices, ...uniqueUnsynced];
              console.log(`[loadInvoices] Merged ${apiInvoices.length} server + ${uniqueUnsynced.length} local unsynced invoices`);
            } catch (saveErr) {
              console.error('[loadInvoices] Cache merge error:', saveErr);
              invoices = apiInvoices;
            }
          } else {
            invoices = apiInvoices;
          }
        } else if (apiInvoices?.error) {
          console.error('[loadInvoices] API error:', apiInvoices.error);
        }
      } catch (error) {
        console.log('[loadInvoices] Using offline invoices:', error.message);
      }
    }
  } catch (outerErr) {
    console.error('[loadInvoices] Unexpected error:', outerErr);
    invoices = [];
  }

  invoices.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  if (!invoices.length) {
    list.innerHTML = `<div class="empty-state">
      <i class="fa-solid fa-file-invoice empty-state-icon"></i>
      <p class="empty-state-title">${showArchived ? 'No archived invoices' : 'No invoices yet'}</p>
      <p class="empty-state-desc">${showArchived ? 'Archived invoices will appear here' : 'Create your first invoice to start tracking payments'}</p>
    </div>`;
    if (!showArchived) renderDashboardStats([]);
    return;
  }

  // Clear loading state before rendering items
  list.innerHTML = '';

  invoices.forEach((inv) => {
    const isOffline = isOfflineId(inv.id);
    const isUnsynced = inv.sync_status === 'unsynced' || isOffline;
    const initials = getInitials(inv.client_name);
    const paymentStatus = inv.payment_status || 'unpaid';
    const statusIcon = paymentStatus === 'paid' ? '🟢' : paymentStatus === 'pending' ? '🟡' : '🔴';
    
    // Sync status badge
    const syncBadge = isUnsynced 
      ? '<span class="sync-badge unsynced" title="Not synced to cloud">📱 Local</span>'
      : '<span class="sync-badge synced" title="Synced to cloud">☁️</span>';
    
    const content = `
      <div class="list-item-simple">
        <div class="client-avatar">${initials}</div>
        <div class="list-item-info">
          <div class="list-item-name">${inv.client_name || "Unknown Client"} ${syncBadge}</div>
          <div class="list-item-meta">INV #${inv.invoice_number || inv.id} • ${statusIcon} ${paymentStatus}</div>
        </div>
        <div class="list-item-amount">${formatCurrency(inv.total || 0)}</div>
      </div>
    `;
    
    const itemMeta = { type: "invoice", id: inv.id, data: inv };
    
    if (showArchived) {
      // Archived items get restore/delete actions
      const actions = [
        { icon: "fa-solid fa-box-open", label: "Restore", class: "unarchive-action", handler: () => unarchiveInvoice(inv.id) },
        { icon: "fa-solid fa-trash", label: "Delete", class: "delete-action", handler: () => {
          showDeleteConfirmModal("invoice", inv.invoice_number || inv.id, () => deleteInvoice(inv.id));
        }}
      ];
      const item = createSwipeableItem(content, actions, () => viewInvoiceDetail(inv.id), itemMeta);
      list.appendChild(item);
    } else {
      // Active items get edit/archive/delete actions
      const actions = [
        { icon: "fa-solid fa-pen", label: "Edit", class: "edit-action", handler: () => viewInvoiceDetail(inv.id) },
        { icon: "fa-solid fa-box-archive", label: "Archive", class: "archive-action", handler: () => archiveInvoice(inv.id) },
        { icon: "fa-solid fa-trash", label: "Delete", class: "delete-action", handler: () => {
          showDeleteConfirmModal("invoice", inv.invoice_number || inv.id, () => deleteInvoice(inv.id));
        }}
      ];
      const item = createSwipeableItem(content, actions, () => viewInvoiceDetail(inv.id), itemMeta);
      list.appendChild(item);
    }
  });
  
  if (!showArchived) {
    renderDashboardStats(invoices);
    updateSyncBadge(); // Update sync badge count
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
    list.innerHTML = `<div class="empty-state">
      <i class="fa-solid fa-clipboard-list empty-state-icon"></i>
      <p class="empty-state-title">${showArchived ? 'No archived quotes' : 'No quotes yet'}</p>
      <p class="empty-state-desc">${showArchived ? 'Archived quotes will appear here' : 'Create your first quote to send estimates to clients'}</p>
    </div>`;
    return;
  }

  quotes.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  quotes.forEach((quote) => {
    const initials = getInitials(quote.client_name);
    const status = quote.status || 'draft';
    const statusIcon = status === 'accepted' ? '🟢' : status === 'sent' ? '🟡' : '⚪';
    const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
    
    const content = `
      <div class="list-item-simple">
        <div class="client-avatar">${initials}</div>
        <div class="list-item-info">
          <div class="list-item-name">${quote.client_name || "Unknown Client"}</div>
          <div class="list-item-meta">QUO #${quote.quote_number || quote.id} • ${statusIcon} ${statusLabel}</div>
        </div>
        <div class="list-item-amount">${formatCurrency(quote.total || 0)}</div>
      </div>
    `;
    
    const itemMeta = { type: "quote", id: quote.id, data: quote };
    
    if (showArchived) {
      const actions = [
        { icon: "fa-solid fa-box-open", label: "Restore", class: "unarchive-action", handler: () => unarchiveQuote(quote.id) },
        { icon: "fa-solid fa-trash", label: "Delete", class: "delete-action", handler: () => {
          showDeleteConfirmModal("quote", quote.quote_number || quote.id, () => deleteQuote(quote.id));
        }}
      ];
      const item = createSwipeableItem(content, actions, () => viewQuoteDetail(quote.id), itemMeta);
      list.appendChild(item);
    } else {
      const actions = [
        { icon: "fa-solid fa-pen", label: "Edit", class: "edit-action", handler: () => viewQuoteDetail(quote.id) },
        { icon: "fa-solid fa-box-archive", label: "Archive", class: "archive-action", handler: () => archiveQuote(quote.id) },
        { icon: "fa-solid fa-trash", label: "Delete", class: "delete-action", handler: () => {
          showDeleteConfirmModal("quote", quote.quote_number || quote.id, () => deleteQuote(quote.id));
        }}
      ];
      const item = createSwipeableItem(content, actions, () => viewQuoteDetail(quote.id), itemMeta);
      list.appendChild(item);
    }
  });
}

// INVOICE & QUOTE DETAIL VIEWS

async function viewInvoiceDetail(invoiceId) {
  try {
    let invoice;
    
    // OFFLINE-FIRST: Check if this is a local invoice (local_* ID)
    const isLocalId = invoiceId && invoiceId.startsWith('local_');
    
    if (isLocalId) {
      // Load from IndexedDB for local invoices
      invoice = await tradebaseDB.get('invoices', invoiceId);
      if (!invoice) {
        showToast("Invoice not found in local storage");
        return;
      }
      console.log('[viewInvoiceDetail] Loaded local invoice:', invoiceId);
    } else {
      // Fetch from API for synced invoices
      const res = await apiFetch(`/api/invoices/${invoiceId}`);
      if (!res.ok) {
        // Try local storage as fallback
        invoice = await tradebaseDB.get('invoices', invoiceId);
        if (!invoice) {
          showToast("Failed to load invoice details");
          return;
        }
      } else {
        invoice = await res.json();
      }
    }
    
    const titleEl = document.getElementById("invoice-detail-title");
    const contentEl = document.getElementById("invoice-detail-content");
    
    titleEl.textContent = `Invoice #${invoice.invoice_number || invoice.id}`;
    
    const paymentStatus = invoice.payment_status || 'unpaid';
    const paymentBadge = `<span class="payment-status-badge ${paymentStatus}">
      <i class="fa-solid ${paymentStatus === 'paid' ? 'fa-check-circle' : paymentStatus === 'pending' ? 'fa-clock' : 'fa-circle-xmark'}"></i>
      ${paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}
    </span>`;
    
    contentEl.innerHTML = `
      <div class="detail-header">
        <div class="detail-header-left">
          <h3>Invoice #${invoice.invoice_number || invoice.id}</h3>
          <p><strong>Date:</strong> ${invoice.issue_date || new Date().toLocaleDateString()}</p>
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
            <span class="detail-totals-value">${formatCurrency(invoice.subtotal || 0)}</span>
          </div>
          ${invoice.tax_amount ? `
            <div class="detail-totals-row">
              <span class="detail-totals-label">Tax:</span>
              <span class="detail-totals-value">${formatCurrency(invoice.tax_amount || 0)}</span>
            </div>
          ` : ''}
          <div class="detail-totals-row total">
            <span class="detail-totals-label">Total:</span>
            <span class="detail-totals-value">${formatCurrency(invoice.total || 0)}</span>
          </div>
        </div>
      </div>
      
      <!-- Job Folder Link Section -->
      <div class="detail-section" style="margin-bottom: 16px; padding: 12px; background: var(--bg); border-radius: 8px; border: 1px solid var(--border);">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <i class="fa-solid fa-folder" style="color: var(--accent); margin-right: 8px;"></i>
            <strong>Job Folder:</strong>
            ${invoice.job_id ? `
              <span id="invoice-job-name" style="margin-left: 8px; color: var(--accent);">${invoice.job?.client_name || 'Loading...'}</span>
            ` : `
              <span style="margin-left: 8px; color: var(--muted);">Not linked</span>
            `}
          </div>
          ${invoice.job_id ? `
            <button class="btn-sm" id="unlink-invoice-job-btn" data-invoice-id="${invoice.id}" style="background: var(--danger); color: white;">
              <i class="fa-solid fa-link-slash"></i> Unlink
            </button>
          ` : `
            <button class="btn-sm" id="link-invoice-to-job-btn" data-invoice-id="${invoice.id}" style="background: var(--accent); color: var(--text-inverse);">
              <i class="fa-solid fa-folder-plus"></i> Add to Job
            </button>
          `}
        </div>
      </div>
      
      <!-- Photos Section -->
      ${invoice.attachments && invoice.attachments.length > 0 ? `
        <div class="detail-section" style="margin-bottom: 16px;">
          <h4 style="margin-bottom: 12px;"><i class="fa-solid fa-camera" style="margin-right: 8px;"></i>Job Photos (${invoice.attachments.length})</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px;">
            ${invoice.attachments.map(photo => `
              <div style="border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <a href="${photo.file_url}" target="_blank">
                  <img src="${photo.file_url}" alt="${photo.file_name || 'Job photo'}" 
                       style="width: 100%; height: 100px; object-fit: cover; display: block; cursor: pointer;" loading="lazy">
                </a>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="detail-actions">
        <button class="btn-sm" id="view-invoice-btn-${invoice.id}" style="background: #6366f1; color: white;">
          <i class="fa-solid fa-eye"></i> View Invoice
        </button>
        <button class="btn-sm" id="edit-invoice-btn-${invoice.id}" style="background: var(--accent); color: var(--text-inverse);">
          <i class="fa-solid fa-pen"></i> Edit Invoice
        </button>
        <select id="invoice-payment-status-select" class="btn-sm" style="cursor: pointer;" onchange="updateInvoicePaymentStatus('${invoice.id}', this.value)">
          <option value="">Change Status...</option>
          <option value="unpaid" ${paymentStatus === 'unpaid' ? 'disabled' : ''}>Mark Unpaid</option>
          <option value="pending" ${paymentStatus === 'pending' ? 'disabled' : ''}>Mark Pending</option>
          <option value="paid" ${paymentStatus === 'paid' ? 'disabled' : ''}>Mark Paid</option>
        </select>
        ${invoice.payment_url ? `
          <button class="btn-sm" onclick="copyToClipboard('${invoice.payment_url}', 'Payment link copied!')">
            <i class="fa-solid fa-copy"></i> Copy Payment Link
          </button>
        ` : `
          <button class="btn-sm" onclick="generatePaymentLink('${invoice.id}')">
            <i class="fa-solid fa-link"></i> Generate Payment Link
          </button>
        `}
        <button class="btn-sm" id="send-email-invoice-btn" data-invoice-id="${invoice.id}" style="background: #3b82f6; color: white;">
          <i class="fa-solid fa-envelope"></i> <span data-i18n="invoice.send_email">Send Email</span>
        </button>
        <button class="btn-sm" id="send-text-invoice-btn" data-invoice-id="${invoice.id}" data-client-phone="${invoice.client?.phone || ''}" data-total="${invoice.total || 0}" style="background: #22c55e; color: white;">
          <i class="fa-solid fa-comment-sms"></i> Send Text
        </button>
        <button class="btn-sm" id="schedule-invoice-btn-${invoice.id}">
          <i class="fa-solid fa-calendar-plus"></i> Set Reminder
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
    
    // Wire up send text button - opens template chooser first
    const sendTextBtn = document.getElementById('send-text-invoice-btn');
    if (sendTextBtn) {
      sendTextBtn.addEventListener('click', () => {
        openTemplateChooserForTextInvoice(invoice);
      });
    }
    
    // Wire up schedule button
    document.getElementById(`schedule-invoice-btn-${invoice.id}`)?.addEventListener('click', () => {
      scheduleEventFromInvoice(invoice.id, invoice.client_name || invoice.client?.name || 'Unknown');
    });
    
    // Wire up view button - opens public invoice view in new tab
    document.getElementById(`view-invoice-btn-${invoice.id}`)?.addEventListener('click', () => {
      window.open(`/view/invoice/${invoice.id}`, '_blank');
    });
    
    // Wire up edit button
    document.getElementById(`edit-invoice-btn-${invoice.id}`)?.addEventListener('click', () => {
      editInvoice(invoice);
    });
    
    // Wire up job link/unlink buttons
    const linkToJobBtn = document.getElementById('link-invoice-to-job-btn');
    if (linkToJobBtn) {
      linkToJobBtn.addEventListener('click', () => {
        openJobFolderPicker('invoice', invoice.id);
      });
    }
    
    const unlinkJobBtn = document.getElementById('unlink-invoice-job-btn');
    if (unlinkJobBtn) {
      unlinkJobBtn.addEventListener('click', () => {
        unlinkFromJob('invoice', invoice.id);
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
    
    if (!res.ok) {
      showToast("Failed to load quote");
      return;
    }
    
    const quote = await res.json();
    
    if (!quote || !quote.id) {
      showToast("Quote not found");
      return;
    }
    
    const titleEl = document.getElementById("quote-detail-title");
    const contentEl = document.getElementById("quote-detail-content");
    
    titleEl.textContent = `Quote #${quote.quote_number || String(quote.id).slice(0, 8)}`;
    
    contentEl.innerHTML = `
      <div class="detail-header">
        <div class="detail-header-left">
          <h3>Quote #${quote.quote_number || String(quote.id).slice(0, 8)}</h3>
          <p><strong>Date:</strong> ${quote.issue_date || new Date().toLocaleDateString()}</p>
          <p><strong>Status:</strong> ${quote.status || 'draft'}</p>
          ${quote.valid_until ? `<p><strong>Valid Until:</strong> ${quote.valid_until}</p>` : ''}
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
          ${quote.tax_amount ? `
            <div class="detail-totals-row">
              <span class="detail-totals-label">Tax:</span>
              <span class="detail-totals-value">${formatCurrency(quote.tax_amount || 0)}</span>
            </div>
          ` : ''}
          <div class="detail-totals-row total">
            <span class="detail-totals-label">Total:</span>
            <span class="detail-totals-value">${formatCurrency(quote.total || 0)}</span>
          </div>
        </div>
      </div>
      
      <!-- Job Folder Link Section -->
      <div class="detail-section" style="margin-bottom: 16px; padding: 12px; background: var(--bg); border-radius: 8px; border: 1px solid var(--border);">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <i class="fa-solid fa-folder" style="color: var(--accent); margin-right: 8px;"></i>
            <strong>Job Folder:</strong>
            ${quote.job_id ? `
              <span id="quote-job-name" style="margin-left: 8px; color: var(--accent);">${quote.job?.client_name || 'Loading...'}</span>
            ` : `
              <span style="margin-left: 8px; color: var(--muted);">Not linked</span>
            `}
          </div>
          ${quote.job_id ? `
            <button class="btn-sm" id="unlink-quote-job-btn" data-quote-id="${quote.id}" style="background: var(--danger); color: white;">
              <i class="fa-solid fa-link-slash"></i> Unlink
            </button>
          ` : `
            <button class="btn-sm" id="link-quote-to-job-btn" data-quote-id="${quote.id}" style="background: var(--accent); color: var(--text-inverse);">
              <i class="fa-solid fa-folder-plus"></i> Add to Job
            </button>
          `}
        </div>
      </div>

      <div class="detail-actions">
        <button class="btn-sm" id="edit-quote-btn-${quote.id}" style="background: var(--accent); color: var(--text-inverse);">
          <i class="fa-solid fa-pen"></i> Edit Quote
        </button>
        <button class="btn-convert-quote" id="convert-quote-btn-${quote.id}" data-quote-id="${quote.id}" ${tourMode ? 'disabled style="opacity: 0.6;"' : ''}>
          <i class="fa-solid fa-file-invoice"></i> <span data-i18n="quote.convert_to_invoice">Convert to Invoice</span>
        </button>
        <button class="btn-sm" id="share-quote-btn-${quote.id}">
          <i class="fa-solid fa-share-nodes"></i> Share Quote
        </button>
        <button class="btn-sm" id="send-text-quote-btn" data-quote-id="${quote.id}" data-client-phone="${quote.client?.phone || ''}" data-total="${quote.total || 0}" style="background: #22c55e; color: white;">
          <i class="fa-solid fa-comment-sms"></i> Send Text
        </button>
        <button class="btn-sm" id="schedule-quote-btn-${quote.id}">
          <i class="fa-solid fa-calendar-plus"></i> Schedule Follow-Up
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
    
    // Wire up send text button
    const sendTextQuoteBtn = document.getElementById('send-text-quote-btn');
    if (sendTextQuoteBtn) {
      sendTextQuoteBtn.addEventListener('click', () => {
        sendQuoteSMS(quote);
      });
    }
    
    // Wire up schedule button
    document.getElementById(`schedule-quote-btn-${quote.id}`)?.addEventListener('click', () => {
      scheduleEventFromQuote(quote.id, quote.client_name || quote.client?.name || 'Unknown');
    });
    
    // Wire up edit button
    document.getElementById(`edit-quote-btn-${quote.id}`)?.addEventListener('click', () => {
      editQuote(quote);
    });
    
    // Wire up job link/unlink buttons
    const linkToJobBtn = document.getElementById('link-quote-to-job-btn');
    if (linkToJobBtn) {
      linkToJobBtn.addEventListener('click', () => {
        openJobFolderPicker('quote', quote.id);
      });
    }
    
    const unlinkJobBtn = document.getElementById('unlink-quote-job-btn');
    if (unlinkJobBtn) {
      unlinkJobBtn.addEventListener('click', () => {
        unlinkFromJob('quote', quote.id);
      });
    }
    
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
    
    // Reset edit mode so we create a NEW invoice, not update an existing one
    editingInvoiceId = null;
    
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
    
    // Ensure form shows "New Invoice" title and button (not "Edit Invoice")
    const formTitle = document.querySelector('#new-invoice .screen-title');
    if (formTitle) {
      formTitle.textContent = t('invoice.new_invoice') || 'New Invoice';
    }
    const submitBtn = document.querySelector('#invoice-form button[type="submit"]');
    if (submitBtn) {
      submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> ' + (t('invoice.save') || 'Save Invoice');
    }
    
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

// Open template chooser before sending invoice via SMS - shows preview first
function openTemplateChooserForTextInvoice(invoice) {
  console.log("[TEMPLATE CHOOSER] Opening for invoice:", invoice.id);
  
  const modal = document.getElementById("template-chooser-modal");
  const grid = document.getElementById("template-chooser-grid");
  const title = modal.querySelector('h2');
  
  if (!modal || !grid) {
    console.error("[TEMPLATE CHOOSER] Modal or grid not found!");
    showToast("Error: Template chooser not available");
    return;
  }
  
  title.textContent = 'Choose Template for Text';
  
  const templates = [
    { id: 'basic_clean', name: 'Basic Clean', desc: 'Classic black & white contractor PDF style' },
    { id: 'modern_pro', name: 'Modern Pro', desc: 'Bold headings, clean professional layout' },
    { id: 'color_accent', name: 'Color Accent Header', desc: 'Blue/gray header for official appearance' },
    { id: 'big_total', name: 'Big Total', desc: 'Emphasizes the total amount prominently' }
  ];
  
  // Store invoice in window for onclick handlers (more reliable on mobile)
  window._currentTextInvoice = invoice;
  
  grid.innerHTML = templates.map(template => `
    <div class="template-card" data-template-id="${template.id}" onclick="handleTemplateCardClick('${template.id}')" style="cursor: pointer; border: 2px solid var(--border); border-radius: 8px; padding: 20px; background: var(--tile); transition: all 0.2s; -webkit-tap-highlight-color: rgba(99, 102, 241, 0.3); user-select: none;">
      <h3 style="margin: 0 0 8px 0; color: var(--text); font-size: 16px;">${template.name}</h3>
      <p style="margin: 0; color: var(--muted); font-size: 13px;">${template.desc}</p>
      <div style="margin-top: 12px; padding: 12px; background: var(--bg); border-radius: 6px; text-align: center; color: var(--primary); font-size: 14px; font-weight: 600;">
        <i class="fa-solid fa-eye"></i> TAP TO PREVIEW
      </div>
    </div>
  `).join('');
  
  console.log("[TEMPLATE CHOOSER] Grid populated with", templates.length, "templates");
  modal.style.display = 'block';
}

// Handle template card click (separate function for better mobile support)
function handleTemplateCardClick(templateId) {
  console.log("[TEMPLATE CARD] Clicked template:", templateId);
  const invoice = window._currentTextInvoice;
  if (!invoice) {
    console.error("[TEMPLATE CARD] No invoice stored in window._currentTextInvoice");
    showToast("Error: Please try again");
    return;
  }
  previewInvoiceTemplateForText(invoice, templateId);
}

// Preview invoice template with Send Text action button
async function previewInvoiceTemplateForText(invoice, templateId) {
  console.log("[TEMPLATE PREVIEW] Starting preview for template:", templateId, "invoice:", invoice.id);
  
  const modal = document.getElementById("template-preview-modal");
  const content = document.getElementById("template-preview-content");
  
  if (!modal || !content) {
    console.error("[TEMPLATE PREVIEW] Modal or content not found!");
    showToast("Error: Preview not available");
    return;
  }
  
  closeTemplateChooser();
  
  try {
    console.log("Loading preview for invoice:", invoice.id, "template:", templateId);
    
    const [invoiceRes, profileRes] = await Promise.all([
      apiFetch(`/api/invoices/${invoice.id}`),
      apiFetch("/api/profile")
    ]);
    
    if (!invoiceRes.ok) {
      const errData = await invoiceRes.json();
      console.error("Invoice fetch failed:", errData);
      showToast("Failed to load invoice: " + (errData.error || "Unknown error"));
      return;
    }
    
    const invoiceData = await invoiceRes.json();
    const profile = await profileRes.json();
    
    console.log("Invoice data loaded:", invoiceData);
    console.log("Profile loaded:", profile);
    
    const invoiceForTemplate = {
      ...invoiceData,
      business_name: profile?.business_name,
      address: profile?.business_address,
      phone: profile?.business_phone,
      email: profile?.business_email,
      logo_url: profile?.logo_url,
      invoice_footer: profile?.invoice_footer,
      items: (invoiceData.items || []).map(item => ({
        description: item.description,
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        total: item.total || 0
      }))
    };
    
    const templateHtml = window.invoiceTemplates[templateId]?.(invoiceForTemplate) 
      || window.invoiceTemplates.basic_clean(invoiceForTemplate);
    
    content.innerHTML = `
      <div style="background: white; padding: 20px; border-radius: 8px; max-height: 60vh; overflow-y: auto;">
        ${templateHtml}
      </div>
      <div style="display: flex; gap: 12px; margin-top: 16px; justify-content: center; flex-wrap: wrap;">
        <button id="send-text-from-preview" style="background: #22c55e; color: white; padding: 12px 24px; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer;">
          <i class="fa-solid fa-comment-sms"></i> Send This via Text
        </button>
        <button id="back-to-templates" style="background: var(--muted); color: white; padding: 12px 24px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer;">
          <i class="fa-solid fa-arrow-left"></i> Choose Different Template
        </button>
        <button onclick="closeTemplatePreview()" style="background: var(--border); color: var(--text); padding: 12px 24px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer;">
          Cancel
        </button>
      </div>
    `;
    
    // Wire up Send Text button
    document.getElementById('send-text-from-preview').addEventListener('click', async () => {
      // Save the template choice first
      try {
        await apiFetch(`/api/invoices/${invoice.id}`, {
          method: 'PUT',
          body: JSON.stringify({ template: templateId })
        });
      } catch (err) {
        console.log("Could not save template preference:", err);
      }
      
      modal.style.display = 'none';
      sendInvoiceSMS({ ...invoiceData, template: templateId });
    });
    
    // Wire up back button
    document.getElementById('back-to-templates').addEventListener('click', () => {
      modal.style.display = 'none';
      openTemplateChooserForTextInvoice(invoice);
    });
    
    modal.style.display = 'block';
  } catch (err) {
    console.error("Error loading preview:", err.message || err);
    showToast("Failed to load preview");
  }
}

// Send Invoice via SMS (opens native Messages app)
function sendInvoiceSMS(invoice) {
  console.log("sendInvoiceSMS called with invoice:", invoice);
  
  // Build message - get business name from settings input field
  const businessNameEl = document.getElementById("business-name");
  const businessName = businessNameEl?.value || "Your business";
  const total = formatCurrency(invoice.total || 0);
  const invoiceViewLink = `https://trade-base.biz/view/invoice/${invoice.id}`;
  const paymentUrl = invoice.payment_url;
  
  let message = `Invoice from ${businessName} for ${total}.`;
  message += `\n\nView invoice: ${invoiceViewLink}`;
  
  if (paymentUrl && invoice.payment_status !== 'paid') {
    message += `\n\nPay now: ${paymentUrl}`;
  }
  
  // Get client phone (cleaned)
  const clientPhone = (invoice.client?.phone || '').replace(/[^0-9+]/g, '');
  
  // Encode message for URL
  const encodedMessage = encodeURIComponent(message);
  
  // Build SMS URL - format differs for iOS vs Android
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  let smsUrl;
  
  if (clientPhone) {
    smsUrl = isIOS ? `sms:${clientPhone}&body=${encodedMessage}` : `sms:${clientPhone}?body=${encodedMessage}`;
  } else {
    smsUrl = isIOS ? `sms:&body=${encodedMessage}` : `sms:?body=${encodedMessage}`;
  }
  
  console.log("SMS URL:", smsUrl);
  
  // Check if running in iframe (dev preview)
  const isInIframe = window.self !== window.top;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  if (isInIframe || !isMobile) {
    // Dev mode or desktop - show message to copy
    alert("TEXT MESSAGE:\n\n" + message);
  } else {
    // Real mobile app - open SMS without navigating away (prevents logout)
    showToast("Opening Messages...");
    window.open(smsUrl, '_self');
  }
}

// Send Quote via SMS (opens native Messages app)
function sendQuoteSMS(quote) {
  console.log("sendQuoteSMS called with quote:", quote);
  
  // Build message - get business name from settings input field
  const businessNameEl = document.getElementById("business-name");
  const businessName = businessNameEl?.value || "Your business";
  const total = formatCurrency(quote.total || 0);
  const quoteNumber = quote.quote_number || (quote.id ? String(quote.id).slice(0, 8) : 'Quote');
  const clientName = quote.client_name || quote.client?.name || 'Customer';
  const quoteViewLink = `https://trade-base.biz/view/quote/${quote.id}`;
  
  let message = `Hi ${clientName}! Here's your quote from ${businessName} for ${total}.`;
  message += `\n\nView & download your quote: ${quoteViewLink}`;
  message += `\n\nPlease reply to approve or let me know if you have any questions!`;
  
  // Get client phone (cleaned)
  const clientPhone = (quote.client?.phone || '').replace(/[^0-9+]/g, '');
  
  // Encode message for URL
  const encodedMessage = encodeURIComponent(message);
  
  // Build SMS URL - format differs for iOS vs Android
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  let smsUrl;
  
  if (clientPhone) {
    smsUrl = isIOS ? `sms:${clientPhone}&body=${encodedMessage}` : `sms:${clientPhone}?body=${encodedMessage}`;
  } else {
    smsUrl = isIOS ? `sms:&body=${encodedMessage}` : `sms:?body=${encodedMessage}`;
  }
  
  console.log("SMS URL:", smsUrl);
  
  // Check if running in iframe (dev preview)
  const isInIframe = window.self !== window.top;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  if (isInIframe || !isMobile) {
    // Dev mode or desktop - show message to copy
    alert("TEXT MESSAGE:\n\n" + message);
  } else {
    // Real mobile app - open SMS without navigating away (prevents logout)
    showToast("Opening Messages...");
    window.open(smsUrl, '_self');
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
      
      // v124: Format currency properly with commas and decimals
      const formatStatCurrency = (val) => {
        const num = parseFloat(val) || 0;
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };
      
      if (outstandingEl) outstandingEl.textContent = `$${formatStatCurrency(stats.outstanding)}`;
      if (paidMonthEl) paidMonthEl.textContent = `$${formatStatCurrency(stats.paid_month)}`;
      if (pendingEl) pendingEl.textContent = `$${formatStatCurrency(stats.pending)}`;
      
      if (dashOutstanding) dashOutstanding.textContent = `$${formatStatCurrency(stats.outstanding)}`;
      if (dashPaidMonth) dashPaidMonth.textContent = `$${formatStatCurrency(stats.paid_month)}`;
      if (dashPending) dashPending.textContent = `$${formatStatCurrency(stats.pending)}`;
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
    // Fallback to issue_date if created_at is missing
    const dateStr = invoice.created_at || invoice.issue_date;
    if (!dateStr) return; // Skip if no date available
    
    const createdDate = new Date(dateStr);
    if (isNaN(createdDate.getTime())) return; // Guard against invalid dates
    
    // v125: CRITICAL - parseFloat to prevent string concatenation bug
    // (database returns total as string, causing "0" + "1600" = "01600")
    const total = parseFloat(invoice.total) || 0;
    
    const isCurrentMonth = createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
    
    if (isCurrentMonth) {
      invoicedMonth += total;
      
      if (invoice.payment_status === 'paid') {
        paidMonth += total;
      }
    }
    
    if (invoice.payment_status === 'unpaid' || invoice.payment_status === 'pending') {
      outstanding += total;
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
  
  // Use correct element IDs from HTML
  const outstandingEl = document.getElementById('dashboard-outstanding');
  const paidMonthEl = document.getElementById('dashboard-paid-month');
  const pendingEl = document.getElementById('dashboard-pending');
  
  if (outstandingEl) {
    outstandingEl.textContent = `$${stats.outstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  if (paidMonthEl) {
    paidMonthEl.textContent = `$${stats.paidMonth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  // Calculate pending (invoices with 'pending' status)
  // v125: parseFloat to prevent string concatenation
  const pendingTotal = invoicesArray
    .filter(inv => inv.payment_status === 'pending')
    .reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
  
  if (pendingEl) {
    pendingEl.textContent = `$${pendingTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  
  const warrantyField = document.getElementById("business-warranty");
  if (warrantyField) {
    warrantyField.value = profile.default_warranty_text || "";
  }

  const paymentProviderSelect = document.getElementById("payment-provider-select");
  if (paymentProviderSelect) {
    paymentProviderSelect.value = profile.payment_provider || "";
  }
  
  const paymentValueInput = document.getElementById("payment-value-input");
  if (paymentValueInput) {
    paymentValueInput.value = profile.payment_value || "";
  }

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

  const warrantyField = document.getElementById("business-warranty");
  const defaultWarrantyText = warrantyField ? warrantyField.value : "";

  const paymentProvider = document.getElementById("payment-provider-select")?.value || "";
  const paymentValue = document.getElementById("payment-value-input")?.value || "";

  const payload = {
    business_name: document.getElementById("business-name").value,
    business_phone: document.getElementById("business-phone").value,
    business_email: document.getElementById("business-email").value,
    business_address: document.getElementById("business-address").value,
    preferred_language: selectedLang,
    preferred_template: selectedTemplate,
    default_warranty_text: defaultWarrantyText,
    payment_provider: paymentProvider || null,
    payment_value: paymentValue || null,
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

// ================== GENERATE PAYMENT URL ==================

async function generateInvoicePaymentUrl() {
  const paymentUrlField = document.getElementById("invoice-payment-url");
  if (!paymentUrlField) return;
  
  const items = getLineItemsFromUI();
  let subtotal = 0;
  items.forEach((i) => (subtotal += i.total));
  const taxPercent = parseFloat(document.getElementById("helper-tax")?.value) || 0;
  const tax = subtotal * (taxPercent / 100);
  const total = subtotal + tax;
  
  if (total <= 0) {
    showToast("Add line items first to calculate total", "error");
    return;
  }
  
  try {
    const res = await apiFetch("/api/generate-payment-url", {
      method: "POST",
      body: JSON.stringify({ 
        amount: total,
        invoiceNumber: `INV-${Date.now()}`
      }),
    });
    
    const data = await res.json();
    
    if (data.payment_url) {
      paymentUrlField.value = data.payment_url;
      showToast("Payment URL generated!");
    } else {
      showToast("Set up payment provider in Settings first", "error");
    }
  } catch (err) {
    console.error("Error generating payment URL:", err);
    showToast("Failed to generate payment URL", "error");
  }
}

window.generateInvoicePaymentUrl = generateInvoicePaymentUrl;

// ================== PAYMENT LINKS MANAGEMENT ==================

let paymentLinksCache = [];

const PROVIDER_ICONS = {
  venmo: 'fa-brands fa-venmo',
  paypal: 'fa-brands fa-paypal',
  cashapp: 'fa-solid fa-dollar-sign',
  zelle: 'fa-solid fa-z',
  stripe: 'fa-brands fa-stripe',
  square: 'fa-solid fa-square',
  other: 'fa-solid fa-link'
};

const PROVIDER_COLORS = {
  venmo: '#3D95CE',
  paypal: '#003087',
  cashapp: '#00D632',
  zelle: '#6D1ED4',
  stripe: '#635BFF',
  square: '#3E4348',
  other: '#666'
};

async function loadPaymentLinks() {
  if (tourMode) return;
  
  try {
    const res = await apiFetch("/api/payment-links");
    if (!res.ok) {
      console.log("Payment links response not ok:", res.status);
      return;
    }
    
    paymentLinksCache = await res.json();
    if (!Array.isArray(paymentLinksCache)) {
      console.log("Payment links response not an array:", paymentLinksCache);
      paymentLinksCache = [];
    }
    renderPaymentLinksList();
  } catch (err) {
    console.error("Error loading payment links:", err.message || err);
  }
}

function renderPaymentLinksList() {
  const container = document.getElementById("payment-links-list");
  if (!container) return;
  
  if (paymentLinksCache.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 20px; color: var(--muted); background: var(--bg-secondary); border-radius: 8px;">
        <i class="fa-solid fa-credit-card" style="font-size: 24px; margin-bottom: 8px;"></i>
        <p>No payment links added yet</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = paymentLinksCache.map(link => {
    const icon = PROVIDER_ICONS[link.provider] || PROVIDER_ICONS.other;
    const color = PROVIDER_COLORS[link.provider] || PROVIDER_COLORS.other;
    const providerName = link.provider.charAt(0).toUpperCase() + link.provider.slice(1);
    const displayLabel = link.label || providerName;
    const truncatedUrl = link.url.length > 35 ? link.url.substring(0, 35) + '...' : link.url;
    
    return `
      <div class="payment-link-item" style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 8px;">
        <div style="width: 40px; height: 40px; border-radius: 8px; background: ${color}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <i class="${icon}" style="color: white; font-size: 18px;"></i>
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong style="font-size: 14px;">${escapeHtml(displayLabel)}</strong>
            ${link.is_default ? '<span style="background: var(--accent); color: white; font-size: 10px; padding: 2px 6px; border-radius: 4px;">DEFAULT</span>' : ''}
          </div>
          <p style="font-size: 12px; color: var(--muted); margin: 2px 0 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(truncatedUrl)}</p>
        </div>
        <div style="display: flex; gap: 4px;">
          ${!link.is_default ? `<button class="icon-btn" onclick="setDefaultPaymentLink('${link.id}')" title="Set as default" style="padding: 8px;"><i class="fa-solid fa-star" style="color: var(--muted);"></i></button>` : ''}
          <button class="icon-btn" onclick="editPaymentLink('${link.id}')" title="Edit" style="padding: 8px;"><i class="fa-solid fa-pen" style="color: var(--muted);"></i></button>
          <button class="icon-btn" onclick="deletePaymentLink('${link.id}')" title="Delete" style="padding: 8px;"><i class="fa-solid fa-trash" style="color: var(--danger);"></i></button>
        </div>
      </div>
    `;
  }).join('');
}

function showAddPaymentLinkModal() {
  document.getElementById("payment-link-modal-title").textContent = "Add Payment Link";
  document.getElementById("payment-link-edit-id").value = "";
  document.getElementById("payment-link-provider").value = "venmo";
  document.getElementById("payment-link-label").value = "";
  document.getElementById("payment-link-url").value = "";
  document.getElementById("payment-link-default").checked = paymentLinksCache.length === 0;
  document.getElementById("payment-link-modal").classList.add("active");
}

function editPaymentLink(id) {
  const link = paymentLinksCache.find(l => l.id === id);
  if (!link) return;
  
  document.getElementById("payment-link-modal-title").textContent = "Edit Payment Link";
  document.getElementById("payment-link-edit-id").value = id;
  document.getElementById("payment-link-provider").value = link.provider;
  document.getElementById("payment-link-label").value = link.label || "";
  document.getElementById("payment-link-url").value = link.url;
  document.getElementById("payment-link-default").checked = link.is_default;
  document.getElementById("payment-link-modal").classList.add("active");
}

function closePaymentLinkModal() {
  document.getElementById("payment-link-modal").classList.remove("active");
}

async function savePaymentLink() {
  const id = document.getElementById("payment-link-edit-id").value;
  const provider = document.getElementById("payment-link-provider").value;
  const label = document.getElementById("payment-link-label").value;
  const url = document.getElementById("payment-link-url").value;
  const is_default = document.getElementById("payment-link-default").checked;
  
  if (!url) {
    showToast("Please enter a payment link URL", "error");
    return;
  }
  
  try {
    const endpoint = id ? `/api/payment-links/${id}` : "/api/payment-links";
    const method = id ? "PUT" : "POST";
    
    const res = await apiFetch(endpoint, {
      method,
      body: JSON.stringify({ provider, label, url, is_default })
    });
    
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || "Failed to save payment link", "error");
      return;
    }
    
    showToast(id ? "Payment link updated!" : "Payment link added!");
    closePaymentLinkModal();
    await loadPaymentLinks();
  } catch (err) {
    console.error("Error saving payment link:", err);
    showToast("Failed to save payment link", "error");
  }
}

async function deletePaymentLink(id) {
  if (!confirm("Delete this payment link?")) return;
  
  try {
    const res = await apiFetch(`/api/payment-links/${id}`, { method: "DELETE" });
    
    if (!res.ok) {
      showToast("Failed to delete payment link", "error");
      return;
    }
    
    showToast("Payment link deleted");
    await loadPaymentLinks();
  } catch (err) {
    console.error("Error deleting payment link:", err);
    showToast("Failed to delete payment link", "error");
  }
}

async function setDefaultPaymentLink(id) {
  try {
    const res = await apiFetch(`/api/payment-links/${id}/default`, { method: "PATCH" });
    
    if (!res.ok) {
      showToast("Failed to set default", "error");
      return;
    }
    
    showToast("Default payment link updated!");
    await loadPaymentLinks();
  } catch (err) {
    console.error("Error setting default:", err);
    showToast("Failed to set default", "error");
  }
}

function getDefaultPaymentLink() {
  return paymentLinksCache.find(l => l.is_default) || paymentLinksCache[0] || null;
}

// Expose payment link functions globally for onclick handlers
window.showAddPaymentLinkModal = showAddPaymentLinkModal;
window.closePaymentLinkModal = closePaymentLinkModal;
window.savePaymentLink = savePaymentLink;
window.editPaymentLink = editPaymentLink;
window.deletePaymentLink = deletePaymentLink;
window.setDefaultPaymentLink = setDefaultPaymentLink;

// ================== END PAYMENT LINKS ==================

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

// UTILS

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(amount) {
  const n = Number(amount) || 0;
  return `$${n.toFixed(2)}`;
}

function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
      address: profile?.business_address,
      phone: profile?.business_phone,
      email: profile?.business_email,
      logo_url: profile?.logo_url,
      invoice_footer: profile?.invoice_footer,
      items: (invoiceData.items || []).map(item => ({
        description: item.description,
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        total: item.total || 0
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
      downloadBlobAsPng(blob, `invoice-${invoiceData.invoice_number || invoiceData.id}.png`, "Invoice");
    });
    
  } catch (err) {
    console.error("Download error:", err);
    showToast("Failed to download invoice");
  }
}

// Mobile-friendly download helper
async function downloadBlobAsPng(blob, filename, type = "File") {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  if (isMobile) {
    // Try navigator.share() first - works great on iOS and Android
    if (navigator.share && navigator.canShare) {
      try {
        const file = new File([blob], filename, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: filename,
            text: `${type} from Skippy Stack`
          });
          showToast(`${type} shared!`);
          return;
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.log('Share failed, falling back to data URL:', err);
        } else {
          // User cancelled share - don't show error
          return;
        }
      }
    }
    
    // Fallback: Convert to data URL and open directly (works for long-press save)
    const reader = new FileReader();
    reader.onloadend = function() {
      const dataUrl = reader.result;
      // Open the data URL directly - iOS can long-press save on this
      const newWindow = window.open(dataUrl, '_blank');
      if (!newWindow) {
        // If popup blocked, try navigating current window
        window.location.href = dataUrl;
      }
      showToast("Long-press the image to save it!");
    };
    reader.readAsDataURL(blob);
  } else {
    // Desktop: Use download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`${type} downloaded!`);
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

function closeTemplatePreview() {
  const modal = document.getElementById("template-preview-modal");
  if (modal) modal.style.display = 'none';
}
window.closeTemplatePreview = closeTemplatePreview;

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
  preview.innerHTML = `<strong>Invoice #${invoice.invoice_number || invoice.id}</strong> · Total: ${formatCurrency(invoice.total || 0)}`;
  
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

async function sendInvoiceEmail(invoiceId, recipientEmail, recipientName, submitBtn) {
  const resetButton = () => {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = t('invoice.send_email') || 'Send Email';
    }
  };
  
  if (!recipientEmail || !recipientEmail.trim()) {
    showToast(t('invoice.email_required'), 'error');
    resetButton();
    return;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipientEmail.trim())) {
    showToast(t('invoice.email_invalid'), 'error');
    resetButton();
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
      // Show sent state briefly
      if (submitBtn) {
        submitBtn.innerHTML = '✓ Sent!';
        submitBtn.style.background = '#22c55e';
      }
      showToast(t('invoice.email_sent_success'));
      
      // Close modal after a brief delay to show success
      setTimeout(() => {
        resetButton();
        if (submitBtn) submitBtn.style.background = '';
        closeEmailInvoiceModal();
      }, 1000);
    } else {
      const error = await res.json();
      showToast(error.error || t('invoice.email_sent_error'), 'error');
      resetButton();
    }
  } catch (error) {
    console.error('Error sending invoice email:', error);
    showToast(t('invoice.email_sent_error'), 'error');
    resetButton();
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
      address: profile?.business_address,
      phone: profile?.business_phone,
      email: profile?.business_email,
      logo_url: profile?.logo_url,
      invoice_footer: profile?.invoice_footer,
      items: (invoiceData.items || []).map(item => ({
        description: item.description,
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        total: item.total || 0
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
      address: profile?.business_address,
      phone: profile?.business_phone,
      email: profile?.business_email,
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
      address: profile?.business_address,
      phone: profile?.business_phone,
      email: profile?.business_email,
      logo_url: profile?.logo_url,
      invoice_footer: profile?.invoice_footer,
      items: (invoiceData.items || []).map(item => ({
        description: item.description,
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        total: item.total || 0
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
      downloadBlobAsPng(blob, `invoice-${invoiceData.invoice_number || invoiceData.id}.png`, "Invoice");
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
      address: profile?.business_address,
      phone: profile?.business_phone,
      email: profile?.business_email,
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
      downloadBlobAsPng(blob, `quote-${quoteData.quote_number || quoteData.id}.png`, "Quote");
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
      resetQuoteForm();
      showScreen("new-quote");
    });
  }
  
  const newInvoiceBtn = document.getElementById("btn-new-invoice");
  if (newInvoiceBtn) {
    newInvoiceBtn.addEventListener("click", () => {
      resetInvoiceForm();
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
  
  const submitBtn = document.getElementById("btn-save-quote");
  setButtonLoading(submitBtn, true);

  const clientName = document.getElementById("quote-client-name").value.trim();
  const quoteDate = document.getElementById("quote-date").value;
  const notes = document.getElementById("quote-notes").value;
  const template = document.getElementById("quote-template").value || "basic_clean";
  const items = getQuoteLineItemsFromUI();

  if (!clientName) {
    errorEl.textContent = "Enter a client name.";
    setButtonLoading(submitBtn, false);
    return;
  }
  if (!items.length) {
    errorEl.textContent = "Add at least one line item.";
    setButtonLoading(submitBtn, false);
    return;
  }

  let subtotal = 0;
  items.forEach((i) => (subtotal += i.total || 0));
  const taxPercent = parseFloat(document.getElementById("quote-tax").value) || 0;
  const tax = subtotal * (taxPercent / 100);
  const total = subtotal + tax;

  const quoteData = {
    client_name: clientName,
    issue_date: quoteDate,
    notes,
    template,
    subtotal,
    tax_amount: tax,
    total,
    items
  };

  const isEditing = editingQuoteId !== null;

  try {
    if (!navigator.onLine && !isEditing) {
      const offlineId = generateOfflineId();
      quoteData.id = offlineId;
      quoteData.quote_number = `QT-${Date.now()}`;
      quoteData.status = "draft";
      quoteData.created_at = new Date().toISOString();
      
      await saveOffline('quotes', quoteData, '/api/quotes', 'POST');
      
      setButtonLoading(submitBtn, false);
      showToast("Quote saved offline. Will sync when online.");
      document.getElementById("quote-form").reset();
      clearQuoteLineItems();
      showScreen("quotes");
      await loadQuotes();
      return;
    }

    let res;
    if (isEditing) {
      res = await apiFetch(`/api/quotes/${editingQuoteId}`, {
        method: "PUT",
        body: JSON.stringify(quoteData),
      });
    } else {
      quoteData.quote_number = `QT-${Date.now()}`;
      quoteData.status = "draft";
      quoteData.created_at = new Date().toISOString();
      res = await apiFetch("/api/quotes", {
        method: "POST",
        body: JSON.stringify(quoteData),
      });
    }

    if (res.ok) {
      const data = await res.json();
      quoteData.id = isEditing ? editingQuoteId : data.id;
      
      try {
        await tradebaseDB.saveQuote(quoteData);
      } catch (dbErr) {
        // IndexedDB save is non-critical, continue
      }
      
      saveLineItemsFromUI();
      setButtonLoading(submitBtn, false);
      showToast(isEditing ? "Quote updated!" : "Quote created!");
      resetQuoteForm();
      showScreen("quotes");
      await loadQuotes();
    } else {
      const data = await res.json();
      errorEl.textContent = data.error || "Failed to save quote.";
      setButtonLoading(submitBtn, false);
    }
  } catch (err) {
    // Show error to user but do NOT logout
    errorEl.textContent = err.message || "An error occurred. Please try again.";
    setButtonLoading(submitBtn, false);
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
      quantity: qty,
      unit_price: price,
      total: qty * price,
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
    <div class="li-desc-wrapper">
      <input type="text" placeholder="${t('quote.line_description_placeholder')}" class="item-desc" value="${data.description || ""}" autocomplete="off" />
      <div class="line-item-suggest hidden"></div>
    </div>
    <input type="number" placeholder="${t('quote.line_qty_placeholder')}" class="item-qty" value="${data.quantity || 1}" min="0" step="0.01" />
    <input type="number" placeholder="${t('quote.line_price_placeholder')}" class="item-price" value="${data.unit_price || 0}" min="0" step="0.01" />
    <button type="button" class="btn-sm" onclick="this.parentElement.remove(); updateQuoteTotals()">Remove</button>
  `;
  container.appendChild(row);

  const descInput = row.querySelector(".item-desc");
  const suggestBox = row.querySelector(".line-item-suggest");
  const priceInput = row.querySelector(".item-price");
  
  descInput.addEventListener("input", () => {
    const query = descInput.value.trim().toLowerCase();
    if (query.length < 2) {
      suggestBox.classList.add("hidden");
      return;
    }
    const saved = getSavedLineItems();
    const matches = saved.filter(i => i.description.toLowerCase().includes(query)).slice(0, 5);
    if (matches.length === 0) {
      suggestBox.classList.add("hidden");
      return;
    }
    suggestBox.innerHTML = matches.map(m => `
      <div class="suggest-item" data-desc="${m.description}" data-price="${m.price}">
        <span class="suggest-desc">${m.description}</span>
        <span class="suggest-price">${formatCurrency(m.price)}</span>
      </div>
    `).join('');
    suggestBox.classList.remove("hidden");
    
    suggestBox.querySelectorAll(".suggest-item").forEach(el => {
      el.addEventListener("click", () => {
        descInput.value = el.dataset.desc;
        priceInput.value = el.dataset.price;
        suggestBox.classList.add("hidden");
        updateQuoteTotals();
      });
    });
  });
  
  descInput.addEventListener("blur", () => {
    setTimeout(() => suggestBox.classList.add("hidden"), 150);
  });

  row.querySelectorAll("input").forEach((inp) => {
    inp.addEventListener("input", updateQuoteTotals);
  });
}

function updateQuoteTotals() {
  const items = getQuoteLineItemsFromUI();
  let subtotal = 0;
  items.forEach((i) => (subtotal += i.total));

  const taxPercent = parseFloat(document.getElementById("quote-tax").value) || 0;
  const tax = subtotal * (taxPercent / 100);
  const total = subtotal + tax;

  document.getElementById("quote-subtotal").textContent = formatCurrency(subtotal);
  document.getElementById("quote-tax-amount").textContent = formatCurrency(tax);
  document.getElementById("quote-total").textContent = formatCurrency(total);
  
  // Update live preview if visible
  updateQuotePreview();
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

  // Wire up quote preview toggle
  const quotePreviewToggle = document.getElementById("btn-quote-preview-toggle");
  if (quotePreviewToggle) {
    quotePreviewToggle.addEventListener("click", toggleQuotePreview);
  }

  // Wire up live preview updates for quotes
  const quoteClientName = document.getElementById("quote-client-name");
  if (quoteClientName) {
    quoteClientName.addEventListener("input", updateQuotePreview);
  }
  const quoteDate = document.getElementById("quote-date");
  if (quoteDate) {
    quoteDate.addEventListener("change", updateQuotePreview);
  }
  const quoteTemplate = document.getElementById("quote-template");
  if (quoteTemplate) {
    quoteTemplate.addEventListener("change", updateQuotePreview);
  }
  const quoteNotes = document.getElementById("quote-notes");
  if (quoteNotes) {
    quoteNotes.addEventListener("input", updateQuotePreview);
  }
}

// LIVE PREVIEW FUNCTIONS

let invoicePreviewVisible = false;
let quotePreviewVisible = false;

function toggleInvoicePreview() {
  invoicePreviewVisible = !invoicePreviewVisible;
  const panel = document.getElementById("invoice-preview-panel");
  const btn = document.getElementById("btn-invoice-preview-toggle");
  
  if (invoicePreviewVisible) {
    panel.classList.remove("hidden");
    btn.classList.add("active");
    btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Hide Preview';
    updateInvoicePreview();
  } else {
    panel.classList.add("hidden");
    btn.classList.remove("active");
    btn.innerHTML = '<i class="fa-solid fa-eye"></i> Show Preview';
  }
}

function toggleQuotePreview() {
  quotePreviewVisible = !quotePreviewVisible;
  const panel = document.getElementById("quote-preview-panel");
  const btn = document.getElementById("btn-quote-preview-toggle");
  
  if (quotePreviewVisible) {
    panel.classList.remove("hidden");
    btn.classList.add("active");
    btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Hide Preview';
    updateQuotePreview();
  } else {
    panel.classList.add("hidden");
    btn.classList.remove("active");
    btn.innerHTML = '<i class="fa-solid fa-eye"></i> Show Preview';
  }
}

function updateInvoicePreview() {
  if (!invoicePreviewVisible) return;
  
  const content = document.getElementById("invoice-preview-content");
  if (!content) return;
  
  const clientName = document.getElementById("invoice-client-name")?.value || '';
  const clientAddress = document.getElementById("invoice-client-address")?.value || '';
  const date = document.getElementById("invoice-date")?.value || new Date().toISOString().split('T')[0];
  let notes = document.getElementById("invoice-notes")?.value || '';
  const templateSelect = document.getElementById("invoice-template-select");
  const template = templateSelect ? templateSelect.value : 'basic_clean';
  
  // Include warranty text if checkbox is checked
  const warrantyCheckbox = document.getElementById("invoice-include-warranty");
  const warrantyText = document.getElementById("invoice-warranty-text")?.value || '';
  if (warrantyCheckbox?.checked && warrantyText.trim()) {
    notes = notes ? `${notes}\n\n--- Warranty/Terms ---\n${warrantyText}` : `--- Warranty/Terms ---\n${warrantyText}`;
  }
  
  const items = getLineItemsFromUI();
  let subtotal = 0;
  items.forEach(i => subtotal += i.total);
  
  const taxPercent = parseFloat(document.getElementById("helper-tax")?.value) || 0;
  const tax = subtotal * (taxPercent / 100);
  const total = subtotal + tax;
  
  const invoiceData = {
    invoice_number: 'INV-PREVIEW',
    issue_date: date,
    client_name: clientName || 'Client Name',
    client_address: clientAddress,
    client: { email: '', phone: '', address: clientAddress },
    business_name: '',
    address: '',
    phone: '',
    logo_url: '',
    items: items,
    subtotal: subtotal,
    tax_amount: tax,
    total: total,
    notes: notes,
    template: template
  };
  
  // Use the template rendering functions from templates.js
  let html = '';
  if (template === 'basic_clean') {
    html = renderBasicClean(invoiceData, 'INVOICE', 'invoice_number', 'issue_date');
  } else if (template === 'modern_pro') {
    html = renderModernPro(invoiceData, 'INVOICE', 'invoice_number', 'issue_date');
  } else if (template === 'color_accent') {
    html = renderColorAccent(invoiceData, 'INVOICE', 'invoice_number', 'issue_date');
  } else if (template === 'big_total') {
    html = renderBigTotal(invoiceData, 'INVOICE', 'invoice_number', 'issue_date');
  }
  
  if (!clientName && items.length === 0) {
    content.innerHTML = `
      <div class="preview-empty">
        <i class="fa-solid fa-file-invoice"></i>
        Start filling out the form to see a live preview
      </div>
    `;
  } else {
    content.innerHTML = `<div class="preview-content-wrapper">${html}</div>`;
  }
}

function updateQuotePreview() {
  if (!quotePreviewVisible) return;
  
  const content = document.getElementById("quote-preview-content");
  if (!content) return;
  
  const clientName = document.getElementById("quote-client-name")?.value || '';
  const date = document.getElementById("quote-date")?.value || new Date().toISOString().split('T')[0];
  let notes = document.getElementById("quote-notes")?.value || '';
  const templateSelect = document.getElementById("quote-template");
  const template = templateSelect ? templateSelect.value : 'basic_clean';
  
  // Include warranty text if checkbox is checked
  const warrantyCheckbox = document.getElementById("quote-include-warranty");
  const warrantyText = document.getElementById("quote-warranty-text")?.value || '';
  if (warrantyCheckbox?.checked && warrantyText.trim()) {
    notes = notes ? `${notes}\n\n--- Warranty/Terms ---\n${warrantyText}` : `--- Warranty/Terms ---\n${warrantyText}`;
  }
  
  const items = getQuoteLineItemsFromUI();
  let subtotal = 0;
  items.forEach(i => subtotal += i.total);
  
  const taxPercent = parseFloat(document.getElementById("quote-tax")?.value) || 0;
  const tax = subtotal * (taxPercent / 100);
  const total = subtotal + tax;
  
  const quoteData = {
    quote_number: 'QUO-PREVIEW',
    issue_date: date,
    client_name: clientName || 'Client Name',
    client: { email: '', phone: '', address: '' },
    business_name: '',
    address: '',
    phone: '',
    logo_url: '',
    items: items,
    subtotal: subtotal,
    tax_amount: tax,
    total: total,
    notes: notes,
    template: template
  };
  
  // Use the template rendering functions from templates.js
  let html = '';
  if (template === 'basic_clean') {
    html = renderBasicClean(quoteData, 'QUOTE', 'quote_number', 'issue_date');
  } else if (template === 'modern_pro') {
    html = renderModernPro(quoteData, 'QUOTE', 'quote_number', 'issue_date');
  } else if (template === 'color_accent') {
    html = renderColorAccent(quoteData, 'QUOTE', 'quote_number', 'issue_date');
  } else if (template === 'big_total') {
    html = renderBigTotal(quoteData, 'QUOTE', 'quote_number', 'issue_date');
  }
  
  if (!clientName && items.length === 0) {
    content.innerHTML = `
      <div class="preview-empty">
        <i class="fa-solid fa-file-contract"></i>
        Start filling out the form to see a live preview
      </div>
    `;
  } else {
    content.innerHTML = `<div class="preview-content-wrapper">${html}</div>`;
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
      <strong>Quote #:</strong> ${quoteData.quote_number || String(quoteData.id).slice(0, 8)}<br>
      <strong>Date:</strong> ${quoteData.quote_date || new Date().toLocaleDateString()}<br>
      <strong>Status:</strong> ${quoteData.status || "draft"}<br>
      ${quoteData.notes ? `<br><strong>Notes:</strong> ${quoteData.notes}` : ""}
    `;
    
    const quoteForTemplate = {
      ...quoteData,
      number: quoteData.quote_number,
      date: quoteData.quote_date,
      business_name: profile?.business_name,
      address: profile?.business_address,
      phone: profile?.business_phone,
      email: profile?.business_email,
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
      downloadBlobAsPng(blob, `quote-${quoteData.quote_number || quoteData.id}.png`, "Quote");
    });
    
  } catch (err) {
    console.error("Download error:", err);
    showToast("Failed to download quote");
  }
}

async function shareQuote(quote) {
  try {
    showToast("Generating quote image...");
    
    const quoteNumber = quote.quote_number || (quote.id ? String(quote.id).slice(0, 8) : 'N/A');
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
  
  const btnScheduleJob = document.getElementById("btn-schedule-job");
  if (btnScheduleJob) {
    btnScheduleJob.addEventListener("click", () => {
      if (!currentJob) return;
      scheduleEventFromJob(currentJob.id, currentJob.client_name || 'Unknown');
    });
  }
  
  const btnLinkInvoice = document.getElementById("btn-link-invoice");
  if (btnLinkInvoice) {
    btnLinkInvoice.addEventListener("click", () => {
      if (!currentJob) return;
      openLinkToJobModal("invoice", currentJob.id);
    });
  }
  
  const btnLinkQuote = document.getElementById("btn-link-quote");
  if (btnLinkQuote) {
    btnLinkQuote.addEventListener("click", () => {
      if (!currentJob) return;
      openLinkToJobModal("quote", currentJob.id);
    });
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
  list.innerHTML = "";

  jobs.forEach(job => {
    const statusColor = job.status === "open" ? "var(--primary)" :
                        job.status === "closed" ? "#4CAF50" : "var(--muted)";
    const statusIcon = job.status === "open" ? "fa-folder-open" :
                       job.status === "closed" ? "fa-check-circle" : "fa-box-archive";
    const dateStr = job.created_at ? new Date(job.created_at).toLocaleDateString() : "-";

    const content = `
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
    `;
    
    const actions = [
      { icon: "fa-solid fa-pen", label: "Edit", class: "edit-action", handler: () => viewJobDetail(job.id) },
      { icon: "fa-solid fa-trash", label: "Delete", class: "delete-action", handler: () => {
        showDeleteConfirmModal("job", job.client_name || job.id, () => deleteJob(job.id));
      }}
    ];
    
    const itemMeta = { type: "job", id: job.id, data: job };
    const item = createSwipeableItem(content, actions, () => viewJobDetail(job.id), itemMeta);
    list.appendChild(item);
  });
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

// Link to Job Modal Functions
let linkToJobType = null;
let linkToJobId = null;

async function openLinkToJobModal(type, jobId) {
  linkToJobType = type;
  linkToJobId = jobId;
  
  const modal = document.getElementById("link-to-job-modal");
  const title = document.getElementById("link-modal-title");
  const list = document.getElementById("link-items-list");
  const empty = document.getElementById("link-items-empty");
  
  title.textContent = type === "invoice" ? "Link Invoice to Job" : "Link Quote to Job";
  list.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--muted);">Loading...</div>';
  empty.style.display = "none";
  
  modal.classList.add("active");
  
  try {
    const endpoint = type === "invoice" ? "/api/invoices" : "/api/quotes";
    const res = await apiFetch(endpoint);
    
    if (!res.ok) {
      list.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--danger);">Failed to load items</div>';
      return;
    }
    
    const items = await res.json();
    const unlinked = items.filter(item => !item.job_id);
    
    if (unlinked.length === 0) {
      list.innerHTML = "";
      empty.style.display = "block";
      return;
    }
    
    empty.style.display = "none";
    
    if (type === "invoice") {
      list.innerHTML = unlinked.map(inv => `
        <div class="list-item" onclick="linkItemToJob('invoice', ${inv.id})" style="cursor: pointer;">
          <div>
            <strong>${inv.invoice_number || 'Invoice #' + inv.id}</strong>
            <br><span style="color: var(--muted); font-size: 13px;">${inv.client_name || 'No client'} - ${inv.issue_date || ''}</span>
          </div>
          <span style="font-weight: 600;">${formatCurrency(inv.total || 0)}</span>
        </div>
      `).join("");
    } else {
      list.innerHTML = unlinked.map(q => `
        <div class="list-item" onclick="linkItemToJob('quote', ${q.id})" style="cursor: pointer;">
          <div>
            <strong>${q.quote_number || 'Quote #' + q.id}</strong>
            <br><span style="color: var(--muted); font-size: 13px;">${q.client_name || 'No client'} - ${q.issue_date || ''}</span>
          </div>
          <span style="font-weight: 600;">${formatCurrency(q.total || 0)}</span>
        </div>
      `).join("");
    }
  } catch (err) {
    console.error("Error loading items for link modal:", err);
    list.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--danger);">Error loading items</div>';
  }
}

function closeLinkToJobModal() {
  const modal = document.getElementById("link-to-job-modal");
  modal.classList.remove("active");
  linkToJobType = null;
  linkToJobId = null;
}

window.openLinkToJobModal = openLinkToJobModal;
window.closeLinkToJobModal = closeLinkToJobModal;

async function linkItemToJob(type, itemId) {
  if (!linkToJobId) {
    showToast("No job selected");
    return;
  }
  
  try {
    const endpoint = type === "invoice" 
      ? `/api/invoices/${itemId}/job`
      : `/api/quotes/${itemId}/job`;
    
    const res = await apiFetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: linkToJobId })
    });
    
    if (res.ok) {
      showToast(type === "invoice" ? "Invoice linked to job!" : "Quote linked to job!");
      closeLinkToJobModal();
      await viewJobDetail(linkToJobId);
    } else {
      const err = await res.json();
      showToast(err.error || "Failed to link item");
    }
  } catch (err) {
    console.error("Error linking item to job:", err);
    showToast("Error linking item to job");
  }
}

window.linkItemToJob = linkItemToJob;

// Job Folder Picker - for linking FROM invoice/quote detail view
let jobPickerType = null;
let jobPickerItemId = null;

async function openJobFolderPicker(type, itemId) {
  jobPickerType = type;
  jobPickerItemId = itemId;
  
  const modal = document.getElementById("job-folder-picker-modal");
  const title = document.getElementById("job-folder-picker-title");
  const list = document.getElementById("job-folder-picker-list");
  const empty = document.getElementById("job-folder-picker-empty");
  
  title.textContent = type === "invoice" ? "Add Invoice to Job Folder" : "Add Quote to Job Folder";
  list.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--muted);">Loading job folders...</div>';
  empty.style.display = "none";
  
  modal.classList.add("active");
  
  try {
    const res = await apiFetch("/api/jobs");
    
    if (!res.ok) {
      list.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--danger);">Failed to load job folders</div>';
      return;
    }
    
    const jobs = await res.json();
    const activeJobs = jobs.filter(job => job.status !== 'closed');
    
    if (activeJobs.length === 0) {
      list.innerHTML = "";
      empty.style.display = "block";
      return;
    }
    
    empty.style.display = "none";
    
    list.innerHTML = activeJobs.map(job => `
      <div class="list-item" onclick="selectJobFolder('${job.id}')" style="cursor: pointer; padding: 12px;">
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-folder" style="color: var(--accent);"></i>
            <strong>${job.client_name || 'Unnamed Job'}</strong>
          </div>
          <div style="color: var(--muted); font-size: 13px; margin-top: 4px;">
            ${job.address || 'No address'} | ${job.job_type || 'General'}
          </div>
        </div>
        <span class="status-badge ${job.status === 'open' ? 'success' : ''}">${job.status || 'open'}</span>
      </div>
    `).join("");
  } catch (err) {
    console.error("Error loading jobs for picker:", err);
    list.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--danger);">Error loading job folders</div>';
  }
}

function closeJobFolderPicker() {
  const modal = document.getElementById("job-folder-picker-modal");
  modal.classList.remove("active");
  jobPickerType = null;
  jobPickerItemId = null;
}

async function selectJobFolder(jobId) {
  if (!jobPickerItemId || !jobPickerType) {
    showToast("No item selected");
    return;
  }
  
  try {
    const endpoint = jobPickerType === "invoice" 
      ? `/api/invoices/${jobPickerItemId}/job`
      : `/api/quotes/${jobPickerItemId}/job`;
    
    const res = await apiFetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId })
    });
    
    if (res.ok) {
      showToast(jobPickerType === "invoice" ? "Invoice added to job folder!" : "Quote added to job folder!");
      closeJobFolderPicker();
      // Refresh the detail view to show the linked job
      if (jobPickerType === "invoice") {
        await viewInvoiceDetail(jobPickerItemId);
      } else {
        await viewQuoteDetail(jobPickerItemId);
      }
    } else {
      const err = await res.json();
      showToast(err.error || "Failed to add to job folder");
    }
  } catch (err) {
    console.error("Error adding to job folder:", err);
    showToast("Error adding to job folder");
  }
}

async function unlinkFromJob(type, itemId) {
  if (!confirm("Remove this " + type + " from its job folder?")) {
    return;
  }
  
  try {
    const endpoint = type === "invoice" 
      ? `/api/invoices/${itemId}/job`
      : `/api/quotes/${itemId}/job`;
    
    const res = await apiFetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: null })
    });
    
    if (res.ok) {
      showToast(type === "invoice" ? "Invoice removed from job folder" : "Quote removed from job folder");
      // Refresh the detail view
      if (type === "invoice") {
        await viewInvoiceDetail(itemId);
      } else {
        await viewQuoteDetail(itemId);
      }
    } else {
      const err = await res.json();
      showToast(err.error || "Failed to unlink from job");
    }
  } catch (err) {
    console.error("Error unlinking from job:", err);
    showToast("Error unlinking from job");
  }
}

window.openJobFolderPicker = openJobFolderPicker;
window.closeJobFolderPicker = closeJobFolderPicker;
window.selectJobFolder = selectJobFolder;
window.unlinkFromJob = unlinkFromJob;

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
      { id: 1, title: "Welcome to Skippy Stack!", content: "Thank you for joining. Start by creating your first quote!", message_type: "success", is_read: false, created_at: new Date().toISOString() },
      { id: 2, title: "Trial Reminder", content: "Your 30-day free trial has started. Enjoy all features!", message_type: "info", is_read: false, created_at: new Date(Date.now() - 86400000).toISOString() }
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
    
    // Update usage indicator
    if (data.usage) {
      updateAIUsageDisplay(data.usage);
    }
  } else {
    inactiveSection?.classList.remove("hidden");
    activeSection?.classList.add("hidden");
    voiceRecorder?.classList.add("hidden");
  }
}

function updateAIUsageDisplay(usage) {
  if (!usage) return;
  
  const used = usage.actions_used || 0;
  const limit = usage.actions_limit || 300;
  const remaining = limit - used;
  const percentage = Math.min((used / limit) * 100, 100);
  
  // Update Settings page elements (if present)
  const usedEl = document.getElementById("ai-actions-used");
  const limitEl = document.getElementById("ai-actions-limit");
  const fillEl = document.getElementById("ai-usage-fill");
  const resetDateEl = document.getElementById("ai-reset-date");
  const warningEl = document.getElementById("ai-usage-warning");
  const remainingEl = document.getElementById("ai-actions-remaining");
  const limitReachedEl = document.getElementById("ai-usage-limit-reached");
  const limitResetDateEl = document.getElementById("ai-limit-reset-date");
  
  if (usedEl) usedEl.textContent = used;
  if (limitEl) limitEl.textContent = limit;
  
  // Update Dashboard AI usage pill (always visible when AI enabled)
  const dashboardUsedEl = document.getElementById("dashboard-ai-used");
  const dashboardLimitEl = document.getElementById("dashboard-ai-limit");
  const dashboardContainer = document.getElementById("dashboard-ai-usage");
  
  if (dashboardUsedEl) dashboardUsedEl.textContent = used;
  if (dashboardLimitEl) dashboardLimitEl.textContent = limit;
  if (dashboardContainer && aiEnabled) {
    dashboardContainer.classList.remove("hidden");
  }
  
  if (fillEl) {
    fillEl.style.width = `${percentage}%`;
    
    // Color the bar based on usage
    if (used >= limit) {
      fillEl.style.background = '#EF4444'; // Red - at limit
    } else if (used >= 250) {
      fillEl.style.background = '#F59E0B'; // Orange - warning
    } else {
      fillEl.style.background = 'var(--accent)'; // Default accent
    }
  }
  
  if (resetDateEl && usage.reset_date) {
    const resetDate = new Date(usage.reset_date);
    resetDateEl.textContent = resetDate.toLocaleDateString();
  }
  
  // Show warning if approaching limit
  if (warningEl && remainingEl) {
    if (usage.is_warning) {
      warningEl.style.display = 'block';
      remainingEl.textContent = remaining;
    } else {
      warningEl.style.display = 'none';
    }
  }
  
  // Show limit reached message
  if (limitReachedEl && limitResetDateEl) {
    if (usage.is_at_limit) {
      limitReachedEl.style.display = 'block';
      const resetDate = new Date(usage.reset_date);
      limitResetDateEl.textContent = resetDate.toLocaleDateString();
    } else {
      limitReachedEl.style.display = 'none';
    }
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

async function clearLocalCache() {
  if (!confirm("This will clear all locally cached data and reload the app. Continue?")) {
    return;
  }
  
  try {
    // Clear IndexedDB
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name) {
        indexedDB.deleteDatabase(db.name);
      }
    }
    
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Unregister service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }
    
    // Clear caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
      }
    }
    
    showToast("Cache cleared! Reloading...");
    setTimeout(() => {
      window.location.reload(true);
    }, 1000);
  } catch (err) {
    console.error("Error clearing cache:", err);
    showToast("Error clearing cache. Try clearing browser data manually.");
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

// ============================================================================
// COMMAND MIC - Unified Voice Command System
// One button to do it all: add clients, inventory, create quotes
// ============================================================================

let commandMicRecorder = null;
let commandMicStream = null;
let commandMicChunks = [];

async function startCommandMic() {
  // Check AI subscription
  if (!aiEnabled && !tourMode) {
    showToast("AI subscription required. Enable in Settings.");
    return;
  }
  
  // Demo mode
  if (tourMode) {
    showDemoCommandMic();
    return;
  }
  
  // Check usage limits
  const usageCheck = await checkAIUsageLimit();
  if (usageCheck.is_at_limit) {
    showToast(`AI limit reached (${usageCheck.actions_used}/${usageCheck.actions_limit}). Resets ${new Date(usageCheck.reset_date).toLocaleDateString()}`);
    return;
  }
  
  try {
    // Request microphone
    commandMicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    commandMicRecorder = new MediaRecorder(commandMicStream);
    commandMicChunks = [];
    
    // Show recording overlay
    const overlay = document.getElementById("command-mic-overlay");
    const status = document.getElementById("command-mic-status");
    const transcript = document.getElementById("command-mic-transcript");
    
    overlay.classList.remove("hidden");
    status.textContent = "Listening...";
    transcript.textContent = "";
    
    // Collect audio chunks
    commandMicRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        commandMicChunks.push(e.data);
      }
    };
    
    // Handle recording stop
    commandMicRecorder.onstop = async () => {
      await processCommandMicAudio();
    };
    
    // Start recording
    commandMicRecorder.start();
    
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(50);
    
  } catch (err) {
    console.error("Microphone error:", err);
    showToast("Microphone access denied. Please allow microphone access.");
  }
}

function stopCommandMic() {
  if (commandMicRecorder && commandMicRecorder.state === "recording") {
    commandMicRecorder.stop();
    
    // Update UI to processing state
    const status = document.getElementById("command-mic-status");
    const modal = document.querySelector(".command-mic-modal");
    const stopBtn = document.getElementById("btn-command-mic-stop");
    
    status.textContent = "Processing...";
    modal.classList.add("processing");
    stopBtn.disabled = true;
    stopBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
  }
}

function cancelCommandMic() {
  if (commandMicRecorder && commandMicRecorder.state === "recording") {
    commandMicRecorder.stop();
  }
  
  // Stop stream
  if (commandMicStream) {
    commandMicStream.getTracks().forEach(track => track.stop());
    commandMicStream = null;
  }
  
  // Hide overlay
  hideCommandMicOverlay();
  commandMicChunks = [];
}

function hideCommandMicOverlay() {
  const overlay = document.getElementById("command-mic-overlay");
  const modal = document.querySelector(".command-mic-modal");
  const stopBtn = document.getElementById("btn-command-mic-stop");
  
  overlay.classList.add("hidden");
  modal.classList.remove("processing");
  stopBtn.disabled = false;
  stopBtn.innerHTML = '<i class="fa-solid fa-stop"></i> Done Speaking';
}

async function processCommandMicAudio() {
  try {
    // Stop stream
    if (commandMicStream) {
      commandMicStream.getTracks().forEach(track => track.stop());
      commandMicStream = null;
    }
    
    if (commandMicChunks.length === 0) {
      hideCommandMicOverlay();
      showToast("No audio recorded");
      return;
    }
    
    // Create audio blob
    const audioBlob = new Blob(commandMicChunks, { type: "audio/webm" });
    commandMicChunks = [];
    
    // Update status
    const status = document.getElementById("command-mic-status");
    const transcript = document.getElementById("command-mic-transcript");
    status.textContent = "Transcribing...";
    
    // Send to unified voice command endpoint (preview mode by default)
    const formData = new FormData();
    formData.append("audio", audioBlob, "command.webm");
    formData.append("preview", "true");
    
    const res = await apiFetch("/api/voice-command", {
      method: "POST",
      body: formData
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to process command");
    }
    
    const result = await res.json();
    console.log("Voice command result:", result);
    
    // Show transcript
    if (result.transcript) {
      transcript.textContent = `"${result.transcript}"`;
    }
    
    // Hide mic overlay
    hideCommandMicOverlay();
    
    // Handle result based on status
    if (result.status === "no_action") {
      showToast(result.message || "I didn't understand. Try again.");
      return;
    }
    
    // PREVIEW MODE: Show confirmation modal
    if (result.status === "preview" && result.plannedActions) {
      showActionPreviewModal(result.previewId, result.transcript, result.plannedActions);
      return;
    }
    
    // DIRECT EXECUTION (legacy or explicit): Show toasts
    if (result.actions && result.actions.length > 0) {
      for (const action of result.actions) {
        if (action.success) {
          showToast(action.summary, "success");
        } else {
          showToast(`Failed: ${action.summary}`, "error");
        }
        await new Promise(r => setTimeout(r, 500));
      }
      refreshAfterVoiceCommand(result.actions);
      
      // Update AI usage display with returned data
      if (result.usage) {
        updateAIUsageDisplay(result.usage);
      }
    }
    
  } catch (err) {
    console.error("Command mic error:", err);
    hideCommandMicOverlay();
    showToast(err.message || "Failed to process voice command");
  }
}

// Show action preview modal for user confirmation
function showActionPreviewModal(previewId, transcript, plannedActions) {
  // Remove existing modal if any
  const existing = document.getElementById("action-preview-modal");
  if (existing) existing.remove();
  
  // Check if any actions are risky (send, delete, charge)
  const hasRiskyActions = plannedActions.some(a => a.risky);
  
  const actionsHtml = plannedActions.map(action => `
    <div class="action-preview-item ${action.risky ? 'action-risky' : ''}">
      <span class="action-icon">${action.risky ? '⚠️' : action.icon}</span>
      <div class="action-details">
        <div class="action-title">${action.risky ? '<span class="risky-badge">Risky</span> ' : ''}${action.title}</div>
        <div class="action-description">${action.description}</div>
      </div>
      <span class="action-check">${action.risky ? '!' : '✓'}</span>
    </div>
  `).join("");
  
  const riskyWarningHtml = hasRiskyActions ? `
    <div class="risky-warning">
      <i class="fa-solid fa-exclamation-triangle"></i>
      <span>This includes actions that send emails, delete data, or charge money. Please review carefully.</span>
    </div>
    <label class="risky-confirm-checkbox">
      <input type="checkbox" id="risky-confirm-check" onchange="toggleRiskyRunButton()">
      <span>I understand and want to proceed with these risky actions</span>
    </label>
  ` : '';
  
  const modal = document.createElement("div");
  modal.id = "action-preview-modal";
  modal.className = "action-preview-overlay";
  modal.innerHTML = `
    <div class="modal action-preview-modal-content">
      <div class="modal-header">
        <h3>${hasRiskyActions ? '⚠️ Review Risky Actions' : 'Confirm Actions'}</h3>
        <button class="modal-close" onclick="cancelActionPreview()">&times;</button>
      </div>
      <div class="modal-body">
        <p class="transcript-preview">"${transcript}"</p>
        <div class="action-preview-list">
          ${actionsHtml}
        </div>
        ${riskyWarningHtml}
      </div>
      <div class="modal-footer action-preview-buttons">
        <button class="btn btn-secondary" onclick="cancelActionPreview()">Cancel</button>
        <button class="btn btn-primary" id="btn-run-actions" onclick="confirmActionPreview('${previewId}')" ${hasRiskyActions ? 'disabled' : ''}>
          <i class="fa-solid fa-check"></i> Run All
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Store for potential undo
  window.currentPreviewId = previewId;
}

function toggleRiskyRunButton() {
  const checkbox = document.getElementById("risky-confirm-check");
  const btn = document.getElementById("btn-run-actions");
  if (checkbox && btn) {
    btn.disabled = !checkbox.checked;
  }
}

function cancelActionPreview() {
  const modal = document.getElementById("action-preview-modal");
  if (modal) modal.remove();
  window.currentPreviewId = null;
}

async function confirmActionPreview(previewId) {
  const modal = document.getElementById("action-preview-modal");
  const runBtn = modal?.querySelector(".btn-primary");
  
  if (runBtn) {
    runBtn.disabled = true;
    runBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Running...';
  }
  
  try {
    const res = await apiFetch("/api/voice-command/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ previewId })
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to execute actions");
    }
    
    const result = await res.json();
    console.log("Confirmed actions result:", result);
    
    // Close modal
    if (modal) modal.remove();
    
    // Store last action set for undo
    window.lastActionSetId = result.actionSetId;
    
    // Show results with undo option
    if (result.actions && result.actions.length > 0) {
      const successCount = result.actions.filter(a => a.success).length;
      
      if (successCount > 0) {
        showUndoableToast(`${successCount} action${successCount > 1 ? 's' : ''} completed`, result.actionSetId);
      }
      
      // Show individual failures
      for (const action of result.actions) {
        if (!action.success) {
          showToast(`Failed: ${action.summary}`, "error");
        }
      }
      
      refreshAfterVoiceCommand(result.actions);
    }
    
    // Update AI usage display with returned data
    if (result.usage) {
      updateAIUsageDisplay(result.usage);
    }
    
  } catch (err) {
    // Only log and show toast for real errors with content
    const hasMessage = err && err.message && err.message.length > 0;
    const hasKeys = err && typeof err === 'object' && Object.keys(err).length > 0;
    if (hasMessage) {
      console.error("Confirm action error:", err);
      showToast(err.message, "error");
    } else if (hasKeys && !(err instanceof Object && Object.keys(err).length === 0)) {
      console.error("Confirm action error:", err);
      showToast("Failed to execute actions", "error");
    }
    // Silently ignore empty objects - likely a spurious error from somewhere
    if (modal) modal.remove();
  }
}

// Toast with undo button
function showUndoableToast(message, actionSetId) {
  const existing = document.querySelector(".toast-undoable");
  if (existing) existing.remove();
  
  const toast = document.createElement("div");
  toast.className = "toast toast-success toast-undoable";
  toast.innerHTML = `
    <span>${message}</span>
    <button class="toast-undo-btn" onclick="undoLastActions('${actionSetId}', this)">Undo</button>
  `;
  
  document.body.appendChild(toast);
  
  // Auto-remove after 8 seconds (longer for undo option)
  setTimeout(() => {
    toast.classList.add("toast-fade");
    setTimeout(() => toast.remove(), 300);
  }, 8000);
}

async function undoLastActions(actionSetId, btn) {
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Undoing...";
  }
  
  try {
    const res = await apiFetch("/api/activity-log/undo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionSetId })
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to undo");
    }
    
    const result = await res.json();
    console.log("Undo result:", result);
    
    // Remove the toast
    if (btn) {
      const toast = btn.closest(".toast");
      if (toast) toast.remove();
    }
    
    showToast("Actions undone", "success");
    
    // Refresh current screen
    const currentScreen = document.querySelector(".screen.active")?.id;
    switch (currentScreen) {
      case "screen-clients": loadClients(); break;
      case "screen-inventory": loadInventory(); break;
      case "screen-quotes": loadQuotes(); break;
      case "screen-invoices": loadInvoices(); break;
      case "screen-calendar": loadCalendar(); break;
      case "screen-jobs": loadJobs(); break;
      case "screen-dashboard": loadDashboardStats(); break;
    }
    
  } catch (err) {
    console.error("Undo error:", err);
    showToast(err.message || "Failed to undo", "error");
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Undo";
    }
  }
}

// Make functions globally accessible
window.cancelActionPreview = cancelActionPreview;
window.confirmActionPreview = confirmActionPreview;
window.undoLastActions = undoLastActions;
window.showActivityLog = showActivityLog;
window.toggleRiskyRunButton = toggleRiskyRunButton;

async function showActivityLog() {
  const container = document.getElementById("activity-log-list");
  if (!container) return;
  
  container.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>';
  
  try {
    const res = await apiFetch("/api/activity-log?limit=100");
    if (!res.ok) throw new Error("Failed to load activity log");
    
    const logs = await res.json();
    
    if (!logs || logs.length === 0) {
      container.innerHTML = `
        <div class="activity-log-empty">
          <i class="fa-solid fa-clock-rotate-left"></i>
          <p>No voice commands yet</p>
          <p class="text-muted">Use "Talk to Work" to add clients, inventory, or create quotes with your voice</p>
        </div>
      `;
      return;
    }
    
    const groupedBySet = {};
    for (const log of logs) {
      const setId = log.action_set_id;
      if (!groupedBySet[setId]) {
        groupedBySet[setId] = {
          actions: [],
          timestamp: log.created_at,
          isUndone: log.is_undone
        };
      }
      groupedBySet[setId].actions.push(log);
    }
    
    const actionSetIds = Object.keys(groupedBySet).sort((a, b) => {
      return new Date(groupedBySet[b].timestamp) - new Date(groupedBySet[a].timestamp);
    });
    
    let html = '<div class="activity-timeline">';
    
    for (const setId of actionSetIds) {
      const group = groupedBySet[setId];
      const date = new Date(group.timestamp);
      const timeAgo = formatTimeAgo(date);
      const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      const timeStr = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      
      html += `
        <div class="activity-group ${group.isUndone ? 'undone' : ''}">
          <div class="activity-group-header">
            <span class="activity-time">${timeAgo}</span>
            <span class="activity-date">${dateStr} at ${timeStr}</span>
            ${group.isUndone ? '<span class="activity-undone-badge">Undone</span>' : ''}
          </div>
          <div class="activity-actions">
      `;
      
      for (const action of group.actions) {
        const icon = getActionIcon(action.action_type);
        html += `
          <div class="activity-action-item">
            <span class="activity-action-icon">${icon}</span>
            <span class="activity-action-summary">${escapeHtml(action.summary || action.action_type)}</span>
          </div>
        `;
      }
      
      html += `
          </div>
        </div>
      `;
    }
    
    html += '</div>';
    container.innerHTML = html;
    
  } catch (err) {
    console.error("Error loading activity log:", err);
    container.innerHTML = `
      <div class="activity-log-empty">
        <i class="fa-solid fa-exclamation-triangle"></i>
        <p>Failed to load history</p>
        <p class="text-muted">${err.message}</p>
      </div>
    `;
  }
}

function getActionIcon(actionType) {
  switch (actionType) {
    case 'create_client': return '<i class="fa-solid fa-user-plus"></i>';
    case 'add_inventory_item': return '<i class="fa-solid fa-box"></i>';
    case 'create_quote': return '<i class="fa-solid fa-file-invoice"></i>';
    case 'create_invoice': return '<i class="fa-solid fa-file-invoice-dollar"></i>';
    case 'create_calendar_event': return '<i class="fa-solid fa-calendar-plus"></i>';
    default: return '<i class="fa-solid fa-bolt"></i>';
  }
}

function refreshAfterVoiceCommand(actions) {
  const currentScreen = document.querySelector(".screen.active")?.id;
  
  for (const action of actions) {
    if (!action.success) continue;
    
    switch (action.type) {
      case "create_client":
        if (currentScreen === "screen-clients") loadClients();
        break;
      case "add_inventory_item":
        if (currentScreen === "screen-inventory") loadInventory();
        break;
      case "create_quote":
        if (currentScreen === "screen-quotes") loadQuotes();
        if (currentScreen === "screen-jobs") loadJobs();
        break;
      case "create_invoice":
        if (currentScreen === "screen-invoices") loadInvoices();
        break;
      case "create_calendar_event":
        if (currentScreen === "screen-calendar") loadCalendar();
        break;
    }
  }
  
  // Always refresh dashboard stats
  if (currentScreen === "screen-dashboard") {
    loadDashboardStats();
  }
}

async function checkAIUsageLimit() {
  try {
    const res = await apiFetch("/api/ai/status");
    if (res.ok) {
      const data = await res.json();
      return data.usage || { is_at_limit: false, actions_used: 0, actions_limit: 300 };
    }
  } catch (e) {
    console.error("Failed to check AI usage:", e);
  }
  return { is_at_limit: false, actions_used: 0, actions_limit: 300 };
}

function showDemoCommandMic() {
  // Demo mode simulation
  const overlay = document.getElementById("command-mic-overlay");
  const status = document.getElementById("command-mic-status");
  const transcript = document.getElementById("command-mic-transcript");
  
  overlay.classList.remove("hidden");
  status.textContent = "Listening...";
  transcript.textContent = "";
  
  // Simulate recording for 2 seconds
  setTimeout(() => {
    status.textContent = "Processing...";
    document.querySelector(".command-mic-modal").classList.add("processing");
  }, 2000);
  
  // Show simulated result
  setTimeout(() => {
    hideCommandMicOverlay();
    transcript.textContent = '"Add John Smith and create a quote for 2 radon fans at 450 dollars"';
    
    showToast('Created client "John Smith"', "success");
    setTimeout(() => {
      showToast('Created quote QT-DEMO for John Smith - $900.00', "success");
    }, 800);
  }, 3500);
}

// Make functions globally accessible
window.startCommandMic = startCommandMic;
window.stopCommandMic = stopCommandMic;
window.cancelCommandMic = cancelCommandMic;

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
    updateVoiceStatus("processing", "Transcribing audio...", "Converting speech to text...");
    
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
    updateVoiceTranscript(transcript);
    updateVoiceStatus("processing", "Parsing inventory...", "Extracting item details...");
    
    const parseRes = await apiFetch("/api/ai/parse-inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript })
    });
    
    if (!parseRes.ok) {
      throw new Error("Failed to parse inventory data");
    }
    
    const parsed = await parseRes.json();
    
    // Handle array of items (new format) or single item (legacy)
    const items = parsed.items || [parsed];
    
    if (items.length === 0) {
      throw new Error("Could not extract any items from voice");
    }
    
    updateVoiceStatus("processing", `Adding ${items.length} item${items.length > 1 ? 's' : ''}...`, "Saving to inventory...");
    
    let savedCount = 0;
    let stackedCount = 0;
    const messages = [];
    
    for (const item of items) {
      const itemData = {
        name: item.name || "Voice Item",
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        category: item.category || "Other",
        notes: item.notes || "",
        smart_stack: true
      };
      
      const saveRes = await apiFetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemData)
      });
      
      if (saveRes.ok) {
        const result = await saveRes.json();
        savedCount++;
        
        if (result.stacked) {
          stackedCount++;
          messages.push(`+${itemData.quantity} ${itemData.name} (now ${result.quantity})`);
        } else {
          messages.push(`${itemData.quantity}x ${itemData.name}`);
        }
      }
    }
    
    if (savedCount === 0) {
      throw new Error("Failed to save inventory items");
    }
    
    hideVoiceTranscriptModal();
    
    if (savedCount === 1) {
      if (stackedCount === 1) {
        showToast(`Added to existing: ${messages[0]}`);
      } else {
        showToast(`Added: ${messages[0]}`);
      }
    } else {
      const stackedMsg = stackedCount > 0 ? ` (${stackedCount} stacked)` : '';
      showToast(`Added ${savedCount} items${stackedMsg}`);
    }
    
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
    updateVoiceStatus("processing", "Transcribing audio...", "Converting speech to text...");
    
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
    updateVoiceTranscript(transcript);
    updateVoiceStatus("processing", "Parsing invoice...", "Extracting details...");
    
    const parseRes = await apiFetch("/api/ai/parse-quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript })
    });
    
    if (!parseRes.ok) {
      throw new Error("Failed to parse invoice data");
    }
    
    const parsed = await parseRes.json();
    updateVoiceStatus("processing", "Creating invoice...", "Saving...");
    
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
    updateVoiceStatus("processing", "Transcribing audio...", "Converting speech to text...");
    
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
    updateVoiceTranscript(transcript);
    updateVoiceStatus("processing", "Parsing client info...", "Extracting details...");
    
    const parseRes = await apiFetch("/api/ai/parse-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript })
    });
    
    if (!parseRes.ok) {
      throw new Error("Failed to parse client data");
    }
    
    const parsed = await parseRes.json();
    updateVoiceStatus("processing", "Creating client...", "Saving...");
    
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
      const errData = await saveRes.json();
      console.error("Client save error details:", errData);
      const errMsg = errData.hint || errData.details || errData.error || "Unknown error";
      throw new Error(errMsg);
    }
    
    hideVoiceTranscriptModal();
    showToast(`Added client: ${clientData.name}`);
    await loadClients();
    showScreen("clients");
    
  } catch (error) {
    console.error("Voice client error:", error);
    hideVoiceTranscriptModal();
    showToast("Error: " + error.message);
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

// AI VOICE CALENDAR EVENT
async function startAIVoiceCalendarEvent() {
  closeAIDoAllMenu();
  
  if (tourMode) {
    showDemoAIVoiceCalendarEvent();
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

    showVoiceTranscriptModal("calendar");

    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/wav" });
      stream.getTracks().forEach(track => track.stop());
      await completeVoiceCalendarWorkflow(blob);
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

async function completeVoiceCalendarWorkflow(audioBlob) {
  try {
    updateVoiceStatus("processing", "Transcribing audio...", "Converting speech to text...");
    
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
    updateVoiceTranscript(transcript);
    updateVoiceStatus("processing", "Parsing event details...", "Extracting date, time, and client...");
    
    const parseRes = await apiFetch("/api/ai/parse-calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript })
    });
    
    if (!parseRes.ok) {
      throw new Error("Failed to parse calendar data");
    }
    
    const parsed = await parseRes.json();
    updateVoiceStatus("processing", "Creating event...", "Saving to calendar...");
    
    if (!parsed.title || !parsed.date || !parsed.time) {
      throw new Error("Could not extract event details from voice");
    }
    
    // Build title - include client name if mentioned (no need to have them as saved client)
    let eventTitle = parsed.title;
    if (parsed.client_name && !eventTitle.toLowerCase().includes(parsed.client_name.toLowerCase())) {
      eventTitle = `${parsed.title} - ${parsed.client_name}`;
    }
    
    const eventDatetime = new Date(`${parsed.date}T${parsed.time}:00`).toISOString();
    let reminderDatetime = null;
    
    if (parsed.reminder && parsed.reminder.enabled && parsed.reminder.offset_minutes_before) {
      const reminderDate = new Date(eventDatetime);
      reminderDate.setMinutes(reminderDate.getMinutes() - parsed.reminder.offset_minutes_before);
      reminderDatetime = reminderDate.toISOString();
    }
    
    const eventData = {
      title: eventTitle,
      event_datetime: eventDatetime,
      client_id: null,  // No client lookup needed - just use the name in title
      reminder_datetime: reminderDatetime,
      notes: parsed.notes || ""
    };
    
    const saveRes = await apiFetch("/api/calendar-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventData)
    });
    
    if (!saveRes.ok) {
      const errData = await saveRes.json();
      console.error("Calendar save error details:", errData);
      const errMsg = errData.hint || errData.details || errData.error || "Unknown error";
      throw new Error(errMsg);
    }
    
    hideVoiceTranscriptModal();
    
    const eventDate = new Date(parsed.date);
    const formattedDate = eventDate.toLocaleDateString();
    const formattedTime = formatTime24to12(parsed.time);
    showToast(`Scheduled: ${eventTitle} on ${formattedDate} at ${formattedTime}`);
    
    // Navigate calendar to the event's month so it's visible
    calendarCurrentDate = new Date(eventDate.getFullYear(), eventDate.getMonth(), 1);
    calendarSelectedDate = parsed.date; // Select the day with the new event
    
    await loadCalendarEvents();
    showScreen("calendar");
    
  } catch (error) {
    console.error("Voice calendar error:", error);
    hideVoiceTranscriptModal();
    showToast("Error: " + error.message);
  }
}

function formatTime24to12(time24) {
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function showDemoAIVoiceCalendarEvent() {
  showToast("Demo: Voice Schedule Event");
  
  setTimeout(() => {
    showToast("Recording: 'Schedule a plumbing job at Johnson's house next Tuesday at 2pm'");
  }, 1000);
  
  setTimeout(() => {
    showToast("Demo: Event 'Plumbing job at Johnson' scheduled for Dec 3, 2024 at 2:00 PM");
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
      case "calendar":
        instructions = "Say: 'Schedule plumbing job at Johnson house next Tuesday at 2pm'";
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
      console.error('[createQuoteFromParsedData] API error:', res.status, errData);
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

    const content = `
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

    const actions = [
      { icon: "fa-solid fa-pen", label: "Edit", class: "edit-action", handler: () => editInventoryItem(item) },
      { icon: "fa-solid fa-trash", label: "Delete", class: "delete-action", handler: () => {
        showDeleteConfirmModal("item", item.name, () => deleteInventoryItem(item.id));
      }}
    ];
    
    const itemMeta = { type: "inventory", id: item.id, data: item };
    const card = createSwipeableItem(content, actions, () => editInventoryItem(item), itemMeta);
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

  await deleteInventoryItem(itemId);
}

async function deleteInventoryItem(itemId) {
  // Handle tour mode - just remove from demo data
  if (tourMode) {
    const index = DEMO_DATA.inventory.findIndex(item => item.id === itemId || item.id === parseInt(itemId));
    if (index > -1) {
      DEMO_DATA.inventory.splice(index, 1);
      showToast("Item deleted!");
      showScreen("inventory");
      loadInventory();
    }
    return;
  }
  
  try {
    const res = await apiFetch(`/api/inventory/${itemId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      showToast("Failed to delete item");
      return;
    }

    // Also delete from IndexedDB cache so it doesn't reappear
    try {
      await tradebaseDB.deleteInventory(itemId);
    } catch (dbErr) {
      console.warn("Could not delete from IndexedDB:", dbErr);
    }

    showToast("Item deleted!");
    showScreen("inventory");
    await loadInventory();
  } catch (err) {
    console.error("Error deleting inventory item:", err);
    showToast("Failed to delete item");
  }
}

// Edit client function - opens modal with address management
let editingClientId = null;
let clientAddresses = [];

function editClient(clientId) {
  editingClientId = clientId;
  
  // Load client data
  apiFetch(`/api/clients/${clientId}`).then(res => res.json()).then(async client => {
    document.getElementById("edit-client-name").value = client.name || "";
    document.getElementById("edit-client-phone").value = client.phone || "";
    document.getElementById("edit-client-email").value = client.email || "";
    document.getElementById("edit-client-address").value = client.address || "";
    
    // Load client's property addresses
    await loadClientAddresses(clientId);
    
    // Show modal
    document.getElementById("client-edit-modal").style.display = "block";
  }).catch(err => {
    console.error("Error loading client:", err);
    showToast("Failed to load client");
  });
}

async function loadClientAddresses(clientId) {
  const list = document.getElementById("client-properties-list");
  
  try {
    const res = await apiFetch(`/api/clients/${clientId}/addresses`);
    if (res.ok) {
      clientAddresses = await res.json();
      renderClientAddresses();
    } else {
      clientAddresses = [];
      renderClientAddresses();
    }
  } catch (err) {
    console.error("Error loading addresses:", err);
    clientAddresses = [];
    renderClientAddresses();
  }
}

function renderClientAddresses() {
  const list = document.getElementById("client-properties-list");
  
  if (!clientAddresses.length) {
    list.innerHTML = '<p style="color: var(--muted); font-size: 13px; text-align: center; padding: 12px;">No additional properties saved</p>';
    return;
  }
  
  // Use escapeHtml to prevent XSS from user-provided content
  list.innerHTML = clientAddresses.map(addr => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: var(--bg); border-radius: 6px; margin-bottom: 8px;">
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 600; font-size: 14px; color: var(--text);">
          ${escapeHtml(addr.label)}
          ${addr.is_default ? '<span style="font-size: 10px; background: var(--primary); color: white; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">DEFAULT</span>' : ''}
        </div>
        <div style="font-size: 12px; color: var(--muted); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(addr.address)}</div>
      </div>
      <div style="display: flex; gap: 8px; margin-left: 8px;">
        ${!addr.is_default ? `<button type="button" onclick="setDefaultAddress('${escapeHtml(addr.id)}')" style="padding: 4px 8px; font-size: 11px; background: var(--tile); border: 1px solid var(--border); border-radius: 4px; cursor: pointer;" title="Set as default">
          <i class="fa-solid fa-star"></i>
        </button>` : ''}
        <button type="button" onclick="deleteClientAddress('${escapeHtml(addr.id)}')" style="padding: 4px 8px; font-size: 11px; background: var(--danger); color: white; border: none; border-radius: 4px; cursor: pointer;" title="Delete">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');
}

function showAddPropertyForm() {
  document.getElementById("add-property-form").style.display = "block";
  document.getElementById("new-property-label").focus();
}

function hideAddPropertyForm() {
  document.getElementById("add-property-form").style.display = "none";
  document.getElementById("new-property-label").value = "";
  document.getElementById("new-property-address").value = "";
}

async function saveNewProperty() {
  const label = document.getElementById("new-property-label").value.trim();
  const address = document.getElementById("new-property-address").value.trim();
  
  if (!label || !address) {
    showToast("Please enter both property name and address");
    return;
  }
  
  try {
    const res = await apiFetch(`/api/clients/${editingClientId}/addresses`, {
      method: "POST",
      body: JSON.stringify({ label, address, is_default: clientAddresses.length === 0 })
    });
    
    if (res.ok) {
      showToast("Property added!");
      hideAddPropertyForm();
      await loadClientAddresses(editingClientId);
    } else {
      const err = await res.json();
      showToast(err.error || "Failed to add property");
    }
  } catch (err) {
    console.error("Error adding property:", err);
    showToast("Failed to add property");
  }
}

async function setDefaultAddress(addressId) {
  try {
    const res = await apiFetch(`/api/clients/${editingClientId}/addresses/${addressId}`, {
      method: "PUT",
      body: JSON.stringify({ is_default: true })
    });
    
    if (res.ok) {
      showToast("Default address updated!");
      await loadClientAddresses(editingClientId);
    }
  } catch (err) {
    console.error("Error setting default:", err);
  }
}

async function deleteClientAddress(addressId) {
  if (!confirm("Delete this property address?")) return;
  
  try {
    const res = await apiFetch(`/api/clients/${editingClientId}/addresses/${addressId}`, {
      method: "DELETE"
    });
    
    if (res.ok) {
      showToast("Property removed!");
      await loadClientAddresses(editingClientId);
    }
  } catch (err) {
    console.error("Error deleting address:", err);
    showToast("Failed to delete property");
  }
}

function closeClientEditModal() {
  document.getElementById("client-edit-modal").style.display = "none";
  editingClientId = null;
  clientAddresses = [];
}

async function saveClientEdit() {
  const name = document.getElementById("edit-client-name").value.trim();
  const phone = document.getElementById("edit-client-phone").value.trim();
  const email = document.getElementById("edit-client-email").value.trim();
  const address = document.getElementById("edit-client-address").value.trim();
  
  if (!name) {
    showToast("Client name is required");
    return;
  }
  
  try {
    const res = await apiFetch(`/api/clients/${editingClientId}`, {
      method: "PUT",
      body: JSON.stringify({ name, phone, email, address })
    });
    
    if (res.ok) {
      showToast("Client updated!");
      closeClientEditModal();
      await loadClients();
    } else {
      const err = await res.json();
      showToast(err.error || "Failed to update client");
    }
  } catch (err) {
    console.error("Error updating client:", err);
    showToast("Failed to update client");
  }
}

async function deleteClient(clientId) {
  if (!confirm('Are you sure you want to delete this client? This cannot be undone.')) {
    return;
  }
  
  try {
    const res = await apiFetch(`/api/clients/${clientId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      showToast("Failed to delete client");
      return;
    }

    showToast("Client deleted!");
    loadClients();
  } catch (err) {
    console.error("Error deleting client:", err);
    showToast("Failed to delete client");
  }
}

async function deleteJob(jobId) {
  if (!confirm('Are you sure you want to delete this job folder? All linked invoices and quotes will be unlinked. This cannot be undone.')) {
    return;
  }
  
  try {
    const res = await apiFetch(`/api/jobs/${jobId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      showToast("Failed to delete job");
      return;
    }

    showToast("Job deleted!");
    loadJobs();
  } catch (err) {
    console.error("Error deleting job:", err);
    showToast("Failed to delete job");
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

// ============================================
// CALENDAR FUNCTIONS
// ============================================

let calendarCurrentDate = new Date();
let calendarSelectedDate = null;
let calendarEvents = [];
let calendarFromContext = null;

const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

function initCalendar() {
  const prevBtn = document.getElementById("btn-prev-month");
  const nextBtn = document.getElementById("btn-next-month");
  const newEventBtn = document.getElementById("btn-new-event");
  const eventForm = document.getElementById("calendar-event-form");
  const linkTypeSelect = document.getElementById("event-link-type");
  const deleteEventBtn = document.getElementById("btn-delete-event");
  const calcBackBtn = document.getElementById("btn-calc-back");
  const useInQuoteBtn = document.getElementById("btn-calc-use-in-quote");

  if (prevBtn) prevBtn.addEventListener("click", () => navigateCalendar(-1));
  if (nextBtn) nextBtn.addEventListener("click", () => navigateCalendar(1));
  if (newEventBtn) newEventBtn.addEventListener("click", () => showCalendarEventModal());
  if (eventForm) eventForm.addEventListener("submit", handleCalendarEventSubmit);
  if (linkTypeSelect) linkTypeSelect.addEventListener("change", handleLinkTypeChange);
  if (deleteEventBtn) deleteEventBtn.addEventListener("click", handleDeleteCalendarEvent);
  
  if (calcBackBtn) {
    calcBackBtn.addEventListener("click", () => {
      if (calendarFromContext === 'quote') {
        showScreen("new-quote");
      } else {
        showScreen("dashboard");
      }
      calendarFromContext = null;
    });
  }
  
  if (useInQuoteBtn) {
    useInQuoteBtn.addEventListener("click", useCalculatorResultInQuote);
  }
}

function navigateCalendar(direction) {
  calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + direction);
  renderCalendar();
}

async function loadCalendarEvents() {
  const year = calendarCurrentDate.getFullYear();
  const month = calendarCurrentDate.getMonth();
  const startDate = new Date(year, month, 1).toISOString();
  const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  try {
    const res = await apiFetch(`/api/calendar-events?start_date=${startDate}&end_date=${endDate}`);
    if (res.ok) {
      calendarEvents = await res.json();
    } else {
      calendarEvents = [];
    }
  } catch (err) {
    console.error("Error loading calendar events:", err);
    calendarEvents = [];
  }
  
  renderCalendar();
}

function renderCalendar() {
  const year = calendarCurrentDate.getFullYear();
  const month = calendarCurrentDate.getMonth();
  
  document.getElementById("calendar-month-year").textContent = `${monthNames[month]} ${year}`;
  
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();
  
  const daysContainer = document.getElementById("calendar-days");
  daysContainer.innerHTML = "";
  
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const dayEl = createCalendarDayElement(day, true, false, year, month - 1);
    daysContainer.appendChild(dayEl);
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = isCurrentMonth && day === todayDate;
    const dayEl = createCalendarDayElement(day, false, isToday, year, month);
    daysContainer.appendChild(dayEl);
  }
  
  const totalCells = firstDay + daysInMonth;
  const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let day = 1; day <= remainingCells; day++) {
    const dayEl = createCalendarDayElement(day, true, false, year, month + 1);
    daysContainer.appendChild(dayEl);
  }
  
  if (calendarSelectedDate) {
    showEventsForDate(calendarSelectedDate);
  } else {
    document.getElementById("calendar-selected-date").textContent = "Select a day";
    document.getElementById("calendar-events-list").innerHTML = 
      '<div class="calendar-no-events">Tap a day to see events</div>';
  }
}

function createCalendarDayElement(day, isOtherMonth, isToday, year, month) {
  const dayEl = document.createElement("div");
  dayEl.className = "calendar-day";
  if (isOtherMonth) dayEl.classList.add("other-month");
  if (isToday) dayEl.classList.add("today");
  
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (calendarSelectedDate === dateStr) {
    dayEl.classList.add("selected");
  }
  
  dayEl.innerHTML = `<span class="day-number">${day}</span>`;
  
  if (!isOtherMonth) {
    const dayEvents = calendarEvents.filter(e => {
      const eventDate = new Date(e.event_datetime).toISOString().split('T')[0];
      return eventDate === dateStr;
    });
    
    if (dayEvents.length > 0) {
      const dotsHtml = dayEvents.slice(0, 3).map(() => '<span class="event-dot"></span>').join('');
      dayEl.innerHTML += `<div class="event-dots">${dotsHtml}</div>`;
    }
    
    dayEl.addEventListener("click", () => selectCalendarDay(dateStr));
  }
  
  return dayEl;
}

function selectCalendarDay(dateStr) {
  calendarSelectedDate = dateStr;
  renderCalendar();
  showEventsForDate(dateStr);
}

function showEventsForDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById("calendar-selected-date").textContent = date.toLocaleDateString('en-US', options);
  
  const dayEvents = calendarEvents.filter(e => {
    const eventDate = new Date(e.event_datetime).toISOString().split('T')[0];
    return eventDate === dateStr;
  }).sort((a, b) => new Date(a.event_datetime) - new Date(b.event_datetime));
  
  const listEl = document.getElementById("calendar-events-list");
  
  if (dayEvents.length === 0) {
    listEl.innerHTML = `
      <div class="calendar-no-events">
        No events scheduled<br>
        <button class="btn-outline-sm" style="margin-top: 12px;" onclick="showCalendarEventModal('${dateStr}')">
          <i class="fa-solid fa-plus"></i> Add Event
        </button>
      </div>
    `;
    return;
  }
  
  listEl.innerHTML = "";
  
  dayEvents.forEach(event => {
    const time = new Date(event.event_datetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    let linkInfo = "";
    if (event.related_job_id && event.jobs) {
      linkInfo = `<div class="calendar-event-link"><i class="fa-solid fa-folder"></i> ${event.jobs.folder_name || 'Job'}</div>`;
    } else if (event.related_quote_id && event.quotes) {
      linkInfo = `<div class="calendar-event-link"><i class="fa-solid fa-file-lines"></i> Quote #${event.quotes.quote_number || event.related_quote_id}</div>`;
    } else if (event.related_invoice_id && event.invoices) {
      linkInfo = `<div class="calendar-event-link"><i class="fa-solid fa-file-invoice"></i> Invoice #${event.invoices.invoice_number || event.related_invoice_id}</div>`;
    }
    
    const clientName = event.clients?.name || '';
    
    const content = `
      <div style="display: flex; align-items: center; gap: 12px; padding: 12px;">
        <div class="calendar-event-time">${time}</div>
        <div class="calendar-event-info" style="flex: 1;">
          <div class="calendar-event-title">${event.title}</div>
          ${clientName ? `<div class="calendar-event-client">${clientName}</div>` : ''}
          ${linkInfo}
        </div>
      </div>
    `;
    
    const actions = [
      { icon: "fa-solid fa-pen", label: "Edit", class: "edit-action", handler: () => editCalendarEvent(event.id) },
      { icon: "fa-solid fa-trash", label: "Delete", class: "delete-action", handler: () => {
        showDeleteConfirmModal("event", event.title, () => deleteCalendarEvent(event.id));
      }}
    ];
    
    const itemMeta = { type: "event", id: event.id, data: event };
    const item = createSwipeableItem(content, actions, () => editCalendarEvent(event.id), itemMeta);
    item.classList.add("calendar-event-item-swipe");
    listEl.appendChild(item);
  });
}

function showCalendarEventModal(presetDate = null, context = null) {
  const modal = document.getElementById("calendar-event-modal");
  const form = document.getElementById("calendar-event-form");
  const titleEl = document.getElementById("calendar-event-modal-title");
  const deleteBtn = document.getElementById("btn-delete-event");
  
  form.reset();
  document.getElementById("event-id").value = "";
  document.getElementById("event-related-job-id").value = "";
  document.getElementById("event-related-quote-id").value = "";
  document.getElementById("event-related-invoice-id").value = "";
  document.getElementById("event-link-id").style.display = "none";
  deleteBtn.style.display = "none";
  titleEl.textContent = "New Event";
  
  if (presetDate) {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(Math.ceil(now.getMinutes() / 15) * 15).padStart(2, '0');
    document.getElementById("event-datetime").value = `${presetDate}T${hours}:${mins}`;
  }
  
  if (context) {
    document.getElementById("event-title").value = context.title || "";
    if (context.client_id) {
      document.getElementById("event-client").value = context.client_id;
    }
    if (context.job_id) {
      document.getElementById("event-related-job-id").value = context.job_id;
      document.getElementById("event-link-type").value = "job";
    } else if (context.quote_id) {
      document.getElementById("event-related-quote-id").value = context.quote_id;
      document.getElementById("event-link-type").value = "quote";
    } else if (context.invoice_id) {
      document.getElementById("event-related-invoice-id").value = context.invoice_id;
      document.getElementById("event-link-type").value = "invoice";
    }
  }
  
  populateEventClientDropdown();
  modal.classList.remove("hidden");
}

function hideCalendarEventModal() {
  document.getElementById("calendar-event-modal").classList.add("hidden");
}

async function populateEventClientDropdown() {
  const select = document.getElementById("event-client");
  select.innerHTML = '<option value="">-- Select Client --</option>';
  
  try {
    const res = await apiFetch("/api/clients");
    if (res.ok) {
      const clients = await res.json();
      clients.forEach(client => {
        const opt = document.createElement("option");
        opt.value = client.id;
        opt.textContent = client.name;
        select.appendChild(opt);
      });
    }
  } catch (err) {
    console.error("Error loading clients for event:", err);
  }
}

async function handleLinkTypeChange() {
  const linkType = document.getElementById("event-link-type").value;
  const linkIdSelect = document.getElementById("event-link-id");
  
  if (!linkType) {
    linkIdSelect.style.display = "none";
    linkIdSelect.innerHTML = '<option value="">-- Select --</option>';
    return;
  }
  
  linkIdSelect.style.display = "block";
  linkIdSelect.innerHTML = '<option value="">Loading...</option>';
  
  try {
    let endpoint = "";
    if (linkType === "job") endpoint = "/api/jobs";
    else if (linkType === "quote") endpoint = "/api/quotes";
    else if (linkType === "invoice") endpoint = "/api/invoices";
    
    const res = await apiFetch(endpoint);
    if (res.ok) {
      const items = await res.json();
      linkIdSelect.innerHTML = '<option value="">-- Select --</option>';
      items.forEach(item => {
        const opt = document.createElement("option");
        opt.value = item.id;
        if (linkType === "job") {
          opt.textContent = item.folder_name || `${item.client_name} - ${item.job_type}`;
        } else if (linkType === "quote") {
          opt.textContent = `Quote #${item.quote_number || item.id} - ${item.client_name || 'No client'}`;
        } else {
          opt.textContent = `Invoice #${item.invoice_number || item.id} - ${item.client_name || 'No client'}`;
        }
        linkIdSelect.appendChild(opt);
      });
    }
  } catch (err) {
    console.error("Error loading link items:", err);
    linkIdSelect.innerHTML = '<option value="">Error loading</option>';
  }
}

async function handleCalendarEventSubmit(e) {
  e.preventDefault();
  
  const eventId = document.getElementById("event-id").value;
  const title = document.getElementById("event-title").value.trim();
  const eventDatetime = document.getElementById("event-datetime").value;
  const clientId = document.getElementById("event-client").value || null;
  const notes = document.getElementById("event-notes").value.trim();
  const reminderOffset = document.getElementById("event-reminder").value;
  
  const linkType = document.getElementById("event-link-type").value;
  const linkId = document.getElementById("event-link-id").value;
  
  let relatedJobId = document.getElementById("event-related-job-id").value || null;
  let relatedQuoteId = document.getElementById("event-related-quote-id").value || null;
  let relatedInvoiceId = document.getElementById("event-related-invoice-id").value || null;
  
  if (linkType === "job" && linkId) relatedJobId = linkId;
  if (linkType === "quote" && linkId) relatedQuoteId = linkId;
  if (linkType === "invoice" && linkId) relatedInvoiceId = linkId;
  
  let reminderDatetime = null;
  if (reminderOffset) {
    const eventDate = new Date(eventDatetime);
    eventDate.setMinutes(eventDate.getMinutes() - parseInt(reminderOffset));
    reminderDatetime = eventDate.toISOString();
  }
  
  const payload = {
    title,
    event_datetime: new Date(eventDatetime).toISOString(),
    client_id: clientId,
    related_job_id: relatedJobId,
    related_quote_id: relatedQuoteId,
    related_invoice_id: relatedInvoiceId,
    reminder_datetime: reminderDatetime,
    notes
  };
  
  try {
    const method = eventId ? "PATCH" : "POST";
    const url = eventId ? `/api/calendar-events/${eventId}` : "/api/calendar-events";
    
    const res = await apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
      const err = await res.json();
      showToast(err.error || "Failed to save event");
      return;
    }
    
    hideCalendarEventModal();
    showToast(eventId ? "Event updated!" : "Event created!");
    loadCalendarEvents();
  } catch (err) {
    console.error("Error saving event:", err);
    showToast("Failed to save event");
  }
}

async function editCalendarEvent(eventId) {
  try {
    const res = await apiFetch(`/api/calendar-events/${eventId}`);
    if (!res.ok) {
      showToast("Failed to load event");
      return;
    }
    
    const event = await res.json();
    
    document.getElementById("event-id").value = event.id;
    document.getElementById("event-title").value = event.title;
    
    const eventDate = new Date(event.event_datetime);
    const localDatetime = new Date(eventDate.getTime() - eventDate.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16);
    document.getElementById("event-datetime").value = localDatetime;
    
    document.getElementById("event-notes").value = event.notes || "";
    
    await populateEventClientDropdown();
    if (event.client_id) {
      document.getElementById("event-client").value = event.client_id;
    }
    
    document.getElementById("event-related-job-id").value = event.related_job_id || "";
    document.getElementById("event-related-quote-id").value = event.related_quote_id || "";
    document.getElementById("event-related-invoice-id").value = event.related_invoice_id || "";
    
    if (event.related_job_id) {
      document.getElementById("event-link-type").value = "job";
    } else if (event.related_quote_id) {
      document.getElementById("event-link-type").value = "quote";
    } else if (event.related_invoice_id) {
      document.getElementById("event-link-type").value = "invoice";
    }
    
    if (event.reminder_datetime) {
      const eventTime = new Date(event.event_datetime).getTime();
      const reminderTime = new Date(event.reminder_datetime).getTime();
      const diffMinutes = Math.round((eventTime - reminderTime) / 60000);
      
      const reminderSelect = document.getElementById("event-reminder");
      for (let opt of reminderSelect.options) {
        if (parseInt(opt.value) === diffMinutes) {
          reminderSelect.value = opt.value;
          break;
        }
      }
    }
    
    document.getElementById("calendar-event-modal-title").textContent = "Edit Event";
    document.getElementById("btn-delete-event").style.display = "block";
    document.getElementById("calendar-event-modal").classList.remove("hidden");
  } catch (err) {
    console.error("Error loading event:", err);
    showToast("Failed to load event");
  }
}

async function handleDeleteCalendarEvent() {
  const eventId = document.getElementById("event-id").value;
  if (!eventId) return;
  
  if (!confirm("Delete this event?")) return;
  
  await deleteCalendarEvent(eventId);
  hideCalendarEventModal();
}

async function deleteCalendarEvent(eventId) {
  try {
    const res = await apiFetch(`/api/calendar-events/${eventId}`, { method: "DELETE" });
    if (!res.ok) {
      showToast("Failed to delete event");
      return;
    }
    
    showToast("Event deleted!");
    loadCalendarEvents();
  } catch (err) {
    console.error("Error deleting event:", err);
    showToast("Failed to delete event");
  }
}

function openCalculatorFromQuote() {
  calendarFromContext = 'quote';
  showScreen("calculator");
  const useBtn = document.getElementById("btn-calc-use-in-quote");
  if (useBtn) useBtn.style.display = "none";
}

function useCalculatorResultInQuote() {
  const totalText = document.getElementById("calc-total")?.textContent || "";
  const total = parseFloat(totalText.replace(/[^0-9.-]/g, '')) || 0;
  
  if (total <= 0) {
    showToast("Calculate a total first");
    return;
  }
  
  showScreen("new-quote");
  calendarFromContext = null;
  
  setTimeout(() => {
    addQuoteLineItemWithValue("Calculated Job Cost", 1, total);
  }, 100);
}

function addQuoteLineItemWithValue(description, qty, unitPrice) {
  const container = document.getElementById("quote-line-items");
  if (!container) return;
  
  const itemDiv = document.createElement("div");
  itemDiv.className = "line-item";
  itemDiv.innerHTML = `
    <input type="text" placeholder="Description" class="line-desc" value="${description}" />
    <input type="number" placeholder="Qty" class="line-qty" min="1" value="${qty}" />
    <input type="number" placeholder="Unit $" class="line-price" min="0" step="0.01" value="${unitPrice.toFixed(2)}" />
    <button type="button" class="btn-remove-line" onclick="this.parentNode.remove(); calculateQuoteTotals();">×</button>
  `;
  container.appendChild(itemDiv);
  
  itemDiv.querySelectorAll("input").forEach(inp => {
    inp.addEventListener("input", calculateQuoteTotals);
  });
  
  calculateQuoteTotals();
  showToast(`Added line item: $${unitPrice.toFixed(2)}`);
}

function scheduleEventFromJob(jobId, clientName) {
  showScreen("calendar");
  loadCalendarEvents().then(() => {
    showCalendarEventModal(null, {
      title: `Job - ${clientName}`,
      job_id: jobId
    });
  });
}

function scheduleEventFromQuote(quoteId, clientName) {
  showScreen("calendar");
  loadCalendarEvents().then(() => {
    showCalendarEventModal(null, {
      title: `Quote Follow-Up - ${clientName}`,
      quote_id: quoteId
    });
  });
}

function scheduleEventFromInvoice(invoiceId, clientName) {
  showScreen("calendar");
  loadCalendarEvents().then(() => {
    showCalendarEventModal(null, {
      title: `Invoice Due - ${clientName}`,
      invoice_id: invoiceId
    });
  });
}

// ===== SWIPE TO REVEAL ACTIONS =====
let activeSwipeItem = null;
let swipeStartX = 0;
let swipeCurrentX = 0;
let swipeDragging = false;

// ===== MULTI-SELECT STATE =====
let multiSelectMode = false;
let selectedItems = new Map(); // Map of itemId -> {type, container, data}
let longPressTimer = null;
const LONG_PRESS_DURATION = 500; // ms

function createSwipeableItem(content, actions, onClick, itemMeta = null) {
  const container = document.createElement("div");
  container.className = "swipe-container";
  
  // Store item metadata for multi-select
  if (itemMeta) {
    container.dataset.itemId = itemMeta.id;
    container.dataset.itemType = itemMeta.type;
  }
  
  // Checkbox for selection mode (hidden by default)
  const checkbox = document.createElement("div");
  checkbox.className = "select-checkbox";
  checkbox.innerHTML = '<i class="fas fa-check"></i>';
  container.appendChild(checkbox);
  
  // Actions panel (behind the content)
  const actionsDiv = document.createElement("div");
  actionsDiv.className = "swipe-actions";
  
  actions.forEach(action => {
    const btn = document.createElement("button");
    btn.className = `swipe-action ${action.class}`;
    btn.innerHTML = `<i class="${action.icon}"></i><span>${action.label}</span>`;
    btn.onclick = (e) => {
      e.stopPropagation();
      closeSwipeItem();
      action.handler();
    };
    actionsDiv.appendChild(btn);
  });
  
  container.appendChild(actionsDiv);
  
  // Content panel (swipeable)
  const contentDiv = document.createElement("div");
  contentDiv.className = "swipe-content list-item";
  contentDiv.innerHTML = content;
  
  // Touch/pointer events for swiping
  contentDiv.addEventListener("pointerdown", (e) => handleSwipeStart(e, container, itemMeta));
  contentDiv.addEventListener("pointermove", handleSwipeMove);
  contentDiv.addEventListener("pointerup", (e) => handleSwipeEnd(e, container));
  contentDiv.addEventListener("pointercancel", (e) => handleSwipeEnd(e, container));
  
  // Click to view item or toggle selection
  contentDiv.addEventListener("click", (e) => {
    if (multiSelectMode && itemMeta) {
      e.preventDefault();
      e.stopPropagation();
      toggleItemSelection(container, itemMeta);
      return;
    }
    
    if (!swipeDragging && onClick) {
      const content = e.currentTarget.closest('.swipe-container').querySelector('.swipe-content');
      const translateX = getTranslateX(content);
      if (Math.abs(translateX) < 10) {
        onClick(e);
      }
    }
  });
  
  container.appendChild(contentDiv);
  
  return container;
}

function toggleItemSelection(container, itemMeta) {
  const itemKey = `${itemMeta.type}-${itemMeta.id}`;
  
  if (selectedItems.has(itemKey)) {
    selectedItems.delete(itemKey);
    container.classList.remove("selected");
  } else {
    selectedItems.set(itemKey, { 
      type: itemMeta.type, 
      id: itemMeta.id,
      container: container,
      data: itemMeta.data 
    });
    container.classList.add("selected");
  }
  
  updateSelectionBar();
}

function enterMultiSelectMode(container, itemMeta) {
  if (multiSelectMode) return;
  
  multiSelectMode = true;
  document.body.classList.add("multi-select-mode");
  
  // Add the initial item to selection
  toggleItemSelection(container, itemMeta);
  
  // Show selection bar
  showSelectionBar(itemMeta.type);
  
  // Haptic feedback if available
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
}

function exitMultiSelectMode() {
  multiSelectMode = false;
  document.body.classList.remove("multi-select-mode");
  
  // Clear all selections
  selectedItems.forEach(item => {
    item.container?.classList.remove("selected");
  });
  selectedItems.clear();
  
  // Hide selection bar
  hideSelectionBar();
}

function showSelectionBar(itemType) {
  let bar = document.getElementById("selection-bar");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "selection-bar";
    document.body.appendChild(bar);
  }
  
  // Only invoices and quotes support archiving
  const supportsArchive = itemType === "invoice" || itemType === "quote";
  
  bar.innerHTML = `
    <div class="selection-bar-left">
      <button class="selection-cancel" id="btn-cancel-select">
        <i class="fas fa-times"></i>
      </button>
      <span class="selection-count">1 selected</span>
    </div>
    <div class="selection-bar-actions">
      ${supportsArchive ? `
        <button class="selection-action archive-action" id="btn-bulk-archive">
          <i class="fas fa-archive"></i>
        </button>
      ` : ''}
      <button class="selection-action delete-action" id="btn-bulk-delete">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `;
  
  // Attach event listeners directly (more reliable than inline onclick on mobile)
  const cancelBtn = document.getElementById("btn-cancel-select");
  const deleteBtn = document.getElementById("btn-bulk-delete");
  const archiveBtn = supportsArchive ? document.getElementById("btn-bulk-archive") : null;
  
  cancelBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Cancel button clicked');
    exitMultiSelectMode();
  });
  
  cancelBtn.addEventListener("touchend", (e) => {
    e.preventDefault();
    console.log('Cancel button touched');
    exitMultiSelectMode();
  });
  
  deleteBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Delete button clicked');
    bulkDeleteSelected();
  });
  
  deleteBtn.addEventListener("touchend", (e) => {
    e.preventDefault();
    console.log('Delete button touched');
    bulkDeleteSelected();
  });
  
  if (archiveBtn) {
    archiveBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Archive button clicked');
      bulkArchiveSelected();
    });
    
    archiveBtn.addEventListener("touchend", (e) => {
      e.preventDefault();
      console.log('Archive button touched');
      bulkArchiveSelected();
    });
  }
  
  bar.dataset.itemType = itemType;
  bar.classList.add("visible");
}

function hideSelectionBar() {
  const bar = document.getElementById("selection-bar");
  if (bar) {
    bar.classList.remove("visible");
  }
}

function updateSelectionBar() {
  const countEl = document.querySelector(".selection-count");
  if (countEl) {
    const count = selectedItems.size;
    countEl.textContent = `${count} selected`;
  }
  
  // Exit multi-select if nothing selected
  if (selectedItems.size === 0) {
    exitMultiSelectMode();
  }
}

let isDeleting = false;

async function bulkDeleteSelected() {
  console.log('bulkDeleteSelected called, selectedItems.size:', selectedItems.size);
  
  if (isDeleting) {
    console.log('Already deleting, ignoring duplicate call');
    return;
  }
  
  if (selectedItems.size === 0) {
    showToast('No items selected');
    return;
  }
  
  const count = selectedItems.size;
  const itemType = document.getElementById("selection-bar")?.dataset.itemType || "items";
  
  if (!confirm(`Delete ${count} ${itemType}(s)?`)) {
    return;
  }
  
  isDeleting = true;
  
  const itemsToDelete = Array.from(selectedItems.values());
  let successCount = 0;
  let failCount = 0;
  
  for (const item of itemsToDelete) {
    try {
      let endpoint = "";
      switch (item.type) {
        case "invoice": endpoint = `/api/invoices/${item.id}`; break;
        case "quote": endpoint = `/api/quotes/${item.id}`; break;
        case "client": endpoint = `/api/clients/${item.id}`; break;
        case "job": endpoint = `/api/jobs/${item.id}`; break;
        case "inventory": endpoint = `/api/inventory/${item.id}`; break;
        case "event": endpoint = `/api/calendar-events/${item.id}`; break;
        default: 
          console.log('Unknown item type:', item.type);
          continue;
      }
      
      console.log('Deleting:', endpoint, 'item:', item);
      const res = await apiFetch(endpoint, { method: "DELETE" });
      console.log('Delete response:', res.status, res.ok);
      
      if (res.ok) {
        // Delete from IndexedDB too
        switch (item.type) {
          case "invoice": await tradebaseDB.deleteInvoice(item.id); break;
          case "quote": await tradebaseDB.deleteQuote(item.id); break;
          case "client": await tradebaseDB.deleteClient(item.id); break;
          case "inventory": await tradebaseDB.deleteInventory(item.id); break;
        }
        successCount++;
      } else {
        const errorText = await res.text();
        console.error('Delete failed:', res.status, errorText);
        failCount++;
      }
    } catch (err) {
      console.error('Bulk delete error:', err);
      failCount++;
    }
  }
  
  exitMultiSelectMode();
  
  // Reload the current list
  const currentScreen = document.querySelector(".screen.active")?.id;
  if (currentScreen === "screen-invoices") loadInvoices();
  else if (currentScreen === "screen-quotes") loadQuotes();
  else if (currentScreen === "screen-clients") loadClients();
  else if (currentScreen === "screen-jobs") loadJobs();
  else if (currentScreen === "screen-inventory") loadInventory();
  else if (currentScreen === "screen-calendar") loadCalendarEvents();
  
  isDeleting = false;
  
  if (failCount > 0) {
    showToast(`Deleted ${successCount}, failed ${failCount}`);
  } else if (successCount > 0) {
    showToast(`Deleted ${successCount} item(s)`);
  }
}

async function bulkArchiveSelected() {
  if (selectedItems.size === 0) return;
  
  const itemsToArchive = Array.from(selectedItems.values());
  let successCount = 0;
  let failCount = 0;
  
  for (const item of itemsToArchive) {
    try {
      let endpoint = "";
      switch (item.type) {
        case "invoice": endpoint = `/api/invoices/${item.id}/archive`; break;
        case "quote": endpoint = `/api/quotes/${item.id}/archive`; break;
        default: continue; // Only invoices and quotes support archive
      }
      
      const res = await apiFetch(endpoint, { method: "POST" });
      
      if (res.ok) {
        // Remove from local cache so it doesn't show in active list
        switch (item.type) {
          case "invoice": await tradebaseDB.deleteInvoice(item.id); break;
          case "quote": await tradebaseDB.deleteQuote(item.id); break;
        }
        successCount++;
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error('Archive failed:', errData);
        failCount++;
      }
    } catch (err) {
      console.error('Bulk archive error:', err);
      failCount++;
    }
  }
  
  exitMultiSelectMode();
  
  // Reload the current list
  const currentScreen = document.querySelector(".screen.active")?.id;
  if (currentScreen === "screen-invoices") loadInvoices();
  else if (currentScreen === "screen-quotes") loadQuotes();
  
  if (failCount > 0) {
    showToast(`Archived ${successCount}, failed ${failCount}`);
  } else if (successCount > 0) {
    showToast(`Archived ${successCount} item(s)`);
  }
}

// Make multi-select functions globally accessible
window.bulkDeleteSelected = bulkDeleteSelected;
window.bulkArchiveSelected = bulkArchiveSelected;
window.exitMultiSelectMode = exitMultiSelectMode;

function handleSwipeStart(e, container, itemMeta) {
  if (e.button !== 0) return; // Only left click/touch
  
  const content = e.currentTarget;
  content.setPointerCapture(e.pointerId);
  
  swipeStartX = e.clientX;
  swipeCurrentX = swipeStartX;
  swipeDragging = false;
  
  const translateX = getTranslateX(content);
  content.dataset.startTranslate = translateX;
  content.classList.add("dragging");
  
  // Start long-press timer for multi-select (only if we have item metadata)
  if (itemMeta && !multiSelectMode) {
    clearTimeout(longPressTimer);
    longPressTimer = setTimeout(() => {
      if (!swipeDragging) {
        enterMultiSelectMode(container, itemMeta);
      }
    }, LONG_PRESS_DURATION);
  }
}

function handleSwipeMove(e) {
  if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
  
  const content = e.currentTarget;
  swipeCurrentX = e.clientX;
  const deltaX = swipeCurrentX - swipeStartX;
  const startTranslate = parseFloat(content.dataset.startTranslate) || 0;
  
  // Only start dragging if moved more than 10px horizontally
  if (Math.abs(deltaX) > 10) {
    swipeDragging = true;
    // Cancel long-press if user starts swiping
    clearTimeout(longPressTimer);
  }
  
  if (!swipeDragging) return;
  
  // Don't allow swipe in multi-select mode
  if (multiSelectMode) return;
  
  e.preventDefault();
  
  let newTranslate = startTranslate + deltaX;
  
  // Get actions width
  const actionsWidth = content.parentElement.querySelector('.swipe-actions')?.offsetWidth || 210;
  
  // Clamp: can't swipe right past 0, can't swipe left more than actions width
  newTranslate = Math.max(-actionsWidth, Math.min(0, newTranslate));
  
  content.style.transform = `translateX(${newTranslate}px)`;
}

function handleSwipeEnd(e, container) {
  const content = e.currentTarget;
  content.classList.remove("dragging");
  
  // Cancel any pending long-press
  clearTimeout(longPressTimer);
  
  if (!content.hasPointerCapture(e.pointerId)) return;
  content.releasePointerCapture(e.pointerId);
  
  // Don't snap in multi-select mode
  if (multiSelectMode) {
    setTimeout(() => { swipeDragging = false; }, 50);
    return;
  }
  
  const translateX = getTranslateX(content);
  const actionsWidth = content.parentElement.querySelector('.swipe-actions')?.offsetWidth || 210;
  
  // If swiped more than 40% of actions width, snap open; otherwise close
  if (Math.abs(translateX) > actionsWidth * 0.4) {
    // Snap open
    content.style.transform = `translateX(-${actionsWidth}px)`;
    
    // Close any previously open item
    if (activeSwipeItem && activeSwipeItem !== content) {
      activeSwipeItem.style.transform = 'translateX(0)';
    }
    activeSwipeItem = content;
  } else {
    // Snap closed
    content.style.transform = 'translateX(0)';
    if (activeSwipeItem === content) {
      activeSwipeItem = null;
    }
  }
  
  // Reset dragging state after a short delay
  setTimeout(() => { swipeDragging = false; }, 50);
}

function getTranslateX(element) {
  const transform = window.getComputedStyle(element).transform;
  if (transform === 'none') return 0;
  const matrix = new DOMMatrix(transform);
  return matrix.m41;
}

function closeSwipeItem() {
  if (activeSwipeItem) {
    activeSwipeItem.style.transform = 'translateX(0)';
    activeSwipeItem = null;
  }
}

// Close swipe when clicking outside
document.addEventListener("click", (e) => {
  if (activeSwipeItem && !e.target.closest('.swipe-container')) {
    closeSwipeItem();
  }
});

// Delete confirmation modal
function showDeleteConfirmModal(itemType, itemName, onConfirm) {
  let modal = document.getElementById("delete-confirm-modal");
  
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "delete-confirm-modal";
    modal.className = "delete-confirm-modal hidden";
    modal.innerHTML = `
      <div class="delete-confirm-content">
        <h3><i class="fa-solid fa-triangle-exclamation"></i> Delete?</h3>
        <p id="delete-confirm-message">Are you sure?</p>
        <div class="delete-confirm-buttons">
          <button class="btn-cancel" onclick="hideDeleteConfirmModal()">Cancel</button>
          <button class="btn-delete" id="delete-confirm-btn">Delete</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  document.getElementById("delete-confirm-message").textContent = 
    `Delete ${itemType} "${itemName}"? This cannot be undone.`;
  
  const confirmBtn = document.getElementById("delete-confirm-btn");
  confirmBtn.onclick = () => {
    hideDeleteConfirmModal();
    onConfirm();
  };
  
  modal.classList.remove("hidden");
}

function hideDeleteConfirmModal() {
  const modal = document.getElementById("delete-confirm-modal");
  if (modal) modal.classList.add("hidden");
}

// Global event delegation for selection bar buttons (more reliable on mobile)
document.addEventListener("click", (e) => {
  const target = e.target.closest("#btn-cancel-select, #btn-bulk-delete, #btn-bulk-archive");
  if (!target) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  if (target.id === "btn-cancel-select") {
    exitMultiSelectMode();
  } else if (target.id === "btn-bulk-delete") {
    bulkDeleteSelected();
  } else if (target.id === "btn-bulk-archive") {
    bulkArchiveSelected();
  }
}, true); // Use capture phase

// Also handle touchend for iOS
document.addEventListener("touchend", (e) => {
  const target = e.target.closest("#btn-cancel-select, #btn-bulk-delete, #btn-bulk-archive");
  if (!target) return;
  
  e.preventDefault();
  
  if (target.id === "btn-cancel-select") {
    exitMultiSelectMode();
  } else if (target.id === "btn-bulk-delete") {
    bulkDeleteSelected();
  } else if (target.id === "btn-bulk-archive") {
    bulkArchiveSelected();
  }
}, true); // Use capture phase
