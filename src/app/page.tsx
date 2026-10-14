"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Role = "admin" | "verifikator" | "kontributor";
type ContentType = "Semua" | "Video" | "E-Book" | "Science" | "Populer" | "Insight" | "Review" | "Best Practice";
type Profile = {
  id: string;
  full_name: string;
  role: Role;
  bio: string | null;
};
type Submission = {
  id: string;
  profile_id: string;
  title: string;
  description: string;
  youtube_url: string;
  document_path: string;
  status: "pending" | "approved" | "rejected";
  feedback: string | null;
  is_published: boolean;
  created_at: string;
  profiles?: { full_name: string }[] | null;
};
type PublishedSubmission = {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  created_at: string;
  full_name: string;
};
type ManagedAccountRole = "verifikator" | "kontributor";
export type PageKey = "beranda" | "jelajahi" | "produk" | "koleksi" | "widyaiswara" | "ajukan" | "ruang-kerja";
type HomeLesson = (typeof lessons)[number] & {
  id?: string;
  description?: string;
  youtube_url?: string;
};

const navItems: [string, string, string][] = [
  ["Beranda", "/", "home"],
  ["Jelajahi", "/jelajahi", "search"],
  ["Karya", "/produk", "book"],
  ["Koleksi", "/koleksi", "grid"],
  ["Widyaiswara", "/widyaiswara", "users"],
  ["Unggah Karya", "/ajukan", "upload"],
  ["Ruang Kerja", "/ruang-kerja", "briefcase"],
];

const lessons = [
  { category: "DESAIN PEMBELAJARAN", title: "Merancang Pembelajaran yang Efektif", author: "R. Sari Wulandari", time: "12 menit", color: "forest", symbol: "✳", level: "PEMULA", format: "VIDEO PEMBELAJARAN" },
  { category: "METODE FASILITASI", title: "Teknik Fasilitasi Kelas Interaktif", author: "Bima Pratama", time: "8 menit", color: "sun", symbol: "↗", level: "PEMULA", format: "MATERI PRAKTIK" },
  { category: "ASESMEN KOMPETENSI", title: "Menyusun Asesmen Pembelajaran", author: "Dewi Anggraini", time: "15 menit", color: "ocean", symbol: "≈", level: "MENENGAH", format: "VIDEO PEMBELAJARAN" },
];

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    leaf: <><path d="M20 4c-8 0-14 4-14 11a5 5 0 0 0 5 5c7 0 11-6 9-16Z" /><path d="M4 21c3-6 7-9 13-12" /></>,
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
      <section className="login-dialog" role="dialog" aria-modal="true" aria-labelledby="login-title">
        <button className="dialog-close" onClick={onClose} aria-label="Tutup">×</button>
        <Image className="dialog-mark" src="/panisi-mark.svg" alt="" width={52} height={52} />
        <span className="eyebrow">SELAMAT DATANG KEMBALI</span>
        <h2 id="login-title">Ruang karya<br />Widyaiswara.</h2>
        <p>Masuk untuk menjelajah karya, mengelola konten, dan memantau kontribusi terbaik para widyaiswara.</p>
        {!supabase && <div className="notice">Hubungkan Supabase terlebih dahulu dengan mengisi <code>.env.local</code>. Panduannya tersedia di README.</div>}
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Alamat email</label>
          <input id="email" type="email" autoComplete="email" placeholder="nama@email.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <label htmlFor="password">Kata sandi</label>
          <input id="password" type="password" autoComplete="current-password" placeholder="Masukkan kata sandi" value={password} onChange={(event) => setPassword(event.target.value)} required />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary login-submit" disabled={!supabase || busy}>{busy ? "Memproses..." : "Masuk ke Karya Widyaiswara"} <Icon name="arrow" size={17} /></button>
        </form>
        <span className="dialog-help">Belum memiliki akun? Hubungi administrator Karya Widyaiswara.</span>
      </section>
    </div>
  );
}

export function Home({ activePage = "beranda" }: { activePage?: PageKey }) {
  const [lessonQuery, setLessonQuery] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [publishedSubmissions, setPublishedSubmissions] = useState<PublishedSubmission[]>([]);
  const [loginOpen, setLoginOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadWorkspace = useCallback(async (activeSession: Session | null) => {
    if (!supabase || !activeSession) {
      setProfile(null);
      setSubmissions([]);
      return;
    }
    const { data: currentProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, role, bio")
      .eq("id", activeSession.user.id)
      .single();
    if (profileError) {
      setMessage(`Profil tidak dapat dimuat: ${profileError.message}`);
      return;
    }
    setProfile(currentProfile as Profile);
    let query = supabase
      .from("submissions")
      .select("id, profile_id, title, description, youtube_url, document_path, status, feedback, is_published, created_at, profiles(full_name)")
      .order("created_at", { ascending: false });
    if (currentProfile.role === "admin") query = query.eq("status", "approved");
    else if (currentProfile.role === "verifikator") query = query.eq("status", "pending");
    else query = query.eq("profile_id", activeSession.user.id);
    const { data, error } = await query;
    if (error) {
      setMessage(`Ruang kerja tidak dapat dimuat: ${error.message}`);
      return;
    }
    setSubmissions((data ?? []) as Submission[]);
  }, []);

  const loadPublished = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("published_submissions")
      .select("id, title, description, youtube_url, created_at, full_name")
      .order("created_at", { ascending: false });
    if (error) {
      setMessage(`Materi terbit tidak dapat dimuat: ${error.message}`);
      return;
    }
    setPublishedSubmissions((data ?? []) as PublishedSubmission[]);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      void loadWorkspace(data.session);
      void loadPublished();
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void loadWorkspace(nextSession);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadPublished, loadWorkspace]);

  async function login(email: string, password: string) {
    if (!supabase) throw new Error("Koneksi Supabase belum dikonfigurasi.");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function updateBio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !profile) return;
    const bio = new FormData(event.currentTarget).get("bio")?.toString().trim() ?? "";
    setBusy(true);
    setMessage("");
    const { error } = await supabase.from("profiles").update({ bio }).eq("id", profile.id);
    setBusy(false);
    if (error) setMessage(`Biodata belum tersimpan: ${error.message}`);
    else {
      setProfile({ ...profile, bio });
      setMessage("Biodata berhasil diperbarui.");
    }
  }

  async function submitContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !profile) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const title = values.get("title")?.toString().trim() ?? "";
    const description = values.get("description")?.toString().trim() ?? "";
    const videoUrl = values.get("youtube_url")?.toString().trim() ?? "";
    const file = values.get("document");
    if (!(file instanceof File) || file.size === 0 || file.type !== "application/pdf") {
      setMessage("Pilih dokumen dengan format PDF.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setMessage("Ukuran dokumen maksimal 20 MB.");
      return;
    }
    if (!youtubeId(videoUrl)) {
      setMessage("Masukkan tautan video YouTube yang valid.");
      return;
    }
    setBusy(true);
    setMessage("");
    const path = `${profile.id}/${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await supabase.storage.from("contribution-documents").upload(path, file, { contentType: "application/pdf", upsert: false });
    if (uploadError) {
      setBusy(false);
      setMessage(`Dokumen gagal diunggah: ${uploadError.message}`);
      return;
    }
    const { error } = await supabase.from("submissions").insert({
      profile_id: profile.id,
      title,
      description,
      youtube_url: videoUrl,
      document_path: path,
    });
    setBusy(false);
    if (error) {
      const { error: cleanupError } = await supabase.storage.from("contribution-documents").remove([path]);
      if (cleanupError) {
        setMessage(`Kontribusi belum tersimpan (${error.message}) dan dokumen sementara tidak dapat dibersihkan (${cleanupError.message}).`);
        return;
      }
      setMessage(`Kontribusi belum tersimpan: ${error.message}`);
      return;
    }
    form.reset();
    setMessage("Kontribusi berhasil diajukan untuk diverifikasi.");
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
      await loadWorkspace(session);
    }
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/accounts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fullName: values.get("account_full_name")?.toString() ?? "",
        email: values.get("account_email")?.toString() ?? "",
        password: values.get("account_password")?.toString() ?? "",
        role: values.get("account_role")?.toString() ?? "",
      }),
    });
    const result = await response.json() as { error?: string; fullName?: string; role?: ManagedAccountRole };
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error ?? "Akun tidak dapat dibuat.");
      return;
    }
    form.reset();
    setMessage(`Akun ${result.fullName ?? "baru"} (${result.role}) berhasil dibuat.`);
  }

  async function saveSubmission(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    if (!supabase) return;
    const values = new FormData(event.currentTarget);
    const title = values.get("edit_title")?.toString().trim() ?? "";
    const description = values.get("edit_description")?.toString().trim() ?? "";
    const videoUrl = values.get("edit_youtube_url")?.toString().trim() ?? "";
    if (!title || title.length > 120 || !description || description.length > 2000 || !youtubeId(videoUrl)) {
      setMessage("Lengkapi judul, deskripsi, dan tautan YouTube yang valid.");
      return;
    }
    setBusy(true);
    setMessage("");
    const { error } = await supabase.from("submissions").update({
      title,
      description,
      youtube_url: videoUrl,
    }).eq("id", id);
    setBusy(false);
    if (error) {
      setMessage(`Postingan tidak dapat diperbarui: ${error.message}`);
      return;
    }
    setEditingId(null);
    setMessage("Postingan berhasil diperbarui.");
    await Promise.all([loadWorkspace(session), loadPublished()]);
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
    await Promise.all([loadWorkspace(session), loadPublished()]);
  }

  async function deleteSubmission(item: Submission) {
    if (!supabase || !window.confirm(`Hapus postingan “${item.title}”? Tindakan ini tidak dapat dibatalkan.`)) return;
    setBusy(true);
    setMessage("");
    const { error } = await supabase.from("submissions").delete().eq("id", item.id);
    if (error) {
      setBusy(false);
      setMessage(`Postingan tidak dapat dihapus: ${error.message}`);
      return;
    }
    const { error: storageError } = await supabase.storage
      .from("contribution-documents")
      .remove([item.document_path]);
    setBusy(false);
    if (storageError) {
      setMessage(`Postingan berhasil dihapus, tetapi dokumen ${item.document_path} tidak dapat dibersihkan: ${storageError.message}`);
    } else {
      setMessage("Postingan dan dokumen pendukung berhasil dihapus.");
    }
    await Promise.all([loadWorkspace(session), loadPublished()]);
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setMessage(`Tidak dapat keluar: ${error.message}`);
  }

  const adminRole = profile?.role === "admin";
  const verifierRole = profile?.role === "verifikator";
  const homeLessons: HomeLesson[] = [
    ...lessons,
    ...publishedSubmissions.map((item, index) => ({
      id: item.id,
      category: "MATERI KOMUNITAS",
      title: item.title,
      author: item.full_name,
      time: "VIDEO",
      color: (["forest", "sun", "ocean"] as const)[index % 3],
      symbol: "↗",
      level: "TERVERIFIKASI",
      format: "VIDEO PEMBELAJARAN",
      description: item.description,
      youtube_url: item.youtube_url,
    })),
  ];
  const filteredLessons = homeLessons.filter((lesson) =>
    `${lesson.title} ${lesson.category} ${lesson.author} ${lesson.description ?? ""}`.toLowerCase().includes(lessonQuery.trim().toLowerCase()),
  );

  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Karya Widyaiswara"><Image className="brand-logo" src="/panisi-logo.svg" alt="Karya Widyaiswara" width={190} height={48} priority /></Link>
        <nav className="desktop-nav" aria-label="Navigasi utama">
          {navItems.map(([label, href, icon]) => <Link className={(href === "/" ? activePage === "beranda" : href.slice(1) === activePage) ? "nav-active" : ""} href={href} key={href} aria-current={(href === "/" ? activePage === "beranda" : href.slice(1) === activePage) ? "page" : undefined}><Icon name={icon} size={15} />{label}</Link>)}
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
          {navItems.map(([label, href, icon]) => <Link className={(href === "/" ? activePage === "beranda" : href.slice(1) === activePage) ? "nav-active" : ""} href={href} key={href} aria-current={(href === "/" ? activePage === "beranda" : href.slice(1) === activePage) ? "page" : undefined} onClick={() => setMobileNavOpen(false)}><span><Icon name={icon} size={17} />{label}</span><Icon name="arrow" size={15} /></Link>)}
        </nav>}
      </header>

      {activePage === "beranda" && <>
      <section className="hero" id="beranda">
        <div className="hero-image" aria-hidden="true" />
        <div className="hero-shade" aria-hidden="true" />
        <div className="hero-content">
          <div className="hero-pill"><span className="live-dot" /> KARYA WIDYAISWARA</div>
          <h1>Menampilkan karya.<br /><em>Menginspirasi pembelajaran.</em></h1>
          <p>Ruang digital untuk menampilkan karya terbaik widyaiswara, berbagi pengalaman, dan memperkuat inspirasi pembelajaran yang berdampak.</p>
          <div className="hero-actions"><Link href="/produk" className="button button-light">Jelajahi karya <Icon name="arrow" size={17} /></Link><Link href="/ajukan" className="hero-text-link"><span className="play-circle"><Icon name="play" size={13} /></span> Bagikan karya ajar</Link></div>
        </div>
        <div className="hero-learning-card" aria-label="Ringkasan karya Widyaiswara">
          <div className="preview-top"><span><Icon name="book" size={17} /> KARYA WIDYAISWARA</span><span className="preview-live"><i /> ONLINE</span></div>
          <div className="preview-title">Karya baru<br /><strong>menginspirasi banyak orang.</strong></div>
          <div className="preview-progress"><span><i /></span></div>
          <div className="preview-progress-caption"><span>PORTOFOLIO</span><strong>3 karya terpilih</strong></div>
          <div className="preview-modules">
            <span className="preview-module-icon"><Icon name="book" size={18} /></span>
            <span><strong>Karya widyaiswara</strong><small>Materi · Video · Praktik</small></span>
            <Icon name="check" size={17} />
          </div>
          <div className="preview-avatars"><span>SW</span><span>BP</span><span>DA</span><small>Kolaborasi karya terbaik</small></div>
        </div>
        <div className="hero-note"><span className="note-rule" /> <span>Setiap karya memberi makna.<br /><strong>Inspirasi hidup dalam praktik.</strong></span></div>
        <div className="hero-index">01 <span /> 04</div>
        <div className="hero-bottom"><span>KARYA • INSPIRASI • KOLABORASI</span><span>JELAJAHI KARYA WIDYAISWARA <span className="down-arrow">↓</span></span></div>
      </section>
      <section className="learning-section home-published-section">
        <div className="content-wrap">
          <div className="section-heading"><div><span className="eyebrow">KARYA TERPILIH</span><h2>Karya inspiratif dari sesama widyaiswara.</h2></div><Link className="text-link" href="/produk">Semua karya <Icon name="arrow" size={16} /></Link></div>
          {publishedSubmissions.length > 0 ? <div className="lesson-grid">
            {publishedSubmissions.slice(0, 3).map((item, index) => <article className="lesson-card" key={item.id}>
              <a className={`lesson-art ${(["forest", "sun", "ocean"] as const)[index % 3]}`} href={item.youtube_url} target="_blank" rel="noreferrer" aria-label={`Tonton ${item.title}`}><span className="art-orbit orbit-one" /><span className="art-orbit orbit-two" /><span className="art-symbol">↗</span><span className="lesson-count">TERBIT</span><span className="art-play"><Icon name="play" size={16} /></span><span className="lesson-format">VIDEO KARYA</span></a>
              <div className="lesson-meta"><span>KARYA KOMUNITAS</span><span>TERVERIFIKASI</span></div><h3>{item.title}</h3><p className="lesson-description">{item.description}</p><div className="lesson-author"><span className="author-avatar">{item.full_name.slice(0, 1)}</span><span>{item.full_name}</span><span className="lesson-duration">VIDEO</span></div>
            </article>)}
          </div> : <p className="lesson-empty">Karya yang sudah diverifikasi dan diterbitkan akan tampil di sini.</p>}
        </div>
      </section>
      </>}

      {activePage === "jelajahi" && <>
      <section className="intro content-wrap" id="jelajahi">
        <div className="intro-kicker"><span className="eyebrow">KARYA DAN PENGALAMAN BERKELANJUTAN</span><span className="section-number">01 / 04</span></div>
        <div className="intro-grid">
          <h2>Jelajahi karya,<br /><em>temukan inspirasi baru.</em></h2>
          <div className="intro-copy"><p>Setiap karya widyaiswara menjadi cerminan keahlian, pengalaman mengajar, dan kontribusi nyata dalam membangun pembelajaran yang bermakna.</p><Link className="text-link" href="/produk">Lihat semua karya <Icon name="arrow" size={16} /></Link></div>
        </div>
        <div className="feature-strip">
          <div className="feature-icon"><Icon name="play" size={21} /></div><span>PORTOFOLIO TERSTRUKTUR</span><p>Setiap karya tersusun untuk memudahkan akses dan inspirasi.</p>
          <div className="feature-icon second"><Icon name="user" size={21} /></div><span>KOMUNITAS WIDYAISWARA</span><p>Berbagi pengalaman dan praktik pembelajaran terbaik.</p>
          <Link href="/widyaiswara" className="feature-more" aria-label="Kenali widyaiswara"><Icon name="arrow" size={19} /></Link>
        </div>
      </section>
      </>}

      {activePage === "produk" && <>
      <section className="learning-section" id="produk">
        <div className="content-wrap">
          <div className="section-heading"><div><span className="eyebrow">KARYA WIDYAISWARA</span><h2>Ragam karya unggulan.</h2></div><span className="lesson-total">{filteredLessons.length} KARYA</span></div>
          <label className="lesson-search"><Icon name="search" size={18} /><input type="search" value={lessonQuery} onChange={(event) => setLessonQuery(event.target.value)} placeholder="Cari judul, tema, atau pengajar..." aria-label="Cari karya widyaiswara" /></label>
          {filteredLessons.length > 0 ? <div className="lesson-grid">
            {filteredLessons.map((lesson, index) => <article className="lesson-card" key={lesson.id ?? lesson.title}>
              <a className={`lesson-art ${lesson.color}`} href={lesson.youtube_url ?? "/koleksi"} target={lesson.youtube_url ? "_blank" : undefined} rel={lesson.youtube_url ? "noreferrer" : undefined} aria-label={`Pelajari ${lesson.title}`}><span className="art-orbit orbit-one" /><span className="art-orbit orbit-two" /><span className="art-symbol">{lesson.symbol}</span><span className="lesson-count">KARYA {String(index + 1).padStart(2, "0")}</span><span className="art-play"><Icon name="play" size={16} /></span><span className="lesson-format">{lesson.format}</span></a>
              <div className="lesson-meta"><span>{lesson.category}</span><span>{lesson.level}</span></div><h3>{lesson.title}</h3>{lesson.description && <p className="lesson-description">{lesson.description}</p>}<div className="lesson-author"><span className="author-avatar">{lesson.author.slice(0, 1)}</span><span>{lesson.author}</span><span className="lesson-duration">{lesson.time}</span></div>
            </article>)}
          </div> : <p className="lesson-empty">Belum ada karya untuk “{lessonQuery}”. Coba kata kunci lain.</p>}
        </div>
      </section>
      </>}

      {activePage === "koleksi" && <>
      <section className="collection-section" id="koleksi">
        <div className="collection-image"><div className="collection-frame"><span className="frame-label">KARYA / WIDYAISWARA</span><span className="frame-sun" /><span className="frame-plant">✳</span><span className="frame-caption">Bangun<br />inspirasi.</span></div></div>
        <div className="collection-copy"><span className="eyebrow">KOLLEKSI KARYA</span><h2>Setiap karya<br /><em>mencerminkan dedikasi mengajar.</em></h2><p>Kumpulan karya widyaiswara menjadi jejak pengalaman, inovasi, dan inspirasi yang terus berkembang untuk mendukung pembelajaran yang lebih bermakna.</p><Link className="button button-dark" href="/produk">Jelajahi karya <Icon name="arrow" size={17} /></Link><div className="collection-coordinate">INOVASI • PENGALAMAN • INSPIRASI</div></div>
      </section>
      </>}

      {activePage === "widyaiswara" && <>
      <section className="teacher-section" id="widyaiswara">
        <div className="teacher-copy"><span className="eyebrow">KOMUNITAS PENGAJAR</span><h2>Karya dibagikan,<br /><em>inspirasi diteruskan.</em></h2><p>Terhubung dengan widyaiswara yang membagikan karya, metode, wawasan, dan pengalaman mengajar dari berbagai bidang.</p><Link className="text-link" href="/ajukan">Jadilah kontributor <Icon name="arrow" size={16} /></Link></div>
        <div className="teacher-quote"><span className="quote-mark">“</span><blockquote>Setiap karya yang dibagikan menjadi sumber inspirasi bagi pembelajaran yang lebih luas.</blockquote><span className="quote-credit">KOLABORASI • INOVASI • KARYA</span><span className="teacher-leaf"><Icon name="book" size={84} /></span></div>
      </section>
      </>}

      {activePage === "ajukan" && <>
      <section className="contribute-section" id="ajukan">
        <div className="content-wrap contribute-inner">
          <div className="contribute-kicker"><span className="eyebrow">BAGIKAN KARYA, TULISKAN INSPIRASI</span><span className="contribute-index">02 — 04</span></div>
          <div className="contribute-grid"><h2>Jadikan pengalamanmu<br /><em>karya yang menginspirasi.</em></h2><div><p>Bagikan biodata profesional, video pembelajaran, dan dokumen pendukung. Setelah diverifikasi, karya Anda dapat menjadi inspirasi bagi komunitas widyaiswara.</p><Link href="/ruang-kerja" className="button button-light">Ajukan karya ajar <Icon name="arrow" size={17} /></Link></div></div>
          <div className="steps"><div><span>01</span><strong>Kenalkan dirimu</strong><p>Bagikan biodata dan keahlianmu.</p></div><div><span>02</span><strong>Susun karya</strong><p>Tambahkan video pembelajaran YouTube.</p></div><div><span>03</span><strong>Lengkapi sumber</strong><p>Unggah dokumen pendukung PDF.</p></div><div><span>04</span><strong>Bagikan inspirasi</strong><p>Karya ditinjau sebelum diterbitkan.</p></div></div>
        </div>
      </section>
      </>}

      {activePage === "ruang-kerja" && <>
      <section className="workspace-section content-wrap" id="ruang-kerja">
        <div className="section-heading workspace-heading"><div><span className="eyebrow">PANISI / RUANG KERJA</span><h2>{profile ? `Halo, ${profile.full_name}.` : "Ruang pengembangan profesional."}</h2></div>{session ? <button className="button button-outline" onClick={signOut}>Keluar <Icon name="arrow" size={16} /></button> : <button className="button button-dark" onClick={() => setLoginOpen(true)}>Masuk ke ruang kerja <Icon name="arrow" size={16} /></button>}</div>
        {message && <div className={message.includes("berhasil") ? "workspace-message success" : "workspace-message"} role="status">{message}<button onClick={() => setMessage("")} aria-label="Tutup pesan">×</button></div>}
        {!session && <div className="workspace-empty"><span className="feature-icon"><Icon name="play" size={21} /></span><p>Masuk untuk mengelola profil widyaiswara, membagikan materi ajar, atau meninjau kontribusi sesuai peranmu.</p><span className="role-list">ADMIN <i /> VERIFIKATOR <i /> KONTRIBUTOR</span></div>}
        {session && profile && <div className="workspace-grid">
          <div className="workspace-panel">
            <div className="panel-title"><div><span className="eyebrow">PROFIL PROFESIONAL</span><h3>Biodata dan keahlian</h3></div><span className="role-badge">{profile.role}</span></div>
            {adminRole && <div className="submit-box account-box"><span className="eyebrow">MANAJEMEN AKUN</span><h3>Buat akun verifikator atau kontributor</h3><form onSubmit={createAccount} className="contribution-form">
              <label htmlFor="account_full_name">Nama lengkap</label><input id="account_full_name" name="account_full_name" required maxLength={100} />
              <label htmlFor="account_email">Alamat email</label><input id="account_email" name="account_email" type="email" autoComplete="off" required />
              <label htmlFor="account_password">Kata sandi sementara (min. 12 karakter)</label><input id="account_password" name="account_password" type="password" autoComplete="new-password" minLength={12} required />
              <label htmlFor="account_role">Peran</label><select id="account_role" name="account_role" defaultValue="kontributor"><option value="kontributor">Kontributor</option><option value="verifikator">Verifikator</option></select>
              <button className="button button-primary" disabled={busy}>{busy ? "Membuat akun..." : "Buat akun"} <Icon name="arrow" size={16} /></button>
            </form><p className="account-help">Akun langsung aktif. Bagikan email dan kata sandi sementara kepada pemilik akun.</p></div>}
            <form onSubmit={updateBio} className="bio-form"><label htmlFor="bio">Profil profesional dan keahlian mengajar</label><textarea id="bio" name="bio" defaultValue={profile.bio ?? ""} placeholder="Ceritakan bidang keahlian dan pengalaman mengajarmu..." rows={4} maxLength={1000} /><button className="button button-dark" disabled={busy}>Simpan profil <Icon name="arrow" size={16} /></button></form>
            {profile.role === "kontributor" && <div className="submit-box"><span className="eyebrow">KONTRIBUSI PEMBELAJARAN</span><h3>Ajukan materi ajar</h3><form onSubmit={submitContribution} className="contribution-form"><label htmlFor="title">Judul materi</label><input id="title" name="title" placeholder="Contoh: Teknik fasilitasi kelas interaktif" required maxLength={120} /><label htmlFor="description">Deskripsi</label><textarea id="description" name="description" placeholder="Jelaskan tujuan dan isi materi ajar..." rows={3} required maxLength={2000} /><label htmlFor="youtube_url">Tautan video pembelajaran YouTube</label><input id="youtube_url" name="youtube_url" type="url" placeholder="https://www.youtube.com/watch?v=..." required /><label htmlFor="document">Modul atau dokumen pendukung (PDF, maks. 20 MB)</label><input id="document" name="document" type="file" accept="application/pdf,.pdf" required /><button className="button button-primary" disabled={busy}>{busy ? "Mengirim..." : "Ajukan untuk verifikasi"} <Icon name="arrow" size={16} /></button></form></div>}
          </div>
          <div className="workspace-panel submissions-panel"><div className="panel-title"><div><span className="eyebrow">{adminRole ? "POSTINGAN TERVERIFIKASI" : verifierRole ? "ANTRIAN VERIFIKASI" : "KONTRIBUSIKU"}</span><h3>{adminRole ? "Kelola dan terbitkan materi" : verifierRole ? "Materi komunitas" : "Materi yang diajukan"}</h3></div><span className="submission-count">{submissions.length.toString().padStart(2, "0")}</span></div>
            {submissions.length === 0 ? <div className="no-submissions"><Icon name="file" size={24} /><p>Belum ada materi di sini.</p></div> : <div className="submission-list">{submissions.map((item) => <article className="submission-item" key={item.id}><div className="submission-top"><span className={`status status-${item.status}`}>{item.status === "pending" ? "Menunggu verifikasi" : item.status === "approved" ? "Terverifikasi" : "Perlu revisi"}</span><time>{new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</time></div>{editingId === item.id ? <form className="contribution-form edit-post-form" onSubmit={(event) => saveSubmission(event, item.id)}>
              <label htmlFor={`edit_title_${item.id}`}>Judul</label><input id={`edit_title_${item.id}`} name="edit_title" defaultValue={item.title} required maxLength={120} />
              <label htmlFor={`edit_description_${item.id}`}>Deskripsi</label><textarea id={`edit_description_${item.id}`} name="edit_description" defaultValue={item.description} rows={4} required maxLength={2000} />
              <label htmlFor={`edit_youtube_url_${item.id}`}>Tautan YouTube</label><input id={`edit_youtube_url_${item.id}`} name="edit_youtube_url" type="url" defaultValue={item.youtube_url} required />
              <div className="review-actions"><button type="submit" disabled={busy}>Simpan perubahan</button><button type="button" onClick={() => setEditingId(null)}>Batal</button></div>
            </form> : <><h4>{item.title}</h4><p className="submission-description">{item.description}</p></>}{(adminRole || verifierRole) && <span className="submitted-by">oleh {item.profiles?.[0]?.full_name ?? "Kontributor"}</span>}<div className="submission-video"><iframe src={`https://www.youtube-nocookie.com/embed/${youtubeId(item.youtube_url)}`} title={`Video: ${item.title}`} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div><div className="submission-links">{supabase && <DocumentLink path={item.document_path} />}</div>{item.feedback && <p className="review-feedback">{item.feedback}</p>}{verifierRole && item.status === "pending" && <div className="review-actions"><button onClick={() => reviewSubmission(item.id, "approved")}><Icon name="check" size={15} /> Setujui</button><button onClick={() => reviewSubmission(item.id, "rejected")}>Minta revisi</button></div>}{adminRole && item.status === "approved" && <div className="review-actions admin-post-actions">{editingId !== item.id && <button onClick={() => setEditingId(item.id)}>Edit postingan</button>}<button onClick={() => togglePublished(item)} disabled={busy}>{item.is_published ? "Tarik dari beranda" : "Terbitkan di beranda"}</button><button onClick={() => deleteSubmission(item)} disabled={busy}>Hapus</button></div>}</article>)}</div>}
          </div>
        </div>}
      </section>
      </>}

      <footer className="site-footer">
        <div className="footer-top"><Link className="brand footer-brand" href="/" aria-label="Karya Widyaiswara"><Image className="brand-logo" src="/panisi-logo-light.svg" alt="Karya Widyaiswara" width={190} height={48} /></Link><span>Menghasilkan karya, menebar inspirasi.</span><Link className="footer-top-link" href="/">Kembali ke beranda ↑</Link></div>
        <div className="footer-bottom"><span>© 2026 PANISI — RUANG BELAJAR WIDYAISWARA</span><span>PENGEMBANGAN KOMPETENSI SEPANJANG HAYAT</span></div>
      </footer>
      {loginOpen && <LoginDialog onClose={() => setLoginOpen(false)} onLogin={login} />}
    </main>
  );
}

export default function HomePage() {
  return <Home activePage="beranda" />;
}

function DocumentLink({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!supabase) return;
    supabase.storage.from("contribution-documents").createSignedUrl(path, 60).then(({ data, error: signedUrlError }) => {
      if (signedUrlError) setError(signedUrlError.message);
      else setUrl(data.signedUrl);
    });
  }, [path]);
  if (error) return <span className="document-error" title={error}>Dokumen tidak tersedia</span>;
  return url ? <a href={url} target="_blank" rel="noreferrer"><Icon name="file" size={14} /> PDF</a> : <span className="document-loading">Memuat PDF...</span>;
}
