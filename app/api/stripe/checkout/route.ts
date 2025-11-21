import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

const prices: Record<string, string> = {
  lifetime_early: 'price_1SVkdpBQnHmahVblGACoBqoJ',  // $149 first 500
  lifetime: 'price_1SVkdpBQnHmahVblGACoBqoJ',        // flips to $199
  monthly: 'price_1SUIKEBQnHmahVblf7WGY5lW',
  yearly: 'price_1SUILYBQnHmahVblsHU8lwDE',
  connect_stripe: 'price_1SVkebBQnHmahVblU6qXXG4Q',
};

export async function POST(req: Request) {
  const { priceId, userId } = await req.json();

  // Early-bird logic
  const { count } = await supabase.from('purchases').select('id', { count: 'exact' });
  const finalPriceId = priceId === 'lifetime_early' && count! < 500 ? prices.lifetime_early : prices.lifetime;

  const session = await stripe.checkout.sessions.create({
    mode: priceId.includes('lifetime') ? 'payment' : 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: finalPriceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_URL}/success`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/cancel`,
    metadata: { userId },
  });

  return NextResponse.json({ url: session.url });
}
