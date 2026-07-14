/**
 * Generate the next sequential invoice number for an org.
 * Per-org sequence: INV-0001, INV-0002, …
 * Uses COUNT of existing invoices — good enough for contractor scale,
 * no risk of collision under normal single-user usage.
 */
export async function nextInvoiceNumber(
  admin: any,
  orgId: string
): Promise<string> {
  const { count } = await admin
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);
  const seq = (count ?? 0) + 1;
  return `INV-${String(seq).padStart(4, "0")}`;
}
