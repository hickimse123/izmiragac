# İzmir Ağaç Atlası

İzmir'in ağaç türlerini harita üzerinde keşfetme, gözlem paylaşma ve yapay zekâ ile tür tanıma uygulaması.

**Yığın:** React + Vite · Hono + tRPC · Drizzle ORM · TiDB Cloud (MySQL) · Vercel Blob · Google Gemini · Vercel

Kurulum ve yayınlama adımları için **[KURULUM.md](./KURULUM.md)** dosyasına bak.

## Hızlı başlangıç
```bash
npm install
cp .env.example .env     # değerleri doldur
npm run db:push          # tabloları oluştur
npm run dev              # http://localhost:3000
```

## Komutlar
| Komut | Açıklama |
|---|---|
| `npm run dev` | Ön yüz + API (yerel) |
| `npm run build` | Üretim derlemesi (`dist/`) |
| `npm run check` | TypeScript tip kontrolü |
| `npm run db:push` | Şemayı veritabanına uygula |
| `npm run db:seed` | Örnek veri ekle |
