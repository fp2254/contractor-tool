import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureUserOrg } from "@/lib/auth";
import { getOpenAIClient } from "@/lib/openai";

export const dynamic = "force-dynamic";

const outputSchema = z.object({
  name:    z.string().default(""),
  company: z.string().default(""),
  phone:   z.string().default(""),
  email:   z.string().default(""),
  website: z.string().default(""),
  address: z.string().default(""),
  trade:   z.string().default(""),
});

export type CardScanResult = z.infer<typeof outputSchema>;

function extractJSON(raw: string): unknown | null {
  // 1. Direct parse
  try { return JSON.parse(raw.trim()); } catch { /* continue */ }

  // 2. Strip markdown fences  ```json ... ``` or ``` ... ```
  const fenceStripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try { return JSON.parse(fenceStripped); } catch { /* continue */ }

  // 3. Find the first { ... } block
  const first = raw.indexOf("{");
  const last  = raw.lastIndexOf("}");
  if (first !== -1 && last > first) {
    try { return JSON.parse(raw.slice(first, last + 1)); } catch { /* continue */ }
  }

  return null;
}

export async function POST(req: Request) {
  await ensureUserOrg();

  const { image_data_url } = await req.json() as { image_data_url?: string };
  if (!image_data_url?.startsWith("data:image")) {
    return NextResponse.json({ error: "image_data_url is required" }, { status: 400 });
  }

  const client = getOpenAIClient();

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 400,
      messages: [
        {
          role: "system",
          content: [
            "You are a business card parser.",
            "Extract contact information from the image and respond with ONLY a raw JSON object — no markdown, no backticks, no explanation.",
            "Use exactly these keys: name, company, phone, email, website, address, trade.",
            "Set any field you cannot find to an empty string.",
            "If multiple phones exist, pick the mobile/direct number. If multiple emails, pick the primary.",
            'Example output: {"name":"Jane Smith","company":"Smith Plumbing","phone":"5035551234","email":"jane@smithplumbing.com","website":"","address":"Portland OR","trade":"Plumbing"}',
          ].join(" "),
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: image_data_url, detail: "low" },
            },
            {
              type: "text",
              text: 'Extract the contact info. Return ONLY the JSON object, nothing else.',
            },
          ],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    console.log("[card-scan] raw:", JSON.stringify(raw));

    const parsed = extractJSON(raw);
    if (!parsed) {
      console.error("[card-scan] could not extract JSON from:", JSON.stringify(raw));
      return NextResponse.json({ error: "Could not read card — please try again" }, { status: 500 });
    }

    const result = outputSchema.safeParse(parsed);
    if (!result.success) {
      return NextResponse.json({ error: "Could not parse card data" }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (err) {
    console.error("[card-scan] error:", err);
    return NextResponse.json({ error: "Card scanning failed — please try again" }, { status: 503 });
  }
}
