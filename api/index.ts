/**
 * Vercel'in TEK sunucusuz fonksiyonu.
 * Tüm /api/* istekleri vercel.json'daki rewrite ile buraya gelir ve
 * server/ altındaki Hono + tRPC uygulamasına devredilir.
 * (Backend kodu server/ altında; api/ altına başka dosya EKLEMEYİN —
 *  Vercel her dosyayı ayrı fonksiyon sayar.)
 */
import { handle } from "@hono/node-server/vercel";
import app from "../server/app.js";

export default handle(app);
