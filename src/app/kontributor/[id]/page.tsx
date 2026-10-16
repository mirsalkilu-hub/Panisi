import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Home } from "../../page";

type ContributorPageProps = {
  params: Promise<{ id: string }>;
};

async function getContributor(id: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Konfigurasi Supabase belum tersedia.");
  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("contributor_public_profiles")
    .select("id, full_name, job_title, area_of_expertise, profile_photo_path")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Profil kontributor tidak dapat dimuat: ${error.message}`);
  return data;
}

async function getPublicSiteBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL;
  if (configuredUrl) return new URL(/^https?:\/\//i.test(configuredUrl) ? configuredUrl : `https://${configuredUrl}`);
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host")?.split(",")[0].trim()
    ?? requestHeaders.get("host")
    ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0].trim()
    ?? (host.startsWith("localhost") ? "http" : "https");
  return new URL(`${protocol}://${host}`);
}

export async function generateMetadata({ params }: ContributorPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return { title: "Kontributor tidak ditemukan | PINISI" };
  }
  const contributor = await getContributor(id);
  if (!contributor) return { title: "Kontributor tidak ditemukan | PINISI" };

  const baseUrl = await getPublicSiteBaseUrl();
  const canonicalUrl = new URL(`/kontributor/${encodeURIComponent(id)}`, baseUrl);
  const imageUrl = contributor.profile_photo_path
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      .storage.from("profile-photos").getPublicUrl(contributor.profile_photo_path).data.publicUrl
    : new URL("/panisi-logo.svg", baseUrl).toString();
  const description = [contributor.job_title, contributor.area_of_expertise].filter(Boolean).join(" · ")
    || "Lihat profil dan karya kontributor PINISI.";

  return {
    title: `${contributor.full_name} | Kontributor PINISI`,
    description,
    metadataBase: baseUrl,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "profile",
      siteName: "PINISI",
      title: contributor.full_name,
      description,
      url: canonicalUrl,
      images: [{ url: imageUrl, alt: `Foto profil ${contributor.full_name}` }],
    },
    twitter: {
      card: "summary",
      title: contributor.full_name,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ContributorPage({ params }: ContributorPageProps) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }
  return <Home activePage="widyaiswara" selectedContributorId={id} />;
}
