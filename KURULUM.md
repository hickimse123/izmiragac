# Türkiye Ağaç Atlası — Kurulum ve Yayınlama Rehberi

Yığın: **Vercel** (site + API) · **TiDB Cloud Starter** (MySQL) · **Vercel Blob** (fotoğraflar) · **Google Gemini** (tür tanıma)

## 0. Önkoşullar
- Node.js 20 veya üstü (`node -v`)
- GitHub hesabı, Vercel hesabı (Hobby), TiDB Cloud hesabı, Google hesabı
- Not: Vercel Hobby planı **ticari olmayan** kullanım içindir.

## 1. Projeyi yerelde hazırla
```bash
unzip Turkiye_Agac_Atlasi_Vercel.zip && cd agac-atlasi
npm install          # .npmrc içindeki legacy-peer-deps=true otomatik uygulanır
cp .env.example .env
```
`APP_SECRET` için rastgele bir değer üret ve `.env` içine yaz:
```bash
openssl rand -base64 48
```

## 2. Veritabanı — TiDB Cloud Starter
1. https://tidbcloud.com → kayıt ol → **Create Resource / Create Cluster** → **Starter** (ücretsiz) → bölge seç (Frankfurt/eu-central-1 Türkiye'ye yakındır) → Create.
2. Oluşunca adına tıkla → sağ üstte **Connect**. Bağlantı türü **Public**.
3. **Generate Password** ile şifre oluştur (şifre belirlemeden bağlanılamaz).
4. Ekrandaki bilgilerden `DATABASE_URL` oluştur:
   ```
   mysql://<PREFIX>.root:<ŞİFRE>@<HOST>:4000/<VERİTABANI>
   ```
   - Kullanıcı adı `xxxxxxxx.root` biçimindedir (nokta öncesi dahil, tamamı kullanıcı adıdır).
   - Veritabanı adı: varsayılan `test` kalabilir veya Chat2Query/SQL Editor'den `CREATE DATABASE agac;` ile yenisini aç.
   - Şifrede `@ : / # ? %` gibi karakterler varsa URL-encode et (`@` → `%40`).
5. `.env` içindeki `DATABASE_URL` satırına yapıştır, sonra tabloları oluştur:
   ```bash
   npm run db:push
   npm run db:seed:species   # ZORUNLU: tür kataloğunu (164 tür) veritabanına yükler
   npm run db:seed           # opsiyonel: örnek gözlemler ve forum konuları (önce türler yüklenmeli)
   ```
   Bağlantı TLS ile otomatik kurulur (kodda ayarlı).

## 3. Tür tanıma — Google Gemini
1. https://aistudio.google.com/apikey → **Create API key** (kredi kartı gerekmez).
2. `.env` → `GOOGLE_GENERATIVE_AI_API_KEY=...`
3. Model adı `GEMINI_MODEL` ile ayarlanır (varsayılan `gemini-3.5-flash`). Google modelleri sık değiştirir; güncel ve ücretsiz katmanda olan adı https://ai.google.dev/gemini-api/docs/models adresinden kontrol et. 404 "model bulunamadı" hatası alırsan burayı güncelle.
4. Ücretsiz katman hız sınırlıdır; sınır dolunca uygulama "kota dolu" mesajı gösterir.

## 4. Yerelde dene (opsiyonel ama önerilir)
```bash
npm run dev          # http://localhost:3000 — ön yüz + API birlikte çalışır
```
Fotoğraf yükleme için `BLOB_READ_WRITE_TOKEN` gerekir; Bölüm 6'dan sonra `vercel env pull .env` ile çekebilirsin.

## 5. GitHub'a yükle
```bash
git init && git add . && git commit -m "ilk sürüm"
git branch -M main
git remote add origin https://github.com/<kullanici>/agac-atlasi.git
git push -u origin main
```
(`.env` `.gitignore` içinde, GitHub'a gitmez.)

## 6. Vercel'e yayınla
1. https://vercel.com/new → GitHub reposunu seç → **Import**.
2. Framework **Vite** olarak algılanır; `vercel.json` build/çıktı ayarlarını zaten içerir. Değiştirme.
3. **Environment Variables** bölümüne ekle:
   | Ad | Değer |
   |---|---|
   | `APP_SECRET` | Bölüm 1'deki rastgele metin |
   | `DATABASE_URL` | Bölüm 2'deki bağlantı adresi |
   | `GOOGLE_GENERATIVE_AI_API_KEY` | Bölüm 3'teki anahtar |
   | `GEMINI_MODEL` | `gemini-3.5-flash` (veya güncel ad) |
   | `ADMIN_EMAIL` | Admin olacak e-posta (opsiyonel) |
4. **Deploy**'a bas. İlk derleme ~1-2 dk.
5. **Blob depolama:** proje sayfasında **Storage → Create → Blob** → erişim türü sorulursa **Public** seç → projeye bağla. `BLOB_READ_WRITE_TOKEN` otomatik eklenir. **Ardından Deployments → son dağıtım → Redeploy** yap (yeni değişken ancak yeni dağıtımda geçerli olur).

## 7. Doğrulama listesi
- `https://<proje>.vercel.app/api/trpc/ping` → `{"result":{"data":{"json":{"ok":true,...}}}}` dönmeli.
- Kayıt ol / giriş yap.
- Gözlem ekle (fotoğraflı) → haritada görünmeli.
- Profilden avatar/banner yükle.
- "Tür Tanıma" sayfasında bir ağaç fotoğrafı dene.

## 8. Admin yetkisi
- `ADMIN_EMAIL` ayarlıysa o e-postayla **kayıt olan** hesap admin olur (hesap önceden varsa çalışmaz).
- Mevcut hesabı yükseltmek için TiDB → SQL Editor:
  ```sql
  UPDATE users SET role = 'admin' WHERE email = 'ben@ornek.com';
  ```

## 9. Sorun giderme
| Belirti | Neden / çözüm |
|---|---|
| `/api/...` 500 döner, log'da "Eksik ortam değişkeni" | Vercel → Settings → Environment Variables eksik; ekle ve Redeploy. |
| `Access denied for user` | Kullanıcı adında `xxxx.root` önekini unuttun, ya da şifredeki özel karakterler URL-encode edilmedi. |
| `ER_NOT_SUPPORTED_AUTH_MODE` / TLS hatası | `DATABASE_URL` sonuna `?ssl=false` ekleme (TiDB TLS ister). Host/port'u kontrol et. |
| Fotoğraf yükleme 500 / `No token found` | Blob store projeye bağlı değil veya bağladıktan sonra Redeploy yapılmadı. |
| Fotoğraf yükleme 413 | İstek 4,5 MB Vercel sınırını aştı. İstemci fotoğrafı küçültür; yine de olursa daha küçük dosya dene. |
| Tür tanıma "kota dolu" (429) | Gemini ücretsiz limit; birkaç dakika bekle ya da `GEMINI_MODEL=gemini-3.1-flash-lite` dene. |
| Tür tanıma "model bulunamadı" (404) | Model adı kapanmış; Bölüm 3-3'e bak. |
| Sayfa yenilenince 404 | `vercel.json` rewrites bozulmuş olabilir; dosyayı orijinal haline getir. |
| Giriş yaptıktan sonra oturum düşüyor | Tarayıcı çerezlerini engelliyor olabilir; site HTTPS üzerinden açılmalı (Vercel'de zaten öyle). |
| Fonksiyon "Cannot find module '../server/...'" | Vercel'de `api/` altına başka dosya ekleme; backend kodu `server/` altında kalmalı ve importlar `.js` uzantılı yazılmalı. |

## 10. Mimari özeti
```
api/index.ts        → Vercel'in TEK fonksiyonu (ince sarmalayıcı)
server/             → Hono + tRPC backend (router'lar, auth, storage, veritabanı)
  lib/storage.ts    → Vercel Blob
  identify-router.ts→ Gemini (Vercel AI SDK)
db/                 → Drizzle şeması, seed
src/                → React ön yüz (Vite)
vercel.json         → /api/* → fonksiyon, diğer her şey → SPA
```
Yeni bir dosya `api/` altına eklenirse Vercel onu ayrı fonksiyon sayar; backend'e ait her şeyi `server/` altına koy.


## Tür kataloğu veritabanında

Türler artık kodda değil, `species` tablosunda tutulur (API: `trpc.species.list` / `trpc.species.byId`).
Tablo boşsa harita, kütüphane vb. boş görünür — `npm run db:seed:species` ile doldurun.

**Toplu tür + fotoğraf ekleme:** `data/ornek-turler.json` şablonuna uygun bir JSON hazırlayıp
`npm run species:import -- data/yeni-turler.json` çalıştırın. Kayıt zaten varsa (aynı `id`) güncellenir.
Fotoğraf için `photoUrl` alanına tam URL (https://…) ya da `/species/<id>.jpg` yazın;
fotoğrafı olmayan türler listede otomatik olarak en sona iner.
Otomatik tür çeken bir script yazarken `db/lib-species.ts` içindeki `upsertSpecies()` fonksiyonunu
çağırmanız yeterlidir (doğrulama için `speciesInputSchema` da orada).
Önbellek 60 saniyedir; içe aktarma sonrası yeni türler en geç 1 dakikada görünür.


## Otomatik tür + fotoğraf ekleme (kolay yol)

Ekstra araç gerekmez, her şey Vercel'de çalışır. Kaynaklar: GBIF (tür, Türkçe ad, yayılış), iNaturalist (lisanslı fotoğraf),
Vikipedi (açıklama).

1. **Bir kez:** Vercel → Settings → Environment Variables → `CRON_SECRET` adıyla rastgele uzun bir metin ekle → yeniden deploy.
   Bundan sonra Vercel her gün 03:00'te (UTC) otomatik olarak **8 yeni fotoğraflı tür** ekler (`vercel.json` → `crons`).
2. **İstediğin an hızlandırmak için:** Admin hesabıyla giriş yap → **Panelim** sayfasının üstündeki **"Yeni türleri çek"**
   düğmesine tıkla (her tıklama ~30 sn sürer, 8'e kadar yeni tür ekler; istediğin kadar tıklayabilirsin).
   Admin olmak için `ADMIN_EMAIL` ortam değişkenindeki e-postayla kayıt ol.
3. Veritabanında zaten olan türler atlanır, yani tekrar tekrar çalıştırmak güvenlidir.

Notlar:
- Otomatik gelen türlerde boy, çiçeklenme, yararlar ve akademik veri **boş** gelir; açıklama Vikipedi'den alınır.
  Kategori cinse göre tahmin edilir, gerekirse veritabanında düzeltin.
- Yalnızca CC0 / CC BY / CC BY-SA lisanslı fotoğraflar alınır; fotoğraf sahibi `photoCredit` alanına yazılır.
- Taranan cinsler `server/lib/species-auto.ts` içindeki `TREE_GENERA` dizisindedir.
- Vercel Hobby planında cron günde en fazla 1 kez çalışır.

### İleri düzey: bilgisayardan toplu aktarma (isteğe bağlı)
```bash
npm run species:auto -- --genus Quercus,Acer --limit 10 --dry-run      # deneme, yazmaz
npm run species:auto -- --discover --min-records 30 --limit 200 --require-photo
npm run species:auto -- --names data/latince-liste.txt
npm run species:auto -- --fill-photos                                   # fotoğrafsız türlere fotoğraf bul
npm run species:auto -- --genus Pinus --out data/pinus.json             # DB'ye yazmadan JSON üret
```
(`.env` içinde `DATABASE_URL` gerekir.)
