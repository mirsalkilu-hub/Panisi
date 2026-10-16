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

const maxPhotoSize = 500 * 1024;
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
    if (profilePhoto.size > maxPhotoSize) return responseError("Ukuran foto maksimal 500 KB.", 400);
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
    return responseError("Pengalaman profesional wajib diisi untuk akun kontributor.", 400);
  }
  if (widyaiswaraExperience.length > 2000) {
    return responseError("Pengalaman profesional maksimal 2000 karakter.", 400);
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

export async function PATCH(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return responseError("Konfigurasi Supabase server belum lengkap.", 503);
  }

  const accessToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
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
  if (adminProfile.role !== "admin") return responseError("Hanya admin yang dapat mengelola akun.", 403);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return responseError("Format data akun tidak valid.", 400);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return responseError("Format data akun tidak valid.", 400);
  }
  const input = payload as Record<string, unknown>;
  const stringFields = ["id", "fullName", "jobTitle", "role", "areaOfExpertise", "widyaiswaraExperience", "bio"];
  if (stringFields.some((field) => input[field] !== undefined && typeof input[field] !== "string")) {
    return responseError("Format data akun tidak valid.", 400);
  }

  const id = typeof input.id === "string" ? input.id : "";
  const fullName = typeof input.fullName === "string" ? input.fullName.trim() : "";
  const jobTitle = typeof input.jobTitle === "string" ? input.jobTitle.trim() : "";
  const role = typeof input.role === "string" ? input.role : "";
  const areaOfExpertise = typeof input.areaOfExpertise === "string" ? input.areaOfExpertise.trim() : "";
  const widyaiswaraExperience = typeof input.widyaiswaraExperience === "string" ? input.widyaiswaraExperience.trim() : "";
  const bio = typeof input.bio === "string" ? input.bio.trim() : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return responseError("ID akun tidak valid.", 400);
  }
  if (!fullName || fullName.length > 100) return responseError("Nama harus berisi 1 sampai 100 karakter.", 400);
  if (!jobTitle || jobTitle.length > 120) return responseError("Jabatan wajib diisi dan maksimal 120 karakter.", 400);
  if (role !== "verifikator" && role !== "kontributor") {
    return responseError("Peran akun harus verifikator atau kontributor.", 400);
  }
  if (areaOfExpertise.length > 500) return responseError("Bidang keahlian maksimal 500 karakter.", 400);
  if (widyaiswaraExperience.length > 2000) return responseError("Pengalaman profesional maksimal 2000 karakter.", 400);
  if (bio.length > 1000) return responseError("Profil profesional maksimal 1000 karakter.", 400);
  if (role === "kontributor" && (!areaOfExpertise || !widyaiswaraExperience)) {
    return responseError("Bidang keahlian dan pengalaman wajib diisi untuk akun kontributor.", 400);
  }

  const { data: target, error: targetError } = await adminClient
    .from("profiles")
    .select("id, role")
    .eq("id", id)
    .in("role", ["kontributor", "verifikator"])
    .maybeSingle();
  if (targetError) return responseError(`Akun tidak dapat dimuat: ${targetError.message}`, 500);
  if (!target) return responseError("Akun kontributor atau verifikator tidak ditemukan.", 404);

  const { data: updatedAccount, error: updateError } = await adminClient
    .from("profiles")
    .update({
      full_name: fullName,
      job_title: jobTitle,
      role,
      area_of_expertise: role === "kontributor" ? areaOfExpertise : "",
      widyaiswara_experience: role === "kontributor" ? widyaiswaraExperience : "",
      bio,
    })
    .eq("id", id)
    .select("id, full_name, role, bio, job_title, profile_photo_path, area_of_expertise, widyaiswara_experience, created_at")
    .single();
  if (updateError) return responseError(`Profil akun tidak dapat diperbarui: ${updateError.message}`, 500);

  return NextResponse.json({ account: updatedAccount });
}

export async function DELETE(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return responseError("Konfigurasi Supabase server belum lengkap.", 503);
  }

  const accessToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
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
  if (adminProfile.role !== "admin") return responseError("Hanya admin yang dapat menghapus akun.", 403);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return responseError("Format data akun tidak valid.", 400);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return responseError("Format data akun tidak valid.", 400);
  }
  const id = (payload as Record<string, unknown>).id;
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return responseError("ID akun tidak valid.", 400);
  }

  const { data: target, error: targetError } = await adminClient
    .from("profiles")
    .select("id, full_name, role, profile_photo_path")
    .eq("id", id)
    .in("role", ["kontributor", "verifikator"])
    .maybeSingle();
  if (targetError) return responseError(`Akun tidak dapat dimuat: ${targetError.message}`, 500);
  if (!target) return responseError("Akun kontributor atau verifikator tidak ditemukan.", 404);

  const { data: submissions, error: submissionsError } = await adminClient
    .from("submissions")
    .select("profile_id, document_path, thumbnail_path")
    .eq("profile_id", id);
  if (submissionsError) return responseError(`Berkas akun tidak dapat dimuat: ${submissionsError.message}`, 500);

  const warnings: string[] = [];
  const cleanupFiles = async (bucket: string, paths: string[], label: string) => {
    const safePaths = [...new Set(paths.filter(Boolean))].filter((path) => {
      if (path.startsWith(`${id}/`)) return true;
      warnings.push(`${label} tidak dibersihkan karena jalurnya tidak sesuai dengan pemilik akun.`);
      return false;
    });
    if (safePaths.length === 0) return;
    try {
      const { error } = await adminClient.storage.from(bucket).remove(safePaths);
      if (error) {
        console.error(`Unable to clean up deleted account ${label}:`, error.message);
        warnings.push(`${label} akun tidak dapat dibersihkan: ${error.message}`);
      }
    } catch (error) {
      const details = error instanceof Error ? error.message : "Kesalahan jaringan.";
      console.error(`Unable to clean up deleted account ${label}:`, details);
      warnings.push(`${label} akun tidak dapat dibersihkan: ${details}`);
    }
  };

  await cleanupFiles(
    "profile-photos",
    target.profile_photo_path ? [target.profile_photo_path] : [],
    "Foto profil",
  );
  await cleanupFiles(
    "contribution-documents",
    (submissions ?? []).filter((item) => item.profile_id === id).map((item) => item.document_path ?? ""),
    "PDF kontribusi",
  );
  await cleanupFiles(
    "submission-thumbnails",
    (submissions ?? []).filter((item) => item.profile_id === id).map((item) => item.thumbnail_path ?? ""),
    "Thumbnail kontribusi",
  );

  if (warnings.length > 0) {
    return responseError(
      `Berkas akun tidak dapat dibersihkan sehingga akun tidak dihapus. ${warnings.join(" ")}`,
      500,
    );
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(id);
  if (deleteError) {
    return responseError(
      `Akun masih aktif, tetapi berkas terkait telah dibersihkan. Akun tidak dapat dihapus: ${deleteError.message}`,
      500,
    );
  }

  return NextResponse.json({ deleted: true, fullName: target.full_name, role: target.role });
}
