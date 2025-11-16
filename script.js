// --------------------------
// SUPABASE CONFIG
// --------------------------
const SUPABASE_URL = "https://uafgyteczukkgmxfbeil.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZmd5dGVjenVra2dteGZiZWlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNDEyODQsImV4cCI6MjA3ODgxNzI4NH0.tiddA-ORf1b3ZnQOxGEOgq3rJW-BJe3MMD7QahvDFO4";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const TB_INVOICES_KEY = "tradebase:invoices";
const TB_ESTIMATES_KEY = "tradebase:estimates";
const TB_CLIENTS_KEY = "tradebase:clients";
const TB_BUSINESS_KEY = "tradebase:businessProfile";

// --------------------------
// SIMPLE SCREEN HANDLING
// --------------------------
function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
}

function showLogin() { show('auth-screen'); }
function showSignup() { show('signup-screen'); }
function showReset() { show('reset-screen'); }

// --------------------------
// AUTH
// --------------------------
async function login() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return alert(error.message);

    checkLicense();
}

async function signup() {
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;

    const { error } = await sb.auth.signUp({ email, password });
    if (error) return alert(error.message);

    alert("Account created! Please log in.");
    showLogin();
}

async function resetPassword() {
    const email = document.getElementById('reset-email').value.trim();
    const { error } = await sb.auth.resetPasswordForEmail(email);
    if (error) return alert(error.message);

    alert("Password reset email sent.");
    showLogin();
}

async function logout() {
    await sb.auth.signOut();
    showLogin();
}

// --------------------------
// LICENSE VALIDATION
// --------------------------
async function checkLicense() {
    const { data: userData } = await sb.auth.getUser();
    if (!userData?.user) return showLogin();

    const userId = userData.user.id;

    const { data, error } = await sb
        .from('licenses')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .maybeSingle();

    if (!data) {
        show('license-screen');
    } else {
        show('home-screen');
        initApp();
    }
}

async function activateLicense() {
    const key = document.getElementById('license-key').value.trim();
    const { data: userData } = await sb.auth.getUser();
    if (!userData?.user) return showLogin();
    const userId = userData.user.id;

    const { data, error } = await sb
        .from('licenses')
        .select('*')
        .eq('key', key)
        .maybeSingle();

    if (!data) return alert("Invalid license key.");
    if (data.user_id && data.user_id !== userId) return alert("This key is already in use.");
    if (new Date(data.expires_at) < new Date()) return alert("License expired.");

    await sb.from('licenses').update({ user_id: userId }).eq('id', data.id);

    show('home-screen');
    initApp();
}

// --------------------------
// LOCAL DATA (INVOICES + PHOTOS)
// --------------------------
let tbData = null;
let appInitialized = false;
let currentInvoiceId = null;
let currentPhotos = []; // { id, name, dataUrl }

function loadLocalData() {
    const raw = localStorage.getItem('tradebase_data');
    if (!raw) {
        tbData = { version: 1, invoices: [], nextInvoiceNumber: 1 };
        saveLocalData();
    } else {
        try {
            tbData = JSON.parse(raw);
            if (!tbData.invoices) tbData.invoices = [];
            if (!tbData.nextInvoiceNumber) tbData.nextInvoiceNumber = 1;
        } catch (e) {
            tbData = { version: 1, invoices: [], nextInvoiceNumber: 1 };
        }
    }
}

function saveLocalData() {
    localStorage.setItem('tradebase_data', JSON.stringify(tbData));
}

// --------------------------
// APP INIT
// --------------------------
function initApp() {
    if (appInitialized) return;
    appInitialized = true;

    loadLocalData();
    hookInvoiceInputs();
    renderInvoicesList();
}

// --------------------------
// NAVIGATION
// --------------------------
function backToHome() {
    show('home-screen');
}

function openNewInvoice() {
    currentInvoiceId = null;
    currentPhotos = [];
    clearInvoiceForm();
    updateInvoicePreview();
    show('invoice-screen');
}

function openInvoicesList() {
    renderInvoicesList();
    show('invoices-screen');
}

// --------------------------
// INVOICE FORM + ITEMS
// --------------------------
function hookInvoiceInputs() {
    const inputs = [
        'inv-client-name',
        'inv-client-address',
        'inv-number',
        'inv-date',
        'inv-due',
        'inv-tax',
        'inv-discount',
        'inv-notes'
    ];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateInvoicePreview);
    });

    const photosInput = document.getElementById('inv-photos-input');
    if (photosInput) {
        photosInput.addEventListener('change', handlePhotoInput);
    }

    addItemRow(); // start with one row
}

function clearInvoiceForm() {
    document.getElementById('inv-client-name').value = '';
    document.getElementById('inv-client-address').value = '';
    document.getElementById('inv-date').value = '';
    document.getElementById('inv-due').value = '';
    document.getElementById('inv-tax').value = '0';
    document.getElementById('inv-discount').value = '0';
    document.getElementById('inv-notes').value = '';
    // invoice number
    document.getElementById('inv-number').value = 'INV-' + tbData.nextInvoiceNumber;

    // clear items
    const body = document.getElementById('items-body');
    body.innerHTML = '';
    addItemRow();

    // clear photos
    currentPhotos = [];
    document.getElementById('inv-photos-preview').innerHTML = '';
    document.getElementById('prev-photos').innerHTML = '';
}

function addItemRow() {
    const body = document.getElementById('items-body');
    const row = document.createElement('tr');

    row.innerHTML = `
        <td><input type="text" class="item-desc" placeholder="Description" /></td>
        <td><input type="number" class="item-qty" step="0.01" value="1" /></td>
        <td><input type="number" class="item-rate" step="0.01" value="0" /></td>
        <td class="item-total-cell">$0.00</td>
        <td><button class="small-btn" type="button" onclick="removeItemRow(this)">X</button></td>
    `;

    body.appendChild(row);

    row.querySelector('.item-desc').addEventListener('input', updateInvoicePreview);
    row.querySelector('.item-qty').addEventListener('input', updateInvoicePreview);
    row.querySelector('.item-rate').addEventListener('input', updateInvoicePreview);
}

function removeItemRow(btn) {
    const row = btn.closest('tr');
    const body = document.getElementById('items-body');
    if (body.rows.length > 1) {
        row.remove();
        updateInvoicePreview();
    }
}

// --------------------------
// PHOTOS
// --------------------------
function handlePhotoInput(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            currentPhotos.push({
                id: 'ph_' + Date.now() + '_' + Math.random().toString(16).slice(2),
                name: file.name,
                dataUrl: ev.target.result
            });
            renderPhotoPreviews();
            updateInvoicePreview();
        };
        reader.readAsDataURL(file);
    });

    e.target.value = ''; // reset so same file can be chosen again later
}

function renderPhotoPreviews() {
    const container = document.getElementById('inv-photos-preview');
    container.innerHTML = '';
    currentPhotos.forEach(p => {
        const img = document.createElement('img');
        img.src = p.dataUrl;
        container.appendChild(img);
    });
}

// --------------------------
// PREVIEW + TOTALS
// --------------------------
function gatherItems() {
    const rows = Array.from(document.querySelectorAll('#items-body tr'));
    const items = [];
    rows.forEach(row => {
        const desc = row.querySelector('.item-desc').value.trim();
        const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
        const rate = parseFloat(row.querySelector('.item-rate').value) || 0;
        const total = qty * rate;
        items.push({ desc, qty, rate, total });
        row.querySelector('.item-total-cell').textContent = '$' + total.toFixed(2);
    });
    return items;
}

function updateInvoicePreview() {
    const client = document.getElementById('inv-client-name').value.trim();
    const address = document.getElementById('inv-client-address').value.trim();
    const number = document.getElementById('inv-number').value.trim();
    const date = document.getElementById('inv-date').value;
    const due = document.getElementById('inv-due').value;
    const taxRate = parseFloat(document.getElementById('inv-tax').value) || 0;
    const discount = parseFloat(document.getElementById('inv-discount').value) || 0;
    const notes = document.getElementById('inv-notes').value.trim();

    const items = gatherItems();
    const subtotal = items.reduce((sum, it) => sum + it.total, 0);
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax - discount;

    // update preview fields
    document.getElementById('prev-client').textContent = client || '-';
    document.getElementById('prev-address').textContent = address || '-';
    document.getElementById('prev-number').textContent = number || '-';
    document.getElementById('prev-date').textContent = date || '-';
    document.getElementById('prev-due').textContent = due || '-';

    document.getElementById('prev-subtotal').textContent = subtotal.toFixed(2);
    document.getElementById('prev-tax').textContent = tax.toFixed(2);
    document.getElementById('prev-discount').textContent = discount.toFixed(2);
    document.getElementById('prev-total').textContent = total.toFixed(2);
    document.getElementById('prev-notes').textContent = notes || '-';

    const prevItems = document.getElementById('prev-items');
    prevItems.innerHTML = '';
    items.forEach(it => {
        const p = document.createElement('p');
        p.textContent = `${it.desc || 'Item'} — ${it.qty} x $${it.rate.toFixed(2)} = $${it.total.toFixed(2)}`;
        prevItems.appendChild(p);
    });

    const prevPhotos = document.getElementById('prev-photos');
    prevPhotos.innerHTML = '';
    currentPhotos.forEach(p => {
        const img = document.createElement('img');
        img.src = p.dataUrl;
        prevPhotos.appendChild(img);
    });
}

// --------------------------
// SAVE INVOICE
// --------------------------
function saveInvoice() {
    const client = document.getElementById('inv-client-name').value.trim();
    if (!client) return alert("Client name is required.");

    const address = document.getElementById('inv-client-address').value.trim();
    const number = document.getElementById('inv-number').value.trim() || ('INV-' + tbData.nextInvoiceNumber);
    const date = document.getElementById('inv-date').value;
    const due = document.getElementById('inv-due').value;
    const taxRate = parseFloat(document.getElementById('inv-tax').value) || 0;
    const discount = parseFloat(document.getElementById('inv-discount').value) || 0;
    const notes = document.getElementById('inv-notes').value.trim();
    const items = gatherItems();

    const subtotal = items.reduce((sum, it) => sum + it.total, 0);
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax - discount;

    const invoice = {
        id: currentInvoiceId || ('inv_' + Date.now() + '_' + Math.random().toString(16).slice(2)),
        client,
        address,
        number,
        date,
        due,
        taxRate,
        discount,
        notes,
        items,
        subtotal,
        tax,
        total,
        photos: currentPhotos,
        createdAt: new Date().toISOString()
    };

    if (!currentInvoiceId) {
        tbData.invoices.push(invoice);
        tbData.nextInvoiceNumber += 1;
    } else {
        const idx = tbData.invoices.findIndex(i => i.id === currentInvoiceId);
        if (idx !== -1) tbData.invoices[idx] = invoice;
    }

    saveLocalData();
    alert("Invoice saved.");
    renderInvoicesList();
    show('invoices-screen');
}

// --------------------------
// PRINT / PDF (BASIC)
// --------------------------
function printInvoice() {
    window.print(); // simple for now – uses browser "Save as PDF"
}

// --------------------------
// INVOICES LIST
// --------------------------
function renderInvoicesList() {
    const body = document.getElementById('invoices-list-body');
    if (!body || !tbData) return;
    body.innerHTML = '';

    tbData.invoices
        .slice()
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .forEach(inv => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${inv.number}</td>
                <td>${inv.client}</td>
                <td>${inv.date || '-'}</td>
                <td>$${inv.total.toFixed(2)}</td>
            `;
            tr.addEventListener('click', () => openInvoice(inv.id));
            body.appendChild(tr);
        });
}

function openInvoice(id) {
    const inv = tbData.invoices.find(i => i.id === id);
    if (!inv) return;

    currentInvoiceId = inv.id;
    currentPhotos = inv.photos || [];

    document.getElementById('inv-client-name').value = inv.client;
    document.getElementById('inv-client-address').value = inv.address;
    document.getElementById('inv-number').value = inv.number;
    document.getElementById('inv-date').value = inv.date || '';
    document.getElementById('inv-due').value = inv.due || '';
    document.getElementById('inv-tax').value = inv.taxRate;
    document.getElementById('inv-discount').value = inv.discount;
    document.getElementById('inv-notes').value = inv.notes;

    const body = document.getElementById('items-body');
    body.innerHTML = '';
    inv.items.forEach(it => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="text" class="item-desc" value="${it.desc}" /></td>
            <td><input type="number" class="item-qty" step="0.01" value="${it.qty}" /></td>
            <td><input type="number" class="item-rate" step="0.01" value="${it.rate}" /></td>
            <td class="item-total-cell">$${it.total.toFixed(2)}</td>
            <td><button class="small-btn" type="button" onclick="removeItemRow(this)">X</button></td>
        `;
        body.appendChild(row);
        row.querySelector('.item-desc').addEventListener('input', updateInvoicePreview);
        row.querySelector('.item-qty').addEventListener('input', updateInvoicePreview);
        row.querySelector('.item-rate').addEventListener('input', updateInvoicePreview);
    });

    renderPhotoPreviews();
    updateInvoicePreview();
    show('invoice-screen');
}

// --------------------------
// INITIAL APP BOOT
// --------------------------
async function boot() {
    const { data: userData } = await sb.auth.getUser();
    if (!userData?.user) return showLogin();
    checkLicense();
}

boot();
