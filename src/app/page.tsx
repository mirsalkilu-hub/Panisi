"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { workCategories, type ContentType, type WorkCategorySlug } from "./work-categories";
import { workHref } from "./work-links";
import { SubmissionThumbnail } from "./submission-thumbnail";

type Role = "admin" | "verifikator" | "kontributor";
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
  job_title: string;
  profile_photo_path: string | null;
  area_of_expertise: string;
  widyaiswara_experience: string;
  created_at: string;
};
export type PageKey = "beranda" | "koleksi" | "widyaiswara" | "ajukan" | "ruang-kerja";
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
  youtube_url?: string | null;
  document_path?: string | null;
  thumbnail_path?: string | null;
  contributor_id?: string;
};

const navItems: [string, string, string][] = [
  ["Beranda", "/", "home"],
  ["Koleksi", "/koleksi", "grid"],
  ["Widyaiswara", "/widyaiswara", "users"],
  ["Unggah Karya", "/ajukan", "upload"],
  ["Ruang Kerja", "/ruang-kerja", "briefcase"],
];

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    leaf: <><path d="M20 4c-8 0-14 4-14 11a5 5 0 0 0 5 5c7 0 11-6 9-16Z" /><path d="M4 21c3-6 7-9 13-12" /></>,
    video: <><rect x="3" y="5" width="13" height="14" rx="2" /><path d="m16 10 5-3v10l-5-3" /></>,
    science: <><path d="M9 3h6M10 3v6l-5.5 9.2A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.8L14 9V3M8 15h8" /><circle cx="12" cy="18" r="1" /></>,
    star: <><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></>,
    insight: <><path d="M9 18h6M10 22h4M8.2 14.5A7 7 0 1 1 15.8 14.5c-.9.7-1.3 1.3-1.5 2.5h-4.6c-.2-1.2-.6-1.8-1.5-2.5Z" /><path d="M12 7v4M10 9h4" /></>,
    review: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" /><path d="M4 5.5v16M8 8h8M8 12h6M8 16h7" /><path d="m17 8 .7 1.4 1.5.2-1.1 1.1.3 1.5-1.4-.7-1.4.7.3-1.5-1.1-1.1 1.5-.2L17 8Z" /></>,
    practice: <><path d="M4 4h16v16H4z" /><path d="m8 12 2.5 2.5L16 9" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    play: <><path d="m9 6 10 6-10 6z" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" /><path d="M4 5.5v16M8 7h8M8 11h7" /></>,
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z" /></>,
    grid: <><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5M12 3v12" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name] ?? paths.leaf}</svg>;
}

function PageHero({
  eyebrow,
  title,
  description,
  icon,
  caption,
  children,
  visual,
  className = "",
}: {
  eyebrow: string;
  title: React.ReactNode;
  description: string;
  icon: string;
  caption: string;
  children?: React.ReactNode;
  visual?: React.ReactNode;
  className?: string;
}) {
  return <header className={`collection-page-hero ${className}`}>
    <div className="collection-page-copy">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
      {children && <div className="collection-page-actions">{children}</div>}
    </div>
    <div className={`collection-page-visual${visual ? " custom-page-visual" : ""}`} aria-hidden="true">
      {visual ?? <>
      <span className="collection-visual-orbit orbit-a" /><span className="collection-visual-orbit orbit-b" /><span className="collection-visual-sun" />
      <span className="collection-visual-book"><Icon name={icon} size={68} /></span>
      <span className="collection-visual-caption">{caption}</span>
      </>}
    </div>
  </header>;
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
  if (!["image/jpeg", "image/png", "image/webp"].includes(value.type) || value.size > 5 * 1024 * 1024) {
    return "Thumbnail harus berformat JPG, PNG, atau WebP dan maksimal 5 MB.";
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
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Tutup">×</button>
        <Image className="dialog-mark" src="/panisi-mark.svg" alt="" width={52} height={52} />
        <span className="eyebrow">AKSES AKUN</span>
        <h2 id="login-title">Selamat datang kembali.</h2>
        <p id="login-description">Masuk untuk menjelajah karya, mengelola konten, dan memantau kontribusi terbaik para widyaiswara.</p>
        {!supabase && <div className="notice">Hubungkan Supabase terlebih dahulu dengan mengisi <code>.env.local</code>. Panduannya tersedia di README.</div>}
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Alamat email</label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="nama@email.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <label htmlFor="password">Kata sandi</label>
          <input id="password" name="password" type="password" autoComplete="current-password" placeholder="Masukkan kata sandi" value={password} onChange={(event) => setPassword(event.target.value)} required />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary login-submit" disabled={!supabase || busy}>{busy ? "Memproses..." : "Masuk"} <Icon name="arrow" size={17} /></button>
        </form>
        <span className="dialog-help">Belum memiliki akun? Hubungi administrator Karya Widyaiswara.</span>
      </section>
    </div>
  );
}

export function Home({ activePage = "beranda", selectedContributorId }: { activePage?: PageKey; selectedContributorId?: string }) {
  const [lessonQuery, setLessonQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<WorkCategorySlug | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [verifiedSubmissions, setVerifiedSubmissions] = useState<PublishedSubmission[]>([]);
  const [verifiedSubmissionsError, setVerifiedSubmissionsError] = useState("");
  const [publicContributors, setPublicContributors] = useState<PublicContributor[]>([]);
  const [selectedContributor, setSelectedContributor] = useState<PublicContributor | null>(null);
  const [contributorWorks, setContributorWorks] = useState<PublishedSubmission[]>([]);
  const [contributorWorkTypeFilter, setContributorWorkTypeFilter] = useState<"all" | "video" | "ebook">("all");
  const [contributionType, setContributionType] = useState<"video" | "ebook">("video");
  const [contributorLoading, setContributorLoading] = useState(false);
  const [contributorError, setContributorError] = useState("");
  const [managedAccounts, setManagedAccounts] = useState<ManagedAccount[]>([]);
  const [loginOpen, setLoginOpen] = useState(false);
  const [message, setMessage] = useState("");
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

  const loadWorkspace = useCallback(async (activeSession: Session | null) => {
    if (!supabase || !activeSession) {
      setProfile(null);
      setSubmissions([]);
      setManagedAccounts([]);
      return;
    }
    const { data: currentProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, role, bio, job_title, profile_photo_path, area_of_expertise, widyaiswara_experience")
      .eq("id", activeSession.user.id)
      .single();
    if (profileError) {
      setMessage(`Profil tidak dapat dimuat: ${profileError.message}`);
      return;
    }
    setProfile(currentProfile as Profile);
    if (currentProfile.role === "admin") {
      const pageSize = 500;
      const allAccounts: ManagedAccount[] = [];
      let offset = 0;
      let accountsError: Error | null = null;
      while (true) {
        const { data: accounts, error } = await supabase
          .from("profiles")
          .select("id, full_name, role, job_title, profile_photo_path, area_of_expertise, widyaiswara_experience, created_at")
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
    if (currentProfile.role === "verifikator") query = query.eq("status", "pending");
    else query = query.eq("profile_id", activeSession.user.id);
    const { data, error } = await query;
    if (error) {
      setMessage(`Ruang kerja tidak dapat dimuat: ${error.message}`);
      return;
    }
    setSubmissions((data ?? []) as Submission[]);
  }, []);

  const loadVerifiedSubmissions = useCallback(async () => {
    if (!supabase) return;
    const pageSize = 500;
    const allVerified: PublishedSubmission[] = [];
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from("verified_submissions")
        .select("id, title, description, content_type, category_slug, youtube_url, document_path, thumbnail_path, created_at, full_name, profile_id")
        .order("created_at", { ascending: false })
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
    setVerifiedSubmissionsError("");
    setVerifiedSubmissions(allVerified);
  }, []);

  const filteredContributorWorks = contributorWorkTypeFilter === "all"
    ? contributorWorks
    : contributorWorks.filter((item) => item.content_type === contributorWorkTypeFilter);

  const loadPublicContributors = useCallback(async () => {
    if (!supabase) {
      setContributorError("Koneksi belum tersedia untuk memuat daftar widyaiswara.");
      return;
    }
    const { data, error } = await supabase
      .from("contributor_public_profiles")
      .select("id, full_name, job_title, profile_photo_path, area_of_expertise, widyaiswara_experience")
      .order("full_name", { ascending: true });
    if (error) {
      setContributorError(`Daftar widyaiswara tidak dapat dimuat: ${error.message}`);
      return;
    }
    setContributorError("");
    setPublicContributors((data ?? []) as PublicContributor[]);
  }, []);

  const loadContributorPage = useCallback(async (contributorId: string) => {
    if (!supabase) {
      setContributorError("Koneksi belum tersedia untuk memuat profil widyaiswara.");
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
      setContributorError(`Profil widyaiswara tidak dapat dimuat: ${contributorError.message}`);
      setContributorLoading(false);
      return;
    }
    if (!contributor) {
      setSelectedContributor(null);
      setContributorWorks([]);
      setContributorError("Profil widyaiswara tidak ditemukan.");
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
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      void loadWorkspace(data.session);
      void loadVerifiedSubmissions();
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void loadWorkspace(nextSession);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadPublicContributors, loadVerifiedSubmissions, loadWorkspace]);

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
      setMessage("Bidang keahlian dan pengalaman sebagai widyaiswara wajib dilengkapi.");
      return;
    }
    if (photoFile instanceof File && photoFile.size > 0
      && (!["image/jpeg", "image/png", "image/webp"].includes(photoFile.type) || photoFile.size > 5 * 1024 * 1024)) {
      setMessage("Foto profil harus berformat JPG, PNG, atau WebP dan maksimal 5 MB.");
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
        setMessage(`Foto profil gagal diunggah: ${uploadError.message}`);
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
      setMessage("Profil profesional berhasil diperbarui.");
      if (newPhotoPath && previousPhotoPath) {
        const { error: cleanupError } = await supabase.storage.from("profile-photos").remove([previousPhotoPath]);
        if (cleanupError) setMessage(`Profil profesional berhasil diperbarui, tetapi foto lama tidak dapat dibersihkan: ${cleanupError.message}`);
      }
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
  }

  async function submitContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !profile) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const title = values.get("title")?.toString().trim() ?? "";
    const description = values.get("description")?.toString().trim() ?? "";
    const contentType = contributionType;
    const categorySlug = values.get("category_slug")?.toString() ?? "";
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
      setMessage("Pilih file e-book dengan format PDF.");
      return;
    }
    if (file instanceof File && file.size > 20 * 1024 * 1024) {
      setMessage("Ukuran PDF maksimal 20 MB.");
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
        setMessage(`E-book gagal diunggah: ${uploadError.message}`);
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
    setContributionType("video");
    setMessage(`${contentType === "ebook" ? "E-Book" : "Video"} pembelajaran berhasil diajukan untuk diverifikasi.`);
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
    const { error } = await supabase.from("submissions").update({ status, feedback: feedback.trim() }).eq("id", id);
    if (error) setMessage(`Status tidak dapat diperbarui: ${error.message}`);
    else {
      setMessage("Status kontribusi berhasil diperbarui.");
      await Promise.all([loadWorkspace(session), loadVerifiedSubmissions()]);
    }
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
      || !workCategories.some((category) => category.slug === categorySlug)
      || (replacementDocument instanceof File && replacementDocument.size > 0
        && (replacementDocument.type !== "application/pdf" || replacementDocument.size > 20 * 1024 * 1024))
      || (submission?.content_type === "video" && !youtubeId(videoUrl))) {
      setMessage("Lengkapi judul, deskripsi, dan kategori. Pastikan tautan YouTube valid atau PDF berukuran maksimal 20 MB.");
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
    if (error) setMessage(`Tidak dapat keluar: ${error.message}`);
  }

  const adminRole = profile?.role === "admin";
  const verifierRole = profile?.role === "verifikator";
  const homeLessons: HomeLesson[] = verifiedSubmissions.map((item, index) => ({
      id: item.id,
      category: workCategories.find((category) => category.slug === item.category_slug)?.name.toLocaleUpperCase("id-ID") ?? "KARYA WIDYAISWARA",
      categorySlug: item.category_slug,
      title: item.title,
      author: item.full_name,
      contributor_id: item.profile_id,
      contentType: item.content_type === "ebook" ? "E-Book" as const : "Video" as const,
      time: item.content_type === "ebook" ? "PDF" : "YOUTUBE",
      color: (["forest", "sun", "ocean"] as const)[index % 3],
      symbol: "↗",
      level: "TERVERIFIKASI",
      format: item.content_type === "ebook" ? "E-BOOK PEMBELAJARAN" : "VIDEO PEMBELAJARAN",
      description: item.description,
      youtube_url: item.youtube_url,
      document_path: item.document_path,
      thumbnail_path: item.thumbnail_path,
    }));
  const currentWorkCategory = workCategories.find((category) => category.slug === selectedCategory) ?? null;
  const categoryLessons = currentWorkCategory
    ? homeLessons.filter((lesson) => lesson.categorySlug === currentWorkCategory.slug)
    : homeLessons;
  const filteredLessons = categoryLessons.filter((lesson) =>
    `${lesson.title} ${lesson.category} ${lesson.author} ${lesson.description ?? ""}`.toLowerCase().includes(lessonQuery.trim().toLowerCase()),
  );

  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Karya Widyaiswara"><Image className="brand-logo" src="/panisi-logo.svg" alt="Karya Widyaiswara" width={190} height={48} priority /></Link>
        <nav className="desktop-nav" aria-label="Navigasi utama">
          {navItems.map(([label, href, icon]) => {
            const isContributorProfile = href === "/ruang-kerja" && profile?.role === "kontributor";
            return <Link className={(href === "/" ? activePage === "beranda" : href.slice(1) === activePage) ? "nav-active" : ""} href={href} key={href} aria-current={(href === "/" ? activePage === "beranda" : href.slice(1) === activePage) ? "page" : undefined}><Icon name={isContributorProfile ? "user" : icon} size={15} />{isContributorProfile ? "Profil Saya" : label}</Link>;
          })}
        </nav>
        {session ? <button className="button button-outline header-login" onClick={signOut}><Icon name="user" size={16} /> Keluar</button> : <button className="button button-outline header-login" onClick={() => setLoginOpen(true)}><Icon name="user" size={16} /> Masuk</button>}
        <button
          className="mobile-menu"
          type="button"
          aria-label={mobileNavOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
          aria-expanded={mobileNavOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMobileNavOpen((open) => !open)}
        >
          <Icon name={mobileNavOpen ? "close" : "menu"} />
        </button>
        {mobileNavOpen && <nav className="mobile-nav" id="mobile-navigation" aria-label="Navigasi seluler">
          {navItems.map(([label, href, icon]) => {
            const isContributorProfile = href === "/ruang-kerja" && profile?.role === "kontributor";
            return <Link className={(href === "/" ? activePage === "beranda" : href.slice(1) === activePage) ? "nav-active" : ""} href={href} key={href} aria-current={(href === "/" ? activePage === "beranda" : href.slice(1) === activePage) ? "page" : undefined} onClick={() => setMobileNavOpen(false)}><span><Icon name={isContributorProfile ? "user" : icon} size={17} />{isContributorProfile ? "Profil Saya" : label}</span><Icon name="arrow" size={15} /></Link>;
          })}
        </nav>}
      </header>

      {activePage === "beranda" && <>
      <section className="collection-page content-wrap home-page-hero" id="beranda">
        <PageHero eyebrow="KARYA WIDYAISWARA" title={<>Karya Widyaiswara.<br /><em>Ilmu dibagikan, inspirasi diteruskan.</em></>} description="Ruang kolaborasi untuk merayakan gagasan, membagikan praktik pembelajaran, dan memperluas dampak karya para widyaiswara." icon="book" caption="BERBAGI • BELAJAR • BERTUMBUH">
          <Link href="/#karya" className="button">Jelajahi karya <Icon name="arrow" size={17} /></Link>
          <Link href="/ajukan" className="button button-hero-secondary"><Icon name="upload" size={16} /> Bagikan karya ajar</Link>
        </PageHero>
      </section>
      <section className="learning-section home-published-section" id="karya">
        <div className="content-wrap">
          <div className="section-heading"><div><span className="eyebrow">DARI KOMUNITAS UNTUK KOMUNITAS</span><h2>Gagasan baik tumbuh saat dibagikan.</h2><p className="work-category-description">Pilih kategori untuk menyaring semua pengajuan kontributor yang telah diverifikasi.</p></div><span className="lesson-total">{filteredLessons.length} KARYA</span></div>
          <nav className="work-category-menu" aria-label="Filter kategori karya">
            <button type="button" className={`work-category-link${selectedCategory === null ? " category-active" : ""}`} onClick={() => setSelectedCategory(null)} aria-pressed={selectedCategory === null}><span className="work-category-icon"><Icon name="grid" size={21} /></span><span><strong>Semua Karya</strong><small>Jelajahi seluruh karya</small></span></button>
            {workCategories.map((category) => <button type="button" className={`work-category-link${selectedCategory === category.slug ? " category-active" : ""}`} onClick={() => setSelectedCategory(category.slug)} key={category.slug} aria-pressed={selectedCategory === category.slug}>
              <span className="work-category-icon"><Icon name={category.icon} size={21} /></span><span><strong>{category.name}</strong><small>{category.description}</small></span>
            </button>)}
          </nav>
          <div className="content-toolbar">
            <label className="lesson-search"><Icon name="search" size={18} /><input type="search" value={lessonQuery} onChange={(event) => setLessonQuery(event.target.value)} placeholder="Cari judul, tema, atau pengajar..." aria-label="Cari karya widyaiswara" /></label>
          </div>
          {verifiedSubmissionsError ? <p className="lesson-empty lesson-load-error" role="alert">{verifiedSubmissionsError}</p>
          : filteredLessons.length > 0 ? <div className="lesson-grid">
            {filteredLessons.map((lesson) => <article className="lesson-card" key={lesson.id ?? lesson.title}>
              <Link className="lesson-thumbnail-link" href={workHref(lesson.id, lesson.title)} aria-label={`Buka halaman ${lesson.title}`}><SubmissionThumbnail id={lesson.id} title={lesson.title} contentType={lesson.contentType === "E-Book" ? "ebook" : "video"} categorySlug={lesson.categorySlug} youtubeUrl={lesson.youtube_url} thumbnailPath={lesson.thumbnail_path} accessToken={session?.access_token} /><span className="lesson-thumbnail-status">TERVERIFIKASI</span></Link>
              <div className="lesson-meta"><span>{lesson.category}</span><span>{lesson.level}</span></div><h3><Link className="work-title-link" href={workHref(lesson.id, lesson.title)}>{lesson.title}</Link></h3>{lesson.description && <p className="lesson-description">{lesson.description}</p>}<div className="lesson-author"><span className="author-avatar">{lesson.author.slice(0, 1)}</span>{lesson.contributor_id ? <Link href={`/widyaiswara/${lesson.contributor_id}`}>{lesson.author}</Link> : <span>{lesson.author}</span>}<span className="lesson-duration">{lesson.time}</span></div>
            </article>)}
          </div> : <p className="lesson-empty">{categoryLessons.length === 0 && !lessonQuery.trim() ? `Belum ada karya terverifikasi dalam kategori ${currentWorkCategory?.name ?? "ini"}.` : `Belum ada karya untuk “${lessonQuery}”. Coba kata kunci lain.`}</p>}
        </div>
      </section>
      </>}

      {activePage === "koleksi" && <>
      <section className="collection-page content-wrap" id="koleksi">
        <PageHero eyebrow="KOLEKSI KARYA WIDYAISWARA" title={<>Pengetahuan teruji,<br /><em>siap menginspirasi.</em></>} description="Jelajahi seluruh karya komunitas yang telah ditinjau dan disetujui verifikator. Temukan pengalaman serta gagasan yang dapat diterapkan dalam pembelajaran." icon="book" caption="BERBAGI • BELAJAR • BERTUMBUH">
          <a className="button" href="#koleksi-terverifikasi">Jelajahi koleksi <Icon name="arrow" size={17} /></a>
        </PageHero>
        <div className="collection-list-section" id="koleksi-terverifikasi">
          <div className="collection-list-heading"><div><span className="eyebrow">HASIL VERIFIKASI</span><h2>Koleksi komunitas</h2><p>Semua pengajuan yang disetujui verifikator, dari setiap kontributor.</p></div><span className="lesson-total">{verifiedSubmissions.length} KARYA</span></div>
          {verifiedSubmissionsError ? <p className="lesson-empty lesson-load-error" role="alert">{verifiedSubmissionsError}</p>
            : verifiedSubmissions.length > 0 ? <div className="lesson-grid collection-works-grid">
              {verifiedSubmissions.map((item) => <article className="lesson-card" key={item.id}>
                  <Link className="lesson-thumbnail-link" href={workHref(item.id, item.title)} aria-label={`Buka halaman ${item.title}`}><SubmissionThumbnail id={item.id} title={item.title} contentType={item.content_type} categorySlug={item.category_slug} youtubeUrl={item.youtube_url} thumbnailPath={item.thumbnail_path} accessToken={session?.access_token} /><span className="lesson-thumbnail-status">TERVERIFIKASI</span></Link>
                  <div className="lesson-meta"><span>{workCategories.find((category) => category.slug === item.category_slug)?.name ?? "KARYA"}</span><span>{item.content_type === "ebook" ? "E-BOOK" : "VIDEO"} · DISETUJUI</span></div><h3><Link className="work-title-link" href={workHref(item.id, item.title)}>{item.title}</Link></h3><p className="lesson-description">{item.description}</p><div className="lesson-author"><span className="author-avatar">{item.full_name.slice(0, 1).toLocaleUpperCase("id-ID")}</span><Link href={`/widyaiswara/${item.profile_id}`}>{item.full_name}</Link><span className="lesson-duration">{new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span></div>
              </article>)}
            </div>
            : <div className="collection-empty"><span className="collection-empty-icon"><Icon name="book" size={26} /></span><h3>Belum ada karya terverifikasi</h3><p>Koleksi akan tampil di sini setelah verifikator menyetujui pengajuan dari para kontributor.</p><Link className="text-link" href="/ajukan">Bagikan karya pertama <Icon name="arrow" size={16} /></Link></div>}
        </div>
      </section>
      </>}

      {activePage === "widyaiswara" && selectedContributorId && <>
      <section className="contributor-profile content-wrap">
        <Link href="/widyaiswara" className="contributor-back"><Icon name="arrow" size={15} /> Semua widyaiswara</Link>
        {contributorLoading ? <div className="contributor-state" role="status">Memuat profil widyaiswara...</div>
          : contributorError ? <div className="contributor-state contributor-error" role="alert">{contributorError}</div>
          : selectedContributor && <>
            <PageHero eyebrow="PROFIL WIDYAISWARA" title={<>{selectedContributor.full_name}<br /><em>{selectedContributor.job_title}</em></>} description="Berbagi pengalaman, pengetahuan, dan karya untuk pembelajaran yang lebih bermakna." icon="user" caption="WIDYAISWARA • KONTRIBUTOR" className="contributor-page-hero" visual={<><span className="collection-visual-orbit orbit-a" /><span className="collection-visual-orbit orbit-b" /><span className="collection-visual-sun" />{selectedContributor.profile_photo_path && supabase
              ? <Image className="contributor-hero-photo" src={supabase.storage.from("profile-photos").getPublicUrl(selectedContributor.profile_photo_path).data.publicUrl} alt="" width={150} height={150} unoptimized />
              : <span className="contributor-hero-photo contributor-avatar">{selectedContributor.full_name.slice(0, 1).toLocaleUpperCase("id-ID")}</span>}<span className="collection-visual-caption">WIDYAISWARA • KONTRIBUTOR</span></>} />
            <div className="contributor-bio-grid">
              <article><span className="eyebrow">BIDANG KEAHLIAN</span><p>{selectedContributor.area_of_expertise || "Informasi bidang keahlian belum tersedia."}</p></article>
              <article><span className="eyebrow">PENGALAMAN WIDYAISWARA</span><p>{selectedContributor.widyaiswara_experience || "Informasi pengalaman belum tersedia."}</p></article>
            </div>
            <div className="contributor-works-heading"><div><span className="eyebrow">KARYA YANG DIBAGIKAN</span><h2>Kontribusi pembelajaran</h2></div><span className="lesson-total">{contributorWorks.length} KARYA</span></div>
            <nav className="contributor-work-filters" aria-label="Filter kategori karya kontributor">
              {([
                ["all", "Semua karya", contributorWorks.length],
                ["video", "Video pembelajaran", contributorWorks.filter((item) => item.content_type === "video").length],
                ["ebook", "E-Book pembelajaran", contributorWorks.filter((item) => item.content_type === "ebook").length],
              ] as const).map(([filter, label, count]) => <button type="button" key={filter} className={contributorWorkTypeFilter === filter ? "active" : ""} onClick={() => setContributorWorkTypeFilter(filter)}>{label}<span>{count}</span></button>)}
            </nav>
            {contributorWorks.length > 0 ? filteredContributorWorks.length > 0 ? <div className="lesson-grid">
              {filteredContributorWorks.map((item) => <article className="lesson-card" key={item.id}>
                <Link className="lesson-thumbnail-link" href={workHref(item.id, item.title)} aria-label={`Buka halaman ${item.title}`}><SubmissionThumbnail id={item.id} title={item.title} contentType={item.content_type} categorySlug={item.category_slug} youtubeUrl={item.youtube_url} thumbnailPath={item.thumbnail_path} accessToken={session?.access_token} /><span className="lesson-thumbnail-status">TERVERIFIKASI</span></Link>
                <div className="lesson-meta"><span>{workCategories.find((category) => category.slug === item.category_slug)?.name ?? "KARYA"}</span><span>{item.content_type === "ebook" ? "E-BOOK" : "VIDEO"} · TERVERIFIKASI</span></div><h3><Link className="work-title-link" href={workHref(item.id, item.title)}>{item.title}</Link></h3><p className="lesson-description">{item.description}</p><div className="lesson-author"><span className="author-avatar">{selectedContributor.full_name.slice(0, 1)}</span><span>{selectedContributor.full_name}</span><span className="lesson-duration">{item.content_type === "ebook" ? "PDF" : "VIDEO"}</span></div>
              </article>)}
            </div> : <p className="lesson-empty">Belum ada karya pada kategori ini.</p> : <p className="lesson-empty">Widyaiswara ini belum memiliki karya yang disetujui verifikator.</p>}
          </>}
      </section>
      </>}

      {activePage === "widyaiswara" && !selectedContributorId && <>
      <section className="contributor-directory content-wrap">
        <PageHero eyebrow="KOMUNITAS KARYA WIDYAISWARA" title={<>Kenali para penggerak,<br /><em>inspirasi pembelajaran.</em></>} description="Jelajahi profil, bidang keahlian, pengalaman, dan karya yang telah dibagikan para widyaiswara." icon="users" caption="KOMUNITAS • KEAHLIAN • PENGALAMAN" />
        <div className="section-heading"><div><span className="eyebrow">PARA PENGGERAK PEMBELAJARAN</span><h2>Komunitas widyaiswara.</h2><p className="workspace-intro">Kenali pengalaman, keahlian, dan kontribusi para widyaiswara dalam satu ruang.</p></div><span className="lesson-total">{publicContributors.length} WIDYAISWARA</span></div>
        {contributorError ? <p className="contributor-state contributor-error" role="alert">{contributorError}</p>
          : publicContributors.length > 0 ? <div className="contributor-directory-grid">{publicContributors.map((contributor) => <Link className="contributor-directory-card" href={`/widyaiswara/${contributor.id}`} key={contributor.id}>
            {contributor.profile_photo_path && supabase
              ? <Image className="contributor-avatar" src={supabase.storage.from("profile-photos").getPublicUrl(contributor.profile_photo_path).data.publicUrl} alt="" width={62} height={62} unoptimized />
              : <span className="contributor-avatar">{contributor.full_name.slice(0, 1).toLocaleUpperCase("id-ID")}</span>}
            <span className="eyebrow">WIDYAISWARA</span><strong>{contributor.full_name}</strong><span className="directory-job-title">{contributor.job_title}</span><span className="directory-expertise">{contributor.area_of_expertise || "Bidang keahlian belum dilengkapi."}</span><span className="directory-action">Lihat profil <Icon name="arrow" size={15} /></span>
          </Link>)}</div>
          : <p className="lesson-empty">Profil widyaiswara akan tampil di sini setelah tersedia.</p>}
      </section>
      <section className="teacher-section" id="widyaiswara">
        <div className="teacher-copy"><span className="eyebrow">KOMUNITAS WIDYAISWARA</span><h2>Berbagi keahlian,<br /><em>menguatkan pendidikan.</em></h2><p>Karya Widyaiswara mempertemukan para pendidik untuk berbagi metode, wawasan, dan pengalaman yang dapat menginspirasi pembelajaran di berbagai tempat.</p><Link className="text-link" href="/ajukan">Bagikan karya Anda <Icon name="arrow" size={16} /></Link></div>
        <div className="teacher-quote"><span className="quote-mark">“</span><blockquote>Pengetahuan yang dibagikan hari ini dapat membuka kemungkinan baru bagi pembelajaran esok hari.</blockquote><span className="quote-credit">BERBAGI • BELAJAR • BERTUMBUH</span><span className="teacher-leaf"><Icon name="book" size={84} /></span></div>
      </section>
      </>}

      {activePage === "ajukan" && <>
      <section className="collection-page content-wrap upload-page" id="ajukan">
        <PageHero eyebrow="UNGGAH KARYA PEMBELAJARAN" title={<>Pengalaman berharga,<br /><em>bagikan agar berdampak.</em></>} description="Ajukan video pembelajaran melalui tautan YouTube atau bagikan e-book dan modul dalam format PDF. Setiap karya akan ditinjau verifikator sebelum ditampilkan kepada komunitas." icon="upload" caption="BAGIKAN • TUMBUH • MENGINSPIRASI">
          {session && profile?.role === "kontributor" ? <a className="button" href="#formulir-pengajuan">Mulai mengunggah <Icon name="arrow" size={17} /></a> : !session ? <button className="button" onClick={() => setLoginOpen(true)}>Masuk untuk mengunggah <Icon name="arrow" size={17} /></button> : <Link className="button" href="/ruang-kerja">Buka ruang kerja <Icon name="arrow" size={17} /></Link>}
        </PageHero>
        {message && <div className={`workspace-message${message.includes("berhasil") ? " success" : ""}`} role="status">{message}<button type="button" onClick={() => setMessage("")} aria-label="Tutup pesan">×</button></div>}
        <div className="upload-steps">
          <article><span>01</span><Icon name="user" size={19} /><strong>Lengkapi profil</strong><p>Pastikan keahlian dan pengalaman Anda telah tercantum.</p></article>
          <article><span>02</span><Icon name="video" size={19} /><strong>Pilih format karya</strong><p>Ajukan video YouTube atau unggah e-book PDF.</p></article>
          <article><span>03</span><Icon name="check" size={19} /><strong>Tunggu verifikasi</strong><p>Pantau status atau edit pengajuan di halaman ini sebelum diverifikasi.</p></article>
        </div>
        {session && profile?.role === "kontributor" ? <>
        <div className="workspace-grid upload-workspace-grid" id="formulir-pengajuan">
          <div className="workspace-panel upload-form-panel">
            <div className="panel-title"><div><span className="eyebrow">FORMULIR KONTRIBUSI</span><h3>Ajukan materi ajar</h3></div><span className="role-badge">Kontributor</span></div>
            <div className="contribution-type-picker" role="group" aria-label="Pilih jenis karya">
              <button type="button" className={contributionType === "video" ? "active" : ""} aria-pressed={contributionType === "video"} onClick={() => setContributionType("video")}><Icon name="video" size={19} /><span><strong>Video pembelajaran</strong><small>Bagikan video dari YouTube</small></span></button>
              <button type="button" className={contributionType === "ebook" ? "active" : ""} aria-pressed={contributionType === "ebook"} onClick={() => setContributionType("ebook")}><Icon name="book" size={19} /><span><strong>E-Book pembelajaran</strong><small>Unggah buku atau modul PDF</small></span></button>
            </div>
            <form onSubmit={submitContribution} className="contribution-form">
              <label htmlFor="title">Judul materi</label><input id="title" name="title" placeholder="Contoh: Teknik fasilitasi kelas interaktif" required maxLength={120} />
              <label htmlFor="description">Deskripsi</label><textarea id="description" name="description" placeholder="Jelaskan tujuan dan isi materi ajar..." rows={4} required maxLength={2000} />
              <label htmlFor="category_slug">Kategori karya</label><select id="category_slug" name="category_slug" defaultValue="video" required>{workCategories.map((category) => <option value={category.slug} key={category.slug}>{category.name} — {category.description}</option>)}</select>
              <label htmlFor="thumbnail">Thumbnail landscape (wajib, JPG/PNG/WebP, maks. 5 MB)</label><input id="thumbnail" name="thumbnail" type="file" accept="image/jpeg,image/png,image/webp" required /><small className="upload-hint">Pilih gambar landscape dengan rasio lebar sekitar 1,4–2,5 kali tinggi. Thumbnail akan tampil pada kartu dan halaman karya.</small>
              {contributionType === "video"
                ? <><label htmlFor="youtube_url">Tautan video pembelajaran YouTube</label><input id="youtube_url" name="youtube_url" type="url" placeholder="https://www.youtube.com/watch?v=..." required /></>
                : <><label htmlFor="document">File e-book atau modul (PDF, maks. 20 MB)</label><input id="document" name="document" type="file" accept="application/pdf,.pdf" required /><small className="upload-hint">Unggah satu dokumen PDF untuk ditinjau verifikator.</small></>}
              <button className="button button-primary" disabled={busy}>{busy ? "Mengirim..." : "Ajukan untuk verifikasi"} <Icon name="arrow" size={16} /></button>
            </form>
          </div>
          <aside className="workspace-panel upload-info-panel"><span className="upload-info-icon"><Icon name={contributionType === "video" ? "video" : "book"} size={24} /></span><span className="eyebrow">SEBELUM MENGIRIM</span><h3>Pastikan karya siap dibagikan.</h3><p>{contributionType === "video" ? "Pastikan tautan YouTube dapat dibuka dan mengarah ke materi yang ingin dibagikan." : "Gunakan PDF yang jelas dan terbaca. Berkas maksimal 20 MB dan hanya dapat diakses tim verifikasi sebelum disetujui."}</p><ul><li><Icon name="check" size={15} /> Judul dan deskripsi sesuai isi karya</li><li><Icon name="check" size={15} /> Materi mendukung pembelajaran</li><li><Icon name="check" size={15} /> Status dapat dipantau di halaman ini</li></ul></aside>
        </div>
        <section className="workspace-panel submissions-panel contributor-submissions-panel" id="kontribusiku">
          <div className="panel-title"><div><span className="eyebrow">KONTRIBUSIKU</span><h3>Pengajuan karya saya</h3><p className="workspace-intro">Periksa status pengajuan. Karya yang masih menunggu verifikasi dapat diedit di sini.</p></div><span className="submission-count">{submissions.length.toString().padStart(2, "0")}</span></div>
          {submissions.length === 0 ? <div className="no-submissions"><Icon name="file" size={24} /><p>Anda belum mengajukan karya.</p></div> : <div className="submission-list">{submissions.map((item) => <article className="submission-item" key={item.id}>
            <div className="submission-top"><span className={`status status-${item.status}`}>{item.status === "pending" ? "Menunggu verifikasi" : item.status === "approved" ? "Terverifikasi" : "Perlu revisi"}</span><time>{new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</time></div>
            {editingId === item.id ? <><SubmissionThumbnail id={item.id} title={item.title} contentType={item.content_type} categorySlug={item.category_slug} youtubeUrl={item.youtube_url} thumbnailPath={item.thumbnail_path} accessToken={session?.access_token} className="submission-list-thumbnail" /><form className="contribution-form edit-post-form" onSubmit={(event) => saveSubmission(event, item.id)}>
              <label htmlFor={`edit_title_${item.id}`}>Judul</label><input id={`edit_title_${item.id}`} name="edit_title" defaultValue={item.title} required maxLength={120} />
              <label htmlFor={`edit_description_${item.id}`}>Deskripsi</label><textarea id={`edit_description_${item.id}`} name="edit_description" defaultValue={item.description} rows={4} required maxLength={2000} />
              <label htmlFor={`edit_category_slug_${item.id}`}>Kategori karya</label><select id={`edit_category_slug_${item.id}`} name="edit_category_slug" defaultValue={item.category_slug} required>{workCategories.map((category) => <option value={category.slug} key={category.slug}>{category.name} — {category.description}</option>)}</select>
              <label htmlFor={`edit_thumbnail_${item.id}`}>Ganti thumbnail landscape (opsional, JPG/PNG/WebP, maks. 5 MB)</label><input id={`edit_thumbnail_${item.id}`} name="edit_thumbnail" type="file" accept="image/jpeg,image/png,image/webp" /><small className="upload-hint">Kosongkan jika thumbnail saat ini tetap digunakan.</small>
              {item.content_type === "video"
                ? <><label htmlFor={`edit_youtube_url_${item.id}`}>Tautan video YouTube</label><input id={`edit_youtube_url_${item.id}`} name="edit_youtube_url" type="url" defaultValue={item.youtube_url ?? ""} required /></>
                : <><label htmlFor={`edit_document_${item.id}`}>Ganti file PDF (opsional, maks. 20 MB)</label><input id={`edit_document_${item.id}`} name="edit_document" type="file" accept="application/pdf,.pdf" /></>}
              <div className="review-actions"><button type="submit" disabled={busy}>Simpan perubahan</button><button type="button" onClick={() => setEditingId(null)}>Batal</button></div>
            </form></> : <>
              <SubmissionThumbnail id={item.id} title={item.title} contentType={item.content_type} categorySlug={item.category_slug} youtubeUrl={item.youtube_url} thumbnailPath={item.thumbnail_path} accessToken={session?.access_token} className="submission-list-thumbnail" />
              <div className="submission-kind">{item.content_type === "ebook" ? <Icon name="book" size={15} /> : <Icon name="video" size={15} />}{item.content_type === "ebook" ? "E-BOOK PEMBELAJARAN" : "VIDEO PEMBELAJARAN"}<span className="submission-category">{workCategories.find((category) => category.slug === item.category_slug)?.name ?? "Kategori"}</span></div>
              <h4>{item.status === "approved" ? <Link className="work-title-link" href={workHref(item.id, item.title)}>{item.title}</Link> : item.title}</h4><p className="submission-description">{item.description}</p>
              {item.content_type === "video" && item.youtube_url && <div className="submission-video"><iframe src={`https://www.youtube-nocookie.com/embed/${youtubeId(item.youtube_url)}`} title={`Video: ${item.title}`} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>}
              {item.document_path && <DocumentPreview path={item.document_path} title={item.title} />}
              {item.feedback && <p className="review-feedback">{item.feedback}</p>}
              {item.status === "pending"
                ? <div className="review-actions"><button type="button" onClick={() => setEditingId(item.id)}>Edit pengajuan</button></div>
                : item.status === "approved" && <Link className="submission-detail-link" href={workHref(item.id, item.title)}>Buka halaman karya <Icon name="arrow" size={15} /></Link>}
            </>}
          </article>)}</div>}
        </section>
        </> : !session ? <div className="upload-access-panel"><span className="collection-empty-icon"><Icon name="upload" size={23} /></span><h3>Masuk untuk mulai berbagi karya</h3><p>Pengajuan video dan e-book tersedia bagi akun kontributor. Masuk untuk membuka formulir kontribusi Anda.</p><button type="button" className="button button-dark" onClick={() => setLoginOpen(true)}>Masuk sebagai kontributor <Icon name="arrow" size={16} /></button></div> : <div className="upload-access-panel"><span className="collection-empty-icon"><Icon name="user" size={23} /></span><h3>Fitur unggah untuk akun kontributor</h3><p>Akun Anda memiliki peran {profile?.role}. Pengajuan materi pembelajaran hanya tersedia bagi kontributor.</p><Link className="button button-dark" href="/ruang-kerja">Kembali ke Ruang Kerja <Icon name="arrow" size={16} /></Link></div>}
      </section>
      </>}

      {activePage === "ruang-kerja" && <>
      <section className="workspace-section content-wrap" id="ruang-kerja">
        <header className="collection-page-hero workspace-page-hero">
          <div className="collection-page-copy">
            <span className="eyebrow">{profile?.role === "kontributor" ? "PROFIL WIDYAISWARA" : "RUANG KERJA / KARYA WIDYAISWARA"}</span>
            <h1>{profile?.role === "kontributor" ? "Profil profesional." : profile ? `Selamat datang, ${profile.full_name}.` : "Ruang untuk karya dan kolaborasi."}</h1>
            <p>{profile?.role === "kontributor" ? "Kelola data diri dan informasi profesional yang ditampilkan pada profil publik Anda." : profile ? "Kelola komunitas, tinjau pengajuan, dan terbitkan karya yang menginspirasi." : "Satu tempat untuk mengelola profil serta meninjau kontribusi komunitas."}</p>
            <div className="workspace-hero-actions">{session && profile?.role === "kontributor" && <><Link className="button workspace-public-link" href={`/widyaiswara/${profile.id}`}><Icon name="user" size={16} /> Lihat profil publik</Link><Link className="button workspace-public-link" href="/ajukan"><Icon name="upload" size={16} /> Unggah karya</Link></>}{session ? <button className="button workspace-signout" onClick={signOut}>Keluar <Icon name="arrow" size={16} /></button> : <button className="button workspace-signout" onClick={() => setLoginOpen(true)}>Masuk ke ruang kerja <Icon name="arrow" size={16} /></button>}</div>
          </div>
          <div className="collection-page-visual workspace-page-visual" aria-hidden="true">
            <span className="collection-visual-orbit" /><span className="collection-visual-orbit orbit-b" /><span className="collection-visual-sun" />
            <span className="workspace-profile-mark">{profile?.profile_photo_path && supabase ? <Image src={supabase.storage.from("profile-photos").getPublicUrl(profile.profile_photo_path).data.publicUrl} alt="" width={92} height={92} unoptimized /> : <Icon name={profile?.role === "kontributor" ? "user" : "briefcase"} size={44} />}</span>
            <span className="collection-visual-caption">{profile ? profile.role.toLocaleUpperCase("id-ID") : "KARYA · KOLABORASI · INSPIRASI"}</span>
          </div>
        </header>
        {profile?.role === "kontributor" && <div className="workspace-profile-summary"><span className="workspace-profile-avatar">{profile.full_name.slice(0, 1).toLocaleUpperCase("id-ID")}</span><div><strong>{profile.full_name}</strong><span>{profile.job_title || "Widyaiswara"} · Profil profesional publik</span></div><span className="role-badge">Kontributor</span></div>}
        {accountCreatedNotice && <div className="account-created-notice" role="status"><span className="account-created-check"><Icon name="check" size={17} /></span><span>{accountCreatedNotice}</span><button type="button" onClick={() => setAccountCreatedNotice("")} aria-label="Tutup notifikasi">×</button></div>}
        {message && <div className={message.includes("berhasil") ? "workspace-message success" : "workspace-message"} role="status">{message}<button onClick={() => setMessage("")} aria-label="Tutup pesan">×</button></div>}
        {!session && <div className="workspace-empty"><span className="feature-icon"><Icon name="play" size={21} /></span><p>Masuk untuk mengelola profil widyaiswara, membagikan materi ajar, atau meninjau kontribusi sesuai peranmu.</p><span className="role-list">ADMIN <i /> VERIFIKATOR <i /> KONTRIBUTOR</span></div>}
        {session && profile && adminRole && <section className="admin-overview" aria-label="Ringkasan administrasi">
          <div className="admin-overview-copy"><span className="eyebrow">PANEL ADMINISTRATOR</span><h3>Kelola komunitas dan karya.</h3><p>Buat akun tim, pantau profil anggota, dan atur materi yang siap dipublikasikan.</p></div>
          <div className="admin-overview-stats">
            <article><span>SELURUH AKUN</span><strong>{managedAccounts.length}</strong><small>Kontributor dan verifikator</small></article>
            <article><span>KONTRIBUTOR</span><strong>{managedAccounts.filter((account) => account.role === "kontributor").length}</strong><small>Penggerak berbagi karya</small></article>
            <article><span>VERIFIKATOR</span><strong>{managedAccounts.filter((account) => account.role === "verifikator").length}</strong><small>Tim peninjau kontribusi</small></article>
          </div>
        </section>}
        {session && profile && <div className={`workspace-grid${adminRole ? " admin-workspace-grid" : ""}${profile.role === "kontributor" ? " contributor-profile-grid" : ""}`}>
          <div className={`workspace-panel${adminRole ? " admin-workspace-panel" : ""}`}>
            <div className="panel-title"><div><span className="eyebrow">{profile.role === "kontributor" ? "DATA PROFIL" : "PROFIL PROFESIONAL"}</span><h3>{profile.role === "kontributor" ? "Informasi widyaiswara" : "Biodata dan keahlian"}</h3></div><span className="role-badge">{profile.role}</span></div>
            {adminRole && <div className="submit-box account-box"><div className="account-create-heading"><span className="account-create-icon"><Icon name="users" size={19} /></span><div><span className="eyebrow">MANAJEMEN AKUN</span><h3>Buat akun tim</h3></div></div><p className="account-create-description">Tambahkan verifikator untuk membantu proses peninjauan atau kontributor untuk berbagi karya.</p><form onSubmit={createAccount} onChange={() => setAccountCreateError("")} className="contribution-form">
              <label htmlFor="account_full_name">Nama lengkap</label><input id="account_full_name" name="account_full_name" required maxLength={100} />
              <label htmlFor="account_job_title">Jabatan</label><input id="account_job_title" name="account_job_title" placeholder="Contoh: Widyaiswara Ahli Madya" required maxLength={120} />
              <label htmlFor="account_profile_photo">Foto profil (JPG, PNG, atau WebP; maks. 5 MB)</label><input id="account_profile_photo" name="account_profile_photo" type="file" accept="image/jpeg,image/png,image/webp" />
              <label htmlFor="account_email">Alamat email</label><input id="account_email" name="account_email" type="email" autoComplete="off" required />
              <label htmlFor="account_password">Kata sandi sementara (min. 8 karakter)</label><input id="account_password" name="account_password" type="password" autoComplete="new-password" minLength={8} required />
              <label htmlFor="account_role">Peran</label><select id="account_role" name="account_role" value={newAccountRole} onChange={(event) => setNewAccountRole(event.target.value === "verifikator" ? "verifikator" : "kontributor")}><option value="kontributor">Kontributor</option><option value="verifikator">Verifikator</option></select>
              {newAccountRole === "kontributor" && <>
                <label htmlFor="account_area_of_expertise">Bidang keahlian</label><textarea id="account_area_of_expertise" name="account_area_of_expertise" placeholder="Contoh: desain pembelajaran, kepemimpinan, atau evaluasi program" rows={2} maxLength={500} required />
                <label htmlFor="account_widyaiswara_experience">Pengalaman sebagai widyaiswara</label><textarea id="account_widyaiswara_experience" name="account_widyaiswara_experience" placeholder="Ceritakan pengalaman kerja, instansi, atau program yang pernah ditangani..." rows={3} maxLength={2000} required />
              </>}
              <button type="submit" className="button button-primary" disabled={busy}>{busy ? "Membuat akun..." : "Buat akun"} <Icon name="arrow" size={16} /></button>
            </form>{accountCreateError && <p className="account-create-error" role="alert" aria-live="assertive">{accountCreateError}</p>}<p className="account-help">Akun langsung aktif. Sampaikan email dan kata sandi sementara secara aman kepada pemilik akun.</p>
              <div className="managed-account-roster">
                <div className="managed-account-heading"><div><span className="eyebrow">AKUN TERDAFTAR</span><h4>Kontributor dan verifikator</h4></div><span className="managed-account-count">{managedAccounts.length}</span></div>
                {managedAccounts.length === 0
                  ? <p className="managed-account-empty">Belum ada akun kontributor atau verifikator.</p>
                  : <div className="managed-account-list">{managedAccounts.map((account) => <article className="managed-account" key={account.id}>
                    <div className="managed-account-top"><div className="managed-account-identity">{account.profile_photo_path ? <Image src={supabase?.storage.from("profile-photos").getPublicUrl(account.profile_photo_path).data.publicUrl ?? ""} alt="" width={42} height={42} unoptimized /> : <span className="managed-account-avatar">{account.full_name.slice(0, 1).toLocaleUpperCase("id-ID")}</span>}<div><strong>{account.full_name}</strong><span>{account.job_title}</span></div></div><span className={`managed-account-role role-${account.role}`}>{account.role}</span></div>
                    <p><b>Bidang keahlian</b>{account.area_of_expertise || "Belum dilengkapi"}</p>
                    <p><b>Pengalaman widyaiswara</b>{account.widyaiswara_experience || "Belum dilengkapi"}</p>
                  </article>)}</div>}
              </div>
            </div>}
            <form onSubmit={updateBio} className="bio-form">
              {profile.role === "kontributor" && <div className="profile-photo-field">
                <div className="profile-photo-preview">{profile.profile_photo_path && supabase
                  ? <Image src={supabase.storage.from("profile-photos").getPublicUrl(profile.profile_photo_path).data.publicUrl} alt={`Foto profil ${profile.full_name}`} width={76} height={76} unoptimized />
                  : <span>{profile.full_name.slice(0, 1).toLocaleUpperCase("id-ID")}</span>}</div>
                <div className="profile-photo-copy"><label htmlFor="profile_photo">Foto profil</label><input id="profile_photo" name="profile_photo" type="file" accept="image/jpeg,image/png,image/webp" /><small>JPG, PNG, atau WebP · maksimal 5 MB</small></div>
              </div>}
              <label htmlFor="full_name">Nama lengkap</label><input id="full_name" name="full_name" defaultValue={profile.full_name} required maxLength={100} />
              <label htmlFor="job_title">Jabatan</label><input id="job_title" name="job_title" defaultValue={profile.job_title} required maxLength={120} />
              {profile.role === "kontributor" && <>
                <label htmlFor="area_of_expertise">Bidang keahlian</label><textarea id="area_of_expertise" name="area_of_expertise" defaultValue={profile.area_of_expertise} placeholder="Tuliskan bidang keahlian utama Anda..." rows={2} maxLength={500} required />
                <label htmlFor="widyaiswara_experience">Pengalaman bekerja sebagai widyaiswara</label><textarea id="widyaiswara_experience" name="widyaiswara_experience" defaultValue={profile.widyaiswara_experience} placeholder="Ceritakan pengalaman, instansi, program, dan kontribusi Anda sebagai widyaiswara..." rows={4} maxLength={2000} required />
                <label htmlFor="bio">Profil profesional lainnya (opsional)</label><textarea id="bio" name="bio" defaultValue={profile.bio ?? ""} placeholder="Tambahkan informasi profesional lain yang ingin dibagikan..." rows={3} maxLength={1000} />
              </>}
              {profile.role !== "kontributor" && <><label htmlFor="bio">Profil profesional dan keahlian mengajar</label><textarea id="bio" name="bio" defaultValue={profile.bio ?? ""} placeholder="Ceritakan bidang keahlian dan pengalaman mengajarmu..." rows={4} maxLength={1000} /></>}
              <button className="button button-dark" disabled={busy}>Simpan profil <Icon name="arrow" size={16} /></button>
            </form>
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
          </div>
          {(adminRole || verifierRole) && <div className="workspace-panel submissions-panel"><div className="panel-title"><div><span className="eyebrow">{adminRole ? "SELURUH PENGAJUAN" : "ANTRIAN VERIFIKASI"}</span><h3>{adminRole ? "Kelola materi kontributor" : "Materi komunitas"}</h3></div><span className="submission-count">{submissions.length.toString().padStart(2, "0")}</span></div>
            {submissions.length === 0 ? <div className="no-submissions"><Icon name="file" size={24} /><p>Belum ada materi di sini.</p></div> : <div className="submission-list">{submissions.map((item) => <article className="submission-item" key={item.id}><div className="submission-top"><span className={`status status-${item.status}`}>{item.status === "pending" ? "Menunggu verifikasi" : item.status === "approved" ? "Terverifikasi" : "Perlu revisi"}</span><time>{new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</time></div>{editingId === item.id ? <form className="contribution-form edit-post-form" onSubmit={(event) => saveSubmission(event, item.id)}>
              <label htmlFor={`edit_title_${item.id}`}>Judul</label><input id={`edit_title_${item.id}`} name="edit_title" defaultValue={item.title} required maxLength={120} />
              <label htmlFor={`edit_description_${item.id}`}>Deskripsi</label><textarea id={`edit_description_${item.id}`} name="edit_description" defaultValue={item.description} rows={4} required maxLength={2000} />
              {item.content_type === "video" && <><label htmlFor={`edit_youtube_url_${item.id}`}>Tautan YouTube</label><input id={`edit_youtube_url_${item.id}`} name="edit_youtube_url" type="url" defaultValue={item.youtube_url ?? ""} required /></>}
              <div className="review-actions"><button type="submit" disabled={busy}>Simpan perubahan</button><button type="button" onClick={() => setEditingId(null)}>Batal</button></div>
            </form> : <><SubmissionThumbnail id={item.id} title={item.title} contentType={item.content_type} categorySlug={item.category_slug} youtubeUrl={item.youtube_url} thumbnailPath={item.thumbnail_path} accessToken={session?.access_token} className="submission-list-thumbnail" /><div className="submission-kind">{item.content_type === "ebook" ? <Icon name="book" size={15} /> : <Icon name="video" size={15} />}{item.content_type === "ebook" ? "E-BOOK PEMBELAJARAN" : "VIDEO PEMBELAJARAN"}<span className="submission-category">{workCategories.find((category) => category.slug === item.category_slug)?.name ?? "Kategori"}</span></div><h4>{item.title}</h4><p className="submission-description">{item.description}</p></>}{(adminRole || verifierRole) && <span className="submitted-by">oleh {item.profiles?.[0]?.full_name ?? "Kontributor"}</span>}{item.content_type === "video" && item.youtube_url && <div className="submission-video"><iframe src={`https://www.youtube-nocookie.com/embed/${youtubeId(item.youtube_url)}`} title={`Video: ${item.title}`} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>}{item.document_path && <DocumentPreview path={item.document_path} title={item.title} />}{item.feedback && <p className="review-feedback">{item.feedback}</p>}{verifierRole && item.status === "pending" && <div className="review-actions"><button onClick={() => reviewSubmission(item.id, "approved")}><Icon name="check" size={15} /> Setujui</button><button onClick={() => reviewSubmission(item.id, "rejected")}>Minta revisi</button><button type="button" onClick={() => deleteSubmission(item)} disabled={busy}>Hapus postingan</button></div>}{adminRole && <div className="review-actions admin-post-actions">{item.status === "approved" && editingId !== item.id && <button type="button" onClick={() => setEditingId(item.id)}>Edit postingan</button>}{item.status === "approved" && <button type="button" onClick={() => togglePublished(item)} disabled={busy}>{item.is_published ? "Tarik dari beranda" : "Terbitkan di beranda"}</button>}<button type="button" onClick={() => deleteSubmission(item)} disabled={busy}>Hapus postingan</button></div>}</article>)}</div>}
          </div>}
        </div>}
      </section>
      </>}

      <footer className="site-footer">
        <div className="footer-top">
          <div className="footer-brand-block">
            <Link className="brand footer-brand" href="/" aria-label="Karya Widyaiswara"><Image className="brand-logo" src="/panisi-logo-light.svg" alt="Karya Widyaiswara" width={190} height={48} /></Link>
            <p>Ruang bersama untuk merawat gagasan, membagikan pengalaman, dan menumbuhkan pembelajaran yang bermakna.</p>
          </div>
          <div className="footer-message"><span className="eyebrow">KARYA WIDYAISWARA</span><strong>Ilmu dibagikan.<br />Inspirasi diteruskan.</strong><span>Setiap karya adalah kontribusi untuk pendidikan Indonesia.</span></div>
          <nav className="footer-links" aria-label="Tautan footer"><span>JELAJAHI</span><Link href="/#karya">Karya komunitas</Link><Link href="/koleksi">Koleksi karya</Link><Link href="/widyaiswara">Komunitas</Link><Link href="/ajukan">Bagikan karya</Link></nav>
        </div>
        <div className="footer-bottom"><span>© 2026 PANISI · KARYA WIDYAISWARA</span><span>BERBAGI PENGETAHUAN, MENGUATKAN PEMBELAJARAN</span><Link className="footer-top-link" href="/">Kembali ke atas ↑</Link></div>
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
  if (error) return <div className="document-preview-error" role="alert">Pratinjau e-book tidak tersedia: {error}</div>;
  if (!url) return <div className="document-preview-loading"><Icon name="file" size={17} /> Memuat pratinjau e-book...</div>;
  return <div className="document-preview">
    <div className="document-preview-toolbar"><span><Icon name="file" size={16} /> Pratinjau e-book</span><a href={url} target="_blank" rel="noreferrer">Buka PDF untuk cetak <Icon name="arrow" size={14} /></a></div>
    <iframe src={url} title={`Pratinjau e-book: ${title}`} loading="lazy" />
  </div>;
}
