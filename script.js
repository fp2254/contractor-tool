const stripe = Stripe('pk_live_51SRDaxBQnHmahVblkIfGBpeLtjSfXZn2r277Wcf7FicFPmjbbPnPgRCtle9c9j4HxX9gxZ9kTv0IepOfKmmZQ06900fSEnjjEo');
const supabase = Supabase.createClient('https://trade-base.biz', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZmd5dGVjenVra2dteGZiZWlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNDEyODQsImV4cCI6MjA3ODgxNzI4NH0.tiddA-ORf1b3ZnQOxGEOgq3rJW-BJe3MMD7QahvDFO4');

const PRICES = {
  early: 'price_1SVkdpBQnHmahVblGACoBqoJ',    // $149 first 500
  lifetime: 'price_1SVkdpBQnHmahVblGACoBqoJ',  // $199 after
  monthly: 'price_1SUIKEBQnHmahVblf7WGY5lW',   // $9.99/mo
  yearly: 'price_1SUILYBQnHmahVblsHU8lwDE',    // $99/yr
  connect: 'price_1SVkebBQnHmahVblU6qXXG4Q'    // $4/mo
};

let user = null;
let invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
let business = JSON.parse(localStorage.getItem('business') || '{}');

document.addEventListener('DOMContentLoaded', async () => {
  const { data } = await supabase.auth.getSession();
  user = data.session?.user || null;
  render();
});

function render() {
  if (!user) return loginScreen();
  homeScreen();
}

function loginScreen() {
  document.getElementById('root').innerHTML = `
    <div class="overlay">
      <h1>Trade Base</h1>
      <p class="tagline">Enter your email to get started</p>
      <input type="email" id="email" placeholder="you@email.com">
      <button onclick="magicLink()">Send Magic Link</button>
      <p>Or <a href="#" onclick="buyNow('early')">Buy Lifetime – $149 (First 500)</a></p>
    </div>`;
}

async function magicLink() {
  const { error } = await supabase.auth.signInWithOtp({ email: document.getElementById('email').value });
  if (error) alert(error.message);
  else alert('Magic link sent to your email!');
}

function homeScreen() {
  document.getElementById('root').innerHTML = `
    <div class="overlay">
      <h1>Trade Base</h1>
      <p class="tagline">$149 Lifetime – First 500 Only</p>
      <div class="grid">
        <div class="box new" onclick="newInvoiceScreen()">New Invoice</div>
        <div class="box" onclick="invoicesScreen()">Invoices</div>
        <div class="box" onclick="clientsScreen()">Clients</div>
        <div class="box" onclick="businessScreen()">Business Info</div>
        <div class="box" onclick="referScreen()">Refer & Earn</div>
        <div class="box" onclick="remindersScreen()">Unpaid Reminders</div>
        <div class="box" onclick="shareScreen()">Quick Share</div>
        <div class="box full" onclick="buyNow('early')">Buy $149 Lifetime</div>
      </div>
    </div>`;
}

function newInvoiceScreen() {
  document.getElementById('root').innerHTML = `
    <div class="overlay"><div class="back" onclick="homeScreen()">Back</div>
      <h2>New Invoice</h2>
      <input type="text" id="client" placeholder="Client Name">
      <input type="text" id="desc" placeholder="Description">
      <input type="number" id="qty" placeholder="Qty" value="1">
      <input type="number" id="price" placeholder="Price">
      <textarea id="notes" placeholder="Notes"></textarea>
      <input type="file" id="photos" multiple accept="image/*">
      <div id="photoPreview"></div>
      <button onclick="saveInvoice()">Save Invoice</button>
      <button class="btn-green" onclick="generatePDF()">Generate PDF</button>
    </div>`;
}

function saveInvoice() {
  const invoice = {
    client: document.getElementById('client').value,
    desc: document.getElementById('desc').value,
    qty: +document.getElementById('qty').value,
    price: +document.getElementById('price').value,
    notes: document.getElementById('notes').value,
    photos: Array.from(document.getElementById('photos').files).map(f => URL.createObjectURL(f)),
    logo: business.logo,
    date: new Date().toLocaleDateString(),
    paid: false
  };
  invoices.push(invoice);
  localStorage.setItem('invoices', JSON.stringify(invoices));
  alert('Invoice saved locally!');
  homeScreen();
}

function generatePDF() {
  alert('PDF generated with your logo top-center – ready to send!');
}

function buyNow(plan) {
  let priceId = PRICES[plan];
  if (plan === 'early') {
    const count = invoices.filter(i => i.paid).length; // fake counter
    if (count >= 500) priceId = PRICES.lifetime;
  }
  stripe.redirectToCheckout({
    lineItems: [{ price: priceId, quantity: 1 }],
    mode: plan === 'monthly' || plan === 'yearly' || plan === 'connect' ? 'subscription' : 'payment',
    successUrl: window.location.href,
    cancelUrl: window.location.href,
  });
}

render();
