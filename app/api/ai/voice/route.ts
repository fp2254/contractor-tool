import { NextResponse } from "next/server";
import { ensureUserOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOpenAIClient } from "@/lib/openai";

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const body = await req.json();
  const transcript = String(body.transcript ?? "").trim();

  if (!transcript) {
    return NextResponse.json({ error: "transcript is required" }, { status: 400 });
  }

  const { data: presets } = await admin
    .from("service_presets")
    .select("id,service_name,description,price_type,flat_rate,hourly_rate,estimated_hours,tags,category")
    .eq("org_id", orgId!)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const presetsText =
    presets && presets.length > 0
      ? presets
          .map(
            (p) =>
              `id=${p.id} name="${p.service_name}" price=${
                p.price_type === "flat"
                  ? p.flat_rate
                  : (p.hourly_rate ?? 0) * (p.estimated_hours ?? 1)
              } tags="${p.tags ?? ""}" category="${p.category ?? ""}"`
          )
          .join("\n")
      : "No presets configured.";

  const today = new Date().toISOString().slice(0, 10);

  const openai = getOpenAIClient();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    max_completion_tokens: 800,
    messages: [
      {
        role: "system",
        content: `You extract structured job information from a contractor's spoken description.

Today's date: ${today}

Available service presets:
${presetsText}

Return a single JSON object with exactly these keys:
- "customer_name": full name as spoken (string)
- "customer_phone": phone number if mentioned, else ""
- "customer_address": street address if mentioned, else ""
- "job_title": short title for the job (5 words max)
- "scheduled_date": ISO date YYYY-MM-DD if a day/date was mentioned (resolve relative dates like "Friday" or "next Monday" relative to today), else ""
- "notes": any extra details not captured elsewhere
- "line_items": array of objects with keys: description (string), qty (number), unit_price (number), preset_id (string matching a preset id above if it matches, else null)

Match line_items to presets when the spoken description mentions work that matches a preset name, tags, or category. Use the preset price as unit_price when matched. If a specific price was spoken, use that instead. If no price is known, use 0.

Output JSON only.`,
      },
      {
        role: "user",
        content: transcript,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";

  let extracted: Record<string, unknown>;
  try {
    extracted = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  return NextResponse.json({ transcript, extracted });
}
