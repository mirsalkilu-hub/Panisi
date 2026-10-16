"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type ImpactAction = "reuse" | "application" | "feedback";
type ViewerState = "loading" | "anonymous" | "contributor" | "other";
type ImpactCounts = { reuse_count: number; application_count: number; completed_count: number };
type ImpactRecord = { action_type: ImpactAction; details: string | null; application_completed: boolean };
type ImpactRecords = Partial<Record<ImpactAction, ImpactRecord>>;

const emptyCounts: ImpactCounts = { reuse_count: 0, application_count: 0, completed_count: 0 };

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
  const [viewer, setViewer] = useState<ViewerState>(supabase ? "loading" : "anonymous");
  const [contributorId, setContributorId] = useState<string | null>(null);
  const [records, setRecords] = useState<ImpactRecords>({});
  const [busyAction, setBusyAction] = useState<ImpactAction | null>(null);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    async function loadViewer() {
      const { data: sessionData } = await supabase!.auth.getSession();
      if (!active) return;
      const user = sessionData.session?.user;
      if (!user) {
        setContributorId(null);
        setRecords({});
        setViewer("anonymous");
        return;
      }

      const { data: profile } = await supabase!
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      if (profile?.role !== "kontributor") {
        setContributorId(null);
        setRecords({});
        setViewer("other");
        return;
      }

      const { data: impactRecords } = await supabase!
        .from("submission_impact_records")
        .select("action_type, details, application_completed")
        .eq("submission_id", submissionId)
        .eq("contributor_id", user.id);
      if (!active) return;
      const ownRecords: ImpactRecords = {};
      for (const record of impactRecords ?? []) {
        ownRecords[record.action_type as ImpactAction] = record as ImpactRecord;
      }
      setContributorId(user.id);
      setRecords(ownRecords);
      setViewer("contributor");
    }

    async function loadCounts() {
      const { data, error } = await supabase!
        .from("submission_impact_totals")
        .select("reuse_count, application_count, completed_count")
        .eq("submission_id", submissionId)
        .maybeSingle();
      if (!active) return;
      if (error) {
        setErrorMessage("Data dampak belum tersedia. Pastikan migrasi dampak karya sudah diterapkan.");
        return;
      }
      setCounts(data ?? emptyCounts);
    }

    void loadViewer();
    void loadCounts();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => { void loadViewer(); }, 0);
    });
    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [submissionId]);

  async function saveImpact(action: ImpactAction, event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!supabase || !contributorId) return;
    const formData = event ? new FormData(event.currentTarget) : null;
    const details = formData?.get("details")?.toString().trim() || null;
    const completed = action === "application" && formData?.get("completed") === "on";
    if (action !== "reuse" && !details) {
      setErrorMessage("Lengkapi catatan sebelum menyimpan.");
      return;
    }

    setBusyAction(action);
    setNotice("");
    setErrorMessage("");
    const { error } = await supabase.from("submission_impact_records").upsert({
      submission_id: submissionId,
      contributor_id: contributorId,
      action_type: action,
      details,
      application_completed: completed,
    }, { onConflict: "submission_id,contributor_id,action_type" });
    setBusyAction(null);
    if (error) {
      setErrorMessage(`Catatan belum tersimpan: ${error.message}`);
      return;
    }

    setNotice(action === "reuse"
      ? "Penggunaan ulang berhasil dicatat."
      : action === "application"
        ? "Penerapan berhasil dicatat."
        : "Feedback berhasil dikirim.");
    const updatedRecord: ImpactRecord = { action_type: action, details, application_completed: completed };
    setRecords((current) => ({ ...current, [action]: updatedRecord }));
    const { data: totals } = await supabase
      .from("submission_impact_totals")
      .select("reuse_count, application_count, completed_count")
      .eq("submission_id", submissionId)
      .maybeSingle();
    if (totals) setCounts(totals);
  }

  return (
    <section className="work-impact-panel" aria-labelledby="work-impact-title">
      <header className="work-impact-heading">
        <span className="work-impact-heading-icon"><ImpactIcon name="reuse" /></span>
        <div><span className="eyebrow">DAMPAK &amp; PEMANFAATAN</span><h2 id="work-impact-title">Dampak &amp; Pemanfaatan Pengetahuan</h2><p>Catat bagaimana karya ini digunakan dan memberi manfaat.</p></div>
      </header>
      <div className="work-impact-stats" aria-label="Ringkasan dampak karya">
        <article className="impact-stat impact-reuse"><span><ImpactIcon name="reuse" /></span><div><strong>{counts.reuse_count}</strong><small>Tercatat Reuse</small></div></article>
        <article className="impact-stat impact-application"><span><ImpactIcon name="application" /></span><div><strong>{counts.application_count}</strong><small>Penerapan Lapangan</small></div></article>
        <article className="impact-stat impact-completed"><span><ImpactIcon name="completed" /></span><div><strong>{counts.completed_count}</strong><small>Penerapan Selesai</small></div></article>
      </div>
      <div className="work-impact-contribute">
        <h3>Catat &amp; Berikan Kontribusi</h3>
        {viewer === "loading" ? <p className="impact-access-note" role="status">Memeriksa akses kontributor...</p>
          : viewer === "anonymous" ? <p className="impact-access-note"><Link href="/profil">Masuk ke akun Anda</Link> untuk mencatat penggunaan materi atau memberikan feedback.</p>
            : viewer === "other" ? <p className="impact-access-note">Fitur pencatatan dampak tersedia untuk akun kontributor.</p>
              : <div className="work-impact-actions">
                <article className="work-impact-action">
                  <h4><ImpactIcon name="reuse" />1. Catat Penggunaan Kembali (Reuse)</h4>
                  <p>Catat penggunaan materi ini dalam pembelajaran atau pekerjaan Anda.</p>
                  <button type="button" className="impact-action-button" disabled={Boolean(busyAction) || Boolean(records.reuse)} onClick={() => void saveImpact("reuse")}>
                    {busyAction === "reuse" ? "Menyimpan..." : records.reuse ? "Penggunaan tercatat" : "Catat penggunaan kembali"}
                  </button>
                </article>
                <article className="work-impact-action">
                  <h4><ImpactIcon name="application" />2. Catat Penerapan Nyata (Application)</h4>
                  <p>Ceritakan penerapan pengetahuan ini di organisasi atau lapangan.</p>
                  <form onSubmit={(event) => void saveImpact("application", event)}>
                    <label htmlFor={`impact-application-${submissionId}`}>Catatan penerapan</label>
                    <textarea id={`impact-application-${submissionId}`} name="details" defaultValue={records.application?.details ?? ""} maxLength={2000} placeholder="Apa yang diterapkan dan bagaimana hasilnya?" required />
                    <label className="impact-completed-toggle"><input type="checkbox" name="completed" defaultChecked={records.application?.application_completed ?? false} /> Penerapan sudah selesai</label>
                    <button type="submit" className="impact-action-button" disabled={Boolean(busyAction)}>{busyAction === "application" ? "Menyimpan..." : records.application ? "Perbarui catatan penerapan" : "Simpan penerapan"}</button>
                  </form>
                </article>
                <article className="work-impact-action">
                  <h4><ImpactIcon name="feedback" />3. Berikan Feedback Terstruktur</h4>
                  <p>Bagikan manfaat yang dirasakan dan saran untuk pengembangan karya.</p>
                  <form onSubmit={(event) => void saveImpact("feedback", event)}>
                    <label htmlFor={`impact-feedback-${submissionId}`}>Ulasan dan saran</label>
                    <textarea id={`impact-feedback-${submissionId}`} name="details" defaultValue={records.feedback?.details ?? ""} maxLength={2000} placeholder="Apa yang bermanfaat? Apa yang bisa ditingkatkan?" required />
                    <button type="submit" className="impact-action-button" disabled={Boolean(busyAction)}>{busyAction === "feedback" ? "Mengirim..." : records.feedback ? "Perbarui feedback" : "Kirim feedback"}</button>
                  </form>
                </article>
              </div>}
        {notice && <p className="impact-success" role="status">{notice}</p>}
        {errorMessage && <p className="impact-error" role="alert">{errorMessage}</p>}
      </div>
    </section>
  );
}
