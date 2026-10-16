import { notFound, redirect } from "next/navigation";
import { Home, type PageKey } from "../page";

const pageKeys: PageKey[] = [
  "koleksi",
  "widyaiswara",
  "ajukan",
  "ruang-kerja",
];

function isPageKey(section: string): section is PageKey {
  return pageKeys.some((pageKey) => pageKey === section);
}

type SectionPageProps = {
  params: Promise<{ section: string }>;
};

export default async function SectionPage({ params }: SectionPageProps) {
  const { section } = await params;
  if (section === "widyaiswara") redirect("/kontributor");
  if (section === "ruang-kerja") redirect("/profil");
  if (section === "kontributor") return <Home activePage="widyaiswara" />;
  if (section === "profil") return <Home activePage="ruang-kerja" />;
  if (!isPageKey(section)) notFound();
  return <Home activePage={section} />;
}
