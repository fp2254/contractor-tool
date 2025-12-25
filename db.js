const DB_NAME = 'TradeBaseDB';
const DB_VERSION = 2; // Upgraded for offline-first sync status tracking

const STORES = {
  INVOICES: 'invoices',
  QUOTES: 'quotes',
  CLIENTS: 'clients',
  INVENTORY: 'inventory',
  SYNC_QUEUE: 'sync_queue'
};

class TradeBaseDB {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;

        if (!db.objectStoreNames.contains(STORES.INVOICES)) {
          const invoiceStore = db.createObjectStore(STORES.INVOICES, { keyPath: 'id' });
          invoiceStore.createIndex('user_id', 'user_id', { unique: false });
          invoiceStore.createIndex('updated_at', 'updated_at', { unique: false });
          invoiceStore.createIndex('sync_status', 'sync_status', { unique: false });
        } else if (oldVersion < 2) {
          // Upgrade existing store to add sync_status index
          const transaction = event.target.transaction;
          const invoiceStore = transaction.objectStore(STORES.INVOICES);
          if (!invoiceStore.indexNames.contains('sync_status')) {
            invoiceStore.createIndex('sync_status', 'sync_status', { unique: false });
          }
        }

        if (!db.objectStoreNames.contains(STORES.QUOTES)) {
          const quoteStore = db.createObjectStore(STORES.QUOTES, { keyPath: 'id' });
          quoteStore.createIndex('user_id', 'user_id', { unique: false });
          quoteStore.createIndex('updated_at', 'updated_at', { unique: false });
          quoteStore.createIndex('sync_status', 'sync_status', { unique: false });
        } else if (oldVersion < 2) {
          const transaction = event.target.transaction;
          const quoteStore = transaction.objectStore(STORES.QUOTES);
          if (!quoteStore.indexNames.contains('sync_status')) {
            quoteStore.createIndex('sync_status', 'sync_status', { unique: false });
          }
        }

        if (!db.objectStoreNames.contains(STORES.CLIENTS)) {
          const clientStore = db.createObjectStore(STORES.CLIENTS, { keyPath: 'id' });
          clientStore.createIndex('user_id', 'user_id', { unique: false });
          clientStore.createIndex('updated_at', 'updated_at', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.INVENTORY)) {
          const inventoryStore = db.createObjectStore(STORES.INVENTORY, { keyPath: 'id' });
          inventoryStore.createIndex('user_id', 'user_id', { unique: false });
          inventoryStore.createIndex('updated_at', 'updated_at', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('status', 'status', { unique: false });
        }
      };
    });
  }

  async ensureDB() {
    if (!this.db) {
      await this.init();
    }
    return this.db;
  }

  async add(storeName, data) {
    await this.ensureDB();
    if (!this.db) return null;
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.add(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put(storeName, data) {
    await this.ensureDB();
    if (!this.db) return null;
    
    // Validate that the data has a valid id (required keyPath)
    if (!data || !data.id) {
      console.warn('Skipping IndexedDB put - missing id field');
      return null;
    }
    
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get(storeName, key) {
    await this.ensureDB();
    if (!this.db) return null;
    const transaction = this.db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName, indexName = null, indexValue = null) {
    await this.ensureDB();
    if (!this.db) return [];
    const transaction = this.db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      let request;
      
      if (indexName && indexValue) {
        const index = store.index(indexName);
        request = index.getAll(indexValue);
      } else {
        request = store.getAll();
      }
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, key) {
    await this.ensureDB();
    if (!this.db) return null;
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName) {
    await this.ensureDB();
    if (!this.db) return null;
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveInvoice(invoice) {
    invoice.updated_at = new Date().toISOString();
    return this.put(STORES.INVOICES, invoice);
  }

  async saveInvoiceOfflineFirst(invoice, userId) {
    const now = new Date().toISOString();
    const localId = invoice.id || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const enrichedInvoice = {
      ...invoice,
      id: localId,
      local_id: localId,
      remote_id: invoice.remote_id || null,
      user_id: userId,
      sync_status: 'unsynced',
      sync_error: null,
      updated_at: now,
      created_at: invoice.created_at || now
    };
    
    await this.put(STORES.INVOICES, enrichedInvoice);
    return enrichedInvoice;
  }

  async markInvoiceSynced(localId, remoteId) {
    const invoice = await this.get(STORES.INVOICES, localId);
    if (invoice) {
      invoice.remote_id = remoteId;
      invoice.sync_status = 'synced';
      invoice.sync_error = null;
      invoice.updated_at = new Date().toISOString();
      
      // If remote_id is different from local_id, update the id to remote_id
      // and delete the old local entry
      if (remoteId && remoteId !== localId) {
        await this.delete(STORES.INVOICES, localId);
        invoice.id = remoteId;
      }
      
      await this.put(STORES.INVOICES, invoice);
    }
    return invoice;
  }

  async markInvoiceSyncFailed(localId, errorMessage) {
    const invoice = await this.get(STORES.INVOICES, localId);
    if (invoice) {
      invoice.sync_status = 'unsynced';
      invoice.sync_error = errorMessage;
      invoice.updated_at = new Date().toISOString();
      await this.put(STORES.INVOICES, invoice);
    }
    return invoice;
  }

  async getUnsyncedInvoices(userId) {
    const invoices = await this.getInvoices(userId);
    return invoices.filter(inv => inv.sync_status === 'unsynced');
  }

  async getUnsyncedCount(userId) {
    const unsynced = await this.getUnsyncedInvoices(userId);
    return unsynced.length;
  }

  async getInvoices(userId) {
    return this.getAll(STORES.INVOICES, 'user_id', userId);
  }

  async getAllInvoicesRaw() {
    // Get ALL invoices without filtering - for stale data detection
    return this.getAll(STORES.INVOICES);
  }

  async getAllClientsRaw() {
    // Get ALL clients without filtering - for stale data detection
    return this.getAll(STORES.CLIENTS);
  }

  async deleteInvoice(invoiceId) {
    return this.delete(STORES.INVOICES, invoiceId);
  }

  async clearInvoices(userId) {
    // Clear all invoices for a specific user
    const invoices = await this.getInvoices(userId);
    for (const inv of invoices) {
      await this.delete(STORES.INVOICES, inv.id);
    }
  }

  async saveQuote(quote) {
    quote.updated_at = new Date().toISOString();
    return this.put(STORES.QUOTES, quote);
  }

  async getQuotes(userId) {
    return this.getAll(STORES.QUOTES, 'user_id', userId);
  }

  async deleteQuote(quoteId) {
    return this.delete(STORES.QUOTES, quoteId);
  }

  async saveClient(client) {
    client.updated_at = new Date().toISOString();
    return this.put(STORES.CLIENTS, client);
  }

  async getClients(userId) {
    return this.getAll(STORES.CLIENTS, 'user_id', userId);
  }

  async deleteClient(clientId) {
    return this.delete(STORES.CLIENTS, clientId);
  }

  async clearClients(userId) {
    // Clear all clients for a specific user
    const clients = await this.getClients(userId);
    for (const client of clients) {
      await this.delete(STORES.CLIENTS, client.id);
    }
  }

  async saveInventory(item) {
    item.updated_at = new Date().toISOString();
    return this.put(STORES.INVENTORY, item);
  }

  async getInventory(userId) {
    return this.getAll(STORES.INVENTORY, 'user_id', userId);
  }

  async deleteInventory(itemId) {
    return this.delete(STORES.INVENTORY, itemId);
  }

  async addToSyncQueue(operation) {
    const queueItem = {
      ...operation,
      timestamp: Date.now(),
      status: 'pending'
    };
    return this.add(STORES.SYNC_QUEUE, queueItem);
  }

  async getPendingSyncs() {
    const allSyncs = await this.getAll(STORES.SYNC_QUEUE);
    return allSyncs.filter(sync => sync.status === 'pending' || sync.status === 'failed');
  }

  async markSyncComplete(id) {
    const item = await this.get(STORES.SYNC_QUEUE, id);
    if (item) {
      item.status = 'completed';
      await this.put(STORES.SYNC_QUEUE, item);
    }
  }

  async markSyncFailed(id, error) {
    const item = await this.get(STORES.SYNC_QUEUE, id);
    if (item) {
      item.status = 'failed';
      item.error = error;
      await this.put(STORES.SYNC_QUEUE, item);
    }
  }

  async clearCompletedSyncs() {
    const allSyncs = await this.getAll(STORES.SYNC_QUEUE);
    const completedSyncs = allSyncs.filter(sync => sync.status === 'completed');
    
    for (const sync of completedSyncs) {
      await this.delete(STORES.SYNC_QUEUE, sync.id);
    }
  }

  async clearAll() {
    await this.ensureDB();
    if (!this.db) return;
    
    await Promise.all([
      this.clear(STORES.INVOICES),
      this.clear(STORES.QUOTES),
      this.clear(STORES.CLIENTS),
      this.clear(STORES.INVENTORY),
      this.clear(STORES.SYNC_QUEUE)
    ]);
  }
}

const tradebaseDB = new TradeBaseDB();
