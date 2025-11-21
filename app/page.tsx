import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-[url('https://images.unsplash.com/photo-1581092580490-4ed0f0f7e8e6?q=80&w=2340&auto=format&fit=crop')] bg-cover bg-center">
      <div className="min-h-screen bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-6">
        <h1 className="text-5xl md:text-6xl font-black mb-4">Trade Base</h1>
        <p className="text-xl mb-12 opacity-95">Pay once. Own it forever.</p>

        <div className="grid grid-cols-2 gap-6 max-w-2xl w-full">
          {/* NEW INVOICE – full width */}
          <Button className="col-span-2 h-32 text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700">
            New Invoice
          </Button>

          <Button variant="outline" className="h-28 text-xl">Invoices</Button>
          <Button variant="outline" className="h-28 text-xl">Clients</Button>
          <Button variant="outline" className="h-28 text-xl">Business Info</Button>
          <Button variant="outline" className="h-28 text-xl">Refer & Earn</Button>
          <Button variant="outline" className="h-28 text-xl">Unpaid Reminders</Button>
          <Button variant="outline" className="h-28 text-xl">Quick Share</Button>

          {/* SETTINGS – full width */}
          <Button variant="outline" className="col-span-2 h-28 text-xl">Settings</Button>
        </div>
      </div>
    </div>
  );
}
