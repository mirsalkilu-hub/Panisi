import type { Metadata } from "next";
import WorkDetailPage, { generateMetadata as generateWorkMetadata } from "./[slug]/page";

type WorkShortPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: WorkShortPageProps): Promise<Metadata> {
  const { id } = await params;
  return generateWorkMetadata({ params: Promise.resolve({ id }) });
}

export default async function WorkShortPage({ params }: WorkShortPageProps) {
  const { id } = await params;
  return WorkDetailPage({ params: Promise.resolve({ id }) });
}
