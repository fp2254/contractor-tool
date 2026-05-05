import { NextResponse } from "next/server";
import { ensureUserOrg } from "@/lib/auth";
import { getOpenAIClient } from "@/lib/openai";

export const dynamic = "force-dynamic";

export type TemplateScanField = {
  label: string;
  field_type: "short_text" | "dropdown" | "yes_no";
  required: boolean;
  options: string[];
};

export type TemplateScanInvoiceItem = {
  description: string;
  amount: number;
};

export type TemplateScanResult = {
  name: string;
  description: string;
  required_photo_count: number;
  fields: TemplateScanField[];
  invoice_items: TemplateScanInvoiceItem[];
  warranty_title: string;
  warranty_body: string;
};

export async function POST(req: Request) {
  await ensureUserOrg();

  const { image_data_url } = await req.json() as { image_data_url?: string };
  if (!image_data_url?.startsWith("data:image")) {
    return NextResponse.json({ error: "image_data_url is required" }, { status: 400 });
  }

  const client = getOpenAIClient();

  const systemPrompt = [
    "You are a job template extractor for a trades business app.",
    "The user will upload a photo or scan of an existing paper job template, checklist, or form.",
    "Your job is to extract all structured information from it and return it as JSON.",
    "",
    "Rules:",
    "- name: the overall name of the template/form (e.g. 'Radon Mitigation Installation').",
    "- description: a brief description if one is present, otherwise empty string.",
    "- required_photo_count: if you see 'X photos required' or a photo section with slots, extract the number. Default 0.",
    "- fields: extract every checkbox, input field, dropdown, or yes/no question you can see.",
    "  - field_type must be one of: 'short_text', 'dropdown', 'yes_no'.",
    "  - Use 'yes_no' for checkboxes, pass/fail items, or yes/no questions.",
    "  - Use 'dropdown' only when there are clearly listed multiple-choice options.",
    "  - Use 'short_text' for everything else (measurements, model numbers, free text, signatures, dates).",
    "  - required: true if the field is marked required or starred, otherwise false.",
    "  - options: only populate for dropdown type, list the options you can read.",
    "- invoice_items: extract any line items, pricing table, or service items with amounts. Amount defaults to 0 if no price shown.",
    "- warranty_title and warranty_body: extract any warranty or guarantee section.",
    "- Do NOT invent field names or items that are not visible in the document.",
    "- Do NOT include trade-specific hardcoded assumptions — only extract what you actually see.",
    "Return ONLY valid JSON matching this exact schema:",
    '{ "name": "", "description": "", "required_photo_count": 0, "fields": [{ "label": "", "field_type": "short_text", "required": false, "options": [] }], "invoice_items": [{ "description": "", "amount": 0 }], "warranty_title": "", "warranty_body": "" }',
  ].join("\n");

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      max_completion_tokens: 1200,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: image_data_url, detail: "high" },
            },
            {
              type: "text",
              text: "Extract all template information from this document. Return JSON only.",
            },
          ],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Partial<TemplateScanResult>;

    const result: TemplateScanResult = {
      name: parsed.name ?? "",
      description: parsed.description ?? "",
      required_photo_count: Number(parsed.required_photo_count ?? 0),
      fields: (parsed.fields ?? []).map(f => ({
        label: f.label ?? "",
        field_type: ["short_text", "dropdown", "yes_no"].includes(f.field_type)
          ? f.field_type
          : "short_text",
        required: Boolean(f.required),
        options: Array.isArray(f.options) ? f.options : [],
      })),
      invoice_items: (parsed.invoice_items ?? []).map(i => ({
        description: i.description ?? "",
        amount: Number(i.amount ?? 0),
      })),
      warranty_title: parsed.warranty_title ?? "",
      warranty_body: parsed.warranty_body ?? "",
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("template-scan error:", err);
    return NextResponse.json({ error: "AI scan failed — please try again." }, { status: 500 });
  }
}
