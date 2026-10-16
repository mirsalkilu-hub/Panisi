import { notFound, redirect } from "next/navigation";

type ManagementPageProps = {
  params: Promise<{ management: string }>;
};

export default async function ManagementPage({ params }: ManagementPageProps) {
  const { management } = await params;
  if (management === "akun" || management === "postingan") redirect(`/ruang-kerja/${management}`);
  notFound();
}
