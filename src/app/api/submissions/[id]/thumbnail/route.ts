import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Konfigurasi penyimpanan server belum lengkap." }, { status: 503 });
  }

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Thumbnail tidak ditemukan." }, { status: 404 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: submission, error } = await supabase
    .from("submissions")
    .select("thumbnail_path")
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();

  if (error) {
    console.error("Unable to load approved submission thumbnail:", error.message);
    return NextResponse.json({ error: "Thumbnail sementara tidak dapat dimuat." }, { status: 500 });
  }
  if (!submission?.thumbnail_path) {
    return NextResponse.json({ error: "Thumbnail tidak ditemukan atau karya belum disetujui." }, { status: 404 });
  }

  const { data, error: signedUrlError } = await supabase.storage
    .from("submission-thumbnails")
    .createSignedUrl(submission.thumbnail_path, 300);
  if (signedUrlError) {
    if (signedUrlError.statusCode === "404" || /object not found/i.test(signedUrlError.message)) {
      return NextResponse.json({ error: "Thumbnail tidak ditemukan." }, { status: 404 });
    }
    console.error("Unable to create approved submission thumbnail URL:", signedUrlError.message);
    return NextResponse.json({ error: "Thumbnail sementara tidak dapat dibuka." }, { status: 500 });
  }

  const response = NextResponse.redirect(data.signedUrl);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
