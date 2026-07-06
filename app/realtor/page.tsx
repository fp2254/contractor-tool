import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Circle, Building2, Users, Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getRealtorProfileByUserId, computeProfileCompletion } from "@/lib/realtor";

export default async function RealtorDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/realtor");

  const profile = await getRealtorProfileByUserId(user.id);
  if (!profile) redirect("/realtor/settings");

  const completion = computeProfileCompletion(profile);

  const checklist = [
    { label: "Add your name and agency", done: !!(profile.display_name && profile.agency_name) },
    { label: "Add a phone number", done: !!profile.phone },
    { label: "Write a short bio", done: !!profile.bio },
    { label: "Upload a profile photo", done: !!profile.avatar_url },
    { label: "Publish your public profile", done: profile.is_published },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Welcome, {profile.display_name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          This is your realtor dashboard — manage your public profile and, soon, connect with contractors.
        </p>
      </div>

      {completion < 100 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-800">Complete your profile</h2>
            <span className="text-xs font-bold text-blue-600">{completion}%</span>
          </div>
          <div className="h-2 bg-blue-50 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${completion}%` }} />
          </div>
          <ul className="space-y-2">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-sm">
                {item.done ? (
                  <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                ) : (
                  <Circle size={16} className="text-gray-300 shrink-0" />
                )}
                <span className={item.done ? "text-gray-500 line-through" : "text-gray-700"}>{item.label}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/realtor/settings"
            className="mt-4 inline-block rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: "#1B3A6B" }}
          >
            Edit Profile
          </Link>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 opacity-60">
          <Building2 size={20} className="text-gray-400 mb-2" />
          <p className="text-sm font-bold text-slate-800">Contractor Directory</p>
          <p className="text-xs text-gray-400 mt-1">Coming soon</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 opacity-60">
          <Users size={20} className="text-gray-400 mb-2" />
          <p className="text-sm font-bold text-slate-800">My Contacts</p>
          <p className="text-xs text-gray-400 mt-1">Coming soon</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 opacity-60">
          <Inbox size={20} className="text-gray-400 mb-2" />
          <p className="text-sm font-bold text-slate-800">Work Requests</p>
          <p className="text-xs text-gray-400 mt-1">Coming soon</p>
        </div>
      </div>

      {profile.is_published && profile.slug && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm font-bold text-slate-800 mb-1">Your public profile is live</p>
          <a
            href={`/agent/${profile.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm underline"
            style={{ color: "#1B3A6B" }}
          >
            tradebase.app/agent/{profile.slug} ↗
          </a>
        </div>
      )}
    </div>
  );
}
