import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return responseError("Konfigurasi Supabase server belum lengkap.", 503);
  }

  const accessToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return responseError("Sesi pengguna tidak ditemukan.", 401);

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return responseError("Postingan tidak ditemukan.", 404);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userError } = await adminClient.auth.getUser(accessToken);
  if (userError || !userData.user) return responseError("Sesi tidak valid atau sudah berakhir.", 401);

  const { data: actor, error: actorError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();
  if (actorError) return responseError(`Peran pengguna tidak dapat diverifikasi: ${actorError.message}`, 500);
  if (actor.role !== "admin" && actor.role !== "verifikator") {
    return responseError("Hanya admin atau verifikator yang dapat menghapus postingan.", 403);
  }

  const { data: submission, error: submissionError } = await adminClient
    .from("submissions")
    .select("id, profile_id, status, document_path, thumbnail_path")
    .eq("id", id)
    .maybeSingle();
  if (submissionError) return responseError(`Postingan tidak dapat dimuat: ${submissionError.message}`, 500);
  if (!submission) return responseError("Postingan tidak ditemukan.", 404);
  const deleteQuery = adminClient.from("submissions").delete().eq("id", id);
  const { data: deleted, error: deleteError } = await deleteQuery.select("id");
  if (deleteError) return responseError(`Postingan tidak dapat dihapus: ${deleteError.message}`, 500);
  if (!deleted?.length) return responseError("Postingan tidak lagi tersedia untuk dihapus.", 409);

  const warnings: string[] = [];
  if (submission.document_path) {
    if (!submission.document_path.startsWith(`${submission.profile_id}/`)) {
      warnings.push("PDF tidak dibersihkan karena jalurnya tidak sesuai dengan pemilik pengajuan.");
    } else {
      try {
        const { error } = await adminClient.storage.from("contribution-documents").remove([submission.document_path]);
        if (error) {
          console.error("Unable to clean up deleted submission PDF:", error.message);
          warnings.push(`PDF pendukung tidak dapat dibersihkan: ${error.message}`);
        }
      } catch (error) {
        const details = error instanceof Error ? error.message : "Kesalahan jaringan.";
        console.error("Unable to clean up deleted submission PDF:", details);
        warnings.push(`PDF pendukung tidak dapat dibersihkan: ${details}`);
      }
    }
  }
  if (submission.thumbnail_path) {
    if (!submission.thumbnail_path.startsWith(`${submission.profile_id}/`)) {
      warnings.push("Thumbnail tidak dibersihkan karena jalurnya tidak sesuai dengan pemilik pengajuan.");
    } else {
      try {
        const { error } = await adminClient.storage.from("submission-thumbnails").remove([submission.thumbnail_path]);
        if (error) {
          console.error("Unable to clean up deleted submission thumbnail:", error.message);
          warnings.push(`Thumbnail tidak dapat dibersihkan: ${error.message}`);
        }
      } catch (error) {
        const details = error instanceof Error ? error.message : "Kesalahan jaringan.";
        console.error("Unable to clean up deleted submission thumbnail:", details);
        warnings.push(`Thumbnail tidak dapat dibersihkan: ${details}`);
      }
    }
  }

  return NextResponse.json({ deleted: true, warnings });
}
