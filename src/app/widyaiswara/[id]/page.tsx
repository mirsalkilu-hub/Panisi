import { notFound } from "next/navigation";
import { Home } from "../../page";

type ContributorPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ContributorPage({ params }: ContributorPageProps) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }
  return <Home activePage="widyaiswara" selectedContributorId={id} />;
}
