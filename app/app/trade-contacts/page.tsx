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

      <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">
        No contacts yet. Tap Invite a Contractor to get started.
      </div>
    </div>
  );
}
