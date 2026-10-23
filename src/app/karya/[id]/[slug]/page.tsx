import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { allWorkCategories, type WorkCategorySlug } from "../../../work-categories";
import { workHref, workShareHref, workSlug } from "../../../work-links";
import { PdfBookReader } from "../../../pdf-book-reader";
import { WorkShareActions } from "../../../work-share-actions";
import { WorkDetailHeader } from "../../../work-detail-header";
import { CategoryIcon } from "../../../category-icon";
import { WorkImpactPanel } from "../../../work-impact-panel";

type WorkRecord = {
  id: string;
  title: string;
  description: string;
  content_type: "video" | "ebook";
  category_slug: WorkCategorySlug;
  youtube_url: string | null;
  thumbnail_path: string | null;
  created_at: string;
  full_name: string;
  profile_id: string;
  profile_photo_path: string | null;
};

type WorkRow = Omit<WorkRecord, "profile_photo_path">;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Konfigurasi Supabase belum tersedia.");
  return createClient(url, key);
}

async function getWork(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return null;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("verified_submissions")
    .select("id, title, description, content_type, category_slug, youtube_url, thumbnail_path, created_at, full_name, profile_id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Karya tidak dapat dimuat: ${error.message}`);
  if (!data) return null;
  const { data: contributor, error: contributorError } = await supabase
    .from("contributor_public_profiles")
    .select("profile_photo_path")
    .eq("id", data.profile_id)
    .maybeSingle();
  if (contributorError) throw new Error(`Foto profil kontributor tidak dapat dimuat: ${contributorError.message}`);
  return { ...data, profile_photo_path: contributor?.profile_photo_path ?? null } as WorkRecord;
}

async function getWorkByTitle(title: string) {
  if (!title || title.length > 500) return null;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("verified_submissions")
    .select("id, title, description, content_type, category_slug, youtube_url, thumbnail_path, created_at, full_name, profile_id")
    .eq("title", title)
    .limit(2);
  if (error) throw new Error(`Karya tidak dapat dimuat: ${error.message}`);
  if (data?.length !== 1) return null;
  const work = data[0] as WorkRow;
  const { data: contributor, error: contributorError } = await supabase
    .from("contributor_public_profiles")
    .select("profile_photo_path")
    .eq("id", work.profile_id)
    .maybeSingle();
  if (contributorError) throw new Error(`Foto profil kontributor tidak dapat dimuat: ${contributorError.message}`);
  return { ...work, profile_photo_path: contributor?.profile_photo_path ?? null } as WorkRecord;
}

async function getWorkFromRouteSegment(segment: string) {
  const exactTitleMatch = await getWorkByTitle(segment);
  if (exactTitleMatch) return exactTitleMatch;
  try {
    const decodedSegment = decodeURIComponent(segment);
    return decodedSegment === segment ? null : getWorkByTitle(decodedSegment);
  } catch {
    return null;
  }
}

async function getWorkBySlugs(contributorSlug: string, titleSlug: string) {
  if (!/^[a-z0-9-]+$/.test(contributorSlug) || !/^[a-z0-9-]+$/.test(titleSlug)) return null;
  const supabase = getSupabase();
  const { data: contributors, error: contributorsError } = await supabase
    .from("contributor_public_profiles")
    .select("id, full_name");
  if (contributorsError) throw new Error(`Daftar kontributor tidak dapat dimuat: ${contributorsError.message}`);
  const matchingProfiles = (contributors ?? []).filter((profile) => workSlug(profile.full_name) === contributorSlug);
  if (matchingProfiles.length === 0) return null;

  const { data: works, error: worksError } = await supabase
    .from("verified_submissions")
    .select("id, title, description, content_type, category_slug, youtube_url, thumbnail_path, created_at, full_name, profile_id")
    .in("profile_id", matchingProfiles.map((profile) => profile.id));
  if (worksError) throw new Error(`Karya tidak dapat dimuat: ${worksError.message}`);
  const matches = (works ?? []).filter((work) =>
    workSlug(work.full_name) === contributorSlug && workSlug(work.title) === titleSlug);
  if (matches.length !== 1) return null;

  const work = matches[0] as WorkRow;
  const { data: contributor, error: contributorError } = await supabase
    .from("contributor_public_profiles")
    .select("profile_photo_path")
    .eq("id", work.profile_id)
    .maybeSingle();
  if (contributorError) throw new Error(`Foto profil kontributor tidak dapat dimuat: ${contributorError.message}`);
  return { ...work, profile_photo_path: contributor?.profile_photo_path ?? null } as WorkRecord;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string; slug?: string }> }): Promise<Metadata> {
  const { id, slug } = await params;
  const work = await getWork(id) ?? await getWorkFromRouteSegment(id) ?? await getWorkBySlugs(id, slug ?? "");
  if (!work) return { title: "Karya tidak ditemukan | PINISI" };

  const baseUrl = await getPublicSiteBaseUrl();
  const canonicalUrl = new URL(workShareHref(work.title), baseUrl);
  const videoId = work.youtube_url ? getYoutubeId(work.youtube_url) : null;
  const thumbnailPath = work.thumbnail_path
    ? `/api/submissions/${encodeURIComponent(work.id)}/thumbnail`
    : videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "/panisi-home-banner.jpg";
  const thumbnailUrl = new URL(thumbnailPath, baseUrl);
  if (work.thumbnail_path) {
    thumbnailUrl.searchParams.set("v", work.thumbnail_path);
  }
  const shareImageUrl = thumbnailUrl.toString();
  const thumbnailType = work.thumbnail_path
    ? getThumbnailMimeType(work.thumbnail_path)
    : "image/jpeg";

  return {
    title: `${work.title} | PINISI`,
    description: work.description,
    metadataBase: baseUrl,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "article",
      siteName: "PINISI",
      title: work.title,
      description: work.description,
      url: canonicalUrl,
      images: [{ url: shareImageUrl, secureUrl: shareImageUrl, alt: work.title, type: thumbnailType }],
    },
    twitter: {
      card: "summary_large_image",
      title: work.title,
      description: work.description,
      images: [shareImageUrl],
    },
  };
}

function getThumbnailMimeType(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "image/jpeg";
}

async function getPublicSiteBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredUrl) return new URL(/^https?:\/\//i.test(configuredUrl) ? configuredUrl : `https://${configuredUrl}`);

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host")?.split(",")[0].trim()
    ?? requestHeaders.get("host")
    ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0].trim()
    ?? (host.startsWith("localhost") ? "http" : "https");
  return new URL(`${protocol}://${host}`);
}

export default async function WorkDetailPage({ params }: { params: Promise<{ id: string; slug?: string }> }) {
  const { id, slug } = await params;
  const work = await getWork(id) ?? await getWorkFromRouteSegment(id) ?? await getWorkBySlugs(id, slug ?? "");
  if (!work) notFound();
  const isLegacyId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  let routeTitle = id;
  try {
    routeTitle = decodeURIComponent(id);
  } catch {
    routeTitle = id;
  }
  if (slug || (isLegacyId && id !== work.id) || (!isLegacyId && routeTitle !== work.title)) {
    redirect(workShareHref(work.title));
  }
  const category = allWorkCategories.find((item) => item.slug === work.category_slug);
  const publishedDate = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(work.created_at));
  const publishedYear = new Intl.DateTimeFormat("id-ID", { year: "numeric" }).format(new Date(work.created_at));
  const citation = `${work.full_name}. (${publishedYear}). ${work.title}. PINISI.`;
  const videoId = work.youtube_url ? getYoutubeId(work.youtube_url) : null;

  return (
    <main className="work-detail-page">
      <WorkDetailHeader />
      <article className="work-detail content-wrap">
        <nav className="work-detail-breadcrumb" aria-label="Breadcrumb"><Link href="/">Beranda</Link><span>/</span><Link href="/koleksi">Koleksi</Link><span>/</span><span>{category?.name ?? "Karya"}</span></nav>
        <header className="work-detail-heading">
          <div className="work-detail-tags"><span>{category && <CategoryIcon categorySlug={work.category_slug} size={13} />}{category?.name ?? "Karya Kontributor"}</span><span>{work.content_type === "ebook" ? "PDF" : "Tautan YouTube"}</span><span><span aria-hidden="true">✓</span> Terverifikasi</span></div>
          <h1>{work.title}</h1>
          <p className="work-detail-byline">Dibagikan oleh <Link href={`/kontributor/${work.profile_id}`}>{work.full_name}</Link><span>·</span><time dateTime={work.created_at}>{publishedDate}</time></p>
          <WorkShareActions title={work.title} citation={citation} href={workHref(work.id, work.title)} shareHref={workShareHref(work.title)} />
        </header>
        <div className="work-detail-layout">
          <section className="work-detail-content" aria-label="Isi karya">
            {work.content_type === "video" ? <>
              {videoId ? <div className="work-detail-video">
                <iframe src={`https://www.youtube-nocookie.com/embed/${videoId}`} title={work.title} referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
              </div> : <p className="lesson-empty" role="alert">Video YouTube untuk karya ini tidak tersedia.</p>}
            </> : <div className="work-detail-document pdf-book-reader-host">
              <PdfBookReader submissionId={work.id} title={work.title} />
            </div>}
            <section className="work-detail-description"><span className="eyebrow">RINGKASAN KARYA</span><p>{work.description}</p></section>
          </section>
          <aside className="work-detail-sidebar">
            <section className="work-detail-sidebar-section">
              <span className="eyebrow">KONTRIBUTOR</span>
              <div className="work-detail-author-avatar">{work.profile_photo_path
                ? <Image src={getSupabase().storage.from("profile-photos").getPublicUrl(work.profile_photo_path).data.publicUrl} alt={`Foto profil ${work.full_name}`} width={58} height={58} unoptimized />
                : work.full_name.slice(0, 1).toLocaleUpperCase("id-ID")}</div>
              <h2>{work.full_name}</h2>
              <Link className="button button-outline" href={`/kontributor/${work.profile_id}`}>Lihat profil kontributor <span aria-hidden="true">→</span></Link>
            </section>
            <section className="work-detail-sidebar-section work-detail-metadata">
              <span className="eyebrow">INFORMASI KARYA</span>
              <dl>
                <div><dt>Kategori</dt><dd>{category?.name ?? "Karya Kontributor"}</dd></div>
                <div><dt>Format</dt><dd>{work.content_type === "ebook" ? "PDF" : "Tautan YouTube"}</dd></div>
                <div><dt>Diterbitkan</dt><dd><time dateTime={work.created_at}>{publishedDate}</time></dd></div>
                <div><dt>Status</dt><dd><span className="work-verified-status">Terverifikasi</span></dd></div>
              </dl>
            </section>
          </aside>
        </div>
        <WorkImpactPanel submissionId={work.id} />
        <Link className="work-detail-back" href="/koleksi">← Kembali ke semua karya</Link>
      </article>
      <footer className="site-footer">
        <div className="footer-top">
          <div className="footer-brand-block">
            <Link className="brand footer-brand" href="/" aria-label="PINISI — Pusat Ilmu dan Informasi Bersinergi"><Image className="brand-logo" src="/panisi-logo-light.svg" alt="PINISI — Pusat Ilmu dan Informasi Bersinergi" width={190} height={48} /></Link>
            <p>Pusat ilmu, informasi, dan karya pembelajaran yang bertumbuh melalui kolaborasi.</p>
          </div>
          <div className="footer-message"><span className="eyebrow">PINISI</span><strong>Pusat Ilmu dan Informasi<br />Bersinergi.</strong><span>Berbagi karya, memperluas manfaat pengetahuan.</span></div>
          <nav className="footer-links" aria-label="Menu utama footer"><span>MENU UTAMA</span><Link href="/">Beranda</Link><Link href="/koleksi">Koleksi</Link><Link href="/kontributor">Kontributor</Link><Link href="/ajukan">Unggah Karya</Link><Link href="/ruang-kerja">Ruang Kerja</Link></nav>
        </div>
        <div className="footer-bottom"><span>© 2026 PINISI · KARYA KONTRIBUTOR</span><span>BERBAGI PENGETAHUAN, MENGUATKAN PEMBELAJARAN</span><Link className="footer-top-link" href="/">Kembali ke atas ↑</Link></div>
      </footer>
    </main>
  );
}

function getYoutubeId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") return parsed.pathname.slice(1);
    if (parsed.hostname === "youtube.com" || parsed.hostname.endsWith(".youtube.com")) {
      const id = parsed.searchParams.get("v") ?? parsed.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1] ?? null;
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
  } catch {
    return null;
  }
  return null;
}
