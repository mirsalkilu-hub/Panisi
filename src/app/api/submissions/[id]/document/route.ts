import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Konfigurasi penyimpanan server belum lengkap." }, { status: 503 });
  }

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Dokumen PDF tidak ditemukan." }, { status: 404 });
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: submission, error } = await supabase
    .from("submissions")
    .select("document_path, title")
    .eq("id", id)
    .eq("status", "approved")
    .eq("content_type", "ebook")
    .maybeSingle();

  if (error) {
    console.error("Unable to load approved submission PDF:", error.message);
    return NextResponse.json({ error: "Dokumen PDF sementara tidak dapat dimuat." }, { status: 500 });
  }
  if (!submission?.document_path) {
    return NextResponse.json({ error: "Dokumen PDF tidak ditemukan atau belum disetujui." }, { status: 404 });
  }

  const download = new URL(request.url).searchParams.get("download") === "1";
  const fileName = `${submission.title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 100) || "karya"}.pdf`;
  const { data, error: signedUrlError } = await supabase.storage
    .from("contribution-documents")
    .createSignedUrl(submission.document_path, 60, download ? { download: fileName } : undefined);
  if (signedUrlError) {
    console.error("Unable to create approved submission PDF URL:", signedUrlError.message);
    return NextResponse.json({ error: "Dokumen PDF sementara tidak dapat dibuka." }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
