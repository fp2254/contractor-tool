import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "tradebase-photos";

export type PdfPhoto = {
  url: string;
  storage_path?: string | null;
  filename: string | null;
};

function detectMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "image/webp";
  return null;
}

export async function loadPhotosForPdf(
  photos: PdfPhoto[],
  admin: SupabaseClient
): Promise<PdfPhoto[]> {
  const results = await Promise.all(
    photos.map(async (p, idx) => {
      try {
        let buf: Buffer;
        let mime: string | null;

        if (p.storage_path) {
          console.log(`[pdf-photos] downloading via storage: ${p.storage_path}`);
          const { data, error } = await admin.storage.from(BUCKET).download(p.storage_path);
          if (error || !data) {
            console.warn(`[pdf-photos] storage download failed for photo ${idx}: ${error?.message}`);
            return null;
          }
          buf = Buffer.from(await data.arrayBuffer());
          mime = detectMime(buf);
          console.log(`[pdf-photos] photo ${idx} — size: ${buf.length} bytes, detected mime: ${mime ?? "unknown"}, blob type: ${data.type}`);
        } else {
          console.log(`[pdf-photos] fetching via URL: ${p.url}`);
          const res = await fetch(p.url, { cache: "no-store" });
          if (!res.ok) {
            console.warn(`[pdf-photos] fetch ${res.status} for photo ${idx}: ${p.url}`);
            return null;
          }
          buf = Buffer.from(await res.arrayBuffer());
          mime = detectMime(buf);
          console.log(`[pdf-photos] photo ${idx} — size: ${buf.length} bytes, detected mime: ${mime ?? "unknown"}`);
        }

        if (mime !== "image/jpeg" && mime !== "image/png") {
          console.warn(`[pdf-photos] skipping photo ${idx} — unsupported format: ${mime ?? "unknown"} (${p.filename ?? "no filename"})`);
          return null;
        }

        const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
        console.log(`[pdf-photos] photo ${idx} OK — ${mime}, ${buf.length} bytes → data URL`);
        return { url: dataUrl, filename: p.filename, storage_path: null };
      } catch (err) {
        console.warn(`[pdf-photos] exception loading photo ${idx}:`, err);
        return null;
      }
    })
  );

  const loaded = results.filter((r): r is PdfPhoto => r !== null);
  console.log(`[pdf-photos] loaded ${loaded.length} of ${photos.length} photos for PDF`);
  return loaded;
}
