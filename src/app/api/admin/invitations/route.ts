import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function authorizeAdmin(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return { error: responseError("Konfigurasi Supabase server belum lengkap.", 503) };
  }

  const accessToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return { error: responseError("Sesi admin tidak ditemukan.", 401) };

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userError } = await client.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return { error: responseError("Sesi tidak valid atau sudah berakhir.", 401) };
  }

  const { data: adminProfile, error: profileError } = await client
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();
  if (profileError) {
    return { error: responseError(`Peran admin tidak dapat diverifikasi: ${profileError.message}`, 500) };
  }
  if (adminProfile.role !== "admin") {
    return { error: responseError("Hanya admin yang dapat mengelola kode undangan.", 403) };
  }

  return { client, adminId: userData.user.id };
}

function missingMigration(error: { code?: string; message: string }) {
  return error.code === "42P01" || error.code === "PGRST205"
    ? responseError("Tabel kode undangan belum tersedia. Terapkan migrasi 20261017000000_contributor_invitation_codes.sql.", 503)
    : responseError(`Kode undangan tidak dapat dimuat: ${error.message}`, 500);
}

export async function GET(request: Request) {
  const authorization = await authorizeAdmin(request);
  if ("error" in authorization) return authorization.error;

  const { data: invitations, error } = await authorization.client
    .from("contributor_invitation_codes")
    .select("id, label, is_active, created_at")
    .order("created_at", { ascending: false });
  if (error) return missingMigration(error);
  return NextResponse.json({ invitations });
}

export async function POST(request: Request) {
  const authorization = await authorizeAdmin(request);
  if ("error" in authorization) return authorization.error;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return responseError("Format data kode undangan tidak valid.", 400);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return responseError("Format data kode undangan tidak valid.", 400);
  }
  const labelValue = (payload as Record<string, unknown>).label;
  if (labelValue !== undefined && typeof labelValue !== "string") {
    return responseError("Nama kode undangan tidak valid.", 400);
  }
  const label = typeof labelValue === "string" ? labelValue.trim() : "Undangan kontributor";
  if (!label || label.length > 100) {
    return responseError("Nama kode undangan harus berisi 1 sampai 100 karakter.", 400);
  }

  const code = randomBytes(10).toString("hex").toUpperCase();
  const codeHash = createHash("sha256").update(code).digest("hex");
  const { data: invitation, error } = await authorization.client
    .from("contributor_invitation_codes")
    .insert({ code_hash: codeHash, label, created_by: authorization.adminId })
    .select("id, label, is_active, created_at")
    .single();
  if (error) return missingMigration(error);

  return NextResponse.json({ invitation, code }, { status: 201 });
}

export async function PATCH(request: Request) {
  const authorization = await authorizeAdmin(request);
  if ("error" in authorization) return authorization.error;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return responseError("Format perubahan kode undangan tidak valid.", 400);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return responseError("Format perubahan kode undangan tidak valid.", 400);
  }
  const input = payload as Record<string, unknown>;
  const id = input.id;
  const isActive = input.isActive;
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    || typeof isActive !== "boolean") {
    return responseError("ID atau status kode undangan tidak valid.", 400);
  }

  const { data: invitation, error } = await authorization.client
    .from("contributor_invitation_codes")
    .update({ is_active: isActive })
    .eq("id", id)
    .select("id, label, is_active, created_at")
    .maybeSingle();
  if (error) return missingMigration(error);
  if (!invitation) return responseError("Kode undangan tidak ditemukan.", 404);
  return NextResponse.json({ invitation });
}
