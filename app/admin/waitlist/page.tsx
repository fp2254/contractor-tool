import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import WaitlistAdminClient from "./WaitlistAdminClient";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminWaitlistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: entries } = await (admin as any)
    .from("waitlist")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Waitlist</h1>
            <p className="text-sm text-gray-500 mt-0.5">{entries?.length ?? 0} signups</p>
          </div>
        </div>
        <WaitlistAdminClient entries={entries ?? []} />
      </div>
    </div>
  );
}
