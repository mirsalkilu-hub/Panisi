import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type AccountRole = "verifikator" | "kontributor";

type AccountRequest = {
  fullName?: unknown;
  email?: unknown;
  password?: unknown;
  role?: unknown;
};

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
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
  try {
    input = await request.json() as AccountRequest;
  } catch {
    return responseError("Format data akun tidak valid.", 400);
  }

  const fullName = typeof input.fullName === "string" ? input.fullName.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const role = input.role;
  if (fullName.length < 1 || fullName.length > 100) {
    return responseError("Nama harus berisi 1 sampai 100 karakter.", 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return responseError("Alamat email tidak valid.", 400);
  }
  if (password.length < 12) return responseError("Kata sandi minimal 12 karakter.", 400);
  if (role !== "verifikator" && role !== "kontributor") {
    return responseError("Peran akun harus verifikator atau kontributor.", 400);
  }

  const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createError) return responseError(`Akun tidak dapat dibuat: ${createError.message}`, 400);
  if (!createdUser.user) return responseError("Supabase tidak mengembalikan akun yang dibuat.", 500);

  const { error: updateError } = await adminClient
    .from("profiles")
    .update({ full_name: fullName, role: role as AccountRole })
    .eq("id", createdUser.user.id);
  if (updateError) {
    const { error: cleanupError } = await adminClient.auth.admin.deleteUser(createdUser.user.id);
    const cleanupMessage = cleanupError
      ? ` Akun Auth sementara juga gagal dibersihkan: ${cleanupError.message}`
      : "";
    return responseError(`Profil akun tidak dapat disiapkan: ${updateError.message}.${cleanupMessage}`, 500);
  }

  return NextResponse.json(
    { id: createdUser.user.id, fullName, email, role },
    { status: 201 },
  );
}
