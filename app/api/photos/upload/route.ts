import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

export const dynamic = "force-dynamic";

const BUCKET = "tradebase-photos";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/gif"];
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const entityType = form.get("entity_type") as string | null;
  const entityId = form.get("entity_id") as string | null;

  if (!file || !entityType || !entityId) {
    return NextResponse.json({ error: "Missing file, entity_type, or entity_id" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
  }

  // Ensure bucket exists and is public (both calls are idempotent)
  await admin.storage.createBucket(BUCKET, { public: true }).catch(() => {});
  await admin.storage.updateBucket(BUCKET, { public: true }).catch(() => {});

  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${Date.now()}.${ext}`;
  const path = `${orgId}/${entityType}/${entityId}/${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path);

  const { data: photo, error: dbErr } = await admin
    .from("photos")
    .insert({
      org_id: orgId!,
      entity_type: entityType,
      entity_id: entityId,
      storage_path: path,
      url: publicUrl,
      filename: file.name,
    })
    .select("id,url,filename,created_at")
    .single();

  if (dbErr || !photo) {
    await admin.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: dbErr?.message ?? "DB insert failed" }, { status: 500 });
  }

  return NextResponse.json(photo);
}
