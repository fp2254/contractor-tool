const DEMO_ITEMS = [
  { name: "Radon Mitigation System", price: "$1,500", stock: "Stock: 2", icon: "🔧" },
  { name: "PVC Piping", price: "$3/ft", stock: "Stock: 190 ft.", icon: "🔩" },
  { name: "Dehumidifier", price: "$450", stock: "Stock: 4", icon: "💨" },
  { name: "Sump Pump", price: "$350", stock: "Stock: 3", icon: "⚙️" },
  { name: "50-Gallon Water Heater", price: "$800", stock: "Stock: 45 rolls", icon: "🏠" },
  { name: "Duct Tape", price: "$6/1", stock: "Stock: 6/6", icon: "📦" },
];

export default function InventoryPage() {
  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-bold text-slate-800">Inventory</h1>

      <button
        className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-white font-semibold"
        style={{ backgroundColor: "#1B3A6B" }}>
        <span className="text-lg">+</span> New Item
      </button>

      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input className="flex-1 text-sm outline-none bg-transparent" placeholder="Search items" />
        </div>
        <button className="bg-white rounded-xl p-2 shadow-sm text-gray-400">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M3 6h18M7 12h10M11 18h2" />
          </svg>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
        {DEMO_ITEMS.map((item) => (
          <div key={item.name} className="flex items-center gap-3 px-4 py-3">
            <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl shrink-0">
              {item.icon}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-800 text-sm">{item.name}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-[#1B3A6B] text-sm">{item.price}</p>
              <p className="text-xs text-gray-400">{item.stock}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
