# Karya Widyaiswara

Karya Widyaiswara adalah platform berbasis Next.js dan Supabase untuk menampilkan karya, materi ajar, dan kontribusi inspiratif para widyaiswara. Menu navigasi memiliki halaman tersendiri: Beranda (`/`), Jelajahi, Karya, Koleksi, Widyaiswara, Unggah Karya, dan Ruang Kerja.

## Menjalankan aplikasi

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` di `.env.local` dari **Supabase Project Settings → API** sebelum menggunakan fitur autentikasi dan ruang kerja. Isi juga `SUPABASE_SERVICE_ROLE_KEY` untuk endpoint pembuatan akun oleh admin. Kunci ini hanya digunakan di server dan jangan pernah menaruhnya di variabel `NEXT_PUBLIC_*` atau mengirimkannya ke browser.

## Menyiapkan Supabase

1. Buat proyek Supabase, lalu jalankan semua berkas di `supabase/migrations/` secara berurutan melalui Supabase CLI atau SQL Editor: skema dasar terlebih dahulu, lalu migrasi `admin_publishing`.
2. Buat akun melalui **Authentication → Users**. Trigger akan membuat profil baru otomatis dengan peran `kontributor`.
3. Tetapkan satu akun sebagai `admin`, dua akun sebagai `verifikator`, dan akun lainnya sebagai `kontributor` di SQL Editor:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (select id from auth.users where email = 'admin@panisi.com');
   ```

   Buat akun admin pertama melalui **Authentication → Users**, lalu ganti alamat contoh dengan email tersebut. Setelah masuk, admin dapat membuat akun verifikator dan kontributor dari **Ruang Kerja**. Akun baru aktif langsung dan harus diberikan kata sandi sementaranya secara aman. Peran dilindungi oleh Row Level Security dan tidak bisa diubah sendiri oleh pengguna.
4. Pastikan provider **Email** aktif di Supabase Authentication. Gunakan tombol **Masuk** pada aplikasi untuk login.

Kontributor dapat mengelola biodata, mengirim materi beserta tautan video YouTube dan dokumen PDF (maksimal 20 MB). Verifikator menyetujui atau meminta revisi. Admin dapat mengedit atau menghapus materi yang sudah diverifikasi, lalu menerbitkan atau menariknya dari halaman utama. Hanya materi yang terverifikasi dan diterbitkan yang tampil secara publik. Dokumen disimpan pada bucket privat; akses file menggunakan signed URL sementara.

## Perintah

```bash
npm run dev
npm run lint
npm run build
```
