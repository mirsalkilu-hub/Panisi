import { notFound } from "next/navigation";
import { Home } from "../../page";

type ManagementPageProps = {
  params: Promise<{ management: string }>;
};

export default async function ManagementPage({ params }: ManagementPageProps) {
  const { management } = await params;
  if (management === "akun") return <Home activePage="admin-akun" />;
  if (management === "postingan") return <Home activePage="admin-postingan" />;
  notFound();
}
