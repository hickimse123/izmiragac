/**
 * Dosya depolama — Vercel Blob (public).
 *
 * Veritabanında (observations.photoKey, users.avatar, users.banner) artık
 * blob'un TAM URL'si saklanır. Sütun adları değişmedi; böylece şema göçü gerekmez.
 *
 * Gerekli ortam değişkeni: BLOB_READ_WRITE_TOKEN
 * (Vercel → Storage → Blob store'u projeye bağlayınca otomatik eklenir.)
 */
import { put, del } from "@vercel/blob";

const isHttp = (v: string) => /^https?:\/\//i.test(v);
const isBlobUrl = (v: string) => /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(v);

export interface UploadFileInput {
  fileContent: Uint8Array;
  /** Örn. "observations/u12/foto.jpg" — sonuna rastgele ek getirilir */
  fileName: string;
  contentType?: string;
}

export const storage = {
  async uploadFile({ fileContent, fileName, contentType }: UploadFileInput) {
    const blob = await put(fileName, Buffer.from(fileContent), {
      access: "public",
      contentType: contentType ?? "image/jpeg",
      addRandomSuffix: true,
    });
    return { key: blob.url };
  },

  /** Yalnızca bizim Blob deposundaki URL'leri siler; harici (seed vb.) URL'lere dokunmaz. */
  async deleteFile(urlOrKey: string | null | undefined) {
    if (!urlOrKey || !isBlobUrl(urlOrKey)) return;
    try {
      await del(urlOrKey);
    } catch (err) {
      console.warn("[storage] silinemedi:", err);
    }
  },

  /** Saklanan değeri tarayıcıda gösterilebilir URL'ye çevirir (eski Kimi anahtarları → null). */
  resolveUrl(value: string | null | undefined): string | null {
    return value && isHttp(value) ? value : null;
  },
};
