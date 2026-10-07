import {
  mysqlTable,
  mysqlEnum,
  bigint,
  varchar,
  text,
  double,
  int,
  timestamp,
  index,
  json,
} from "drizzle-orm/mysql-core";

/**
 * Birincil anahtar: standart "BIGINT UNSIGNED AUTO_INCREMENT".
 * (drizzle'ın serial() çıktısı "SERIAL AUTO_INCREMENT" olur; MariaDB ve bazı
 *  MySQL uyumlu motorlar bunu reddeder. Bu biçim MySQL / TiDB / MariaDB'de çalışır.)
 */
const pk = () =>
  bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey();

export const users = mysqlTable("users", {
  id: pk(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  avatar: text("avatar"),
  bio: text("bio"),
  banner: text("banner"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/* ------------------------------------------------------------------ */
/* Topluluk gözlemleri (vatandaş bilimi katkıları)                     */
/* ------------------------------------------------------------------ */
export const observations = mysqlTable(
  "observations",
  {
    id: pk(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    speciesId: varchar("speciesId", { length: 64 }).notNull(),
    customName: varchar("customName", { length: 255 }),
    lat: double("lat").notNull(),
    lng: double("lng").notNull(),
    district: varchar("district", { length: 120 }),
    note: text("note"),
    photoKey: text("photoKey"),
    status: mysqlEnum("status", ["pending", "verified"])
      .default("pending")
      .notNull(),
    likes: int("likes").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    speciesIdx: index("obs_species_idx").on(t.speciesId),
    userIdx: index("obs_user_idx").on(t.userId),
  }),
);
export type Observation = typeof observations.$inferSelect;
export type InsertObservation = typeof observations.$inferInsert;

/* ------------------------------------------------------------------ */
/* Forum                                                               */
/* ------------------------------------------------------------------ */
export const posts = mysqlTable(
  "posts",
  {
    id: pk(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content").notNull(),
    category: mysqlEnum("category", [
      "genel",
      "belirleme",
      "arastirma",
      "etkinlik",
    ])
      .default("genel")
      .notNull(),
    views: int("views").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({ userIdx: index("post_user_idx").on(t.userId) }),
);
export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

/* Yorumlar: hem forum gönderileri hem gözlemler için */
export const comments = mysqlTable(
  "comments",
  {
    id: pk(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    targetType: mysqlEnum("targetType", ["post", "observation"]).notNull(),
    targetId: bigint("targetId", { mode: "number", unsigned: true }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    targetIdx: index("comment_target_idx").on(t.targetType, t.targetId),
  }),
);
export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

/* Gözlem beğenileri (tekil) */
export const observationLikes = mysqlTable(
  "observation_likes",
  {
    id: pk(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    observationId: bigint("observationId", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    uniqIdx: index("like_uniq_idx").on(t.userId, t.observationId),
  }),
);
export type ObservationLike = typeof observationLikes.$inferSelect;

/* ------------------------------------------------------------------ */
/* Tür kataloğu (artık veritabanında; toplu içe aktarma için hazır)    */
/* ------------------------------------------------------------------ */
export const species = mysqlTable(
  "species",
  {
    /** Doğal anahtar (slug): örn. "kizilcam". observations.speciesId bununla eşleşir. */
    id: varchar("id", { length: 64 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    latin: varchar("latin", { length: 255 }).notNull(),
    family: varchar("family", { length: 255 }).notNull().default(""),
    category: mysqlEnum("category", ["ibreli", "yaprakli", "maki", "meyve"]).notNull(),
    height: varchar("height", { length: 64 }).notNull().default(""),
    bloom: varchar("bloom", { length: 128 }).notNull().default(""),
    tag: varchar("tag", { length: 128 }),
    description: text("description").notNull(),
    /** string[] */
    benefits: json("benefits").$type<string[]>().notNull(),
    /** { district, note, coords: [lat, lng] }[] */
    regions: json("regions")
      .$type<{ district: string; note: string; coords: [number, number] }[]>()
      .notNull(),
    /** Akademik veri (IUCN, habitat, rakım, morfoloji, yayılış, kaynakça) */
    academic: json("academic").$type<{
      iucn: string;
      habitat: string;
      altitude: string;
      morphology: string;
      distribution: string;
      references: string[];
    } | null>(),
    /** /species/<id>.jpg ya da harici fotoğraf URL'si; yoksa NULL (listede sona iner) */
    photoUrl: text("photoUrl"),
    photoCredit: varchar("photoCredit", { length: 255 }),
    /** GBIF tür anahtarı (otomatik aktarmada aynı türü tekrar çekmemek için) */
    gbifKey: int("gbifKey"),
    /** Verinin kaynağı: seed | import | gbif | inaturalist ... */
    source: varchar("source", { length: 32 }).notNull().default("seed"),
    /** Küçük sayı = listede önce. Toplu içe aktarılanlar büyük değer alır. */
    sortOrder: int("sortOrder").notNull().default(100000),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    latinIdx: index("species_latin_idx").on(t.latin),
    categoryIdx: index("species_category_idx").on(t.category),
    gbifIdx: index("species_gbif_idx").on(t.gbifKey),
  }),
);
export type SpeciesRow = typeof species.$inferSelect;
export type InsertSpeciesRow = typeof species.$inferInsert;
