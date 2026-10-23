"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ImpactAction = "reuse" | "application" | "feedback";
type ImpactCounts = { reuse_count: number; application_count: number; completed_count: number };
type ImpactRecord = {
  id: string;
  action_type: ImpactAction;
  details: string;
  application_completed: boolean;
  created_at: string;
};

const emptyCounts: ImpactCounts = { reuse_count: 0, application_count: 0, completed_count: 0 };
const actionLabels: Record<ImpactAction, string> = {
  reuse: "Penggunaan kembali",
  application: "Penerapan lapangan",
  feedback: "Feedback",
};

function ImpactIcon({ name }: { name: "reuse" | "application" | "completed" | "feedback" }) {
  const paths = {
    reuse: <><path d="M3 7h13l-3-3M21 17H8l3 3" /><path d="M16 4a7 7 0 0 1 0 10M8 20a7 7 0 0 1 0-10" /></>,
    application: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="m8 12 2.5 2.5L16 9" /></>,
    completed: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    feedback: <><path d="M12 3 14.7 9.3 21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7L12 3Z" /><path d="m19 3 .7 1.7L21.5 5.5l-1.8.8L19 8l-.8-1.7-1.7-.8 1.7-.8L19 3Z" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function WorkImpactPanel({ submissionId }: { submissionId: string }) {
  const [counts, setCounts] = useState(emptyCounts);
  const [publicRecords, setPublicRecords] = useState<ImpactRecord[]>([]);
  const [submittedActions, setSubmittedActions] = useState<Set<ImpactAction>>(() => new Set());
  const [busyAction, setBusyAction] = useState<ImpactAction | null>(null);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    async function loadImpact() {
      const [totalsResult, recordsResult] = await Promise.all([
        supabase!
          .from("submission_impact_totals")
          .select("reuse_count, application_count, completed_count")
          .eq("submission_id", submissionId)
          .maybeSingle(),
        supabase!
          .from("public_submission_impact_records")
          .select("id, action_type, details, application_completed, created_at")
          .eq("submission_id", submissionId)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      if (!active) return;
      if (totalsResult.error || recordsResult.error) {
        setErrorMessage(`Data dampak belum tersedia: ${totalsResult.error?.message ?? recordsResult.error?.message}`);
        return;
      }
      setCounts(totalsResult.data ?? emptyCounts);
      setPublicRecords((recordsResult.data ?? []) as ImpactRecord[]);
    }

    void loadImpact();
    return () => { active = false; };
  }, [submissionId]);

  async function saveImpact(action: ImpactAction, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setErrorMessage("Koneksi belum tersedia untuk mengirim catatan dampak.");
      return;
    }
    const formData = new FormData(event.currentTarget);
    const details = formData.get("details")?.toString().trim() ?? "";
    const completed = action === "application" && formData.get("completed") === "on";
    if (!details) {
      setErrorMessage("Lengkapi catatan sebelum mengirim.");
      return;
    }

    setBusyAction(action);
    setNotice("");
    setErrorMessage("");
    const { error } = await supabase.from("submission_impact_records").insert({
      submission_id: submissionId,
      contributor_id: null,
      action_type: action,
      details,
      application_completed: completed,
    });
    setBusyAction(null);
    if (error) {
      setErrorMessage(`Catatan belum terkirim: ${error.message}`);
      return;
    }

    setSubmittedActions((current) => new Set(current).add(action));
    setNotice("Catatan terkirim dan akan ditampilkan setelah disetujui verifikator.");
  }

  return (
    <section className="work-impact-panel" aria-labelledby="work-impact-title">
      <header className="work-impact-heading">
        <span className="work-impact-heading-icon"><ImpactIcon name="reuse" /></span>
        <div><span className="eyebrow">DAMPAK &amp; PEMANFAATAN</span><h2 id="work-impact-title">Dampak &amp; Pemanfaatan Pengetahuan</h2><p>Catat bagaimana karya ini digunakan dan memberi manfaat.</p></div>
      </header>
      <div className="work-impact-stats" aria-label="Ringkasan dampak karya">
        <article className="impact-stat impact-reuse"><span><ImpactIcon name="reuse" /></span><div><strong>{counts.reuse_count}</strong><small>Terverifikasi reuse</small></div></article>
        <article className="impact-stat impact-application"><span><ImpactIcon name="application" /></span><div><strong>{counts.application_count}</strong><small>Penerapan lapangan</small></div></article>
        <article className="impact-stat impact-completed"><span><ImpactIcon name="completed" /></span><div><strong>{counts.completed_count}</strong><small>Penerapan selesai</small></div></article>
      </div>
      <div className="work-impact-contribute">
        <h3>Catat &amp; Berikan Kontribusi</h3>
        <p className="impact-access-note">Siapa saja dapat mengirim catatan. Catatan dan detailnya hanya akan tampil untuk publik setelah diverifikasi. Jangan sertakan data pribadi atau informasi rahasia.</p>
        <div className="work-impact-actions">
          <article className="work-impact-action">
            <h4><ImpactIcon name="reuse" />1. Catat Penggunaan Kembali (Reuse)</h4>
            <p>Ceritakan bagaimana materi ini digunakan dalam pembelajaran atau pekerjaan Anda.</p>
            <form onSubmit={(event) => void saveImpact("reuse", event)}>
              <label htmlFor={`impact-reuse-${submissionId}`}>Catatan penggunaan</label>
              <textarea id={`impact-reuse-${submissionId}`} name="details" maxLength={2000} placeholder="Di mana dan bagaimana materi ini digunakan?" required disabled={submittedActions.has("reuse")} />
              <button type="submit" className="impact-action-button" disabled={Boolean(busyAction) || submittedActions.has("reuse")}>{busyAction === "reuse" ? "Mengirim..." : submittedActions.has("reuse") ? "Menunggu verifikasi" : "Kirim catatan reuse"}</button>
            </form>
          </article>
          <article className="work-impact-action">
            <h4><ImpactIcon name="application" />2. Catat Penerapan Nyata (Application)</h4>
            <p>Ceritakan penerapan pengetahuan ini di organisasi atau lapangan.</p>
            <form onSubmit={(event) => void saveImpact("application", event)}>
              <label htmlFor={`impact-application-${submissionId}`}>Catatan penerapan</label>
              <textarea id={`impact-application-${submissionId}`} name="details" maxLength={2000} placeholder="Apa yang diterapkan dan bagaimana hasilnya?" required disabled={submittedActions.has("application")} />
              <label className="impact-completed-toggle"><input type="checkbox" name="completed" disabled={submittedActions.has("application")} /> Penerapan sudah selesai</label>
              <button type="submit" className="impact-action-button" disabled={Boolean(busyAction) || submittedActions.has("application")}>{busyAction === "application" ? "Mengirim..." : submittedActions.has("application") ? "Menunggu verifikasi" : "Kirim catatan penerapan"}</button>
            </form>
          </article>
          <article className="work-impact-action">
            <h4><ImpactIcon name="feedback" />3. Berikan Feedback Terstruktur</h4>
            <p>Bagikan manfaat yang dirasakan dan saran untuk pengembangan karya.</p>
            <form onSubmit={(event) => void saveImpact("feedback", event)}>
              <label htmlFor={`impact-feedback-${submissionId}`}>Ulasan dan saran</label>
              <textarea id={`impact-feedback-${submissionId}`} name="details" maxLength={2000} placeholder="Apa yang bermanfaat? Apa yang bisa ditingkatkan?" required disabled={submittedActions.has("feedback")} />
              <button type="submit" className="impact-action-button" disabled={Boolean(busyAction) || submittedActions.has("feedback")}>{busyAction === "feedback" ? "Mengirim..." : submittedActions.has("feedback") ? "Menunggu verifikasi" : "Kirim feedback"}</button>
            </form>
          </article>
        </div>
        {notice && <p className="impact-success" role="status">{notice}</p>}
        {errorMessage && <p className="impact-error" role="alert">{errorMessage}</p>}
      </div>
      <div className="work-impact-contribute work-impact-public-records">
        <h3>Catatan yang Sudah Diverifikasi</h3>
        {publicRecords.length === 0
          ? <p className="impact-access-note">Belum ada catatan dampak yang disetujui untuk ditampilkan.</p>
          : <div className="impact-public-record-list">{publicRecords.map((record) => <article className="impact-public-record" key={record.id}>
            <div><strong>{actionLabels[record.action_type]}</strong><time dateTime={record.created_at}>{new Date(record.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</time></div>
            <p>{record.details}</p>
            {record.action_type === "application" && record.application_completed && <span className="impact-public-completed">Penerapan selesai</span>}
          </article>)}</div>}
      </div>
    </section>
  );
}
