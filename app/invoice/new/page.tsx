import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export default function NewInvoice() {
  const [clientName, setClientName] = useState("");
  const [lineItems, setLineItems] = useState([{ desc: "", qty: 1, price: 0 }]);
  const [photos, setPhotos] = useState<{ uri: string; title: string; note: string }[]>([]);
  const [notes, setNotes] = useState("");

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-4xl font-bold mb-8 text-center">New Invoice</h1>

      {/* Client */}
      <Input placeholder="Client Name" value={clientName} onChange={(e) => setClientName(e.target.value)} className="mb-6" />

      {/* Line Items */}
      {lineItems.map((item, i) => (
        <div key={i} className="grid grid-cols-3 gap-3 mb-4">
          <Input placeholder="Description" />
          <Input type="number" placeholder="Qty" />
          <Input type="number" placeholder="Price" />
        </div>
      ))}

      {/* Photos */}
      <div className="mb-6">
        <Button variant="secondary" className="w-full mb-4">+ Add Photos</Button>
        {photos.map((p, i) => (
          <div key={i} className="bg-gray-800 p-4 rounded-lg mb-3">
            <img src={p.uri} alt="job" className="w-full h-64 object-cover rounded" />
            <Input placeholder="Photo Title" className="mt-2" />
            <Textarea placeholder="Notes" className="mt-2" />
          </div>
        ))}
      </div>

      {/* Notes */}
      <Textarea placeholder="Additional Notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="mb-8" />

      {/* Generate & Send */}
      <div className="grid grid-cols-2 gap-4">
        <Button className="h-16 text-xl bg-green-600">Generate PDF</Button>
        <Button className="h-16 text-xl">Send via Text</Button>
      </div>
    </div>
  );
}
