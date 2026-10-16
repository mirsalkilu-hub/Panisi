"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RegistrationForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitationCode: values.get("invitation_code"),
          fullName: values.get("full_name"),
          email: values.get("email"),
          password: values.get("password"),
          jobTitle: values.get("job_title"),
          areaOfExpertise: values.get("area_of_expertise"),
          widyaiswaraExperience: values.get("widyaiswara_experience"),
        }),
      });
      const result = await response.json() as { error?: string; created?: boolean };
      if (!response.ok || !result.created) {
        throw new Error(result.error ?? "Pendaftaran tidak berhasil. Coba lagi.");
      }
      setSuccess(true);
      const email = values.get("email")?.toString() ?? "";
      const password = values.get("password")?.toString() ?? "";
      if (supabase) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (!signInError) {
          router.replace("/ruang-kerja");
          return;
        }
        setError(`Akun berhasil dibuat, tetapi sesi masuk otomatis gagal: ${signInError.message}`);
      }
    } catch (reason) {
      setSuccess(false);
      setError(reason instanceof Error ? reason.message : "Pendaftaran tidak berhasil. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="registration-page">
      <section className="registration-card" aria-labelledby="registration-title">
        <Link className="registration-brand" href="/" aria-label="Kembali ke PINISI">
          <Image src="/panisi-logo.svg" alt="PINISI — Pusat Ilmu dan Informasi Bersinergi" width={190} height={48} priority />
        </Link>
        {success ? <>
          <span className="eyebrow">PENDAFTARAN BERHASIL</span>
          <h1 id="registration-title">Selamat bergabung.</h1>
          <p>Akun kontributor Anda sudah dibuat. {error || "Anda akan diarahkan ke ruang kerja."}</p>
          {error && <Link className="button button-primary registration-submit" href="/">Kembali untuk masuk</Link>}
        </> : <>
          <span className="eyebrow">AKSES KONTRIBUTOR</span>
          <h1 id="registration-title">Buat akun PINISI.</h1>
          <p>Daftar menggunakan kode undangan dari administrator untuk mulai berbagi karya pembelajaran.</p>
          <form className="registration-form" onSubmit={handleSubmit}>
            <label htmlFor="invitation_code">Kode undangan</label>
            <input id="invitation_code" name="invitation_code" type="text" autoComplete="off" placeholder="Masukkan kode undangan" required />
            <label htmlFor="full_name">Nama lengkap</label>
            <input id="full_name" name="full_name" autoComplete="name" maxLength={100} required />
            <label htmlFor="email">Alamat email</label>
            <input id="email" name="email" type="email" autoComplete="email" maxLength={254} required />
            <label htmlFor="password">Kata sandi (minimal 8 karakter)</label>
            <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required />
            <label htmlFor="job_title">Jabatan</label>
            <input id="job_title" name="job_title" placeholder="Contoh: Widyaiswara Ahli Madya" maxLength={120} required />
            <label htmlFor="area_of_expertise">Bidang keahlian</label>
            <textarea id="area_of_expertise" name="area_of_expertise" rows={2} maxLength={500} required />
            <label htmlFor="widyaiswara_experience">Pengalaman profesional</label>
            <textarea id="widyaiswara_experience" name="widyaiswara_experience" rows={4} maxLength={2000} required />
            {error && <p className="registration-error" role="alert">{error}</p>}
            {!supabase && <p className="registration-error" role="alert">Koneksi autentikasi belum dikonfigurasi. Hubungi administrator.</p>}
            <button className="button button-primary registration-submit" type="submit" disabled={busy || !supabase}>
              {busy ? "Membuat akun..." : "Daftar sebagai kontributor"}
            </button>
          </form>
        </>}
        <p className="registration-footer">Sudah punya akun? <Link href="/">Kembali ke PINISI untuk masuk</Link></p>
      </section>
    </main>
  );
}
