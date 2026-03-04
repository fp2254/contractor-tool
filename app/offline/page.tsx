export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div style={{ backgroundColor: "#1B3A6B" }} className="px-5 py-6">
        <p className="text-white text-xl font-bold">TradeBase</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full space-y-4">
          <div className="text-5xl">📡</div>
          <h1 className="text-xl font-bold text-slate-800">You're offline</h1>
          <p className="text-sm text-gray-500">
            No internet connection found. Pages you've visited recently are still available below.
          </p>
          <p className="text-xs text-gray-400">
            New data will sync automatically when you're back online.
          </p>
          <a
            href="/app"
            className="block w-full rounded-xl py-3 text-white font-semibold text-sm"
            style={{ backgroundColor: "#1B3A6B" }}
          >
            Back to App
          </a>
        </div>
      </div>

      <p className="text-center text-xs text-gray-300 pb-6">TradeBase</p>
    </div>
  );
}
