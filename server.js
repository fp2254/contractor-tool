// server.js
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const stripeLib = require("stripe");

const app = express();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "YOUR_STRIPE_SECRET_KEY";
const stripe = stripeLib(STRIPE_SECRET_KEY);

// Map our plan keys to Stripe price IDs
const PRICE_IDS = {
  monthly: "price_YOUR_MONTHLY_PRICE_ID",
  yearly: "price_YOUR_YEARLY_PRICE_ID",
  lifetime: "price_YOUR_LIFETIME_PRICE_ID"
};

const YOUR_DOMAIN = process.env.APP_DOMAIN || "http://localhost:3000";

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Create Checkout session
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { planKey, email } = req.body;
    const priceId = PRICE_IDS[planKey];

    if (!priceId) {
      return res.status(400).json({ message: "Unknown plan." });
    }

    const mode = planKey === "lifetime" ? "payment" : "subscription";

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: `${YOUR_DOMAIN}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${YOUR_DOMAIN}/`,
      customer_email: email || undefined
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("create-checkout-session error", err);
    res.status(500).json({ message: "Server error creating session." });
  }
});

// Verify Checkout session
app.get("/checkout-session", async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) {
    return res.json({ success: false, message: "No session_id." });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["line_items.data.price"]
    });

    if (session.payment_status !== "paid") {
      return res.json({ success: false, message: "Payment not completed." });
    }

    const priceId = session.line_items.data[0].price.id;
    let planType = null;
    if (priceId === PRICE_IDS.monthly) planType = "monthly";
    if (priceId === PRICE_IDS.yearly) planType = "yearly";
    if (priceId === PRICE_IDS.lifetime) planType = "lifetime";

    if (!planType) {
      return res.json({ success: false, message: "Unknown plan." });
    }

    res.json({ success: true, planType });
  } catch (err) {
    console.error("checkout-session error", err);
    res.json({ success: false, message: "Error verifying session." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TradeBase server running on port ${PORT}`);
});