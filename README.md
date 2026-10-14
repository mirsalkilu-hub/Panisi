# Karya Widyaiswara

Karya Widyaiswara adalah platform berbasis Next.js dan Supabase untuk menampilkan karya, materi ajar, dan kontribusi inspiratif para widyaiswara. Karya dan filter kategori berada di halaman Beranda (`/`); filter menampilkan pengajuan kontributor yang sudah disetujui verifikator, tanpa halaman kategori terpisah. Setiap karya terverifikasi memiliki halaman detail `/karya/[id]/[judul]`. Halaman lain meliputi Koleksi, Widyaiswara, Unggah Karya, dan Ruang Kerja. Kontributor memilih kategori Video, E-Book, Science, Populer, Insight, Review, atau Best Practice saat mengajukan video YouTube atau e-book PDF dari halaman **Unggah Karya**. Mereka mengunggah thumbnail landscape, dapat memeriksa status dan tautan halaman karya yang disetujui, serta mengedit kategori, materi, dan thumbnail sebelum verifikator mengambil keputusan. Untuk akun kontributor, **Ruang Kerja** menjadi halaman profil untuk memperbarui data profesional, foto, dan kata sandi.

## Menjalankan aplikasi

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` di `.env.local` dari **Supabase Project Settings → API** sebelum menggunakan fitur autentikasi dan ruang kerja. Isi juga `SUPABASE_SERVICE_ROLE_KEY` untuk endpoint pembuatan akun admin serta pemberian akses aman ke e-book dan thumbnail karya yang telah diverifikasi. Kunci ini hanya digunakan di server dan jangan pernah menaruhnya di variabel `NEXT_PUBLIC_*` atau mengirimkannya ke browser.

## Menyiapkan Supabase

1. Buat proyek Supabase, lalu jalankan semua berkas di `supabase/migrations/` secara berurutan melalui Supabase CLI atau SQL Editor, termasuk migrasi `submission_categories` untuk kategori karya, `contributor_pending_edits` untuk pengeditan pengajuan, `contributor_profile_photos` untuk hak unggah foto profil kontributor, dan `submission_thumbnails` untuk thumbnail karya.
2. Buat akun melalui **Authentication → Users**. Trigger akan membuat profil baru otomatis dengan peran `kontributor`.
3. Tetapkan satu akun sebagai `admin`, dua akun sebagai `verifikator`, dan akun lainnya sebagai `kontributor` di SQL Editor:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (select id from auth.users where email = 'admin@panisi.com');
   ```

   Buat akun admin pertama melalui **Authentication → Users**, lalu ganti alamat contoh dengan email tersebut. Setelah masuk, admin dapat membuat akun verifikator dan kontributor dari **Ruang Kerja**. Akun baru aktif langsung dan harus diberikan kata sandi sementaranya secara aman. Peran dilindungi oleh Row Level Security dan tidak bisa diubah sendiri oleh pengguna.
4. Pastikan provider **Email** aktif di Supabase Authentication. Gunakan tombol **Masuk** pada aplikasi untuk login.

Admin mengisi nama lengkap dan jabatan saat membuat akun kontributor maupun verifikator, serta dapat mengunggah foto profil JPG, PNG, atau WebP hingga 5 MB. Foto bersifat opsional dan disimpan pada bucket publik `profile-photos` agar dapat tampil di profil widyaiswara; jangan unggah foto yang tidak boleh diakses publik. Untuk akun kontributor, admin juga harus mengisi bidang keahlian dan pengalaman sebagai widyaiswara. Kontributor dapat memperbarui jabatan dan informasi profesionalnya di Ruang Kerja. Setiap kontributor memiliki halaman publik `/widyaiswara/[id]` yang menampilkan profil profesional dan semua karya yang telah diterbitkan. Verifikator menyetujui atau meminta revisi. Seluruh pengajuan berstatus disetujui ditampilkan pada bagian karya terverifikasi di halaman utama. Kontrol admin untuk menerbitkan atau menarik materi mengatur halaman karya publik lainnya. Dokumen disimpan pada bucket privat; akses file menggunakan signed URL sementara.

Kontributor dapat mengajukan dua jenis karya: video pembelajaran melalui tautan YouTube atau e-book/modul berupa PDF hingga 20 MB. Pilih satu dari kategori Video, E-Book, Science, Populer, Insight, Review, atau Best Practice, lalu unggah thumbnail landscape JPG, PNG, atau WebP maksimal 5 MB. Thumbnail dan PDF disimpan di bucket privat; thumbnail hanya dapat dibuka oleh kontributor pemilik, tim verifikasi, atau publik setelah karya disetujui. Pengajuan yang masih menunggu keputusan dapat diedit dari halaman **Unggah Karya**. Keduanya ditinjau verifikator; tautan halaman publik berbentuk `/karya/[id]/[judul]` dan hanya berfungsi setelah karya disetujui.

Halaman **Koleksi** menampilkan semua pengajuan berstatus disetujui oleh verifikator dan mengelompokkan setiap karya dengan profil kontributornya. Pastikan seluruh migrasi sudah diterapkan agar daftar koleksi, label jenis karya, dan akses aman ke e-book dapat dimuat.

## Perintah

```bash
npm run dev
npm run lint
npm run build
```
