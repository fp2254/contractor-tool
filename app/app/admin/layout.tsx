import { requirePlatformAdmin } from "@/lib/admin";
import AdminTabBar from "./AdminTabBar";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin();

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-[#1B3A6B] px-4 pt-4 pb-0">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold bg-amber-400 text-slate-900 px-2 py-0.5 rounded-full uppercase tracking-wide">Platform Admin</span>
        </div>
        <AdminTabBar />
      </div>
      <div className="pb-28">
        {children}
      </div>
    </div>
  );
}
