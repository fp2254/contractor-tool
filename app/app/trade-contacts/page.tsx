import Link from "next/link";

const DEMO_CONTACTS = [
  { name: "Mike P.", company: "Portland Electric", phone: "207) 555-3021" },
  { name: "Louie T.", company: "Thompson Plumbing", phone: "207) 555-8912" },
  { name: "Steve R.", company: "Augusta HVAC", phone: "207) 555-7645" },
  { name: "Ed L.", company: "Reliable Construction", phone: "207) 555-6352" },
  { name: "Pat H.", company: "Harris Landscaping", phone: "207) 555-4147" },
  { name: "Dave G.", company: "Pine State Roofing", phone: "207) 555-1286" },
];

export default function TradeContactsPage() {
  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-bold text-slate-800">Trade Contacts</h1>

      <button
        className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-white font-semibold"
        style={{ backgroundColor: "#1B3A6B" }}>
        <span className="text-lg">+</span> Invite a Contractor
      </button>

      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input className="flex-1 text-sm outline-none bg-transparent" placeholder="Search contacts" />
        </div>
        <button className="bg-white rounded-xl p-2 shadow-sm text-gray-400">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M3 6h18M7 12h10M11 18h2" />
          </svg>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
        {DEMO_CONTACTS.map((contact) => (
          <div key={contact.name} className="flex items-center gap-3 px-4 py-3">
            <div className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ backgroundColor: "#1B3A6B" }}>
              {contact.name.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-800 text-sm">{contact.name}</p>
              <p className="text-xs text-gray-500">{contact.company}</p>
              <p className="text-xs text-gray-500">📞 {contact.phone}</p>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <span>📞</span><span>💬</span>
              <span className="text-gray-300 text-lg">›</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
