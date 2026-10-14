import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type AccountRequest = {
  fullName: string;
  email: string;
  password: string;
  role: string;
  jobTitle: string;
  areaOfExpertise: string;
  widyaiswaraExperience: string;
};

const maxPhotoSize = 5 * 1024 * 1024;
const photoTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function hasValidImageSignature(bytes: Uint8Array, contentType: string) {
  if (contentType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (contentType === "image/webp") {
    return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
      && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return responseError("Konfigurasi Supabase server belum lengkap.", 503);
  }

  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return responseError("Sesi admin tidak ditemukan.", 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userError } = await adminClient.auth.getUser(accessToken);
  if (userError || !userData.user) return responseError("Sesi tidak valid atau sudah berakhir.", 401);

  const { data: adminProfile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();
  if (profileError) return responseError(`Peran admin tidak dapat diverifikasi: ${profileError.message}`, 500);
  if (adminProfile.role !== "admin") return responseError("Hanya admin yang dapat membuat akun.", 403);

  let input: AccountRequest;
  let profilePhoto: File | null;
  try {
    const form = await request.formData();
    input = {
      fullName: form.get("fullName")?.toString() ?? "",
      email: form.get("email")?.toString() ?? "",
      password: form.get("password")?.toString() ?? "",
      role: form.get("role")?.toString() ?? "",
      jobTitle: form.get("jobTitle")?.toString() ?? "",
      areaOfExpertise: form.get("areaOfExpertise")?.toString() ?? "",
      widyaiswaraExperience: form.get("widyaiswaraExperience")?.toString() ?? "",
    };
    const photoValue = form.get("profilePhoto");
    profilePhoto = typeof File !== "undefined" && photoValue instanceof File && photoValue.size > 0
      ? photoValue
      : null;
  } catch {
    return responseError("Format data akun tidak valid.", 400);
  }

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const jobTitle = input.jobTitle.trim();
  const areaOfExpertise = input.areaOfExpertise.trim();
  const widyaiswaraExperience = input.widyaiswaraExperience.trim();
  const role = input.role;
  if (fullName.length < 1 || fullName.length > 100) {
    return responseError("Nama harus berisi 1 sampai 100 karakter.", 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return responseError("Alamat email tidak valid.", 400);
  }
  if (password.length < 8) return responseError("Kata sandi minimal 8 karakter.", 400);
  if (role !== "verifikator" && role !== "kontributor") {
    return responseError("Peran akun harus verifikator atau kontributor.", 400);
  }
  if (!jobTitle || jobTitle.length > 120) {
    return responseError("Jabatan wajib diisi dan maksimal 120 karakter.", 400);
  }
  if (profilePhoto) {
    if (profilePhoto.size > maxPhotoSize) return responseError("Ukuran foto maksimal 5 MB.", 400);
    if (!photoTypes.has(profilePhoto.type)) {
      return responseError("Foto harus berformat JPG, PNG, atau WebP.", 400);
    }
    const bytes = new Uint8Array(await profilePhoto.arrayBuffer());
    if (!hasValidImageSignature(bytes, profilePhoto.type)) {
      return responseError("Isi file tidak sesuai dengan format foto yang dipilih.", 400);
    }
  }
  const photoExtension = profilePhoto ? photoTypes.get(profilePhoto.type) : null;
  if (profilePhoto && !photoExtension) return responseError("Format foto tidak didukung.", 400);
  if (role === "kontributor" && !areaOfExpertise) {
    return responseError("Bidang keahlian wajib diisi untuk akun kontributor.", 400);
  }
  if (areaOfExpertise.length > 500) {
    return responseError("Bidang keahlian maksimal 500 karakter.", 400);
  }
  if (role === "kontributor" && !widyaiswaraExperience) {
    return responseError("Pengalaman sebagai widyaiswara wajib diisi untuk akun kontributor.", 400);
  }
  if (widyaiswaraExperience.length > 2000) {
    return responseError("Pengalaman sebagai widyaiswara maksimal 2000 karakter.", 400);
  }

  const { error: schemaError } = await adminClient
    .from("profiles")
    .select("job_title, profile_photo_path, area_of_expertise, widyaiswara_experience")
    .limit(1);
  if (schemaError) {
    return responseError(
      `Struktur database belum siap untuk pembuatan akun. Terapkan seluruh migrasi Supabase di folder supabase/migrations, termasuk 20261014040000_account_job_title_photos.sql. Detail: ${schemaError.message}`,
      503,
    );
  }
  if (profilePhoto) {
    const { data: buckets, error: bucketError } = await adminClient.storage.listBuckets();
    if (bucketError) {
      return responseError(`Konfigurasi penyimpanan foto tidak dapat diperiksa: ${bucketError.message}`, 503);
    }
    if (!buckets.some((bucket) => bucket.name === "profile-photos")) {
      return responseError(
        "Bucket foto profil belum tersedia. Terapkan migrasi 20261014040000_account_job_title_photos.sql di Supabase.",
        503,
      );
    }
  }

  const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createError) return responseError(`Akun tidak dapat dibuat: ${createError.message}`, 400);
  if (!createdUser.user) return responseError("Supabase tidak mengembalikan akun yang dibuat.", 500);

  let photoPath: string | null = null;
  if (profilePhoto && photoExtension) {
    photoPath = `${createdUser.user.id}/profile.${photoExtension}`;
    const { error: uploadError } = await adminClient.storage
      .from("profile-photos")
      .upload(photoPath, profilePhoto, { contentType: profilePhoto.type, upsert: false });
    if (uploadError) {
      const { error: cleanupError } = await adminClient.auth.admin.deleteUser(createdUser.user.id);
      const cleanupMessage = cleanupError
        ? ` Akun Auth sementara juga gagal dibersihkan: ${cleanupError.message}`
        : "";
      return responseError(`Foto profil tidak dapat diunggah: ${uploadError.message}.${cleanupMessage}`, 500);
    }
  }

  const { error: updateError } = await adminClient
    .from("profiles")
    .update({
      full_name: fullName,
      role,
      job_title: jobTitle,
      profile_photo_path: photoPath,
      area_of_expertise: role === "kontributor" ? areaOfExpertise : "",
      widyaiswara_experience: role === "kontributor" ? widyaiswaraExperience : "",
    })
    .eq("id", createdUser.user.id);
  if (updateError) {
    let photoCleanupMessage = "";
    if (photoPath) {
      const { error: photoCleanupError } = await adminClient.storage.from("profile-photos").remove([photoPath]);
      if (photoCleanupError) photoCleanupMessage = ` Foto profil sementara juga gagal dibersihkan: ${photoCleanupError.message}`;
    }
    const { error: cleanupError } = await adminClient.auth.admin.deleteUser(createdUser.user.id);
    const cleanupMessage = cleanupError
      ? ` Akun Auth sementara juga gagal dibersihkan: ${cleanupError.message}`
      : "";
    return responseError(`Profil akun tidak dapat disiapkan: ${updateError.message}.${photoCleanupMessage}${cleanupMessage}`, 500);
  }

  return NextResponse.json(
    { id: createdUser.user.id, fullName, email, role, jobTitle, profilePhotoPath: photoPath },
    { status: 201 },
  );
}
