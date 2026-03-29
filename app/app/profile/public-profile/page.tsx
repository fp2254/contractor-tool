import Link from "next/link";
import { PublicProfileEditor } from "./PublicProfileEditor";

export default function PublicProfilePage() {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/app/profile" className="text-gray-400">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Public Profile</h1>
          <p className="text-xs text-gray-400">Your public-facing contractor page</p>
        </div>
      </div>

      <PublicProfileEditor />
    </div>
  );
}
