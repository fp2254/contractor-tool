import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

export const dynamic = "force-dynamic";

const BUCKET = "tradebase-photos";
const MAX_BYTES = 20 * 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/gif": "gif",
};

const ENTITY_TABLES = {
  customer: "customers",
  lead: "leads",
  job: "jobs",
  quote: "quotes",
  invoice: "invoices",
} as const;

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const entityType = form.get("entity_type");
  const entityId = form.get("entity_id");

  if (
    !(file instanceof File) ||
    typeof entityType !== "string" ||
    typeof entityId !== "string"
  ) {
    return NextResponse.json({ error: "Missing file, entity_type, or entity_id" }, { status: 400 });
  }

  const entityTable = ENTITY_TABLES[entityType as keyof typeof ENTITY_TABLES];
  if (!entityTable || !UUID_PATTERN.test(entityId)) {
    return NextResponse.json({ error: "Invalid photo destination" }, { status: 400 });
  }

  const extension = IMAGE_EXTENSIONS[file.type];
  if (!extension) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP, HEIC, HEIF, or GIF images are allowed" }, { status: 400 });
  }

  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File must be between 1 byte and 20 MB" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: entity, error: entityError } = await (admin as any)
    .from(entityTable)
    .select("id")
    .eq("id", entityId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (entityError) {
    console.error("[photos/upload] entity lookup error:", entityError.message);
    return NextResponse.json({ error: "Failed to validate photo destination" }, { status: 500 });
  }

  if (!entity) {
    return NextResponse.json({ error: "Photo destination not found" }, { status: 404 });
  }

  // This bucket intentionally remains public so portal recipients can see document photos.
  await admin.storage.createBucket(BUCKET, { public: true }).catch(() => {});
  await admin.storage.updateBucket(BUCKET, { public: true }).catch(() => {});

  const filename = `${crypto.randomUUID()}.${extension}`;
  const storagePath = `${orgId}/${entityType}/${entityId}/${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (uploadErr) {
    console.error("[photos/upload] storage error:", uploadErr.message);
    return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
  }

  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(storagePath);

  const { data: photo, error: dbErr } = await admin
    .from("photos")
    .insert({
      org_id: orgId,
      entity_type: entityType,
      entity_id: entityId,
      storage_path: storagePath,
      url: publicUrl,
      filename: file.name.slice(0, 255),
    })
    .select("id,url,filename,created_at")
    .single();

  if (dbErr || !photo) {
    await admin.storage.from(BUCKET).remove([storagePath]);
    console.error("[photos/upload] database error:", dbErr?.message ?? "No photo returned");
    return NextResponse.json({ error: "Failed to save photo" }, { status: 500 });
  }

  return NextResponse.json(photo);
}
