import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { generateObject, APICallError } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createRouter, authedQuery } from "./middleware.js";
import { getAllSpecies } from "./lib/species-store.js";
import { env } from "./lib/env.js";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // istemci ~1024px JPEG gönderir (Vercel gövde sınırı: 4,5 MB)

const resultSchema = z.object({
  matchedId: z
    .string()
    .nullable()
    .describe("Katalogdaki en olası türün id'si; eşleşme yoksa null"),
  name: z.string().describe("Tanımlanan ağacın Türkçe adı"),
  latin: z.string().describe("Bilimsel adı"),
  confidence: z.number().min(0).max(1),
  alternatives: z
    .array(
      z.object({
        matchedId: z.string().nullable(),
        name: z.string(),
        latin: z.string(),
      }),
    )
    .max(3)
    .describe("Diğer olası türler (en fazla 3)"),
  note: z.string().describe("Tek cümlelik ayırt edici ipucu"),
});


const google = createGoogleGenerativeAI({ apiKey: env.geminiApiKey });

/** Gemini / AI SDK hatasını kullanıcıya gösterilecek tRPC hatasına çevirir. */
function toTrpcError(err: unknown): TRPCError {
  if (err instanceof APICallError) {
    const status = err.statusCode ?? 0;
    const text = `${err.message} ${typeof err.responseBody === "string" ? err.responseBody : ""}`.toLowerCase();
    if (status === 429 || text.includes("quota") || text.includes("resource_exhausted")) {
      return new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Ücretsiz AI kotası şu an dolu. Biraz bekleyip tekrar deneyin.",
      });
    }
    if (status === 401 || status === 403 || text.includes("api key")) {
      return new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "AI servisi yapılandırılmamış (API anahtarı geçersiz).",
      });
    }
    if (status === 404) {
      return new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "AI modeli bulunamadı. GEMINI_MODEL ayarını kontrol edin.",
      });
    }
    if (status === 400 && (text.includes("safety") || text.includes("blocked"))) {
      return new TRPCError({
        code: "BAD_REQUEST",
        message: "Fotoğraf işlenemedi, lütfen başka bir kare deneyin.",
      });
    }
    if (status === 408 || status >= 500) {
      return new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "AI servisi geçici olarak yoğun, birazdan tekrar deneyin.",
      });
    }
  }
  console.error("[identify] beklenmeyen hata:", err);
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Tür tanıma başarısız oldu.",
  });
}

export const identifyRouter = createRouter({
  tree: authedQuery
    .input(
      z.object({
        imageBase64: z.string().max(Math.ceil((MAX_IMAGE_BYTES * 4) / 3)),
      }),
    )
    .mutation(async ({ input }) => {
      if (!env.geminiApiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "AI servisi yapılandırılmamış (GOOGLE_GENERATIVE_AI_API_KEY eksik).",
        });
      }

      const bytes = Uint8Array.from(Buffer.from(input.imageBase64, "base64"));
      if (bytes.length > MAX_IMAGE_BYTES) {
        throw new TRPCError({
          code: "PAYLOAD_TOO_LARGE",
          message: "Fotoğraf çok büyük.",
        });
      }

      const ALL_SPECIES = await getAllSpecies();
      const catalogue = ALL_SPECIES.map(
        (s) => `${s.id} | ${s.name} | ${s.latin}`,
      ).join("\n");

      try {
        const { object } = await generateObject({
          model: google(env.geminiModel),
          schema: resultSchema,
          maxRetries: 1,
          abortSignal: AbortSignal.timeout(45_000),
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text:
                    "Bu fotoğraftaki ağacın türünü tanımla. Aşağıda Türkiye ağaç atlası kataloğu var (id | Türkçe ad | bilimsel ad). " +
                    "Önce katalogdan bir eşleşme ara; makul bir eşleşme varsa matchedId olarak o id'yi ver. " +
                    "Katalogda yoksa matchedId null olsun ama yine de en doğru Türkçe ve bilimsel adı yaz. " +
                    "alternatives listesine en fazla 3 olası tür ekle (katalogdan ise matchedId ile). " +
                    "confidence 0-1 arası olsun; fotoğraf ağaç değilse confidence 0.1 altında olsun. Türkçe yanıt ver.\n\nKATALOG:\n" +
                    catalogue,
                },
                { type: "image", image: bytes, mediaType: "image/jpeg" },
              ],
            },
          ],
        });

        const matched = object.matchedId
          ? ALL_SPECIES.find((s) => s.id === object.matchedId)
          : undefined;
        return {
          speciesId: matched?.id ?? null,
          name: matched?.name ?? object.name,
          latin: matched?.latin ?? object.latin,
          confidence: Math.max(0, Math.min(1, object.confidence)),
          note: object.note,
          alternatives: object.alternatives.map((a) => {
            const m = a.matchedId
              ? ALL_SPECIES.find((s) => s.id === a.matchedId)
              : undefined;
            return {
              speciesId: m?.id ?? null,
              name: m?.name ?? a.name,
              latin: m?.latin ?? a.latin,
            };
          }),
        };
      } catch (err) {
        throw toTrpcError(err);
      }
    }),
});
