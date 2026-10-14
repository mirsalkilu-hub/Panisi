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
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: submission, error } = await supabase
    .from("submissions")
    .select("document_path, content_type")
    .eq("id", id)
    .eq("status", "approved")
    .eq("content_type", "ebook")
    .single();

  if (error || !submission?.document_path) {
    return NextResponse.json({ error: "E-Book tidak ditemukan atau belum disetujui." }, { status: 404 });
  }

  const { data, error: signedUrlError } = await supabase.storage
    .from("contribution-documents")
    .createSignedUrl(submission.document_path, 60);
  if (signedUrlError) {
    console.error("Unable to create approved e-book URL:", signedUrlError.message);
    return NextResponse.json({ error: "E-Book sementara tidak dapat dibuka." }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
