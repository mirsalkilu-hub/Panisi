export const workCategories = [
  { slug: "video", name: "Video", description: "Video pembelajaran, webinar · Tautan YouTube", icon: "video" },
  { slug: "e-book", name: "E-Book", description: "Buku digital, modul · PDF", icon: "book" },
  { slug: "review", name: "Review", description: "Review buku · PDF", icon: "review" },
  { slug: "best-practice", name: "Best Practice", description: "Praktik, inovasi, lesson learned · PDF", icon: "practice" },
  { slug: "science", name: "Science", description: "Kajian, KTI, policy brief · PDF", icon: "science" },
  { slug: "insight", name: "Insight", description: "Pengetahuan singkat · PDF", icon: "insight" },
] as const;

export const legacyWorkCategories = [
  { slug: "populer", name: "Populer", description: "Artikel populer", icon: "star" },
] as const;

export const allWorkCategories = [...workCategories, ...legacyWorkCategories] as const;

export type WorkCategorySlug = (typeof allWorkCategories)[number]["slug"];
export type ContentType = (typeof allWorkCategories)[number]["name"];
