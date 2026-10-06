/* Örnek topluluk verisi: demo gözlemciler, gözlemler, forum konuları */
import { getDb } from "../server/queries/connection.js";
import { users, observations, posts, comments } from "./schema.js";

async function main() {
  const db = getDb();

  const demoUsers = [
    { unionId: "demo-zeynep", name: "Zeynep Aydın", email: "zeynep@example.org" },
    { unionId: "demo-murat", name: "Murat Kılıç", email: "murat@example.org" },
    { unionId: "demo-elif", name: "Elif Sönmez", email: "elif@example.org" },
  ];
  const ids: number[] = [];
  for (const u of demoUsers) {
    await db
      .insert(users)
      .values(u)
      .onDuplicateKeyUpdate({ set: { name: u.name } });
    const row = await db.query.users.findFirst({
      where: (t, { eq }) => eq(t.unionId, u.unionId),
    });
    ids.push(row!.id);
  }
  const [zeynep, murat, elif] = ids;

  const existingObs = await db.query.observations.findMany({ limit: 1 });
  if (existingObs.length === 0) {
    await db.insert(observations).values([
      { userId: zeynep, speciesId: "zeytin", lat: 38.322, lng: 26.769, district: "Urla", note: "Klazomenai yolunda tahmini 300+ yıllık anıt zeytin. Gövdesi tamamen burgulu, hâlâ meyve veriyor.", likes: 4 },
      { userId: murat, speciesId: "sakiz", lat: 38.319, lng: 26.302, district: "Çeşme", note: "Geleneksel sakız bahçesinde gövde çiziklerinden damla akışı başlamış.", likes: 6 },
      { userId: elif, speciesId: "kizilcam", lat: 38.641, lng: 26.512, district: "Karaburun", note: "Yangın sonrası sahada doğal gençleşme: açılan kozalaklardan binlerce fidan.", likes: 9 },
      { userId: zeynep, speciesId: "erguvan", lat: 38.419, lng: 27.129, district: "Konak", note: "Kordon'da kauliflori çiçeklenme tam hızında; gövde mor çiçeklerle kaplı.", likes: 3 },
      { userId: murat, speciesId: "bozdag-goknari", lat: 38.371, lng: 28.112, district: "Ödemiş", note: "Bozdağ zirve yamacında relikt göknar topluluğu; sis kuşağında sağlıklı görünüyorlar.", likes: 12 },
      { userId: elif, speciesId: "keciboynuzu", lat: 38.181, lng: 26.812, district: "Seferihisar", note: "Teos antik kentindeki anıtsal harnup; taç çapı 15 metreyi buluyor.", likes: 5 },
      { userId: murat, speciesId: "fistikcami", lat: 39.221, lng: 27.101, district: "Bergama", note: "Kozak yaylasında şemsiye taçlı asırlık fıstıkçamları; hasat sezonu yaklaşıyor.", likes: 7 },
      { userId: zeynep, speciesId: "cinar", lat: 39.121, lng: 27.189, district: "Bergama", note: "Bakırçay kıyısında tescilli anıt çınar; gövde çevresi yaklaşık 7 metre.", likes: 8 },
      { userId: elif, speciesId: "sandal", lat: 38.659, lng: 26.529, district: "Karaburun", note: "Sandal ağacının kızıl kabuğu gün batımında olağanüstü görünüyor.", likes: 10 },
    ]);

    await db.insert(posts).values([
      { userId: zeynep, title: "Bozdağ göknarı saha gezisi — Ekim buluşması", content: "Ekim ayının ikinci hafta sonu Bozdağ'da relikt göknar topluluğunu yerinde incelemek için bir saha gezisi düzenliyoruz. Katılmak isteyenler yorum bıraksın; ekipman listesi ve buluşma noktasını buradan paylaşacağım.", category: "etkinlik", views: 34 },
      { userId: murat, title: "Karaburun'daki bu ağaç sandal mı, kocayemiş mi?", content: "Geçen hafta Karaburun sırtlarında kızıl kabuklu bir ağaç fotoğrafladım. Kabuk soyulması sandal ağacına (Arbutus andrachne) benziyor ama yapraklar kalıcı gibi. Tür belirlemede yardımcı olabilecek var mı?", category: "belirleme", views: 58 },
      { userId: elif, title: "Kentsel ısı adasına karşı hangi türleri önerirsiniz?", content: "Bornova'daki mahalle parkımız için gölge ve toz tutma kapasitesi yüksek, kuraklığa dayanıklı tür önerileri derliyorum. Çınar ve ıhlamur dışında literatürde öne çıkan yerli seçenekler neler?", category: "arastirma", views: 41 },
    ]);

    const postRows = await db.query.posts.findMany();
    if (postRows.length >= 3) {
      await db.insert(comments).values([
        { userId: murat, targetType: "post", targetId: postRows[0].id, content: "Katılmak isterim! Fotoğraf ekipmanımı getiririm." },
        { userId: elif, targetType: "post", targetId: postRows[0].id, content: "Harika fikir, takvimime işledim." },
        { userId: zeynep, targetType: "post", targetId: postRows[1].id, content: "Kabuk turuncu-kızıl ve kağıt gibi soyuluyorsa büyük olasılıkla A. andrachne. Kocayemişte (A. unedo) kabuk gri-kahve ve çatlaklı olur; meyve varsa kesin ayrılır." },
        { userId: murat, targetType: "post", targetId: postRows[2].id, content: "Çitlenbik (Celtis australis) kentsel kurakçıl peyzaj için bence en iyi aday; ayrıca servi rüzgâr perdesi olarak eklenebilir." },
      ]);
    }
    console.log("Seed tamamlandı.");
  } else {
    console.log("Gözlemler zaten mevcut, seed atlandı.");
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
