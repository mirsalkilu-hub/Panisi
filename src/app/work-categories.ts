export const workCategories = [
  { slug: "video", name: "Video", description: "Video pembelajaran, webinar, podcast", icon: "video" },
  { slug: "e-book", name: "E-Book", description: "Buku digital dan modul", icon: "book" },
  { slug: "science", name: "Science", description: "Kajian dan penelitian", icon: "science" },
  { slug: "populer", name: "Populer", description: "Karya pilihan yang banyak diminati", icon: "star" },
  { slug: "insight", name: "Insight", description: "Pengetahuan singkat dan praktis", icon: "insight" },
  { slug: "review", name: "Review", description: "Ulasan dan review buku", icon: "review" },
  { slug: "best-practice", name: "Best Practice", description: "Praktik dan lesson learned", icon: "practice" },
] as const;

export type WorkCategorySlug = (typeof workCategories)[number]["slug"];
export type ContentType = (typeof workCategories)[number]["name"];
