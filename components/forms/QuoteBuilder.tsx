"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Item = { description: string; quantity: number; unit_price: number };

export function QuoteBuilder({
  customers,
  onSubmit,
}: {
  customers: { id: string; name: string }[];
  onSubmit: (payload: { customer_id: string; notes: string; items: Item[] }) => Promise<void>;
}) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([
    { description: "", quantity: 1, unit_price: 0 },
    { description: "", quantity: 1, unit_price: 0 },
  ]);

  const total = useMemo(() => items.reduce((acc, item) => acc + item.quantity * item.unit_price, 0), [items]);

  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit({ customer_id: customerId, notes, items });
      }}
    >
      <label className="text-sm font-medium">Customer</label>
      <select className="rounded-xl border border-slate-300 px-4 py-3" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
        {customers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.name}
          </option>
        ))}
      </select>

      {items.map((item, i) => (
        <div key={i} className="grid grid-cols-3 gap-2">
          <Input
            placeholder="Item"
            value={item.description}
            onChange={(e) => setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, description: e.target.value } : it)))}
            required
          />
          <Input
            type="number"
            min="0"
            step="0.1"
            placeholder="Qty"
            value={item.quantity}
            onChange={(e) => setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, quantity: Number(e.target.value) } : it)))}
            required
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Unit price"
            value={item.unit_price}
            onChange={(e) =>
              setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, unit_price: Number(e.target.value) } : it)))
            }
            required
          />
        </div>
      ))}

      <Button type="button" variant="secondary" onClick={() => setItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0 }])}>
        + Add Line Item
      </Button>

      <Input placeholder="Quote notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <p className="text-sm font-medium">Total ${total.toFixed(2)}</p>
      <Button type="submit">Save Quote</Button>
    </form>
  );
}
