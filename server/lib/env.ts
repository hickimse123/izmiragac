import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Eksik ortam değişkeni: ${name} (Vercel → Settings → Environment Variables)`);
  }
  return value ?? "";
}

export const env = {
  isProduction: process.env.NODE_ENV === "production",
  /** Oturum JWT'sini imzalamak için gizli anahtar (en az 32 karakter) */
  appSecret: required("APP_SECRET"),
  /** mysql://kullanici:sifre@host:4000/veritabani */
  databaseUrl: required("DATABASE_URL"),
  /** Bu e-posta ile kayıt olan kullanıcı otomatik "admin" olur (opsiyonel) */
  adminEmail: (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase(),
  /** Google AI Studio anahtarı — tür tanıma için (opsiyonel; yoksa özellik kapalı kalır) */
  geminiApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-3.5-flash",
};
