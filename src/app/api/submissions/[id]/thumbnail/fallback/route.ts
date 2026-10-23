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

  const accessToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return NextResponse.json({ error: "Sesi pengguna tidak ditemukan." }, { status: 401 });

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Thumbnail tidak ditemukan." }, { status: 404 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Sesi tidak valid atau sudah berakhir." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (profileError) {
    console.error("Unable to load thumbnail viewer role:", profileError.message);
    return NextResponse.json({ error: "Peran pengguna tidak dapat diverifikasi." }, { status: 500 });
  }

  const { data: submission, error } = await supabase
    .from("submissions")
    .select("profile_id, status, thumbnail_path")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("Unable to load submission thumbnail:", error.message);
    return NextResponse.json({ error: "Thumbnail sementara tidak dapat dimuat." }, { status: 500 });
  }
  if (!submission?.thumbnail_path) {
    return NextResponse.json({ error: "Thumbnail tidak ditemukan." }, { status: 404 });
  }
  const canView = submission.status === "approved"
    || submission.profile_id === userData.user.id
    || profile?.role === "admin"
    || profile?.role === "verifikator";
  if (!canView) return NextResponse.json({ error: "Thumbnail tidak ditemukan." }, { status: 404 });

  const { data: image, error: downloadError } = await supabase.storage
    .from("submission-thumbnails")
    .download(submission.thumbnail_path);
  if (downloadError) {
    if (downloadError.statusCode === "404" || /object not found/i.test(downloadError.message)) {
      return NextResponse.json({ error: "Thumbnail tidak ditemukan." }, { status: 404 });
    }
    console.error("Unable to download submission thumbnail:", downloadError.message);
    return NextResponse.json({ error: "Thumbnail sementara tidak dapat dibuka." }, { status: 500 });
  }
  if (!image) return NextResponse.json({ error: "Thumbnail tidak ditemukan." }, { status: 404 });

  const extension = submission.thumbnail_path.split(".").pop()?.toLowerCase();
  const fallbackContentType = extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg";
  const contentType = image.type.startsWith("image/") ? image.type : fallbackContentType;
  return new NextResponse(image, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Length": image.size.toString(),
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
