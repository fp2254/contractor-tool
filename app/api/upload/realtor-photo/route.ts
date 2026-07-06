import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file || !file.size) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const allowedExts = ["jpg", "jpeg", "png", "webp", "gif"];
  if (!allowedExts.includes(ext)) {
    return NextResponse.json({ error: "Only image files are allowed (JPG, PNG, WEBP, GIF)" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const path = `${user.id}/profile.${ext}`;

  await admin.storage.createBucket("profile-photos", { public: true }).catch(() => {});

  const { error: uploadError } = await admin.storage
    .from("profile-photos")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    console.error("[realtor-photo-upload] storage error:", uploadError.message);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("profile-photos").getPublicUrl(path);

  return NextResponse.json({ url: `${publicUrl}?v=${Date.now()}` });
}
