import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const admin = createAdminClient();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file || !file.size) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const allowedExts = ["jpg", "jpeg", "png", "webp", "gif", "heic"];
  if (!allowedExts.includes(ext)) {
    return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  await admin.storage.createBucket("support-uploads", { public: true }).catch(() => {});

  const { error: uploadError } = await admin.storage
    .from("support-uploads")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("[support-upload] error:", uploadError.message);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = admin.storage.from("support-uploads").getPublicUrl(path);
  return NextResponse.json({ url: publicUrl });
}
