import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { workCategories, type WorkCategorySlug } from "../../../work-categories";
import { workHref, workSlug } from "../../../work-links";
import { PdfBookReader } from "../../../pdf-book-reader";
import { SubmissionThumbnail } from "../../../submission-thumbnail";

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

export async function generateMetadata({ params }: { params: Promise<{ id: string; slug: string }> }) {
  const { id } = await params;
  const work = await getWork(id);
  return {
    title: work ? `${work.title} | Karya Widyaiswara` : "Karya tidak ditemukan | Karya Widyaiswara",
    description: work?.description,
  };
}

export default async function WorkDetailPage({ params }: { params: Promise<{ id: string; slug: string }> }) {
  const { id, slug } = await params;
  const work = await getWork(id);
  if (!work) notFound();
  if (slug !== workSlug(work.title)) redirect(workHref(work.id, work.title));
  const category = workCategories.find((item) => item.slug === work.category_slug);
  const publishedDate = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(work.created_at));
  const videoId = work.youtube_url ? getYoutubeId(work.youtube_url) : null;

  return (
    <main className="work-detail-page">
      <header className="site-header work-detail-header">
        <Link className="brand" href="/" aria-label="Karya Widyaiswara">
          <Image className="brand-logo" src="/panisi-logo.svg" alt="Karya Widyaiswara" width={190} height={48} priority />
        </Link>
        <nav className="desktop-nav" aria-label="Navigasi utama">
          <Link href="/">Beranda</Link><Link href="/koleksi" className="nav-active" aria-current="page">Koleksi</Link>
          <Link href="/widyaiswara">Widyaiswara</Link><Link href="/ajukan">Unggah Karya</Link>
        </nav>
        <Link className="button button-outline header-login" href="/koleksi">Kembali ke koleksi</Link>
      </header>
      <article className="work-detail content-wrap">
        <nav className="work-detail-breadcrumb" aria-label="Breadcrumb"><Link href="/">Beranda</Link><span>/</span><Link href="/koleksi">Koleksi</Link><span>/</span><span>{category?.name ?? "Karya"}</span></nav>
        <header className="work-detail-heading">
          <div className="work-detail-tags"><span>{category?.name ?? "Karya Widyaiswara"}</span><span>{work.content_type === "ebook" ? "E-Book" : "Video pembelajaran"}</span><span>Terverifikasi</span></div>
          <h1>{work.title}</h1>
          <p className="work-detail-byline">Dibagikan oleh <Link href={`/widyaiswara/${work.profile_id}`}>{work.full_name}</Link><span>·</span><time dateTime={work.created_at}>{publishedDate}</time></p>
        </header>
        <div className="work-detail-layout">
          <section className="work-detail-content" aria-label="Isi karya">
            <SubmissionThumbnail id={work.id} title={work.title} contentType={work.content_type} categorySlug={work.category_slug} youtubeUrl={work.youtube_url} thumbnailPath={work.thumbnail_path} className="work-detail-thumbnail" />
            {work.content_type === "video" ? videoId ? <div className="work-detail-video">
              <iframe src={`https://www.youtube-nocookie.com/embed/${videoId}`} title={work.title} referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
            </div> : <p className="lesson-empty" role="alert">Video YouTube untuk karya ini tidak tersedia.</p> : <div className="work-detail-document pdf-book-reader-host">
              <PdfBookReader submissionId={work.id} title={work.title} />
            </div>}
            <section className="work-detail-description"><span className="eyebrow">TENTANG KARYA</span><p>{work.description}</p></section>
          </section>
          <aside className="work-detail-sidebar">
            <span className="eyebrow">KONTRIBUTOR</span>
            <div className="work-detail-author-avatar">{work.profile_photo_path
              ? <Image src={getSupabase().storage.from("profile-photos").getPublicUrl(work.profile_photo_path).data.publicUrl} alt={`Foto profil ${work.full_name}`} width={58} height={58} unoptimized />
              : work.full_name.slice(0, 1).toLocaleUpperCase("id-ID")}</div>
            <h2>{work.full_name}</h2>
            <p>Karya ini telah diverifikasi dan dibagikan untuk komunitas Widyaiswara.</p>
            <Link className="button button-outline" href={`/widyaiswara/${work.profile_id}`}>Lihat profil kontributor <span aria-hidden="true">→</span></Link>
          </aside>
        </div>
        <Link className="work-detail-back" href="/koleksi">← Kembali ke semua karya</Link>
      </article>
      <footer className="work-detail-footer"><span>© 2026 PANISI · KARYA WIDYAISWARA</span><Link href="/ajukan">Bagikan karya Anda →</Link></footer>
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
