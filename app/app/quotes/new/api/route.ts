import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";
import { quoteSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const supabase = await createClient();
  const orgId = await ensureUserOrg();
  const body = await req.json();
  const user = await supabase.auth.getUser();
  const parsed = quoteSchema.parse(body);

  const totalAmount = parsed.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const { data: quote, error } = await supabase
    .from("quotes")
    .insert({
      org_id: orgId!,
      customer_id: parsed.customer_id,
      status: "draft",
      total_amount: totalAmount,
      notes: parsed.notes ?? "",
      created_by_user: user.data.user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !quote) return NextResponse.json({ error: error?.message ?? "Could not create quote" }, { status: 400 });

  await supabase.from("quote_items").insert(
    parsed.items.map((item) => ({
      org_id: orgId!,
      quote_id: quote.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.quantity * item.unit_price,
    })),
  );

  return NextResponse.json({ id: quote.id });
}
