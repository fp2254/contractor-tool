export type PdfPhoto = { url: string; filename: string | null };

function detectMime(buf: Buffer): "image/jpeg" | "image/png" | null {
  if (buf.length < 4) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  )
    return "image/png";
  return null;
}

export async function loadPhotosForPdf(photos: PdfPhoto[]): Promise<PdfPhoto[]> {
  const results = await Promise.all(
    photos.map(async (p) => {
      try {
        const res = await fetch(p.url, { cache: "no-store" });
        if (!res.ok) {
          console.warn(`[pdf-photos] fetch failed ${res.status} for ${p.url}`);
          return null;
        }
        const buf = Buffer.from(await res.arrayBuffer());
        const mime = detectMime(buf);
        if (!mime) {
          console.warn(
            `[pdf-photos] unsupported format (likely HEIC/WebP) skipped: ${p.filename ?? p.url}`
          );
          return null;
        }
        const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
        return { url: dataUrl, filename: p.filename };
      } catch (err) {
        console.warn(`[pdf-photos] error loading ${p.url}:`, err);
        return null;
      }
    })
  );
  return results.filter((r): r is PdfPhoto => r !== null);
}
