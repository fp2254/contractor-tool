export const WARRANTY_CLAUSES = [
  { id: "payment",        label: "Payment due on completion",              text: "Payment is due upon completion of work unless otherwise agreed in writing." },
  { id: "labor-warranty", label: "1-year labor warranty",                  text: "All labor is warranted for 1 year from the date of completion." },
  { id: "parts-warranty", label: "90-day parts warranty",                  text: "All parts and materials are warranted per manufacturer specifications (minimum 90 days)." },
  { id: "codes",          label: "Work to local code",                     text: "All work will be performed in accordance with applicable local building codes and regulations." },
  { id: "permits",        label: "Client responsible for permits",         text: "Customer is responsible for obtaining any required permits unless otherwise agreed." },
  { id: "scope",          label: "Additional work requires new agreement", text: "Any work beyond the agreed scope will require a separate written agreement and additional charges." },
  { id: "access",         label: "Site access required",                   text: "Customer agrees to provide reasonable access to the work site at the scheduled time. A return trip fee may apply if access is unavailable." },
  { id: "cancellation",   label: "48-hr cancellation notice",              text: "Cancellations with less than 48 hours notice may be subject to a cancellation fee." },
] as const;

export function parseWarrantyClauses(text: string): string[] {
  return WARRANTY_CLAUSES.filter((c) => text.includes(c.text)).map((c) => c.id);
}

export function parseWarrantyParts(text: string): { ids: string[]; custom: string } {
  const ids: string[] = [];
  let remaining = text;
  for (const clause of WARRANTY_CLAUSES) {
    if (text.includes(clause.text)) {
      ids.push(clause.id);
      remaining = remaining.replace(clause.text, "").trim();
    }
  }
  return { ids, custom: remaining };
}

export function buildWarrantyText(clauseIds: Set<string>, customText: string): string {
  const clauseParts = WARRANTY_CLAUSES.filter((c) => clauseIds.has(c.id)).map((c) => c.text);
  const trimmed = customText.trim();
  return [...clauseParts, ...(trimmed ? [trimmed] : [])].join("\n");
}
