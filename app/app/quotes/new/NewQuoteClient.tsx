"use client";

import { useRouter } from "next/navigation";
import { QuoteBuilder, QuotePayload } from "@/components/forms/QuoteBuilder";

export type ServicePreset = {
  id: string;
  name: string;
  description: string | null;
  price: number;
};

export default function NewQuoteClient({
  customers,
  presets,
  defaultWarrantyText = "",
}: {
  customers: { id: string; name: string }[];
  presets: ServicePreset[];
  defaultWarrantyText?: string;
}) {
  const router = useRouter();

  return (
    <QuoteBuilder
      customers={customers}
      presets={presets}
      defaultWarrantyText={defaultWarrantyText}
      onSubmit={async (payload: QuotePayload) => {
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
