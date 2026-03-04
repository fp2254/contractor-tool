"use client";

import { useRouter } from "next/navigation";
import { QuoteBuilder } from "@/components/forms/QuoteBuilder";

export default function NewQuoteClient({
  customers,
}: {
  customers: { id: string; name: string }[];
}) {
  const router = useRouter();

  return (
    <QuoteBuilder
      customers={customers}
      onSubmit={async (payload) => {
        const response = await fetch("/app/quotes/new/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) return;
        const json = (await response.json()) as { id: string };
        router.push(`/app/quotes/${json.id}`);
      }}
    />
  );
}
