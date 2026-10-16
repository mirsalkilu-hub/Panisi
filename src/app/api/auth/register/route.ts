import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type RegistrationInput = {
  invitationCode: string;
  fullName: string;
  email: string;
  password: string;
  jobTitle: string;
  areaOfExpertise: string;
  widyaiswaraExperience: string;
};

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function missingMigration(error: { code?: string; message: string }) {
  return error.code === "42P01" || error.code === "PGRST205"
    ? responseError("Fitur kode undangan belum tersedia. Administrator perlu menerapkan migrasi Supabase terbaru.", 503)
    : responseError(`Kode undangan tidak dapat diverifikasi: ${error.message}`, 500);
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return responseError("Konfigurasi Supabase server belum lengkap.", 503);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return responseError("Format pendaftaran tidak valid.", 400);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return responseError("Format pendaftaran tidak valid.", 400);
  }
  const input = payload as Partial<RegistrationInput>;
  const fields: (keyof RegistrationInput)[] = [
    "invitationCode",
    "fullName",
    "email",
    "password",
    "jobTitle",
    "areaOfExpertise",
    "widyaiswaraExperience",
  ];
  if (fields.some((field) => typeof input[field] !== "string")) {
    return responseError("Lengkapi semua data pendaftaran.", 400);
  }

  const invitationCode = input.invitationCode!.replace(/[\s-]/g, "").toUpperCase();
  const fullName = input.fullName!.trim();
  const email = input.email!.trim().toLowerCase();
  const password = input.password!;
  const jobTitle = input.jobTitle!.trim();
  const areaOfExpertise = input.areaOfExpertise!.trim();
  const widyaiswaraExperience = input.widyaiswaraExperience!.trim();
  if (!/^[0-9A-F]{20}$/.test(invitationCode)) {
    return responseError("Kode undangan tidak valid atau sudah dicabut.", 400);
  }
  if (!fullName || fullName.length > 100) {
    return responseError("Nama lengkap wajib diisi dan maksimal 100 karakter.", 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return responseError("Alamat email tidak valid.", 400);
  }
  if (password.length < 8 || password.length > 128) {
    return responseError("Kata sandi harus berisi 8 sampai 128 karakter.", 400);
  }
  if (!jobTitle || jobTitle.length > 120) {
    return responseError("Jabatan wajib diisi dan maksimal 120 karakter.", 400);
  }
  if (!areaOfExpertise || areaOfExpertise.length > 500) {
    return responseError("Bidang keahlian wajib diisi dan maksimal 500 karakter.", 400);
  }
  if (!widyaiswaraExperience || widyaiswaraExperience.length > 2000) {
    return responseError("Pengalaman profesional wajib diisi dan maksimal 2000 karakter.", 400);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const codeHash = createHash("sha256").update(invitationCode).digest("hex");
  const { data: invitation, error: invitationError } = await adminClient
    .from("contributor_invitation_codes")
    .select("id")
    .eq("code_hash", codeHash)
    .eq("is_active", true)
    .maybeSingle();
  if (invitationError) return missingMigration(invitationError);
  if (!invitation) return responseError("Kode undangan tidak valid atau sudah dicabut.", 400);

  const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createError) return responseError(`Akun tidak dapat dibuat: ${createError.message}`, 400);
  if (!createdUser.user) return responseError("Supabase tidak mengembalikan akun yang dibuat.", 500);

  const { error: profileError } = await adminClient
    .from("profiles")
    .update({
      full_name: fullName,
      role: "kontributor",
      job_title: jobTitle,
      area_of_expertise: areaOfExpertise,
      widyaiswara_experience: widyaiswaraExperience,
    })
    .eq("id", createdUser.user.id);
  if (profileError) {
    const { error: cleanupError } = await adminClient.auth.admin.deleteUser(createdUser.user.id);
    const cleanupMessage = cleanupError
      ? ` Akun sementara juga gagal dibersihkan: ${cleanupError.message}`
      : "";
    return responseError(`Profil kontributor tidak dapat disiapkan: ${profileError.message}.${cleanupMessage}`, 500);
  }

  return NextResponse.json({ created: true }, { status: 201 });
}
