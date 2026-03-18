import { redirect } from "next/navigation";

export default function MoneyRedirect({ searchParams }: { searchParams: Record<string, string> }) {
  const tab = searchParams?.tab;
  redirect(tab ? `/app/invoices?tab=${tab}` : "/app/invoices");
}
