export const workCategories = [
  { slug: "video", name: "Video", description: "Video pembelajaran, webinar · Tautan YouTube", icon: "video" },
  { slug: "e-book", name: "E-Book", description: "Buku digital, modul · PDF maks. 2 MB", icon: "book" },
  { slug: "populer", name: "Populer", description: "Artikel populer · PDF maks. 2 MB", icon: "star" },
  { slug: "review", name: "Review", description: "Review buku · PDF maks. 2 MB", icon: "review" },
  { slug: "best-practice", name: "Best Practice", description: "Praktik, inovasi, lesson learned · PDF maks. 2 MB", icon: "practice" },
  { slug: "science", name: "Science", description: "Kajian, KTI, policy brief · PDF maks. 2 MB", icon: "science" },
  { slug: "insight", name: "Insight", description: "Pengetahuan singkat · PDF maks. 2 MB", icon: "insight" },
] as const;

export type WorkCategorySlug = (typeof workCategories)[number]["slug"];
export type ContentType = (typeof workCategories)[number]["name"];
