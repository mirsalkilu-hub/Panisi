"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { allWorkCategories, legacyWorkCategories, workCategories, type ContentType, type WorkCategorySlug } from "./work-categories";
import { workHref } from "./work-links";
import { SubmissionThumbnail } from "./submission-thumbnail";
import { WorkSocialShare } from "./work-share-actions";
import { CategoryIcon } from "./category-icon";

type Role = "admin" | "verifikator" | "kontributor";
type ToastNotice = { title: string; message: string; tone: "success" | "info" };
type Profile = {
  id: string;
  full_name: string;
  role: Role;
  bio: string | null;
  job_title: string;
  profile_photo_path: string | null;
  area_of_expertise: string;
  widyaiswara_experience: string;
};
type Submission = {
  id: string;
  profile_id: string;
  title: string;
  description: string;
  content_type: "video" | "ebook";
  category_slug: WorkCategorySlug;
  youtube_url: string | null;
  document_path: string | null;
  thumbnail_path: string | null;
  status: "pending" | "approved" | "rejected";
  feedback: string | null;
  is_published: boolean;
  created_at: string;
  profiles?: { full_name: string }[] | null;
};
type PublishedSubmission = {
  id: string;
  profile_id: string;
  title: string;
  description: string;
  content_type: "video" | "ebook";
  category_slug: WorkCategorySlug;
  youtube_url: string | null;
  document_path: string | null;
  thumbnail_path: string | null;
  created_at: string;
  full_name: string;
  profile_photo_path?: string | null;
};
type PublicContributor = {
  id: string;
  full_name: string;
  job_title: string;
  profile_photo_path: string | null;
  area_of_expertise: string;
  widyaiswara_experience: string;
};
type ManagedAccountRole = "verifikator" | "kontributor";
type ManagedAccount = {
  id: string;
  full_name: string;
  role: ManagedAccountRole;
  bio: string | null;
  job_title: string;
  profile_photo_path: string | null;
  area_of_expertise: string;
  widyaiswara_experience: string;
  created_at: string;
};
type ManagedInvitation = {
  id: string;
  label: string;
  is_active: boolean;
  created_at: string;
};
export type PageKey = "beranda" | "koleksi" | "widyaiswara" | "ajukan" | "ruang-kerja" | "admin-akun" | "admin-postingan";
type IconName = "leaf" | "video" | "science" | "star" | "insight" | "review" | "practice" | "search" | "arrow" | "play" | "plus" | "user" | "briefcase" | "menu" | "close" | "check" | "file" | "book" | "home" | "grid" | "users" | "upload";
type HomeLesson = {
  id: string;
  category: string;
  categorySlug: WorkCategorySlug;
  contentType: ContentType;
  title: string;
  author: string;
  time: string;
  color: "forest" | "sun" | "ocean";
  symbol: string;
  level: string;
  format: string;
  description?: string;
  profile_photo_path?: string | null;
  youtube_url?: string | null;
  document_path?: string | null;
  thumbnail_path?: string | null;
  contributor_id?: string;
};

const maxSubmissionPdfSize = 2 * 1024 * 1024;
const maxSubmissionImageSize = 500 * 1024;
const maxProfilePhotoSize = 500 * 1024;
const navItems: [string, string, IconName][] = [
  ["Beranda", "/", "home"],
  ["Koleksi", "/koleksi", "grid"],
  ["Kontributor", "/kontributor", "users"],
  ["Unggah Karya", "/ajukan", "upload"],
  ["Ruang Kerja", "/ruang-kerja", "briefcase"],
];

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    leaf: <><path d="M20 4c-8 0-14 4-14 11a5 5 0 0 0 5 5c7 0 11-6 9-16Z" /><path d="M4 21c3-6 7-9 13-12" /></>,
    video: <><rect x="3" y="5" width="13" height="14" rx="2" /><path d="m16 10 5-3v10l-5-3M8 9l4 3-4 3" /></>,
    science: <><path d="M9 3h6M10 3v6l-5.5 9.2A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.8L14 9V3M8 15h8" /><circle cx="12" cy="18" r="1" /></>,
    star: <><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></>,
    insight: <><path d="M9 18h6M10 22h4M8.2 14.5A7 7 0 1 1 15.8 14.5c-.9.7-1.3 1.3-1.5 2.5h-4.6c-.2-1.2-.6-1.8-1.5-2.5Z" /><path d="M12 7v4M10 9h4" /></>,
    review: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" /><path d="M4 5.5v16M8 8h8M8 12h6M8 16h7" /><path d="m17 8 .7 1.4 1.5.2-1.1 1.1.3 1.5-1.4-.7-1.4.7.3-1.5-1.1-1.1 1.5-.2L17 8Z" /></>,
    practice: <><path d="M4 4h16v16H4z" /><path d="m8 12 2.5 2.5L16 9" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    play: <><path d="m9 6 10 6-10 6z" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" /><path d="M4 5.5v16M8 7h8M8 11h7" /></>,
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z" /></>,
    grid: <><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5M12 3v12" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function PageHero({
  eyebrow,
  title,
  description,
  icon,
  caption,
  children,
  feature,
  visual,
  hideVisual = false,
  className = "",
}: {
  eyebrow: string;
  title: React.ReactNode;
  description: string;
  icon: IconName;
  caption: string;
  children?: React.ReactNode;
  feature?: React.ReactNode;
  visual?: React.ReactNode;
  hideVisual?: boolean;
  className?: string;
}) {
  return <header className={`collection-page-hero ${className}`}>
    <div className="collection-page-copy">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
      {(children || feature) && <div className="collection-page-actions">{children}{feature}</div>}
    </div>
    {!hideVisual && <div className={`collection-page-visual${visual ? " custom-page-visual" : ""}`} aria-hidden={visual ? undefined : true}>
      {visual ?? <>
      <span className="collection-visual-orbit orbit-a" /><span className="collection-visual-orbit orbit-b" /><span className="collection-visual-sun" />
      <span className="collection-visual-book"><Icon name={icon} size={68} /></span>
      <span className="collection-visual-caption">{caption}</span>
      </>}
    </div>}
  </header>;
}

function PageHeading({
  eyebrow,
  title,
  description,
  icon,
  children,
  className = "",
}: {
  eyebrow: string;
  title: React.ReactNode;
  description: string;
  icon?: IconName;
  children?: React.ReactNode;
  className?: string;
}) {
  return <header className={`page-heading ${className}`}>
    <div>
      <span className="eyebrow page-heading-eyebrow">{icon && <Icon name={icon} size={15} />}{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
      {children && <div className="page-heading-actions">{children}</div>}
    </div>
  </header>;
}

function CategoryLabel({ categorySlug, className = "" }: { categorySlug: WorkCategorySlug; className?: string }) {
  const category = allWorkCategories.find((item) => item.slug === categorySlug);
  if (!category) return null;
  return <span className={className}><CategoryIcon categorySlug={categorySlug} />{category.name}</span>;
}

function WorkDescription({ description, href, title }: { description: string; href: string; title: string }) {
  if (!description.trim()) return null;
  return <div className="lesson-description-wrap">
    <p className="lesson-description">{description}</p>
    <Link className="read-more-link" href={href} aria-label={`Baca selengkapnya tentang ${title}`}>Baca selengkapnya <Icon name="arrow" size={14} /></Link>
  </div>;
}

function ContributorPhoto({ name, path, className = "author-avatar", width = 40, height = 40, loading = "lazy" }: { name: string; path?: string | null; className?: string; width?: number; height?: number; loading?: "eager" | "lazy" }) {
  const photoUrl = path && supabase ? supabase.storage.from("profile-photos").getPublicUrl(path).data.publicUrl : null;
  return photoUrl
    ? <Image className={`${className} contributor-photo`} src={photoUrl} alt="" width={width} height={height} loading={loading} unoptimized />
    : <span className={className} aria-hidden="true">{name.slice(0, 1).toLocaleUpperCase("id-ID")}</span>;
}

function youtubeId(url: string) {
  try {
    const parsed = new URL(url);
    let id: string | null = null;
    if (parsed.hostname === "youtu.be") id = parsed.pathname.slice(1);
    else if (parsed.hostname === "youtube.com" || parsed.hostname.endsWith(".youtube.com")) {
      id = parsed.searchParams.get("v") ?? parsed.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1] ?? null;
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function hasValidImageSignature(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte);
  if (type === "image/webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

async function getThumbnailValidationError(value: FormDataEntryValue | null, required: boolean) {
  if (!(value instanceof File) || value.size === 0) {
    return required ? "Unggah thumbnail landscape untuk karya ini." : null;
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(value.type) || value.size > maxSubmissionImageSize) {
    return "Gambar sampul harus berformat JPG, PNG, atau WebP dan maksimal 500 KB.";
  }
  const signature = new Uint8Array(await value.slice(0, 12).arrayBuffer());
  if (!hasValidImageSignature(value.type, signature)) {
    return "Isi file thumbnail tidak sesuai dengan format gambar yang dipilih.";
  }
  try {
    const image = await createImageBitmap(value);
    const isLandscape = image.width >= image.height * 1.4 && image.width <= image.height * 2.5;
    image.close();
    if (!isLandscape) return "Thumbnail harus berorientasi landscape dengan rasio lebar sekitar 1,4–2,5 kali tinggi.";
  } catch {
    return "Thumbnail tidak dapat dibaca. Pilih file gambar yang valid.";
  }
  return null;
}

function LoginDialog({ onClose, onLogin }: { onClose: () => void; onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onLogin(email, password);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Tidak dapat masuk. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="login-dialog" role="dialog" aria-modal="true" aria-labelledby="login-title" aria-describedby="login-description">
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Tutup"><Icon name="close" size={17} /></button>
        <Image className="dialog-mark" src="/panisi-mark.svg" alt="" width={52} height={52} />
        <span className="eyebrow">AKSES AKUN</span>
        <h2 id="login-title">Selamat datang kembali.</h2>
        <p id="login-description">Masuk untuk menjelajah karya, mengelola konten, dan memantau kontribusi terbaik para kontributor.</p>
        {!supabase && <div className="notice">Supabase belum terhubung. Atur <code>NEXT_PUBLIC_SUPABASE_URL</code> dan <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> sebagai environment variables. Di Vercel, buka Project Settings → Environment Variables. Lihat README untuk panduan.</div>}
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Alamat email</label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="nama@email.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <label htmlFor="password">Kata sandi</label>
          <input id="password" name="password" type="password" autoComplete="current-password" placeholder="Masukkan kata sandi" value={password} onChange={(event) => setPassword(event.target.value)} required />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary login-submit" disabled={!supabase || busy}>{busy ? "Memproses..." : "Masuk"} <Icon name="arrow" size={17} /></button>
        </form>
        <span className="dialog-help">Akses kontributor dan verifikator dikelola administrator PINISI. Hubungi tim administrator untuk mendapatkan akun.</span>
        <Link className="login-register-link" href="/daftar">Punya kode undangan? Daftar sebagai kontributor</Link>
      </section>
    </div>
  );
}

export function Home({ activePage = "beranda", selectedContributorId }: { activePage?: PageKey; selectedContributorId?: string }) {
  const [lessonQuery, setLessonQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<WorkCategorySlug | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(() => Boolean(supabase));
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [verifiedSubmissions, setVerifiedSubmissions] = useState<PublishedSubmission[]>([]);
  const [verifiedSubmissionsError, setVerifiedSubmissionsError] = useState("");
  const [contributorPhotoError, setContributorPhotoError] = useState("");
  const [publicContributors, setPublicContributors] = useState<PublicContributor[]>([]);
  const [contributorQuery, setContributorQuery] = useState("");
  const [selectedContributor, setSelectedContributor] = useState<PublicContributor | null>(null);
  const [contributorWorks, setContributorWorks] = useState<PublishedSubmission[]>([]);
  const [contributionCategory, setContributionCategory] = useState<WorkCategorySlug>("video");
  const contributionType = contributionCategory === "video" ? "video" : "ebook";
  const [contributorLoading, setContributorLoading] = useState(false);
  const [contributorError, setContributorError] = useState("");
  const [managedAccounts, setManagedAccounts] = useState<ManagedAccount[]>([]);
  const [managedAccountQuery, setManagedAccountQuery] = useState("");
  const [managedAccountRoleFilter, setManagedAccountRoleFilter] = useState<"all" | ManagedAccountRole>("all");
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [managedAccountEditRole, setManagedAccountEditRole] = useState<ManagedAccountRole | null>(null);
  const [managedAccountError, setManagedAccountError] = useState("");
  const [invitations, setInvitations] = useState<ManagedInvitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [invitationLabel, setInvitationLabel] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [invitationError, setInvitationError] = useState("");
  const [invitationNotice, setInvitationNotice] = useState("");
  const [invitationBusy, setInvitationBusy] = useState(false);
  const [submissionQuery, setSubmissionQuery] = useState("");
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<"all" | Submission["status"]>(() =>
    activePage === "ruang-kerja" ? "pending" : "all",
  );
  const [loginOpen, setLoginOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState<ToastNotice | null>(null);
  const [accountCreatedNotice, setAccountCreatedNotice] = useState("");
  const [accountCreateError, setAccountCreateError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newAccountRole, setNewAccountRole] = useState<ManagedAccountRole>("kontributor");

  useEffect(() => {
    if (!accountCreatedNotice) return;
    const timeout = window.setTimeout(() => setAccountCreatedNotice(""), 6000);
    return () => window.clearTimeout(timeout);
  }, [accountCreatedNotice]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 5200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const loadWorkspace = useCallback(async (activeSession: Session | null): Promise<Role | null> => {
    if (!supabase || !activeSession) {
      setProfile(null);
      setSubmissions([]);
      setManagedAccounts([]);
      setProfileLoading(false);
      return null;
    }
    setProfileLoading(true);
    const { data: currentProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, role, bio, job_title, profile_photo_path, area_of_expertise, widyaiswara_experience")
      .eq("id", activeSession.user.id)
      .single();
    if (profileError || !currentProfile) {
      setProfile(null);
      setProfileLoading(false);
      setMessage(profileError ? `Profil tidak dapat dimuat: ${profileError.message}` : "Profil tidak ditemukan.");
      return null;
    }
    setProfile(currentProfile as Profile);
    setProfileLoading(false);
    if (currentProfile.role === "admin") {
      const pageSize = 500;
      const allAccounts: ManagedAccount[] = [];
      let offset = 0;
      let accountsError: Error | null = null;
      while (true) {
        const { data: accounts, error } = await supabase
          .from("profiles")
          .select("id, full_name, role, bio, job_title, profile_photo_path, area_of_expertise, widyaiswara_experience, created_at")
          .in("role", ["kontributor", "verifikator"])
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(offset, offset + pageSize - 1);
        if (error) {
          accountsError = error;
          break;
        }
        const page = (accounts ?? []) as ManagedAccount[];
        allAccounts.push(...page);
        if (page.length < pageSize) break;
        offset += pageSize;
      }
      if (accountsError) {
        setMessage(`Daftar akun tidak dapat dimuat: ${accountsError.message}`);
        setManagedAccounts([]);
      } else {
        setManagedAccounts(allAccounts);
      }
    } else {
      setManagedAccounts([]);
    }
    let query = supabase
      .from("submissions")
      .select("id, profile_id, title, description, content_type, category_slug, youtube_url, document_path, thumbnail_path, status, feedback, is_published, created_at, profiles(full_name)")
      .order("created_at", { ascending: false });
    if (currentProfile.role === "kontributor") query = query.eq("profile_id", activeSession.user.id);
    const { data, error } = await query;
    if (error) {
      setMessage(`Profil tidak dapat dimuat: ${error.message}`);
      return currentProfile.role;
    }
    setSubmissions((data ?? []) as Submission[]);
    return currentProfile.role;
  }, []);

  const loadVerifiedSubmissions = useCallback(async (profileId?: string) => {
    if (!supabase) return;
    const pageSize = 500;
    const allVerified: PublishedSubmission[] = [];
    let offset = 0;
    while (true) {
      let query = supabase
        .from("verified_submissions")
        .select("id, title, description, content_type, category_slug, youtube_url, document_path, thumbnail_path, created_at, full_name, profile_id")
        .order("created_at", { ascending: false });
      if (profileId) query = query.eq("profile_id", profileId);
      const { data, error } = await query
        .order("id", { ascending: false })
        .range(offset, offset + pageSize - 1);
      if (error) {
        setVerifiedSubmissionsError(`Pengajuan terverifikasi tidak dapat dimuat: ${error.message}`);
        return;
      }
      const page = (data ?? []) as PublishedSubmission[];
      allVerified.push(...page);
      if (page.length < pageSize) break;
      offset += pageSize;
    }
    const contributorIds = [...new Set(allVerified.map((item) => item.profile_id))];
    const photoPaths = new Map<string, string | null>();
    let photoLookupError = "";
    for (let offset = 0; offset < contributorIds.length; offset += pageSize) {
      const { data: contributors, error: photoError } = await supabase
        .from("contributor_public_profiles")
        .select("id, profile_photo_path")
        .in("id", contributorIds.slice(offset, offset + pageSize));
      if (photoError) {
        photoLookupError = `Foto profil kontributor tidak dapat dimuat: ${photoError.message}`;
        break;
      }
      for (const contributor of contributors ?? []) photoPaths.set(contributor.id, contributor.profile_photo_path);
    }
    setContributorPhotoError(photoLookupError);
    for (const item of allVerified) item.profile_photo_path = photoPaths.get(item.profile_id) ?? null;
    setVerifiedSubmissionsError("");
    setVerifiedSubmissions(allVerified);
  }, []);

  const loadPublicContributors = useCallback(async () => {
    if (!supabase) {
      setContributorError("Koneksi belum tersedia untuk memuat daftar kontributor.");
      return;
    }
    const { data, error } = await supabase
      .from("contributor_public_profiles")
      .select("id, full_name, job_title, profile_photo_path, area_of_expertise, widyaiswara_experience")
      .order("full_name", { ascending: true });
    if (error) {
      setContributorError(`Daftar kontributor tidak dapat dimuat: ${error.message}`);
      return;
    }
    setContributorError("");
    setPublicContributors((data ?? []) as PublicContributor[]);
  }, []);

  const loadContributorPage = useCallback(async (contributorId: string) => {
    if (!supabase) {
      setContributorError("Koneksi belum tersedia untuk memuat profil kontributor.");
      return;
    }
    setContributorLoading(true);
    setContributorError("");
    const { data: contributor, error: contributorError } = await supabase
      .from("contributor_public_profiles")
      .select("id, full_name, job_title, profile_photo_path, area_of_expertise, widyaiswara_experience")
      .eq("id", contributorId)
      .maybeSingle();
    if (contributorError) {
      setContributorError(`Profil kontributor tidak dapat dimuat: ${contributorError.message}`);
      setContributorLoading(false);
      return;
    }
    if (!contributor) {
      setSelectedContributor(null);
      setContributorWorks([]);
      setContributorError("Profil kontributor tidak ditemukan.");
      setContributorLoading(false);
      return;
    }
    setSelectedContributor(contributor as PublicContributor);
    const { data: works, error: worksError } = await supabase
      .from("verified_submissions")
      .select("id, profile_id, title, description, content_type, category_slug, youtube_url, document_path, thumbnail_path, created_at, full_name")
      .eq("profile_id", contributorId)
      .order("created_at", { ascending: false });
    if (worksError) {
      setContributorError(`Daftar karya tidak dapat dimuat: ${worksError.message}`);
      setContributorWorks([]);
    } else {
      setContributorWorks((works ?? []) as PublishedSubmission[]);
    }
    setContributorLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      void loadWorkspace(data.session).then((role) => {
        if (activePage === "koleksi" && role === "kontributor" && data.session) {
          void loadVerifiedSubmissions(data.session.user.id);
        }
      });
      if (activePage !== "koleksi") void loadVerifiedSubmissions();
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void loadWorkspace(nextSession).then((role) => {
        if (activePage === "koleksi" && role === "kontributor" && nextSession) {
          void loadVerifiedSubmissions(nextSession.user.id);
        }
      });
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [activePage, loadPublicContributors, loadVerifiedSubmissions, loadWorkspace]);

  useEffect(() => {
    if (activePage !== "widyaiswara") return;
    void Promise.resolve().then(() => selectedContributorId
      ? loadContributorPage(selectedContributorId)
      : loadPublicContributors());
  }, [activePage, loadContributorPage, loadPublicContributors, selectedContributorId]);

  async function login(email: string, password: string) {
    if (!supabase) throw new Error("Koneksi Supabase belum dikonfigurasi.");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setToast({ title: "Selamat datang kembali", message: "Anda berhasil masuk ke PINISI.", tone: "success" });
  }

  async function updateBio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !profile) return;
    const values = new FormData(event.currentTarget);
    const fullName = values.get("full_name")?.toString().trim() ?? "";
    const jobTitle = values.get("job_title")?.toString().trim() ?? "";
    const areaOfExpertise = values.get("area_of_expertise")?.toString().trim() ?? "";
    const widyaiswaraExperience = values.get("widyaiswara_experience")?.toString().trim() ?? "";
    const bio = values.get("bio")?.toString().trim() ?? "";
    const photoFile = values.get("profile_photo");
    if (!fullName || fullName.length > 100) {
      setMessage("Nama lengkap wajib diisi dan maksimal 100 karakter.");
      return;
    }

    if (!jobTitle || jobTitle.length > 120) {
      setMessage("Jabatan wajib diisi dan maksimal 120 karakter.");
      return;
    }
    if (areaOfExpertise.length > 500 || widyaiswaraExperience.length > 2000 || bio.length > 1000) {
      setMessage("Bidang keahlian maksimal 500 karakter, pengalaman 2000 karakter, dan profil lainnya 1000 karakter.");
      return;
    }
    if (profile.role === "kontributor" && (!areaOfExpertise || !widyaiswaraExperience)) {
      setMessage("Bidang keahlian dan pengalaman sebagai kontributor wajib dilengkapi.");
      return;
    }
    if (photoFile instanceof File && photoFile.size > 0
      && (!["image/jpeg", "image/png", "image/webp"].includes(photoFile.type) || photoFile.size > maxProfilePhotoSize)) {
      setMessage("Foto profil harus berformat JPG, PNG, atau WebP dan maksimal 500 KB.");
      return;
    }
    if (photoFile instanceof File && photoFile.size > 0) {
      const signature = new Uint8Array(await photoFile.slice(0, 12).arrayBuffer());
      if (!hasValidImageSignature(photoFile.type, signature)) {
        setMessage("Isi file foto profil tidak sesuai dengan format gambar yang dipilih.");
        return;
      }
    }
    setBusy(true);
    setMessage("");
    let newPhotoPath: string | null = null;
    if (profile.role === "kontributor" && photoFile instanceof File && photoFile.size > 0) {
      const extension = photoFile.type === "image/jpeg" ? "jpg" : photoFile.type === "image/png" ? "png" : "webp";
      newPhotoPath = `${profile.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("profile-photos").upload(newPhotoPath, photoFile, {
        contentType: photoFile.type,
        upsert: false,
      });
      if (uploadError) {
        setBusy(false);
        const isStoragePolicyError = /row-level security policy/i.test(uploadError.message);
        setMessage(isStoragePolicyError
          ? `Foto profil gagal diunggah karena izin penyimpanan Supabase belum sesuai. Terapkan migrasi 20261016030000_profile_photo_storage_policies.sql, lalu coba lagi. Detail: ${uploadError.message}`
          : `Foto profil gagal diunggah: ${uploadError.message}`);
        return;
      }
    }
    const { error } = await supabase.from("profiles").update({
      full_name: fullName,
      job_title: jobTitle,
      ...(newPhotoPath ? { profile_photo_path: newPhotoPath } : {}),
      ...(profile.role === "kontributor" ? {
        area_of_expertise: areaOfExpertise,
        widyaiswara_experience: widyaiswaraExperience,
      } : {}),
      bio,
    }).eq("id", profile.id);
    if (error) {
      if (newPhotoPath) {
        const { error: cleanupError } = await supabase.storage.from("profile-photos").remove([newPhotoPath]);
        setBusy(false);
        setMessage(cleanupError
          ? `Biodata belum tersimpan (${error.message}) dan foto sementara tidak dapat dibersihkan (${cleanupError.message}).`
          : `Biodata belum tersimpan: ${error.message}`);
      } else {
        setBusy(false);
        setMessage(`Biodata belum tersimpan: ${error.message}`);
      }
    } else {
      const previousPhotoPath = profile.profile_photo_path;
      setProfile({ ...profile, full_name: fullName, job_title: jobTitle, profile_photo_path: newPhotoPath ?? previousPhotoPath, area_of_expertise: areaOfExpertise, widyaiswara_experience: widyaiswaraExperience, bio });
      setBusy(false);
      let notificationMessage = "Perubahan data profil Anda berhasil disimpan.";
      if (newPhotoPath && previousPhotoPath) {
        const { error: cleanupError } = await supabase.storage.from("profile-photos").remove([previousPhotoPath]);
        if (cleanupError) notificationMessage += ` Foto profil lama tidak dapat dibersihkan: ${cleanupError.message}`;
      }
      setMessage(notificationMessage);
      setToast({ title: "Profil berhasil diperbarui", message: notificationMessage, tone: "success" });
    }
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const password = values.get("new_password")?.toString() ?? "";
    const confirmation = values.get("confirm_password")?.toString() ?? "";
    if (password.length < 8) {
      setPasswordMessage("Kata sandi baru harus terdiri dari minimal 8 karakter.");
      return;
    }
    if (password !== confirmation) {
      setPasswordMessage("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    setBusy(true);
    setPasswordMessage("");
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setPasswordMessage(`Kata sandi belum dapat diperbarui: ${error.message}`);
      return;
    }
    form.reset();
    setPasswordMessage("Kata sandi berhasil diperbarui.");
    setToast({ title: "Kata sandi berhasil diperbarui", message: "Kata sandi akun Anda berhasil diganti.", tone: "success" });
  }

  async function submitContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !profile) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const title = values.get("title")?.toString().trim() ?? "";
    const description = values.get("description")?.toString().trim() ?? "";
    const categorySlug = values.get("category_slug")?.toString() ?? "";
    const contentType = categorySlug === "video" ? "video" : "ebook";
    const videoUrl = contentType === "video" ? values.get("youtube_url")?.toString().trim() ?? "" : null;
    const file = values.get("document");
    const thumbnailFile = values.get("thumbnail");
    if (!title || title.length > 120 || !description || description.length > 2000) {
      setMessage("Judul dan deskripsi wajib diisi sesuai batas karakter.");
      return;
    }
    if (!workCategories.some((category) => category.slug === categorySlug)) {
      setMessage("Pilih kategori karya yang sesuai.");
      return;
    }
    if (contentType === "ebook" && (!(file instanceof File) || file.size === 0 || file.type !== "application/pdf")) {
      setMessage("Pilih berkas karya dengan format PDF.");
      return;
    }
    if (file instanceof File && file.size > maxSubmissionPdfSize) {
      setMessage("Ukuran PDF maksimal 2 MB.");
      return;
    }
    if (contentType === "video" && !youtubeId(videoUrl ?? "")) {
      setMessage("Masukkan tautan video YouTube yang valid.");
      return;
    }
    const thumbnailError = await getThumbnailValidationError(thumbnailFile, true);
    if (thumbnailError) {
      setMessage(thumbnailError);
      return;
    }
    setBusy(true);
    setMessage("");
    let path: string | null = null;
    let thumbnailPath: string | null = null;
    if (contentType === "ebook" && file instanceof File) {
      path = `${profile.id}/${crypto.randomUUID()}.pdf`;
      const { error: uploadError } = await supabase.storage.from("contribution-documents").upload(path, file, { contentType: "application/pdf", upsert: false });
      if (uploadError) {
        setBusy(false);
        setMessage(`Berkas PDF gagal diunggah: ${uploadError.message}`);
        return;
      }
    }
    if (thumbnailFile instanceof File) {
      const extension = thumbnailFile.type === "image/jpeg" ? "jpg" : thumbnailFile.type === "image/png" ? "png" : "webp";
      thumbnailPath = `${profile.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("submission-thumbnails").upload(thumbnailPath, thumbnailFile, { contentType: thumbnailFile.type, upsert: false });
      if (uploadError) {
        let cleanupMessage = "";
        if (path) {
          const { error: cleanupError } = await supabase.storage.from("contribution-documents").remove([path]);
          if (cleanupError) cleanupMessage = ` PDF sementara tidak dapat dibersihkan: ${cleanupError.message}`;
        }
        setBusy(false);
        setMessage(`Thumbnail gagal diunggah: ${uploadError.message}.${cleanupMessage}`);
        return;
      }
    }
    const { error } = await supabase.from("submissions").insert({
      profile_id: profile.id,
      title,
      description,
      content_type: contentType,
      category_slug: categorySlug,
      youtube_url: videoUrl,
      document_path: path,
      thumbnail_path: thumbnailPath,
    });
    setBusy(false);
    if (error) {
      let cleanupMessage = "";
      if (path) {
        const { error: cleanupError } = await supabase.storage.from("contribution-documents").remove([path]);
        if (cleanupError) cleanupMessage += ` PDF sementara tidak dapat dibersihkan: ${cleanupError.message}.`;
      }
      if (thumbnailPath) {
        const { error: cleanupError } = await supabase.storage.from("submission-thumbnails").remove([thumbnailPath]);
        if (cleanupError) cleanupMessage += ` Thumbnail sementara tidak dapat dibersihkan: ${cleanupError.message}.`;
      }
      setMessage(`Kontribusi belum tersimpan: ${error.message}.${cleanupMessage}`);
      return;
    }
    form.reset();
    setContributionCategory("video");
    const categoryName = workCategories.find((category) => category.slug === categorySlug)?.name ?? "pilihan";
    setToast({
      title: `Pengajuan ${categoryName} terkirim`,
      message: "Karya Anda masuk ke antrean verifikasi. Pantau statusnya di bagian Karya Saya.",
      tone: "success",
    });
    await loadWorkspace(session);
  }

  async function reviewSubmission(id: string, status: "approved" | "rejected") {
    if (!supabase) return;
    const feedback = window.prompt(status === "approved" ? "Catatan untuk kontributor (opsional):" : "Alasan penolakan:");
    if (feedback === null) return;
    if (status === "rejected" && !feedback.trim()) {
      setMessage("Alasan penolakan wajib diisi.");
      return;
    }
    setBusy(true);
    setMessage("");
    const { data, error } = await supabase.from("submissions")
      .update({ status, feedback: feedback.trim() })
      .eq("id", id)
      .select("id")
      .maybeSingle();
    setBusy(false);
    if (error) {
      setMessage(`Status tidak dapat diperbarui: ${error.message}`);
      return;
    }
    if (!data) {
      setMessage("Postingan sudah berubah atau tidak lagi menunggu verifikasi. Muat ulang daftar untuk melihat status terbaru.");
      await loadWorkspace(session);
      return;
    }
    setMessage("Status kontribusi berhasil diperbarui.");
    await Promise.all([loadWorkspace(session), loadVerifiedSubmissions()]);
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountCreateError("");
    if (!session) {
      setAccountCreateError("Sesi admin tidak tersedia. Silakan masuk kembali.");
      return;
    }
    const form = event.currentTarget;
    const values = new FormData(form);
    const photo = values.get("account_profile_photo");
    const body = new FormData();
    body.set("fullName", values.get("account_full_name")?.toString() ?? "");
    body.set("email", values.get("account_email")?.toString() ?? "");
    body.set("password", values.get("account_password")?.toString() ?? "");
    body.set("role", values.get("account_role")?.toString() ?? "");
    body.set("jobTitle", values.get("account_job_title")?.toString() ?? "");
    body.set("areaOfExpertise", values.get("account_area_of_expertise")?.toString() ?? "");
    body.set("widyaiswaraExperience", values.get("account_widyaiswara_experience")?.toString() ?? "");
    if (photo instanceof File && photo.size > 0) body.set("profilePhoto", photo);
    setBusy(true);
    setMessage("");
    setAccountCreatedNotice("");
    try {
      const response = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body,
      });
      const responseBody = await response.text();
      let result: { error?: string; fullName?: string; role?: ManagedAccountRole };
      try {
        result = JSON.parse(responseBody) as typeof result;
      } catch {
        throw new Error(`Server mengirim respons yang tidak dapat dibaca (HTTP ${response.status}). Periksa log server atau coba lagi.`);
      }
      if (!response.ok) {
        setAccountCreateError(result.error ?? `Akun tidak dapat dibuat (HTTP ${response.status}).`);
        return;
      }
      const roleName = result.role === "verifikator" ? "verifikator" : "kontributor";
      const accountName = result.fullName ?? "Akun baru";
      form.reset();
      setNewAccountRole("kontributor");
      setAccountCreatedNotice(`Akun ${roleName} ${accountName} berhasil dibuat dan sudah aktif.`);
      await loadWorkspace(session);
    } catch (error) {
      setAccountCreateError(`Akun tidak dapat dibuat: ${error instanceof Error ? error.message : "Terjadi kesalahan jaringan."}`);
    } finally {
      setBusy(false);
    }
  }

  async function updateManagedAccount(event: FormEvent<HTMLFormElement>, accountId: string) {
    event.preventDefault();
    if (!session) {
      setManagedAccountError("Sesi admin tidak tersedia. Silakan masuk kembali.");
      return;
    }
    const values = new FormData(event.currentTarget);
    const account = managedAccounts.find((item) => item.id === accountId);
    if (!account) {
      setManagedAccountError("Akun tidak ditemukan. Muat ulang halaman dan coba lagi.");
      return;
    }
    const fullName = values.get("managed_full_name")?.toString().trim() ?? "";
    const jobTitle = values.get("managed_job_title")?.toString().trim() ?? "";
    const role = values.get("managed_role")?.toString() ?? "";
    const areaOfExpertise = values.get("managed_area_of_expertise")?.toString().trim() ?? "";
    const widyaiswaraExperience = values.get("managed_widyaiswara_experience")?.toString().trim() ?? "";
    const bio = values.get("managed_bio")?.toString().trim() ?? "";
    if (!fullName || fullName.length > 100 || !jobTitle || jobTitle.length > 120
      || (role !== "kontributor" && role !== "verifikator")
      || areaOfExpertise.length > 500 || widyaiswaraExperience.length > 2000 || bio.length > 1000
      || (role === "kontributor" && (!areaOfExpertise || !widyaiswaraExperience))) {
      setManagedAccountError("Periksa kembali nama, jabatan, peran, bidang keahlian, dan pengalaman. Kontributor wajib melengkapi bidang keahlian serta pengalaman.");
      return;
    }
    setBusy(true);
    setManagedAccountError("");
    try {
      const response = await fetch("/api/admin/accounts", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: accountId,
          fullName,
          jobTitle,
          role,
          areaOfExpertise,
          widyaiswaraExperience,
          bio,
        }),
      });
      const result = await response.json() as { error?: string; account?: ManagedAccount };
      if (!response.ok || !result.account) {
        setManagedAccountError(result.error ?? "Data akun tidak berhasil diperbarui.");
        return;
      }
      const updatedAccount = result.account;
      setManagedAccounts((current) => current.map((item) => item.id === accountId ? updatedAccount : item));
      setEditingAccountId(null);
      setManagedAccountEditRole(null);
      setMessage(`Profil ${updatedAccount.full_name} berhasil diperbarui.`);
    } catch (error) {
      setManagedAccountError(`Akun tidak dapat diperbarui: ${error instanceof Error ? error.message : "Terjadi kesalahan jaringan."}`);
    } finally {
      setBusy(false);
    }
  }

  async function deleteManagedAccount(account: ManagedAccount) {
    if (!session) {
      setManagedAccountError("Sesi admin tidak tersedia. Silakan masuk kembali.");
      return;
    }
    const confirmed = window.confirm(
      `Hapus akun ${account.full_name} (${account.role}) secara permanen? Semua postingan dan berkas terkait juga akan dihapus.`,
    );
    if (!confirmed) return;

    setBusy(true);
    setManagedAccountError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/accounts", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: account.id }),
      });
      const result = await response.json() as { error?: string; deleted?: boolean; fullName?: string; warnings?: string[] };
      if (!response.ok || !result.deleted) {
        setManagedAccountError(result.error ?? "Akun tidak berhasil dihapus.");
        return;
      }
      setManagedAccounts((current) => current.filter((item) => item.id !== account.id));
      if (editingAccountId === account.id) {
        setEditingAccountId(null);
        setManagedAccountEditRole(null);
      }
      const name = result.fullName ?? account.full_name;
      setMessage(result.warnings?.length
        ? `Akun ${name} berhasil dihapus. ${result.warnings.join(" ")}`
        : `Akun ${name} dan seluruh data terkait berhasil dihapus.`);
    } catch (error) {
      setManagedAccountError(`Akun tidak dapat dihapus: ${error instanceof Error ? error.message : "Terjadi kesalahan jaringan."}`);
    } finally {
      setBusy(false);
    }
  }

  async function saveSubmission(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    if (!supabase) return;
    const values = new FormData(event.currentTarget);
    const title = values.get("edit_title")?.toString().trim() ?? "";
    const description = values.get("edit_description")?.toString().trim() ?? "";
    const videoUrl = values.get("edit_youtube_url")?.toString().trim() ?? "";
    const requestedCategorySlug = values.get("edit_category_slug")?.toString() ?? "";
    const replacementDocument = values.get("edit_document");
    const replacementThumbnail = values.get("edit_thumbnail");
    const submission = submissions.find((item) => item.id === id);
    const categorySlug = requestedCategorySlug || submission?.category_slug || "";
    if (!title || title.length > 120 || !description || description.length > 2000
      || (!workCategories.some((category) => category.slug === categorySlug)
        && !(submission?.category_slug === categorySlug && legacyWorkCategories.some((category) => category.slug === categorySlug)))
      || (replacementDocument instanceof File && replacementDocument.size > 0
        && (replacementDocument.type !== "application/pdf" || replacementDocument.size > maxSubmissionPdfSize))
      || (submission?.content_type === "video" && !youtubeId(videoUrl))
      || (submission && categorySlug !== submission.category_slug
        && (submission.content_type === "video") !== (categorySlug === "video"))) {
      setMessage("Lengkapi judul, deskripsi, dan kategori. Video memerlukan tautan YouTube; kategori lain menggunakan PDF.");
      return;
    }
    const thumbnailError = await getThumbnailValidationError(replacementThumbnail, false);
    if (thumbnailError) {
      setMessage(thumbnailError);
      return;
    }
    setBusy(true);
    setMessage("");
    let replacementPath: string | null = null;
    let replacementThumbnailPath: string | null = null;
    if (submission?.content_type === "ebook" && replacementDocument instanceof File && replacementDocument.size > 0) {
      replacementPath = `${submission.profile_id}/${crypto.randomUUID()}.pdf`;
      const { error: uploadError } = await supabase.storage.from("contribution-documents").upload(replacementPath, replacementDocument, { contentType: "application/pdf", upsert: false });
      if (uploadError) {
        setBusy(false);
        setMessage(`PDF pengganti gagal diunggah: ${uploadError.message}`);
        return;
      }
    }
    if (replacementThumbnail instanceof File && replacementThumbnail.size > 0 && submission) {
      const extension = replacementThumbnail.type === "image/jpeg" ? "jpg" : replacementThumbnail.type === "image/png" ? "png" : "webp";
      replacementThumbnailPath = `${submission.profile_id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("submission-thumbnails").upload(replacementThumbnailPath, replacementThumbnail, { contentType: replacementThumbnail.type, upsert: false });
      if (uploadError) {
        let cleanupMessage = "";
        if (replacementPath) {
          const { error: cleanupError } = await supabase.storage.from("contribution-documents").remove([replacementPath]);
          if (cleanupError) cleanupMessage = ` PDF sementara tidak dapat dibersihkan: ${cleanupError.message}.`;
        }
        setBusy(false);
        setMessage(`Thumbnail pengganti gagal diunggah: ${uploadError.message}.${cleanupMessage}`);
        return;
      }
    }
    const { error } = await supabase.from("submissions").update({
      title,
      description,
      category_slug: categorySlug,
      ...(submission?.content_type === "video" ? { youtube_url: videoUrl } : {}),
      ...(replacementPath ? { document_path: replacementPath } : {}),
      ...(replacementThumbnailPath ? { thumbnail_path: replacementThumbnailPath } : {}),
    }).eq("id", id);
    if (error) {
      let cleanupMessage = "";
      if (replacementPath) {
        const { error: cleanupError } = await supabase.storage.from("contribution-documents").remove([replacementPath]);
        if (cleanupError) cleanupMessage += ` PDF sementara tidak dapat dibersihkan: ${cleanupError.message}.`;
      }
      if (replacementThumbnailPath) {
        const { error: cleanupError } = await supabase.storage.from("submission-thumbnails").remove([replacementThumbnailPath]);
        if (cleanupError) cleanupMessage += ` Thumbnail sementara tidak dapat dibersihkan: ${cleanupError.message}.`;
      }
      setBusy(false);
      setMessage(`Postingan tidak dapat diperbarui: ${error.message}.${cleanupMessage}`);
      return;
    }
    setEditingId(null);
    setMessage(profile?.role === "kontributor" ? "Pengajuan berhasil diperbarui dan tetap menunggu verifikasi." : "Postingan berhasil diperbarui.");
    let cleanupMessage = "";
    if (replacementPath && submission?.document_path) {
      const { error: cleanupError } = await supabase.storage.from("contribution-documents").remove([submission.document_path]);
      if (cleanupError) cleanupMessage = ` PDF lama tidak dapat dibersihkan: ${cleanupError.message}`;
    }
    if (replacementThumbnailPath && submission?.thumbnail_path) {
      const { error: cleanupError } = await supabase.storage.from("submission-thumbnails").remove([submission.thumbnail_path]);
      if (cleanupError) cleanupMessage += `${cleanupMessage ? " " : " "}Thumbnail lama tidak dapat dibersihkan: ${cleanupError.message}`;
    }
    setBusy(false);
    if (cleanupMessage) setMessage((current) => `${current}${cleanupMessage}`);
    await Promise.all([loadWorkspace(session), loadVerifiedSubmissions()]);
  }

  async function togglePublished(item: Submission) {
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    const { error } = await supabase.from("submissions")
      .update({ is_published: !item.is_published })
      .eq("id", item.id);
    setBusy(false);
    if (error) {
      setMessage(`Status publikasi tidak dapat diperbarui: ${error.message}`);
      return;
    }
    setMessage(item.is_published ? "Postingan berhasil ditarik dari halaman utama." : "Postingan berhasil diterbitkan di halaman utama.");
    await loadWorkspace(session);
  }

  async function deleteSubmission(item: Submission) {
    if (!supabase || !window.confirm(`Hapus postingan “${item.title}”? Tindakan ini tidak dapat dibatalkan.`)) return;
    setBusy(true);
    setMessage("");
    let response: Response;
    try {
      response = await fetch(`/api/submissions/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
    } catch {
      setBusy(false);
      setMessage("Tidak dapat menghubungi server untuk menghapus postingan.");
      return;
    }
    let result: { error?: string; warnings?: string[] };
    try {
      result = await response.json() as { error?: string; warnings?: string[] };
    } catch {
      setBusy(false);
      setMessage("Respons server tidak dapat dibaca. Status penghapusan belum dapat dipastikan.");
      return;
    }
    setBusy(false);
    if (!response.ok) {
      setMessage(`Postingan tidak dapat dihapus: ${result.error ?? "Terjadi kesalahan server."}`);
      return;
    }
    setMessage(result.warnings?.length
      ? `Postingan berhasil dihapus. ${result.warnings.join(" ")}`
      : "Postingan dan file pendukung berhasil dihapus.");
    await Promise.all([loadWorkspace(session), loadVerifiedSubmissions()]);
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      setMessage(`Tidak dapat keluar: ${error.message}`);
      return;
    }
    setToast({ title: "Anda sudah keluar", message: "Sesi PINISI telah ditutup dengan aman.", tone: "info" });
  }

  const adminRole = profile?.role === "admin";
  const verifierRole = profile?.role === "verifikator";
  useEffect(() => {
    if (!adminRole || activePage !== "admin-akun" || !session) return;
    let active = true;
    fetch("/api/admin/invitations", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    }).then(async (response) => {
      const result = await response.json() as { error?: string; invitations?: ManagedInvitation[] };
      if (!response.ok) throw new Error(result.error ?? "Kode undangan tidak dapat dimuat.");
      if (active) {
        setInvitations(result.invitations ?? []);
        setInvitationError("");
      }
    }).catch((reason: unknown) => {
      if (active) setInvitationError(reason instanceof Error ? reason.message : "Kode undangan tidak dapat dimuat.");
    }).finally(() => {
      if (active) setInvitationsLoading(false);
    });
    return () => { active = false; };
  }, [activePage, adminRole, session]);

  const adminManagementPage = activePage === "admin-akun" || activePage === "admin-postingan";
  const submissionManagementView = (adminRole && activePage === "admin-postingan")
    || (verifierRole && (activePage === "ruang-kerja" || activePage === "admin-postingan"));
  const workspacePage = activePage === "ruang-kerja" || adminManagementPage;
  const filteredManagedAccounts = managedAccounts.filter((account) => {
    const matchesRole = managedAccountRoleFilter === "all" || account.role === managedAccountRoleFilter;
    const normalizedQuery = managedAccountQuery.trim().toLocaleLowerCase("id-ID");
    const searchableText = [
      account.full_name,
      account.job_title,
      account.area_of_expertise,
      account.widyaiswara_experience,
      account.role,
    ].join(" ").toLocaleLowerCase("id-ID");
    return matchesRole && (!normalizedQuery || searchableText.includes(normalizedQuery));
  });
  const filteredSubmissions = submissions.filter((submission) => {
    const matchesStatus = submissionStatusFilter === "all" || submission.status === submissionStatusFilter;
    const contributorName = submission.profiles?.[0]?.full_name ?? "";
    const categoryName = allWorkCategories.find((category) => category.slug === submission.category_slug)?.name ?? "";
    const searchText = `${submission.title} ${submission.description} ${contributorName} ${categoryName}`.toLocaleLowerCase("id-ID");
    return matchesStatus && (!submissionQuery.trim() || searchText.includes(submissionQuery.trim().toLocaleLowerCase("id-ID")));
  });
  if (verifierRole) {
    filteredSubmissions.sort((left, right) =>
      Number(right.status === "pending") - Number(left.status === "pending")
      || new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
    );
  }
  const filteredPublicContributors = publicContributors.filter((contributor) => {
    const searchText = [contributor.full_name, contributor.job_title, contributor.area_of_expertise, contributor.widyaiswara_experience]
      .join(" ")
      .toLocaleLowerCase("id-ID");
    return searchText.includes(contributorQuery.trim().toLocaleLowerCase("id-ID"));
  });
  const homeLessons: HomeLesson[] = verifiedSubmissions.map((item, index) => ({
      id: item.id,
      category: allWorkCategories.find((category) => category.slug === item.category_slug)?.name.toLocaleUpperCase("id-ID") ?? "KARYA KONTRIBUTOR",
      categorySlug: item.category_slug,
      title: item.title,
      author: item.full_name,
      contributor_id: item.profile_id,
      contentType: allWorkCategories.find((category) => category.slug === item.category_slug)?.name ?? "Video",
      time: item.content_type === "ebook" ? "PDF" : "YOUTUBE",
      color: (["forest", "sun", "ocean"] as const)[index % 3],
      symbol: "↗",
      level: "TERVERIFIKASI",
      format: item.content_type === "ebook" ? "PDF" : "VIDEO YOUTUBE",
      description: item.description,
      profile_photo_path: item.profile_photo_path,
      youtube_url: item.youtube_url,
      document_path: item.document_path,
      thumbnail_path: item.thumbnail_path,
    }));
  const latestHomeSubmissions = verifiedSubmissions.slice(0, 2);
  const currentWorkCategory = workCategories.find((category) => category.slug === selectedCategory) ?? null;
  const categoryLessons = currentWorkCategory
    ? homeLessons.filter((lesson) => lesson.categorySlug === currentWorkCategory.slug)
    : homeLessons;
  const filteredLessons = categoryLessons.filter((lesson) =>
    `${lesson.title} ${lesson.category} ${lesson.author} ${lesson.description ?? ""}`.toLowerCase().includes(lessonQuery.trim().toLowerCase()),
  );
  const collectionSubmissions = profile
    ? verifiedSubmissions.filter((submission) => submission.profile_id === profile.id)
    : [];

  async function createInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      setInvitationError("Sesi admin tidak tersedia. Silakan masuk kembali.");
      return;
    }
    setInvitationBusy(true);
    setInvitationError("");
    setInvitationNotice("");
    try {
      const response = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ label: invitationLabel.trim() || undefined }),
      });
      const result = await response.json() as { error?: string; code?: string; invitation?: ManagedInvitation };
      if (!response.ok || !result.code || !result.invitation) {
        throw new Error(result.error ?? "Kode undangan tidak dapat dibuat.");
      }
      setInvitations((current) => [result.invitation!, ...current]);
      setInvitationCode(result.code);
      setInvitationLabel("");
      setInvitationNotice("Kode berhasil dibuat. Salin dan bagikan kepada calon kontributor.");
    } catch (reason) {
      setInvitationError(reason instanceof Error ? reason.message : "Kode undangan tidak dapat dibuat.");
    } finally {
      setInvitationBusy(false);
    }
  }

  async function toggleInvitation(invitation: ManagedInvitation) {
    if (!session) {
      setInvitationError("Sesi admin tidak tersedia. Silakan masuk kembali.");
      return;
    }
    const nextIsActive = !invitation.is_active;
    if (!nextIsActive && !window.confirm(`Cabut kode "${invitation.label}"? Kode ini tidak dapat digunakan untuk pendaftaran baru.`)) return;
    setInvitationBusy(true);
    setInvitationError("");
    setInvitationNotice("");
    try {
      const response = await fetch("/api/admin/invitations", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: invitation.id, isActive: nextIsActive }),
      });
      const result = await response.json() as { error?: string; invitation?: ManagedInvitation };
      if (!response.ok || !result.invitation) {
        throw new Error(result.error ?? "Status kode undangan tidak dapat diperbarui.");
      }
      setInvitations((current) => current.map((item) => item.id === invitation.id ? result.invitation! : item));
      if (invitationCode && !nextIsActive) setInvitationCode("");
      setInvitationNotice(nextIsActive ? "Kode undangan diaktifkan kembali." : "Kode undangan berhasil dicabut.");
    } catch (reason) {
      setInvitationError(reason instanceof Error ? reason.message : "Status kode undangan tidak dapat diperbarui.");
    } finally {
      setInvitationBusy(false);
    }
  }

  async function copyInvitationDetails() {
    if (!invitationCode) return;
    const url = new URL("/daftar", window.location.origin).toString();
    const formattedCode = invitationCode.match(/.{1,4}/g)?.join("-") ?? invitationCode;
    try {
      await navigator.clipboard.writeText(`Daftar sebagai kontributor PINISI\nTautan: ${url}\nKode undangan: ${formattedCode}`);
      setInvitationNotice("Tautan dan kode undangan berhasil disalin.");
    } catch (reason) {
      setInvitationError(reason instanceof Error ? `Tidak dapat menyalin undangan: ${reason.message}` : "Tidak dapat menyalin undangan dari browser ini.");
    }
  }

  return (
    <main>
      {toast && <aside className={`toast-notice toast-${toast.tone}`} role="status" aria-live="polite">
        <span className="toast-icon"><Icon name={toast.tone === "success" ? "check" : "user"} size={19} /></span>
        <div className="toast-copy"><strong>{toast.title}</strong><p>{toast.message}</p></div>
        <button type="button" onClick={() => setToast(null)} aria-label="Tutup notifikasi"><Icon name="close" size={15} /></button>
        <span className="toast-progress" aria-hidden="true" />
      </aside>}
      <header className="site-header">
        <Link className="brand" href="/" aria-label="PINISI — Pusat Ilmu dan Informasi Bersinergi"><Image className="brand-logo" src="/panisi-logo.svg" alt="PINISI — Pusat Ilmu dan Informasi Bersinergi" width={190} height={48} priority /></Link>
        <nav className="desktop-nav" aria-label="Navigasi utama">
          {navItems.map(([label, href, icon]) => {
            const isCurrent = href === "/" ? activePage === "beranda" : (href === "/kontributor" && activePage === "widyaiswara") || (href === "/ruang-kerja" && (activePage === "ruang-kerja" || adminManagementPage)) || href.slice(1) === activePage;
            return <Link className={isCurrent ? "nav-active" : ""} href={href} key={href} aria-current={isCurrent ? "page" : undefined}><Icon name={icon} size={15} />{label}</Link>;
          })}
        </nav>
        {session ? <button className="button button-outline header-login" onClick={signOut}><Icon name="user" size={16} /> Keluar</button> : <button className="button button-outline header-login" onClick={() => setLoginOpen(true)}><Icon name="user" size={16} /> Masuk</button>}
      </header>
      <nav className="mobile-bottom-nav" aria-label="Navigasi utama seluler">
          {navItems.map(([label, href, icon]) => {
            const isCurrent = href === "/" ? activePage === "beranda" : (href === "/kontributor" && activePage === "widyaiswara") || (href === "/ruang-kerja" && (activePage === "ruang-kerja" || adminManagementPage)) || href.slice(1) === activePage;
            return <Link className={isCurrent ? "nav-active" : ""} href={href} key={href} aria-current={isCurrent ? "page" : undefined}><Icon name={icon} size={19} /><span>{label}</span></Link>;
          })}
      </nav>

      {activePage === "beranda" && <>
      <section className="collection-page content-wrap home-page-hero" id="beranda">
        <PageHero eyebrow="KARYA KONTRIBUTOR" title={<>PINISI<br /><em>Pusat Ilmu dan Informasi Bersinergi.</em></>} description="Ruang kolaborasi untuk merayakan gagasan, membagikan praktik pembelajaran, dan memperluas dampak karya para kontributor." icon="book" caption="BERBAGI • BELAJAR • BERTUMBUH" hideVisual className="home-main-banner" feature={latestHomeSubmissions.length > 0 && <section className="home-latest-posts" aria-label="Dua karya terbaru">
          <div className="home-latest-posts-list">{latestHomeSubmissions.map((item) => <Link className="home-latest-post" href={workHref(item.id, item.title)} key={item.id}>
            <SubmissionThumbnail id={item.id} title={item.title} contentType={item.content_type} categorySlug={item.category_slug} youtubeUrl={item.youtube_url} thumbnailPath={item.thumbnail_path} className="home-latest-thumbnail" />
            <span className="home-latest-post-copy"><strong>{item.title}</strong><span>{allWorkCategories.find((category) => category.slug === item.category_slug)?.name ?? "Karya"} · {item.full_name}</span></span>
            <Icon name="arrow" size={15} />
          </Link>)}</div>
        </section>}>
          <Link href="/#karya" className="button">Jelajahi karya <Icon name="arrow" size={17} /></Link>
          <Link href="/ajukan" className="button button-hero-secondary"><Icon name="upload" size={16} /> Bagikan karya ajar</Link>
        </PageHero>
      </section>
      <section className="learning-section home-published-section" id="karya">
        <div className="content-wrap">
          <div className="section-heading"><div><span className="eyebrow">DARI KONTRIBUTOR</span><h2>Gagasan baik tumbuh saat dibagikan.</h2><p className="work-category-description">Pilih kategori untuk menyaring semua pengajuan kontributor yang telah diverifikasi.</p></div><span className="lesson-total">{filteredLessons.length} KARYA</span></div>
          <nav className="work-category-menu" aria-label="Filter kategori karya">
            {workCategories.map((category) => <button type="button" className={`work-category-link${selectedCategory === category.slug ? " category-active" : ""}`} onClick={() => setSelectedCategory((current) => current === category.slug ? null : category.slug)} key={category.slug} aria-pressed={selectedCategory === category.slug}>
              <span className={`work-category-icon category-icon-${category.slug}`}><CategoryIcon categorySlug={category.slug} size={21} /></span><span><strong>{category.name}</strong><small>{category.description}</small></span>
            </button>)}
          </nav>
          <div className="content-toolbar">
            <label className="lesson-search"><Icon name="search" size={18} /><input type="search" value={lessonQuery} onChange={(event) => setLessonQuery(event.target.value)} placeholder="Cari judul, tema, atau kontributor..." aria-label="Cari karya kontributor" /></label>
          </div>
          {contributorPhotoError && <p className="contributor-photo-warning" role="status">{contributorPhotoError}</p>}
          {verifiedSubmissionsError ? <p className="lesson-empty lesson-load-error" role="alert">{verifiedSubmissionsError}</p>
          : filteredLessons.length > 0 ? <div className="lesson-grid">
            {filteredLessons.map((lesson) => <article className="lesson-card" key={lesson.id ?? lesson.title}>
              <Link className="lesson-thumbnail-link" href={workHref(lesson.id, lesson.title)} aria-label={`Buka halaman ${lesson.title}`}><SubmissionThumbnail id={lesson.id} title={lesson.title} contentType={lesson.categorySlug === "video" ? "video" : "ebook"} categorySlug={lesson.categorySlug} youtubeUrl={lesson.youtube_url} thumbnailPath={lesson.thumbnail_path} accessToken={session?.access_token} /></Link>
              <div className="lesson-meta"><CategoryLabel categorySlug={lesson.categorySlug} /> <span>{lesson.level}</span></div><h3><Link className="work-title-link" href={workHref(lesson.id, lesson.title)}>{lesson.title}</Link></h3>{lesson.description && <WorkDescription description={lesson.description} href={workHref(lesson.id, lesson.title)} title={lesson.title} />}<div className="lesson-author"><div className="lesson-contributor"><ContributorPhoto name={lesson.author} path={lesson.profile_photo_path} />{lesson.contributor_id ? <Link href={`/kontributor/${lesson.contributor_id}`}>{lesson.author}</Link> : <span>{lesson.author}</span>}</div><div className="lesson-author-actions"><span className="lesson-duration">{lesson.time}</span><WorkSocialShare title={lesson.title} href={workHref(lesson.id, lesson.title)} compact /></div></div>
            </article>)}
          </div> : <div className="lesson-empty-state"><span className="lesson-empty-icon"><Icon name={lessonQuery.trim() ? "search" : "book"} size={20} /></span><div><strong>{lessonQuery.trim() ? `Tidak ada karya yang cocok dengan “${lessonQuery}”.` : `Belum ada karya terverifikasi dalam kategori ${currentWorkCategory?.name ?? "ini"}.`}</strong><p>{lessonQuery.trim() ? "Coba kata kunci lain atau hapus pencarian untuk melihat semua karya." : "Jelajahi kategori lain atau kirim karya agar dapat dibagikan kepada komunitas."}</p></div>{lessonQuery.trim() ? <button type="button" onClick={() => setLessonQuery("")}>Hapus pencarian</button> : <Link href="/ajukan">Ajukan karya <Icon name="arrow" size={14} /></Link>}</div>}
        </div>
      </section>
      </>}

      {activePage === "koleksi" && <>
      <section className="collection-page content-wrap" id="koleksi">
        <PageHeading eyebrow="KOLEKSI KARYA KONTRIBUTOR" icon="grid" title="Pengetahuan teruji, siap menginspirasi." description="Jelajahi karya pembelajaran yang telah diverifikasi. Temukan pengalaman dan gagasan yang dapat diterapkan dalam kegiatan belajar.">
          {!profileLoading && session && profile?.role === "kontributor" ? <a className="button button-primary" href="#koleksi-terverifikasi">Jelajahi koleksi <Icon name="arrow" size={17} /></a> : null}
        </PageHeading>
        {profileLoading ? <div className="upload-access-panel collection-access-panel" role="status"><span className="collection-empty-icon"><Icon name="user" size={23} /></span><h3>Memeriksa akses kontributor</h3><p>Tunggu sebentar sementara peran akun Anda diverifikasi.</p></div>
          : !session ? <div className="upload-access-panel collection-access-panel"><span className="collection-empty-icon"><Icon name="user" size={23} /></span><h3>Koleksi khusus kontributor</h3><p>Masuk dengan akun kontributor untuk menelusuri karya yang telah lolos verifikasi.</p><button type="button" className="button button-dark" onClick={() => setLoginOpen(true)}>Masuk sebagai kontributor <Icon name="arrow" size={16} /></button></div>
            : !profile ? <div className="upload-access-panel collection-access-panel" role="alert"><span className="collection-empty-icon"><Icon name="user" size={23} /></span><h3>Akses belum dapat diverifikasi</h3><p>Profil akun belum dapat dimuat. Coba buka Ruang Kerja atau hubungi administrator.</p><Link className="button button-dark" href="/ruang-kerja">Buka Ruang Kerja <Icon name="arrow" size={16} /></Link></div>
              : profile.role !== "kontributor" ? <div className="upload-access-panel collection-access-panel"><span className="collection-empty-icon"><Icon name="user" size={23} /></span><h3>Koleksi khusus kontributor</h3><p>Akun Anda memiliki peran {profile.role}. Daftar karya terverifikasi hanya dapat dilihat oleh kontributor.</p><Link className="button button-dark" href="/ruang-kerja">Kembali ke Ruang Kerja <Icon name="arrow" size={16} /></Link></div>
                : <div className="collection-list-section" id="koleksi-terverifikasi">
          <div className="collection-list-heading"><div><span className="eyebrow">KARYA TERVERIFIKASI</span><h2>Koleksi Saya</h2><p>Daftar karya Anda yang telah lolos verifikasi.</p></div><span className="lesson-total">{collectionSubmissions.length} KARYA</span></div>
          {contributorPhotoError && <p className="contributor-photo-warning" role="status">{contributorPhotoError}</p>}
          {verifiedSubmissionsError ? <p className="lesson-empty lesson-load-error" role="alert">{verifiedSubmissionsError}</p>
            : collectionSubmissions.length > 0 ? <div className="lesson-grid collection-works-grid">
              {collectionSubmissions.map((item) => <article className="lesson-card" key={item.id}>
                  <Link className="lesson-thumbnail-link" href={workHref(item.id, item.title)} aria-label={`Buka halaman ${item.title}`}><SubmissionThumbnail id={item.id} title={item.title} contentType={item.content_type} categorySlug={item.category_slug} youtubeUrl={item.youtube_url} thumbnailPath={item.thumbnail_path} accessToken={session?.access_token} /></Link>
                  <div className="lesson-meta"><CategoryLabel categorySlug={item.category_slug} /> <span>{item.content_type === "ebook" ? "PDF" : "VIDEO · DISETUJUI"}</span></div><h3><Link className="work-title-link" href={workHref(item.id, item.title)}>{item.title}</Link></h3><WorkDescription description={item.description} href={workHref(item.id, item.title)} title={item.title} /><div className="lesson-author"><div className="lesson-contributor"><ContributorPhoto name={item.full_name} path={item.profile_photo_path} /><Link href={`/kontributor/${item.profile_id}`}>{item.full_name}</Link></div><div className="lesson-author-actions"><span className="lesson-duration">{new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span><WorkSocialShare title={item.title} href={workHref(item.id, item.title)} compact /></div></div>
              </article>)}
            </div>
            : <div className="collection-empty"><span className="collection-empty-icon"><Icon name="book" size={26} /></span><h3>Belum ada karya terverifikasi</h3><p>Karya Anda yang disetujui verifikator akan tampil di sini.</p><Link className="text-link" href="/ajukan">Bagikan karya pertama <Icon name="arrow" size={16} /></Link></div>}
        </div>}
      </section>
      </>}

      {activePage === "widyaiswara" && selectedContributorId && <>
      <section className="contributor-profile content-wrap">
        <Link href="/kontributor" className="contributor-back"><Icon name="arrow" size={15} /> Semua kontributor</Link>
        {contributorLoading ? <div className="contributor-state" role="status">Memuat profil kontributor...</div>
          : contributorError ? <div className="contributor-state contributor-error" role="alert">{contributorError}</div>
          : selectedContributor && <>
            <article className="contributor-profile-hero">
              <ContributorPhoto name={selectedContributor.full_name} path={selectedContributor.profile_photo_path} className="contributor-profile-photo" width={142} height={142} loading="eager" />
              <div className="contributor-profile-content">
                <span className="contributor-profile-badge"><Icon name="star" size={14} />{selectedContributor.job_title || "Kontributor"}</span>
                <h1>{selectedContributor.full_name}</h1>
                <div className="contributor-profile-expertise">
                  <strong><Icon name="insight" size={15} />Bidang Keahlian:</strong>
                  <p>{selectedContributor.area_of_expertise || "Informasi bidang keahlian belum tersedia."}</p>
                </div>
                <p className="contributor-profile-bio">{selectedContributor.widyaiswara_experience || "Berbagi pengalaman, pengetahuan, dan karya untuk pembelajaran yang lebih bermakna."}</p>
                <div className="contributor-profile-work-count"><Icon name="book" size={17} /><span><strong>{contributorWorks.length}</strong> Karya Terbit</span></div>
              </div>
            </article>
            <section className="contributor-published-works">
              <div className="contributor-published-heading"><h2>Karya Terbit</h2><span>{contributorWorks.length} karya</span></div>
            {contributorWorks.length > 0 ? <div className="lesson-grid contributor-published-grid">
              {contributorWorks.map((item) => <article className="lesson-card" key={item.id}>
                <Link className="lesson-thumbnail-link" href={workHref(item.id, item.title)} aria-label={`Buka halaman ${item.title}`}><SubmissionThumbnail id={item.id} title={item.title} contentType={item.content_type} categorySlug={item.category_slug} youtubeUrl={item.youtube_url} thumbnailPath={item.thumbnail_path} accessToken={session?.access_token} /><span className="lesson-thumbnail-status">TERVERIFIKASI</span></Link>
                <div className="contributor-work-copy">
                  <CategoryLabel className="contributor-work-category" categorySlug={item.category_slug} />
                  <h3><Link className="work-title-link" href={workHref(item.id, item.title)}>{item.title}</Link></h3>
                  <WorkDescription description={item.description} href={workHref(item.id, item.title)} title={item.title} />
                  <div className="contributor-work-footer"><span>Terverifikasi</span><div className="contributor-work-footer-actions"><span>{new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span><WorkSocialShare title={item.title} href={workHref(item.id, item.title)} compact /></div></div>
                </div>
              </article>)}
            </div> : <div className="collection-empty"><span className="collection-empty-icon"><Icon name="book" size={24} /></span><h3>Belum ada karya terbit</h3><p>Karya yang telah disetujui akan tampil di sini. Sementara itu, jelajahi koleksi dari kontributor lainnya.</p><Link className="text-link" href="/koleksi">Jelajahi koleksi <Icon name="arrow" size={16} /></Link></div>}
            </section>
          </>}
      </section>
      </>}

      {activePage === "widyaiswara" && !selectedContributorId && <>
      <section className="collection-page content-wrap contributor-directory-page">
        <PageHeading eyebrow="DIREKTORI KONTRIBUTOR" icon="users" title="Kontributor PINISI" description="Temukan kontributor, bidang keahlian, dan karya pembelajaran yang telah mereka bagikan.">
          <span className="widyaiswara-directory-count"><Icon name="users" size={15} />{filteredPublicContributors.length}{contributorQuery.trim() ? ` / ${publicContributors.length}` : ""} kontributor</span>
        </PageHeading>
        <div className="contributor-directory-toolbar">
          <label className="contributor-directory-search"><Icon name="search" size={17} /><input type="search" value={contributorQuery} onChange={(event) => setContributorQuery(event.target.value)} placeholder="Cari nama, jabatan, atau keahlian..." aria-label="Cari kontributor" /></label>
          {contributorQuery && <button type="button" className="contributor-directory-clear" onClick={() => setContributorQuery("")}>Hapus pencarian</button>}
        </div>
          {contributorError ? <p className="contributor-state contributor-error" role="alert">{contributorError}</p>
          : filteredPublicContributors.length > 0 ? <div className="contributor-directory-grid">{filteredPublicContributors.map((contributor) => <article className="contributor-directory-card" key={contributor.id}>
            <Link className="contributor-directory-profile-link" href={`/kontributor/${contributor.id}`}>
              <div className="contributor-directory-card-heading">
                {contributor.profile_photo_path && supabase
                  ? <Image className="contributor-avatar" src={supabase.storage.from("profile-photos").getPublicUrl(contributor.profile_photo_path).data.publicUrl} alt="" width={62} height={62} unoptimized />
                  : <span className="contributor-avatar">{contributor.full_name.slice(0, 1).toLocaleUpperCase("id-ID")}</span>}
                <div className="contributor-directory-identity">
                  <h2>{contributor.full_name}</h2>
                  <span>{contributor.job_title || "Kontributor PINISI"}</span>
                </div>
              </div>
              <div className="directory-expertise-block">
                <span className="directory-expertise-label"><Icon name="insight" size={15} />Fokus Keahlian:</span>
                <p className="directory-expertise">{contributor.area_of_expertise || "Bidang keahlian belum dilengkapi."}</p>
              </div>
              {contributor.widyaiswara_experience.trim()
                && contributor.widyaiswara_experience.trim() !== contributor.area_of_expertise.trim()
                && contributor.widyaiswara_experience.trim() !== contributor.job_title.trim()
                && <p className="directory-bio">{contributor.widyaiswara_experience}</p>}
            </Link>
            <div className="contributor-directory-card-actions"><Link className="directory-action" href={`/kontributor/${contributor.id}`}>Lihat Profil &amp; Karya <Icon name="arrow" size={15} /></Link><WorkSocialShare title={`Profil ${contributor.full_name} | PINISI`} href={`/kontributor/${contributor.id}`} compact /></div>
          </article>)}</div>
          : publicContributors.length > 0 ? <div className="contributor-search-empty"><Icon name="search" size={21} /><p>Tidak ada kontributor yang cocok dengan pencarian.</p><button type="button" onClick={() => setContributorQuery("")}>Hapus pencarian</button></div>
            : <div className="collection-empty directory-empty"><span className="collection-empty-icon"><Icon name="users" size={25} /></span><h3>Profil kontributor segera hadir</h3><p>Direktori ini akan menampilkan profil, bidang keahlian, dan karya para kontributor PINISI</p><Link className="text-link" href="/koleksi">Jelajahi karya komunitas <Icon name="arrow" size={16} /></Link></div>}
      </section>
      </>}

      {activePage === "ajukan" && <>
      <section className="collection-page content-wrap upload-page" id="ajukan">
        <PageHeading eyebrow="UNGGAH KARYA PEMBELAJARAN" icon="upload" title="Bagikan karya pembelajaran Anda." description="Pilih kategori untuk memulai pengajuan. Video menggunakan tautan YouTube; E-Book, Review, Best Practice, Science, dan Insight menggunakan PDF. Gambar sampul dibatasi 500 KB." className="upload-page-heading">
          {session && profile?.role === "kontributor" ? <><a className="button" href="#formulir-pengajuan">Mulai mengunggah <Icon name="arrow" size={17} /></a><a className="button button-hero-secondary" href="#kontribusiku">Karya saya <Icon name="arrow" size={17} /></a></> : !session ? <button className="button" onClick={() => setLoginOpen(true)}>Masuk untuk mengunggah <Icon name="arrow" size={17} /></button> : <Link className="button" href="/ruang-kerja">Buka Ruang Kerja <Icon name="arrow" size={17} /></Link>}
        </PageHeading>
        {message && <div className={`workspace-message${message.includes("berhasil") ? " success" : ""}`} role="status">{message}<button type="button" onClick={() => setMessage("")} aria-label="Tutup pesan"><Icon name="close" size={15} /></button></div>}
        <div className="upload-steps">
          <article><span>01</span><Icon name="user" size={19} /><strong>Lengkapi profil</strong><p>Pastikan bidang keahlian dan pengalaman Anda sudah tercantum.</p></article>
          <article><span>02</span><Icon name="grid" size={19} /><strong>Pilih kategori karya</strong><p>Video memakai tautan YouTube; lima kategori lainnya memakai PDF.</p></article>
          <article><span>03</span><Icon name="check" size={19} /><strong>Kirim untuk verifikasi</strong><p>Pantau status dan perbarui pengajuan dari halaman ini.</p></article>
        </div>
        {session && profile?.role === "kontributor" ? <>
        <div className="workspace-grid upload-workspace-grid" id="formulir-pengajuan">
          <div className="workspace-panel upload-form-panel">
            <form onSubmit={submitContribution} className="contribution-form">
              <div className="contribution-form-heading">
                <div className="contribution-form-heading-title"><span className="contribution-form-heading-icon"><Icon name="upload" size={19} /></span><div><span className="eyebrow">FORMULIR PENGAJUAN</span><h3>Ajukan karya</h3></div><span className="role-badge">Kontributor</span></div>
                <div className="contribution-category-field">
                  <label htmlFor="category_slug"><Icon name="grid" size={15} />Kategori karya</label>
                  <select id="category_slug" name="category_slug" value={contributionCategory} onChange={(event) => {
                    const category = workCategories.find((item) => item.slug === event.target.value);
                    if (category) setContributionCategory(category.slug);
                  }} required>{workCategories.map((category) => <option value={category.slug} key={category.slug}>{category.name} — {category.description}</option>)}</select>
                  <small className="contribution-category-hint">Kategori Video menampilkan kolom tautan embed YouTube. Lima kategori lainnya menampilkan unggahan PDF.</small>
                </div>
              </div>
              <label htmlFor="title">Judul materi</label><input id="title" name="title" placeholder="Contoh: Teknik fasilitasi kelas interaktif" required maxLength={120} />
              <label htmlFor="description">Deskripsi</label><textarea id="description" name="description" placeholder="Jelaskan tujuan dan isi materi ajar..." rows={4} required maxLength={2000} />
              <label htmlFor="thumbnail">Gambar sampul (wajib, JPG/PNG/WebP, maks. 500 KB)</label><input id="thumbnail" name="thumbnail" type="file" accept="image/jpeg,image/png,image/webp" required /><small className="upload-hint">Gambar akan ditampilkan pada kartu dan halaman karya. Gunakan orientasi landscape dengan rasio lebar sekitar 1,4–2,5 kali tinggi.</small>
              {contributionType === "video"
                ? <><label htmlFor="youtube_url">Tautan video YouTube</label><input id="youtube_url" name="youtube_url" type="url" placeholder="https://www.youtube.com/watch?v=..." required /><small className="upload-hint">Kolom ini hanya tampil untuk kategori Video.</small></>
                : <><label htmlFor="document">Berkas karya (PDF)</label><input id="document" name="document" type="file" accept="application/pdf,.pdf" required /><small className="upload-hint">Kolom PDF tampil untuk semua kategori selain Video.</small></>}
              <button className="button button-primary" disabled={busy}>{busy ? "Mengirim..." : "Ajukan untuk verifikasi"} <Icon name="arrow" size={16} /></button>
            </form>
          </div>
          <aside className="workspace-panel upload-info-panel"><span className="upload-info-icon"><Icon name={contributionType === "video" ? "video" : "book"} size={24} /></span><span className="eyebrow">SEBELUM MENGIRIM</span><h3>Pastikan karya siap dibagikan.</h3><p>{contributionType === "video" ? "Kategori Video menggunakan tautan YouTube. Pastikan tautan dapat dibuka dan mengarah ke materi yang ingin dibagikan." : "Kategori ini menggunakan dokumen PDF yang jelas dan terbaca."}</p><ul><li><Icon name="check" size={15} /> Gambar sampul maksimal 500 KB</li><li><Icon name="check" size={15} /> Materi mendukung pembelajaran</li><li><Icon name="check" size={15} /> Status dapat dipantau di halaman ini</li></ul></aside>
        </div>
        <section className="workspace-panel submissions-panel contributor-submissions-panel" id="kontribusiku">
          <div className="panel-title"><div><span className="eyebrow">KARYA SAYA</span><h3>Riwayat kiriman</h3><p className="workspace-intro">Pantau karya yang pernah Anda kirim dan tindak lanjut status verifikasinya.</p></div><span className="submission-count">{submissions.length.toString().padStart(2, "0")}</span></div>
          {submissions.length === 0 ? <div className="no-submissions"><Icon name="file" size={24} /><p>Belum ada karya yang dikirim.</p><a className="submission-detail-link" href="#formulir-pengajuan">Mulai unggah karya <Icon name="arrow" size={15} /></a></div> : <div className="submission-list contributor-submission-list">{submissions.map((item) => <article className="submission-item contributor-submission-item" key={item.id}>
            <div className="submission-top"><span className={`status status-${item.status}`}>{item.status === "pending" ? "Menunggu verifikasi" : item.status === "approved" ? "Terverifikasi" : "Perlu revisi"}</span><time>{new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</time></div>
            {editingId === item.id ? <><SubmissionThumbnail id={item.id} title={item.title} contentType={item.content_type} categorySlug={item.category_slug} youtubeUrl={item.youtube_url} thumbnailPath={item.thumbnail_path} accessToken={session?.access_token} className="submission-list-thumbnail" /><form className="contribution-form edit-post-form" onSubmit={(event) => saveSubmission(event, item.id)}>
              <label htmlFor={`edit_title_${item.id}`}>Judul</label><input id={`edit_title_${item.id}`} name="edit_title" defaultValue={item.title} required maxLength={120} />
              <label htmlFor={`edit_description_${item.id}`}>Deskripsi</label><textarea id={`edit_description_${item.id}`} name="edit_description" defaultValue={item.description} rows={4} required maxLength={2000} />
              <label htmlFor={`edit_category_slug_${item.id}`}>Kategori karya</label><select id={`edit_category_slug_${item.id}`} name="edit_category_slug" defaultValue={item.category_slug} required>{[...workCategories, ...legacyWorkCategories.filter((category) => category.slug === item.category_slug)].filter((category) => category.slug === item.category_slug || (item.content_type === "video") === (category.slug === "video")).map((category) => <option value={category.slug} key={category.slug}>{category.name} — {category.description}</option>)}</select>
              <label htmlFor={`edit_thumbnail_${item.id}`}>Ganti gambar sampul (opsional, JPG/PNG/WebP, maks. 500 KB)</label><input id={`edit_thumbnail_${item.id}`} name="edit_thumbnail" type="file" accept="image/jpeg,image/png,image/webp" /><small className="upload-hint">Kosongkan jika gambar saat ini tetap digunakan.</small>
              {item.content_type === "video"
                ? <><label htmlFor={`edit_youtube_url_${item.id}`}>Tautan video YouTube</label><input id={`edit_youtube_url_${item.id}`} name="edit_youtube_url" type="url" defaultValue={item.youtube_url ?? ""} required /></>
                : <><label htmlFor={`edit_document_${item.id}`}>Ganti file PDF (opsional)</label><input id={`edit_document_${item.id}`} name="edit_document" type="file" accept="application/pdf,.pdf" /></>}
              <div className="review-actions"><button type="submit" disabled={busy}>Simpan perubahan</button><button type="button" onClick={() => setEditingId(null)}>Batal</button></div>
            </form></> : <>
              <div className="contributor-submission-summary">
                <SubmissionThumbnail id={item.id} title={item.title} contentType={item.content_type} categorySlug={item.category_slug} youtubeUrl={item.youtube_url} thumbnailPath={item.thumbnail_path} accessToken={session?.access_token} className="contributor-submission-thumbnail" />
                <div className="contributor-submission-copy">
                  <div className="submission-kind">{item.content_type === "ebook" ? <Icon name="book" size={15} /> : <Icon name="video" size={15} />}{item.content_type === "ebook" ? "PDF" : "VIDEO"}<CategoryLabel className="submission-category" categorySlug={item.category_slug} /></div>
                  <h4>{item.status === "approved" ? <Link className="work-title-link" href={workHref(item.id, item.title)}>{item.title}</Link> : item.title}</h4>
                  <p className="submission-description">{item.description}</p>
                </div>
              </div>
              {item.feedback && <p className="review-feedback">{item.feedback}</p>}
              {item.status === "pending"
                ? <div className="review-actions"><button type="button" onClick={() => setEditingId(item.id)}>Edit pengajuan</button></div>
                : item.status === "approved" && <Link className="submission-detail-link" href={workHref(item.id, item.title)}>Buka halaman karya <Icon name="arrow" size={15} /></Link>}
            </>}
          </article>)}</div>}
        </section>
        </> : !session ? <div className="upload-access-panel"><span className="collection-empty-icon"><Icon name="upload" size={23} /></span><h3>Masuk untuk mulai berbagi karya</h3><p>Gunakan tombol masuk di atas untuk membuka formulir, memilih kategori, dan mengirim karya untuk diverifikasi.</p></div> : <div className="upload-access-panel"><span className="collection-empty-icon"><Icon name="user" size={23} /></span><h3>Fitur unggah untuk akun kontributor</h3><p>Akun Anda memiliki peran {profile?.role}. Gunakan tombol profil di atas untuk mengelola akun.</p></div>}
      </section>
      </>}

      {workspacePage && <>
      <section className="workspace-section content-wrap" id="ruang-kerja">
        <PageHeading
          className="workspace-page-heading"
          eyebrow={activePage === "admin-akun" ? "ADMINISTRATOR / MANAJEMEN AKUN" : submissionManagementView ? `${adminRole ? "ADMINISTRATOR" : "VERIFIKATOR"} / MANAJEMEN POSTINGAN` : profile?.role === "kontributor" ? "PROFIL KONTRIBUTOR" : "RUANG KERJA"}
          title={activePage === "admin-akun" ? "Kelola akun Kontributor dan Verifikator" : submissionManagementView ? "Kelola postingan karya." : profile?.role === "kontributor" ? "Profil profesional." : profile ? `Selamat datang, ${profile.full_name}.` : "Ruang kerja untuk profil dan karya."}
          description={activePage === "admin-akun" ? "Buat akun, atur peran, dan kelola profil tim dari satu tempat." : submissionManagementView ? "Tinjau seluruh postingan kontributor, pantau status verifikasi, dan hapus karya bila diperlukan." : profile?.role === "kontributor" ? "Kelola data diri dan informasi profesional yang ditampilkan pada profil publik Anda." : profile ? "Kelola komunitas, tinjau pengajuan, dan terbitkan karya yang menginspirasi." : "Satu tempat untuk mengelola profil serta meninjau kontribusi komunitas."}
        >
          {session && <div className="workspace-hero-actions">{verifierRole && <a className="button button-outline workspace-public-link" href="#daftar-pengajuan"><Icon name="file" size={16} /> Tinjau pengajuan ({submissions.filter((item) => item.status === "pending").length})</a>}{profile?.role === "kontributor" && <><Link className="button button-outline workspace-public-link" href={`/kontributor/${profile.id}`}><Icon name="user" size={16} /> Lihat profil publik</Link><Link className="button button-outline workspace-public-link" href="/ajukan"><Icon name="upload" size={16} /> Unggah karya</Link></>}<button className="button button-outline workspace-signout" onClick={signOut}>Keluar <Icon name="arrow" size={16} /></button></div>}
        </PageHeading>
        {session && profile && adminRole && <nav className="admin-management-nav" aria-label="Halaman administrasi">
          <Link className={activePage === "ruang-kerja" ? "active" : ""} href="/ruang-kerja"><Icon name="grid" size={17} /><span><strong>Ringkasan</strong><small>Ikhtisar ruang kerja</small></span></Link>
          <Link className={activePage === "admin-akun" ? "active" : ""} href="/ruang-kerja/akun"><Icon name="users" size={17} /><span><strong>Kelola akun</strong><small>{managedAccounts.length} akun</small></span></Link>
          <Link className={activePage === "admin-postingan" ? "active" : ""} href="/ruang-kerja/postingan"><Icon name="file" size={17} /><span><strong>Kelola postingan</strong><small>{submissions.length} postingan</small></span></Link>
        </nav>}
        {session && profile && adminRole && activePage === "admin-akun" && <section className="admin-account-overview" aria-label="Ringkasan akun komunitas">
          <div className="admin-account-overview-heading"><span className="eyebrow">KONSOL MANAJEMEN</span><strong>Ringkasan akun</strong></div>
          <div className="admin-account-stat"><span>SELURUH AKUN</span><strong>{managedAccounts.length}</strong><small>Kontributor dan verifikator</small></div>
          <div className="admin-account-stat"><span>KONTRIBUTOR</span><strong>{managedAccounts.filter((account) => account.role === "kontributor").length}</strong><small>Pengelola karya komunitas</small></div>
          <div className="admin-account-stat"><span>VERIFIKATOR</span><strong>{managedAccounts.filter((account) => account.role === "verifikator").length}</strong><small>Tim pemeriksa pengajuan</small></div>
        </section>}
        {profile?.role === "kontributor" && <div className="workspace-profile-summary"><span className="workspace-profile-avatar">{profile.full_name.slice(0, 1).toLocaleUpperCase("id-ID")}</span><div><strong>{profile.full_name}</strong><span>{profile.job_title || "Kontributor"} · Profil profesional publik</span></div><span className="role-badge">Kontributor</span></div>}
        {accountCreatedNotice && <div className="account-created-notice" role="status"><span className="account-created-check"><Icon name="check" size={17} /></span><span>{accountCreatedNotice}</span><button type="button" onClick={() => setAccountCreatedNotice("")} aria-label="Tutup notifikasi"><Icon name="close" size={15} /></button></div>}
        {message && <div className={message.includes("berhasil") ? "workspace-message success" : "workspace-message"} role="status">{message}<button onClick={() => setMessage("")} aria-label="Tutup pesan"><Icon name="close" size={15} /></button></div>}
        {!session && <div className="upload-access-panel collection-access-panel workspace-access-panel">
          <span className="collection-empty-icon"><Icon name="user" size={23} /></span>
          <h3>{adminManagementPage ? "Masuk untuk mengelola komunitas" : "Masuk ke Ruang Kerja"}</h3>
          <p>{adminManagementPage ? "Halaman ini khusus administrator untuk mengelola akun dan postingan komunitas." : "Kelola profil, ajukan karya, atau tinjau kontribusi komunitas sesuai peran akun Anda."}</p>
          <button type="button" className="button button-dark" onClick={() => setLoginOpen(true)}>Masuk ke Ruang Kerja <Icon name="arrow" size={16} /></button>
          {!adminManagementPage && <span className="role-list">ADMIN <i /> VERIFIKATOR <i /> KONTRIBUTOR</span>}
        </div>}
        {session && profile && adminManagementPage && !adminRole && !(verifierRole && activePage === "admin-postingan") && <div className="admin-access-denied" role="alert"><Icon name="user" size={21} /><div><strong>Halaman khusus administrator</strong><p>Akun Anda tidak memiliki izin untuk membuka pengelolaan akun atau postingan.</p></div><Link href="/ruang-kerja">Kembali ke Ruang Kerja <Icon name="arrow" size={15} /></Link></div>}
        {session && profile && adminRole && activePage === "ruang-kerja" && <section className="admin-overview" aria-label="Ringkasan administrasi">
          <div className="admin-overview-copy"><span className="eyebrow">PANEL ADMINISTRATOR</span><h3>Kelola komunitas dan karya.</h3><p>Buat akun tim, pantau profil anggota, dan atur materi yang siap dipublikasikan.</p></div>
          <div className="admin-overview-session"><span><Icon name="check" size={13} /> ADMIN AKTIF</span><strong>{profile.full_name}</strong></div>
          <div className="admin-overview-stats">
            <article><span className="admin-overview-stat-icon"><Icon name="users" size={17} /></span><div><span>SELURUH AKUN</span><strong>{managedAccounts.length}</strong><small>Kontributor dan verifikator</small></div></article>
            <article><span className="admin-overview-stat-icon"><Icon name="file" size={17} /></span><div><span>SELURUH PENGAJUAN</span><strong>{submissions.length}</strong><small>Semua status karya</small></div></article>
            <article><span className="admin-overview-stat-icon"><Icon name="check" size={17} /></span><div><span>MENUNGGU VERIFIKASI</span><strong>{submissions.filter((submission) => submission.status === "pending").length}</strong><small>Perlu ditinjau tim</small></div></article>
          </div>
          <div className="admin-overview-links">
            <Link href="/ruang-kerja/akun"><span className="admin-overview-link-icon"><Icon name="users" size={20} /></span><span><strong>Kelola akun</strong><small>Buat akun, cari anggota, dan perbarui peran atau profil.</small></span><Icon name="arrow" size={17} /></Link>
            <Link href="/ruang-kerja/postingan"><span className="admin-overview-link-icon"><Icon name="file" size={20} /></span><span><strong>Kelola postingan</strong><small>Atur karya kontributor dan status penayangannya.</small></span><Icon name="arrow" size={17} /></Link>
          </div>
        </section>}
        {session && profile && (!adminManagementPage || adminRole || verifierRole && activePage === "admin-postingan") && <div className={`workspace-grid${adminRole || submissionManagementView ? " admin-workspace-grid" : ""}${profile.role === "kontributor" ? " contributor-profile-grid" : ""}${adminManagementPage || submissionManagementView ? " admin-management-grid" : ""}${activePage === "admin-akun" ? " admin-accounts-grid" : ""}`}>
          {activePage !== "admin-postingan" && !submissionManagementView &&
          <div className={`workspace-panel${adminRole ? " admin-workspace-panel" : ""}`}>
            <div className="panel-title"><div><span className="eyebrow">{adminRole && activePage === "admin-akun" ? "PUSAT MANAJEMEN AKUN" : profile.role === "kontributor" ? "DATA PROFIL" : "PROFIL PROFESIONAL"}</span><h3>{adminRole && activePage === "admin-akun" ? "Akun kontributor & verifikator" : profile.role === "kontributor" ? "Informasi kontributor" : "Biodata dan keahlian"}</h3></div><span className="role-badge">{profile.role}</span></div>
            {adminRole && activePage === "admin-akun" && <div className="submit-box account-box"><div className="account-create-heading"><span className="account-create-icon"><Icon name="users" size={19} /></span><div><span className="eyebrow">MANAJEMEN AKUN</span><h3>Buat akun tim</h3></div></div><p className="account-create-description">Tambahkan verifikator untuk membantu proses peninjauan atau kontributor untuk berbagi karya.</p><form onSubmit={createAccount} onChange={() => setAccountCreateError("")} className="contribution-form">
              <div className="account-form-field"><label htmlFor="account_full_name">Nama lengkap</label><input id="account_full_name" name="account_full_name" required maxLength={100} /></div>
              <div className="account-form-field"><label htmlFor="account_job_title">Jabatan</label><input id="account_job_title" name="account_job_title" placeholder="Contoh: Kontributor Ahli Madya" required maxLength={120} /></div>
              <div className="account-form-field"><label htmlFor="account_profile_photo">Foto profil (JPG, PNG, atau WebP; maks. 500 KB)</label><input id="account_profile_photo" name="account_profile_photo" type="file" accept="image/jpeg,image/png,image/webp" /></div>
              <div className="account-form-field"><label htmlFor="account_email">Alamat email</label><input id="account_email" name="account_email" type="email" autoComplete="off" required /></div>
              <div className="account-form-field"><label htmlFor="account_password">Kata sandi sementara (min. 8 karakter)</label><input id="account_password" name="account_password" type="password" autoComplete="new-password" minLength={8} required /></div>
              <div className="account-form-field"><label htmlFor="account_role">Peran</label><select id="account_role" name="account_role" value={newAccountRole} onChange={(event) => setNewAccountRole(event.target.value === "verifikator" ? "verifikator" : "kontributor")}><option value="kontributor">Kontributor</option><option value="verifikator">Verifikator</option></select></div>
              {newAccountRole === "kontributor" && <>
                <div className="account-form-field"><label htmlFor="account_area_of_expertise">Bidang keahlian</label><textarea id="account_area_of_expertise" name="account_area_of_expertise" placeholder="Contoh: desain pembelajaran, kepemimpinan, atau evaluasi program" rows={2} maxLength={500} required /></div>
                <div className="account-form-field"><label htmlFor="account_widyaiswara_experience">Pengalaman sebagai kontributor</label><textarea id="account_widyaiswara_experience" name="account_widyaiswara_experience" placeholder="Ceritakan pengalaman kerja, instansi, atau program yang pernah ditangani..." rows={3} maxLength={2000} required /></div>
              </>}
              <button type="submit" className="button button-primary" disabled={busy}>{busy ? "Membuat akun..." : "Buat akun"} <Icon name="arrow" size={16} /></button>
            </form>{accountCreateError && <p className="account-create-error" role="alert" aria-live="assertive">{accountCreateError}</p>}<p className="account-help">Akun langsung aktif. Sampaikan email dan kata sandi sementara secara aman kepada pemilik akun.</p></div>}
              {adminRole && activePage === "admin-akun" && <section className="invitation-manager" aria-labelledby="invitation-manager-title">
                <div className="managed-account-heading"><div><span className="eyebrow">PENDAFTARAN KONTRIBUTOR</span><h4 id="invitation-manager-title">Kode undangan</h4></div><span className="managed-account-count">{invitations.filter((item) => item.is_active).length} aktif</span></div>
                <p className="invitation-manager-description">Buat kode yang bisa digunakan berulang. Bagikan tautan pendaftaran beserta kodenya kepada calon kontributor. Kode dapat dicabut kapan saja.</p>
                <form className="invitation-create-form" onSubmit={createInvitation}>
                  <label htmlFor="invitation_label">Nama kode (opsional)</label>
                  <input id="invitation_label" value={invitationLabel} onChange={(event) => setInvitationLabel(event.target.value)} maxLength={100} placeholder="Contoh: Undangan pelatihan 2026" />
                  <button type="submit" className="button button-primary" disabled={invitationBusy}>{invitationBusy ? "Membuat kode..." : "Buat kode undangan"} <Icon name="plus" size={16} /></button>
                </form>
                {invitationCode && <div className="invitation-created" role="status">
                  <div><span className="eyebrow">KODE BARU — SALIN SEKARANG</span><strong>{invitationCode.match(/.{1,4}/g)?.join("-") ?? invitationCode}</strong></div>
                  <button type="button" className="button button-outline" onClick={copyInvitationDetails}>Salin tautan + kode</button>
                </div>}
                {invitationError && <p className="account-create-error" role="alert">{invitationError}</p>}
                {invitationNotice && <p className="invitation-notice" role="status">{invitationNotice}</p>}
                <div className="invitation-list">
                  {invitationsLoading
                    ? <p className="managed-account-empty" role="status">Memuat kode undangan...</p>
                    : invitations.length === 0
                      ? <p className="managed-account-empty">Belum ada kode undangan.</p>
                      : invitations.map((invitation) => <article className="invitation-item" key={invitation.id}>
                        <div><strong>{invitation.label}</strong><span>Dibuat {new Date(invitation.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span></div>
                        <span className={`invitation-status${invitation.is_active ? " active" : ""}`}>{invitation.is_active ? "Aktif" : "Dicabut"}</span>
                        <button type="button" className="invitation-toggle" disabled={invitationBusy} onClick={() => void toggleInvitation(invitation)}>{invitation.is_active ? "Cabut kode" : "Aktifkan kembali"}</button>
                      </article>)}
                </div>
              </section>}
              {adminRole && activePage === "admin-akun" && <section className="managed-account-roster" aria-label="Manajemen akun kontributor dan verifikator">
                <div className="managed-account-heading"><div><span className="eyebrow">MANAJEMEN PENGGUNA</span><h4>Daftar kontributor &amp; verifikator</h4></div><span className="managed-account-count" aria-label={`${filteredManagedAccounts.length} dari ${managedAccounts.length} akun ditampilkan`}>{filteredManagedAccounts.length}/{managedAccounts.length}</span></div>
                <div className="managed-account-toolbar">
                  <label className="managed-account-search"><Icon name="search" size={17} /><input type="search" value={managedAccountQuery} onChange={(event) => setManagedAccountQuery(event.target.value)} placeholder="Cari nama, jabatan, atau keahlian..." aria-label="Cari akun kontributor atau verifikator" /></label>
                  <div className="managed-account-filters" role="group" aria-label="Filter peran akun">
                    {([{ value: "all", label: "Semua" }, { value: "kontributor", label: "Kontributor" }, { value: "verifikator", label: "Verifikator" }] as const).map((filter) => <button type="button" key={filter.value} className={managedAccountRoleFilter === filter.value ? "active" : ""} aria-pressed={managedAccountRoleFilter === filter.value} onClick={() => setManagedAccountRoleFilter(filter.value)}>{filter.label}<span>{filter.value === "all" ? managedAccounts.length : managedAccounts.filter((account) => account.role === filter.value).length}</span></button>)}
                  </div>
                </div>
                {managedAccountError && <p className="account-create-error" role="alert">{managedAccountError}</p>}
                {managedAccounts.length > 0 && <div className="managed-account-table-head" aria-hidden="true"><span>Akun</span><span>Profil</span><span>Peran</span><span>Dibuat</span><span>Aksi</span></div>}
                {managedAccounts.length === 0
                  ? <p className="managed-account-empty">Belum ada akun kontributor atau verifikator.</p>
                  : filteredManagedAccounts.length === 0
                    ? <p className="managed-account-empty">Tidak ada akun yang cocok dengan pencarian atau filter ini.</p>
                    : <div className="managed-account-list">{filteredManagedAccounts.map((account) => <article className="managed-account" key={account.id}>
                      <div className="managed-account-top"><div className="managed-account-identity">{account.profile_photo_path ? <Image src={supabase?.storage.from("profile-photos").getPublicUrl(account.profile_photo_path).data.publicUrl ?? ""} alt="" width={46} height={46} unoptimized /> : <span className="managed-account-avatar">{account.full_name.slice(0, 1).toLocaleUpperCase("id-ID")}</span>}<div><strong>{account.full_name}</strong><span>{account.job_title}</span></div></div><span className={`managed-account-role role-${account.role}`}>{account.role}</span><time className="managed-account-created" dateTime={account.created_at}>{new Date(account.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</time></div>
                      {editingAccountId === account.id ? <form className="managed-account-edit-form" onSubmit={(event) => updateManagedAccount(event, account.id)}>
                        <label htmlFor={`managed_full_name_${account.id}`}>Nama lengkap</label><input id={`managed_full_name_${account.id}`} name="managed_full_name" defaultValue={account.full_name} required maxLength={100} />
                        <label htmlFor={`managed_job_title_${account.id}`}>Jabatan</label><input id={`managed_job_title_${account.id}`} name="managed_job_title" defaultValue={account.job_title} required maxLength={120} />
                        <label htmlFor={`managed_role_${account.id}`}>Peran akun</label><select id={`managed_role_${account.id}`} name="managed_role" value={managedAccountEditRole ?? account.role} onChange={(event) => setManagedAccountEditRole(event.target.value as ManagedAccountRole)}><option value="kontributor">Kontributor</option><option value="verifikator">Verifikator</option></select>
                        <label htmlFor={`managed_area_of_expertise_${account.id}`}>Bidang keahlian</label><textarea id={`managed_area_of_expertise_${account.id}`} name="managed_area_of_expertise" defaultValue={account.area_of_expertise} rows={2} maxLength={500} required={managedAccountEditRole === "kontributor"} />
                        <label htmlFor={`managed_widyaiswara_experience_${account.id}`}>Pengalaman profesional</label><textarea id={`managed_widyaiswara_experience_${account.id}`} name="managed_widyaiswara_experience" defaultValue={account.widyaiswara_experience} rows={3} maxLength={2000} required={managedAccountEditRole === "kontributor"} />
                        <label htmlFor={`managed_bio_${account.id}`}>Profil profesional</label><textarea id={`managed_bio_${account.id}`} name="managed_bio" defaultValue={account.bio ?? ""} rows={3} maxLength={1000} />
                        <div className="managed-account-edit-actions"><button className="button button-primary" type="submit" disabled={busy}>{busy ? "Menyimpan..." : "Simpan perubahan"}</button><button className="button button-outline" type="button" onClick={() => { setEditingAccountId(null); setManagedAccountEditRole(null); setManagedAccountError(""); }}>Batal</button></div>
                      </form> : <>
                        <div className="managed-account-summary"><p><b>Bidang keahlian</b>{account.area_of_expertise || "Belum dilengkapi"}</p><details className="managed-account-details"><summary>Detail profil</summary><p><b>Pengalaman profesional</b>{account.widyaiswara_experience || "Belum dilengkapi"}</p>{account.bio && <p><b>Profil profesional</b>{account.bio}</p>}</details></div>
                        <div className="managed-account-actions"><button type="button" className="managed-account-edit-button" onClick={() => { setManagedAccountError(""); setManagedAccountEditRole(account.role); setEditingAccountId(account.id); }}>Kelola akun</button><button type="button" className="managed-account-delete-button" onClick={() => void deleteManagedAccount(account)} disabled={busy}>Hapus akun</button></div>
                      </>}
                    </article>)}</div>}
              </section>}
            {(!adminRole || activePage === "ruang-kerja") && <form onSubmit={updateBio} className="bio-form">
              {profile.role === "kontributor" && <div className="profile-photo-field">
                <div className="profile-photo-preview">{profile.profile_photo_path && supabase
                  ? <Image src={supabase.storage.from("profile-photos").getPublicUrl(profile.profile_photo_path).data.publicUrl} alt={`Foto profil ${profile.full_name}`} width={76} height={76} unoptimized />
                  : <span>{profile.full_name.slice(0, 1).toLocaleUpperCase("id-ID")}</span>}</div>
                <div className="profile-photo-copy"><label htmlFor="profile_photo">Foto profil</label><input id="profile_photo" name="profile_photo" type="file" accept="image/jpeg,image/png,image/webp" /><small>JPG, PNG, atau WebP · maksimal 500 KB</small></div>
              </div>}
              <label htmlFor="full_name">Nama lengkap</label><input id="full_name" name="full_name" defaultValue={profile.full_name} required maxLength={100} />
              <label htmlFor="job_title">Jabatan</label><input id="job_title" name="job_title" defaultValue={profile.job_title} required maxLength={120} />
              {profile.role === "kontributor" && <>
                <label htmlFor="area_of_expertise">Bidang keahlian</label><textarea id="area_of_expertise" name="area_of_expertise" defaultValue={profile.area_of_expertise} placeholder="Tuliskan bidang keahlian utama Anda..." rows={2} maxLength={500} required />
                <label htmlFor="widyaiswara_experience">Pengalaman profesional sebagai kontributor</label><textarea id="widyaiswara_experience" name="widyaiswara_experience" defaultValue={profile.widyaiswara_experience} placeholder="Ceritakan pengalaman, instansi, program, dan kontribusi Anda sebagai kontributor..." rows={4} maxLength={2000} required />
                <label htmlFor="bio">Profil profesional lainnya (opsional)</label><textarea id="bio" name="bio" defaultValue={profile.bio ?? ""} placeholder="Tambahkan informasi profesional lain yang ingin dibagikan..." rows={3} maxLength={1000} />
              </>}
              {profile.role !== "kontributor" && <><label htmlFor="bio">Profil profesional dan keahlian mengajar</label><textarea id="bio" name="bio" defaultValue={profile.bio ?? ""} placeholder="Ceritakan bidang keahlian dan pengalaman mengajarmu..." rows={4} maxLength={1000} /></>}
              <button className="button button-dark" disabled={busy}>Simpan profil <Icon name="arrow" size={16} /></button>
            </form>}
            {profile.role === "kontributor" && <section className="password-settings">
              <div className="password-settings-heading"><span className="workspace-security-icon"><Icon name="check" size={18} /></span><div><span className="eyebrow">KEAMANAN AKUN</span><h3>Ganti kata sandi</h3></div></div>
              <p>Gunakan kata sandi baru minimal 8 karakter untuk menjaga keamanan akun Anda.</p>
              <form onSubmit={updatePassword} className="bio-form password-form">
                <label htmlFor="new_password">Kata sandi baru</label><input id="new_password" name="new_password" type="password" autoComplete="new-password" minLength={8} required />
                <label htmlFor="confirm_password">Konfirmasi kata sandi baru</label><input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" minLength={8} required />
                <button className="button button-outline" disabled={busy}>{busy ? "Memperbarui..." : "Perbarui kata sandi"} <Icon name="arrow" size={16} /></button>
              </form>
              {passwordMessage && <p className={`password-feedback${passwordMessage.includes("berhasil") ? " success" : ""}`} role={passwordMessage.includes("berhasil") ? "status" : "alert"}>{passwordMessage}</p>}
            </section>}
          </div>}
          {submissionManagementView && <div className="workspace-panel submissions-panel admin-posts-panel" id="daftar-pengajuan"><div className="panel-title"><div><span className="eyebrow">{verifierRole ? "ANTREAN VERIFIKASI" : "SELURUH PENGAJUAN"}</span><h3>{verifierRole ? "Tinjau karya kontributor" : "Kelola materi kontributor"}</h3></div><span className="submission-count">{submissions.length.toString().padStart(2, "0")}</span></div>
            <div className="admin-post-toolbar"><label className="admin-post-search"><Icon name="search" size={17} /><input type="search" value={submissionQuery} onChange={(event) => setSubmissionQuery(event.target.value)} placeholder="Cari judul, kontributor, atau kategori..." aria-label="Cari postingan kontributor" /></label><div className="managed-account-filters" role="group" aria-label="Filter status postingan">{([{ value: "all", label: "Semua" }, { value: "pending", label: "Menunggu" }, { value: "approved", label: "Terverifikasi" }, { value: "rejected", label: "Revisi" }] as const).map((filter) => <button type="button" key={filter.value} className={submissionStatusFilter === filter.value ? "active" : ""} aria-pressed={submissionStatusFilter === filter.value} onClick={() => setSubmissionStatusFilter(filter.value)}>{filter.label}<span>{filter.value === "all" ? submissions.length : submissions.filter((item) => item.status === filter.value).length}</span></button>)}</div></div>
            {filteredSubmissions.length > 0 && <div className="admin-post-table-head" aria-hidden="true"><span>Detail karya</span><span>Format / kategori</span><span>Status</span><span>Tanggal</span><span>Aksi</span></div>}
            {submissions.length === 0 ? <div className="no-submissions"><Icon name="file" size={24} /><p>{verifierRole ? "Belum ada pengajuan dari kontributor." : "Belum ada materi di sini."}</p></div> : filteredSubmissions.length === 0 ? <div className="no-submissions"><Icon name="search" size={24} /><p>{verifierRole && submissionStatusFilter === "pending" && !submissionQuery.trim() ? "Tidak ada pengajuan yang menunggu verifikasi." : "Tidak ada postingan yang cocok dengan pencarian atau filter."}</p></div> : <div className="submission-list">{filteredSubmissions.map((item) => <article className="submission-item" key={item.id}><div className="submission-top"><span className={`status status-${item.status}`}>{item.status === "pending" ? "Menunggu verifikasi" : item.status === "approved" ? "Terverifikasi" : "Perlu revisi"}</span><time>{new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</time></div>{editingId === item.id ? <form className="contribution-form edit-post-form" onSubmit={(event) => saveSubmission(event, item.id)}>
              <label htmlFor={`edit_title_${item.id}`}>Judul</label><input id={`edit_title_${item.id}`} name="edit_title" defaultValue={item.title} required maxLength={120} />
              <label htmlFor={`edit_description_${item.id}`}>Deskripsi</label><textarea id={`edit_description_${item.id}`} name="edit_description" defaultValue={item.description} rows={4} required maxLength={2000} />
              <label htmlFor={`edit_category_slug_${item.id}`}>Kategori karya</label><select id={`edit_category_slug_${item.id}`} name="edit_category_slug" defaultValue={item.category_slug} required>{[...workCategories, ...legacyWorkCategories.filter((category) => category.slug === item.category_slug)].filter((category) => category.slug === item.category_slug || (item.content_type === "video") === (category.slug === "video")).map((category) => <option value={category.slug} key={category.slug}>{category.name}</option>)}</select>
              <label htmlFor={`edit_thumbnail_${item.id}`}>Ganti gambar sampul (opsional, JPG/PNG/WebP, maks. 500 KB)</label><input id={`edit_thumbnail_${item.id}`} name="edit_thumbnail" type="file" accept="image/jpeg,image/png,image/webp" />
              {item.content_type === "video" && <><label htmlFor={`edit_youtube_url_${item.id}`}>Tautan YouTube</label><input id={`edit_youtube_url_${item.id}`} name="edit_youtube_url" type="url" defaultValue={item.youtube_url ?? ""} required /></>}
              {item.content_type === "ebook" && <><label htmlFor={`edit_document_${item.id}`}>Ganti file PDF (opsional)</label><input id={`edit_document_${item.id}`} name="edit_document" type="file" accept="application/pdf,.pdf" /></>}
              <div className="review-actions"><button type="submit" disabled={busy}>{busy ? "Menyimpan..." : "Simpan perubahan"}</button><button type="button" onClick={() => setEditingId(null)}>Batal</button></div>
            </form> : <><SubmissionThumbnail id={item.id} title={item.title} contentType={item.content_type} categorySlug={item.category_slug} youtubeUrl={item.youtube_url} thumbnailPath={item.thumbnail_path} accessToken={session?.access_token} className="submission-list-thumbnail" /><div className="submission-kind">{item.content_type === "ebook" ? <Icon name="book" size={15} /> : <Icon name="video" size={15} />}{item.content_type === "ebook" ? "PDF" : "VIDEO"}<CategoryLabel className="submission-category" categorySlug={item.category_slug} /></div><h4>{item.title}</h4><p className="submission-description">{item.description}</p></>}{(adminRole || verifierRole) && <span className="submitted-by">oleh {item.profiles?.[0]?.full_name ?? "Kontributor"}</span>}{item.content_type === "video" && item.youtube_url && youtubeId(item.youtube_url) && <a className="admin-video-link" href={`https://www.youtube-nocookie.com/embed/${youtubeId(item.youtube_url)}`} target="_blank" rel="noreferrer"><Icon name="video" size={18} /><span><strong>Tinjau video</strong><small>Buka pemutar video di tab baru</small></span><span className="admin-document-open">Putar video <Icon name="arrow" size={14} /></span></a>}{item.document_path && <DocumentPreview path={item.document_path} title={item.title} />}{item.feedback && <p className="review-feedback">{item.feedback}</p>}{verifierRole && <div className="review-actions admin-post-actions">{item.status === "pending" && <><button type="button" onClick={() => reviewSubmission(item.id, "approved")} disabled={busy}><Icon name="check" size={15} /> Setujui</button><button type="button" onClick={() => reviewSubmission(item.id, "rejected")} disabled={busy}>Minta revisi</button></> }<button type="button" onClick={() => deleteSubmission(item)} disabled={busy}>Hapus postingan</button></div>}{adminRole && <div className="review-actions admin-post-actions">{editingId !== item.id && <button type="button" onClick={() => setEditingId(item.id)}>Edit postingan</button>}{item.status === "approved" && <button type="button" onClick={() => togglePublished(item)} disabled={busy}>{item.is_published ? "Tarik dari beranda" : "Terbitkan di beranda"}</button>}<button type="button" onClick={() => deleteSubmission(item)} disabled={busy}>Hapus postingan</button></div>}</article>)}</div>}
          </div>}
        </div>}
      </section>
      </>}

      <footer className="site-footer">
        <div className="footer-top">
          <div className="footer-brand-block">
            <Link className="brand footer-brand" href="/" aria-label="PINISI — Pusat Ilmu dan Informasi Bersinergi"><Image className="brand-logo" src="/panisi-logo-light.svg" alt="PINISI — Pusat Ilmu dan Informasi Bersinergi" width={190} height={48} /></Link>
            <p>Pusat ilmu, informasi, dan karya pembelajaran yang bertumbuh melalui kolaborasi.</p>
          </div>
          <div className="footer-message"><span className="eyebrow">PINISI</span><strong>Pusat Ilmu dan Informasi<br />Bersinergi.</strong><span>Berbagi karya, memperluas manfaat pengetahuan.</span></div>
          <nav className="footer-links" aria-label="Menu utama footer"><span>MENU UTAMA</span>{navItems.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}</nav>
        </div>
        <div className="footer-bottom"><span>© 2026 PINISI · KARYA KONTRIBUTOR</span><span>BERBAGI PENGETAHUAN, MENGUATKAN PEMBELAJARAN</span><Link className="footer-top-link" href="/">Kembali ke atas ↑</Link></div>
      </footer>
      {loginOpen && <LoginDialog onClose={() => setLoginOpen(false)} onLogin={login} />}
    </main>
  );
}

export default function HomePage() {
  return <Home activePage="beranda" />;
}

function DocumentPreview({ path, title }: { path: string; title: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(supabase ? "" : "Koneksi penyimpanan tidak tersedia.");
  useEffect(() => {
    let active = true;
    if (!supabase) return;
    supabase.storage.from("contribution-documents").createSignedUrl(path, 300).then(({ data, error: signedUrlError }) => {
      if (!active) return;
      if (signedUrlError) setError(signedUrlError.message);
      else setUrl(data.signedUrl);
    });
    return () => { active = false; };
  }, [path]);
  if (error) return <div className="admin-document-error" role="alert">Dokumen PDF tidak tersedia: {error}</div>;
  if (!url) return <div className="admin-document-loading"><Icon name="file" size={17} /> Menyiapkan dokumen PDF...</div>;
  return <a className="admin-document-link" href={url} target="_blank" rel="noreferrer" aria-label={`Buka dokumen PDF untuk ${title}`}>
    <span className="admin-document-icon"><Icon name="file" size={18} /></span>
    <span className="admin-document-copy"><strong>Dokumen PDF</strong><small>Buka di tab baru untuk meninjau isi</small></span>
    <span className="admin-document-open">Buka PDF <Icon name="arrow" size={14} /></span>
  </a>;
}
