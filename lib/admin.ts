import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export function isPlatformAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const emails = [
    process.env.PLATFORM_ADMIN_EMAILS ?? "",
    process.env.ADMIN_EMAIL ?? "",
  ]
    .join(",")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return emails.includes(email.toLowerCase());
}

export async function requirePlatformAdmin(): Promise<{ id: string; email: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isPlatformAdmin(user.email)) {
    redirect("/app");
  }
  return { id: user.id, email: user.email! };
}
