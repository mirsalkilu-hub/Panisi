"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { workHref } from "./work-links";

type ImpactAction = "reuse" | "application" | "feedback";
type ImpactSubmission = {
  id: string;
  submission_id: string;
  action_type: ImpactAction;
  details: string;
  application_completed: boolean;
  created_at: string;
  moderation_status: "pending" | "approved";
  publicly_visible: boolean;
  submissions: { title: string } | { title: string }[] | null;
};

const actionLabels: Record<ImpactAction, string> = {
  reuse: "Penggunaan kembali",
  application: "Penerapan lapangan",
  feedback: "Feedback",
};

function submissionTitle(record: ImpactSubmission) {
  const submission = Array.isArray(record.submissions) ? record.submissions[0] : record.submissions;
  return submission?.title ?? "Karya tidak ditemukan";
}

export function ImpactVerificationPanel() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [records, setRecords] = useState<ImpactSubmission[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    if (!supabase) {
      setError("Koneksi ke layanan belum tersedia.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    setRecords([]);
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      setError(`Sesi akun tidak dapat diperiksa: ${sessionError.message}`);
      setAuthorized(false);
      setLoading(false);
      return;
    }
    const user = sessionData.session?.user;
    if (!user) {
      setAuthorized(false);
      setRecords([]);
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      setError(`Peran akun tidak dapat diperiksa: ${profileError.message}`);
      setAuthorized(false);
      setLoading(false);
      return;
    }
    if (profile?.role !== "admin" && profile?.role !== "verifikator") {
      setAuthorized(false);
      setRecords([]);
      setLoading(false);
      return;
    }

    setAuthorized(true);
    const { data, error: recordsError } = await supabase
      .from("submission_impact_records")
      .select("id, submission_id, action_type, details, application_completed, created_at, moderation_status, publicly_visible, submissions(title)")
      .or("moderation_status.eq.pending,and(moderation_status.eq.approved,publicly_visible.eq.false)")
      .order("created_at", { ascending: true });
    if (recordsError) {
      setError(`Antrean catatan dampak tidak dapat dimuat: ${recordsError.message}`);
      setLoading(false);
      return;
    }
    setRecords((data ?? []) as ImpactSubmission[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => { void loadRecords(); }, 0);
    if (!supabase) return () => window.clearTimeout(initialLoad);
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => { void loadRecords(); }, 0);
    });
    return () => {
      window.clearTimeout(initialLoad);
      authListener.subscription.unsubscribe();
    };
  }, [loadRecords]);

  async function reviewRecord(record: ImpactSubmission, decision: "approved" | "rejected") {
    if (!supabase) return;
    const reviewerNote = decision === "rejected"
      ? window.prompt("Alasan penolakan wajib diisi:")
      : window.prompt("Catatan verifikator (opsional):");
    if (reviewerNote === null) return;
    if (decision === "rejected" && !reviewerNote.trim()) {
      setError("Alasan penolakan wajib diisi.");
      return;
    }

    setBusyId(record.id);
    setError("");
    setNotice("");
    const { data, error: reviewError } = await supabase
      .from("submission_impact_records")
      .update({ moderation_status: decision, reviewer_note: reviewerNote.trim() || null })
      .eq("id", record.id)
      .eq("moderation_status", record.moderation_status)
      .select("id")
      .maybeSingle();
    setBusyId(null);
    if (reviewError) {
      setError(`Keputusan verifikasi tidak tersimpan: ${reviewError.message}`);
      return;
    }
    if (!data) {
      setError("Catatan sudah berubah status. Muat ulang antrean untuk melihat pembaruan.");
      await loadRecords();
      return;
    }
    setNotice(decision === "approved"
      ? "Catatan disetujui dan sekarang tampil di halaman karya."
      : "Catatan ditolak dan tidak akan ditampilkan kepada publik.");
    await loadRecords();
  }

  return (
    <main className="impact-review-page">
      <header className="impact-review-header">
        <div><span className="eyebrow">RUANG VERIFIKATOR</span><h1>Verifikasi Dampak Karya</h1><p>Tinjau catatan publik sebelum angka dan detailnya ditampilkan pada halaman karya.</p></div>
        <Link className="button button-outline" href="/ruang-kerja">Kembali ke ruang kerja</Link>
      </header>
      {!authorized && !loading
        ? <section className="impact-review-empty"><h2>{supabase ? "Akses verifikator diperlukan" : "Layanan belum tersedia"}</h2><p>{supabase ? "Masuk dengan akun administrator atau verifikator untuk meninjau catatan." : "Konfigurasi layanan belum tersedia. Silakan coba lagi nanti."}</p><Link href="/ruang-kerja">Ke ruang kerja</Link></section>
        : <section className="impact-review-queue" aria-label="Antrean verifikasi dampak">
          <div className="impact-review-queue-heading"><div><span className="eyebrow">ANTREAN VERIFIKASI</span><h2>Catatan menunggu pemeriksaan</h2></div><span>{records.length}</span></div>
          {error && <p className="impact-review-error" role="alert">{error}</p>}
          {notice && <p className="impact-review-notice" role="status">{notice}</p>}
          {loading ? <p className="impact-review-empty">Memuat antrean verifikasi...</p>
            : records.length === 0 ? <p className="impact-review-empty">Tidak ada catatan dampak yang menunggu verifikasi.</p>
              : <div className="impact-review-list">{records.map((record) => {
                const title = submissionTitle(record);
                return <article className="impact-review-record" key={record.id}>
                  <div className="impact-review-record-top"><span>{actionLabels[record.action_type]}</span><time dateTime={record.created_at}>{new Date(record.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</time></div>
                  <h3><Link href={workHref(record.submission_id, title)}>{title}</Link></h3>
                  {record.moderation_status === "approved" && <span className="impact-review-legacy">Angka lama sudah dihitung; detail menunggu verifikasi untuk ditampilkan.</span>}
                  <p>{record.details}</p>
                  {record.action_type === "application" && <span className="impact-review-completed">{record.application_completed ? "Penerapan selesai" : "Penerapan belum selesai"}</span>}
                  <div className="impact-review-actions">
                    <button type="button" onClick={() => void reviewRecord(record, "approved")} disabled={Boolean(busyId)}>{busyId === record.id ? "Menyimpan..." : "Setujui & publikasikan"}</button>
                    <button type="button" onClick={() => void reviewRecord(record, "rejected")} disabled={Boolean(busyId)}>Tolak</button>
                  </div>
                </article>;
              })}</div>}
        </section>}
    </main>
  );
}
