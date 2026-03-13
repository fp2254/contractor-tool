import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

async function changePassword(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const password = String(formData.get("password") ?? "").trim();
  const confirm = String(formData.get("confirm") ?? "").trim();
  if (!password || password !== confirm) return;
  await supabase.auth.updateUser({ password });
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Settings</h1>

      {/* ACCOUNT */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Account</p>
        </div>
        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm text-slate-500">Email</span>
          <span className="text-sm font-medium text-slate-700">{user.email}</span>
        </div>
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-medium text-slate-700 mb-3">Change Password</p>
          <form action={changePassword} className="space-y-2">
            <input
              name="password"
              type="password"
              placeholder="New password"
              minLength={6}
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <input
              name="confirm"
              type="password"
              placeholder="Confirm new password"
              minLength={6}
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="submit"
              className="w-full rounded-xl py-2.5 text-sm font-semibold text-white"
              style={{ backgroundColor: "#1B3A6B" }}>
              Update Password
            </button>
          </form>
        </div>
      </div>

      {/* APP */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">App</p>
        </div>
        <Link href="/app/profile"
          className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <span className="text-sm font-medium text-slate-700">Business Profile</span>
          <span className="text-gray-300 text-lg">›</span>
        </Link>
        <Link href="/app/support"
          className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <span className="text-sm font-medium text-slate-700">Support</span>
          <span className="text-gray-300 text-lg">›</span>
        </Link>
        <div className="flex items-center justify-between px-4 py-4">
          <span className="text-sm text-slate-500">Version</span>
          <span className="text-sm text-gray-400">1.0.0</span>
        </div>
      </div>

      {/* LEGAL */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Legal</p>
        </div>
        <Link href="/terms" target="_blank"
          className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <span className="text-sm font-medium text-slate-700">Terms of Service</span>
          <span className="text-gray-300 text-lg">›</span>
        </Link>
        <Link href="/privacy" target="_blank"
          className="flex items-center justify-between px-4 py-4">
          <span className="text-sm font-medium text-slate-700">Privacy Policy</span>
          <span className="text-gray-300 text-lg">›</span>
        </Link>
      </div>
    </div>
  );
}
