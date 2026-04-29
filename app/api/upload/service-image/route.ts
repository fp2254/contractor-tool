import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const index = (formData.get("index") as string) ?? "0";

  if (!file || !file.size) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const allowedExts = ["jpg", "jpeg", "png", "gif", "webp"];
  if (!allowedExts.includes(ext)) {
    return NextResponse.json({ error: "Only image files are allowed (JPG, PNG, GIF, WEBP)" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const path = `${orgId}/service_${index}_${Date.now()}.${ext}`;

  await admin.storage.createBucket("service-images", { public: true }).catch(() => {});

  const { error: uploadError } = await admin.storage
    .from("service-images")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = admin.storage.from("service-images").getPublicUrl(path);

  return NextResponse.json({ url: `${publicUrl}?v=${Date.now()}` });
}
