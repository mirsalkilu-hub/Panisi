import { notFound } from "next/navigation";
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
  if (!isPageKey(section)) notFound();
  return <Home activePage={section} />;
}
