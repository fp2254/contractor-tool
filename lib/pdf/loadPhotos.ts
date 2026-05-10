import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";

const BUCKET = "tradebase-photos";

export type PdfPhoto = {
  url: string;
  storage_path?: string | null;
  filename: string | null;
};

async function normaliseForPdf(buf: Buffer): Promise<{ data: Buffer; mime: "image/jpeg" | "image/png" } | null> {
  try {
    const img = sharp(buf);
    const meta = await img.metadata();
    const fmt = meta.format;
    if (!fmt || !["jpeg", "jpg", "png", "webp", "heic", "heif", "avif"].includes(fmt)) {
      console.warn(`[pdf-photos] unsupported sharp format: ${fmt}`);
      return null;
    }
    const outBuf = await img
      .rotate()
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: false, mozjpeg: false })
      .toBuffer();
    return { data: outBuf, mime: "image/jpeg" };
  } catch (err) {
    console.warn(`[pdf-photos] sharp normalise failed:`, err);
    return null;
  }
}

export async function loadPhotosForPdf(
  photos: PdfPhoto[],
  admin: SupabaseClient
): Promise<PdfPhoto[]> {
  const results = await Promise.all(
    photos.map(async (p, idx) => {
      try {
        let rawBuf: Buffer;

        if (p.storage_path) {
          console.log(`[pdf-photos] downloading via storage: ${p.storage_path}`);
          const { data, error } = await admin.storage.from(BUCKET).download(p.storage_path);
          if (error || !data) {
            console.warn(`[pdf-photos] storage download failed for photo ${idx}: ${error?.message}`);
            return null;
          }
          rawBuf = Buffer.from(await data.arrayBuffer());
        } else {
          console.log(`[pdf-photos] fetching via URL: ${p.url}`);
          const res = await fetch(p.url, { cache: "no-store" });
          if (!res.ok) {
            console.warn(`[pdf-photos] fetch ${res.status} for photo ${idx}: ${p.url}`);
            return null;
          }
          rawBuf = Buffer.from(await res.arrayBuffer());
        }

        console.log(`[pdf-photos] photo ${idx} raw size: ${rawBuf.length} bytes — normalising via sharp`);
        const normalised = await normaliseForPdf(rawBuf);
        if (!normalised) {
          console.warn(`[pdf-photos] skipping photo ${idx} — normalisation failed`);
          return null;
        }

        const dataUrl = `data:${normalised.mime};base64,${normalised.data.toString("base64")}`;
        console.log(`[pdf-photos] photo ${idx} OK — ${normalised.mime}, ${normalised.data.length} bytes after re-encode`);
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
