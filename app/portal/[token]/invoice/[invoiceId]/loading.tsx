export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-10 w-10 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: "#1B3A6B33", borderTopColor: "#1B3A6B" }}
        />
        <p className="text-sm text-gray-500">Loading invoice…</p>
      </div>
    </div>
  );
}
