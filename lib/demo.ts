import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export function isDemoOrg(org: { is_demo?: boolean | null } | null | undefined): boolean {
  return org?.is_demo === true;
}

export async function getOrgIsDemo(orgId: string): Promise<boolean> {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from("orgs")
    .select("is_demo")
    .eq("id", orgId)
    .single();
  return data?.is_demo === true;
}

export class DemoModeError extends Error {
  readonly isDemoError = true;
  constructor(actionName?: string) {
    super(actionName
      ? `${actionName} is disabled in demo mode.`
      : "This action is disabled in demo mode."
    );
    this.name = "DemoModeError";
  }
}

export function demoBlockedResponse(message?: string): NextResponse {
  return NextResponse.json(
    { error: message ?? "This action is disabled in demo mode." },
    { status: 403 }
  );
}

export async function checkDemoBlock(
  orgId: string,
  message?: string
): Promise<NextResponse | null> {
  const isDemo = await getOrgIsDemo(orgId);
  if (isDemo) return demoBlockedResponse(message);
  return null;
}
