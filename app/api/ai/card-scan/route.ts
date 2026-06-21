import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureUserOrg } from "@/lib/auth";
import { getOpenAIClient } from "@/lib/openai";

export const dynamic = "force-dynamic";

const outputSchema = z.object({
  name: z.string().default(""),
  company: z.string().default(""),
  phone: z.string().default(""),
  email: z.string().default(""),
  website: z.string().default(""),
  address: z.string().default(""),
  trade: z.string().default(""),
});

export type CardScanResult = z.infer<typeof outputSchema>;

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
      response_format: { type: "json_object" },
      max_completion_tokens: 400,
      messages: [
        {
          role: "system",
          content: [
            "You are a business card parser. Extract structured contact information from business card images.",
            "Return ONLY valid JSON. Leave any field blank (empty string) if you cannot confidently extract it.",
            "If multiple phone numbers exist, choose the primary one (direct/mobile preferred over fax).",
            "If multiple emails exist, choose the primary one.",
            "For trade/specialty, only fill it if clearly stated (e.g. 'Licensed Electrician', 'Plumbing & HVAC').",
            "Output schema: { name, company, phone, email, website, address, trade }",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: image_data_url, detail: "high" },
            },
            {
              type: "text",
              text: "Extract all contact information from this business card. Return JSON only.",
            },
          ],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 500 });
    }

    const result = outputSchema.safeParse(parsed);
    if (!result.success) {
      return NextResponse.json({ error: "Could not parse card data" }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (err) {
    console.error("[card-scan] OpenAI error:", err);
    return NextResponse.json({ error: "Card scanning failed — please try again" }, { status: 503 });
  }
}
