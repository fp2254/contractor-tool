import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureUserOrg } from "@/lib/auth";
import { getOpenAIClient } from "@/lib/openai";

export const dynamic = "force-dynamic";

const leadSchema = z.object({
  name: z.string().default(""),
  phone: z.string().default(""),
  email: z.string().default(""),
  address: z.string().default(""),
  city: z.string().default(""),
  state: z.string().default(""),
  job_type: z.string().default(""),
  notes: z.string().default(""),
});

const outputSchema = z.object({
  leads: z.array(leadSchema).default([]),
});

export type LeadScanResult = z.infer<typeof leadSchema>;

function parseCSV(text: string): LeadScanResult[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const cols: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if ((ch === "," || ch === "\t") && !inQuote) {
        cols.push(cur.trim()); cur = "";
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    return cols;
  };

  const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, "_"));

  const colMap = (candidates: string[]): number => {
    for (const c of candidates) {
      const idx = headers.findIndex(h => h.includes(c));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const nameIdx    = colMap(["name", "full_name", "contact", "customer"]);
  const phoneIdx   = colMap(["phone", "cell", "mobile", "tel"]);
  const emailIdx   = colMap(["email", "mail"]);
  const addressIdx = colMap(["address", "street", "addr"]);
  const cityIdx    = colMap(["city", "town"]);
  const stateIdx   = colMap(["state", "st", "province"]);
  const jobIdx     = colMap(["job", "service", "type", "work"]);
  const notesIdx   = colMap(["note", "comment", "description", "desc"]);

  const get = (row: string[], idx: number) => idx >= 0 ? (row[idx] ?? "").trim() : "";

  return lines.slice(1).map(line => {
    const row = parseRow(line);
    const name = get(row, nameIdx) || row[0]?.trim() || "";
    if (!name) return null;
    return {
      name,
      phone: get(row, phoneIdx),
      email: get(row, emailIdx),
      address: get(row, addressIdx),
      city: get(row, cityIdx),
      state: get(row, stateIdx),
      job_type: get(row, jobIdx),
      notes: get(row, notesIdx),
    };
  }).filter(Boolean) as LeadScanResult[];
}

export async function POST(req: Request) {
  await ensureUserOrg();

  const body = await req.json() as { type: "csv" | "image"; text?: string; image_data_url?: string };

  if (body.type === "csv") {
    if (!body.text?.trim()) {
      return NextResponse.json({ error: "No CSV text provided" }, { status: 400 });
    }
    const leads = parseCSV(body.text);
    return NextResponse.json({ leads });
  }

  if (body.type === "image") {
    if (!body.image_data_url?.startsWith("data:image")) {
      return NextResponse.json({ error: "image_data_url is required" }, { status: 400 });
    }

    const client = getOpenAIClient();

    try {
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        max_completion_tokens: 2000,
        messages: [
          {
            role: "system",
            content: [
              "You are a lead extraction tool for a contractor app.",
              "Look at this image of a leads list, customer list, or contact sheet.",
              "Extract every person/contact you can see into a structured JSON array.",
              "Return ONLY valid JSON matching: { leads: [ { name, phone, email, address, city, state, job_type, notes } ] }",
              "For any field not visible, return an empty string.",
              "name is required — skip rows with no identifiable name.",
              "job_type should be the type of work requested if visible.",
              "notes should capture any extra details like requested work description.",
              "Do not invent data — only extract what is clearly visible.",
            ].join(" "),
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: body.image_data_url, detail: "high" },
              },
              {
                type: "text",
                text: "Extract all leads/contacts from this sheet. Return JSON only.",
              },
            ],
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      let parsed: unknown;
      try { parsed = JSON.parse(raw); } catch {
        return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 500 });
      }

      const result = outputSchema.safeParse(parsed);
      if (!result.success) {
        return NextResponse.json({ error: "Could not parse leads from image" }, { status: 500 });
      }

      return NextResponse.json({ leads: result.data.leads });
    } catch (err) {
      console.error("[leads/scan]", err);
      return NextResponse.json({ error: "AI scan failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "type must be csv or image" }, { status: 400 });
}
