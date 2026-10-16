"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { workCategories, type WorkCategorySlug } from "./work-categories";

export function SubmissionThumbnail({
  id,
  title,
  contentType,
  categorySlug,
  youtubeUrl,
  thumbnailPath,
  accessToken,
  className = "",
}: {
  id: string;
  title: string;
  contentType: "video" | "ebook";
  categorySlug: WorkCategorySlug;
  youtubeUrl?: string | null;
  thumbnailPath?: string | null;
  accessToken?: string;
  className?: string;
}) {
  const [signedImage, setSignedImage] = useState<{ key: string; url: string } | null>(null);
  const category = workCategories.find((item) => item.slug === categorySlug);
  const videoId = contentType === "video" && youtubeUrl ? getYoutubeId(youtubeUrl) : null;
  const thumbnailKey = `${id}:${thumbnailPath ?? ""}`;

  useEffect(() => {
    let cancelled = false;
    if (!thumbnailPath || !accessToken || !supabase) return;

    void supabase.storage.from("submission-thumbnails").createSignedUrl(thumbnailPath, 300)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Unable to create submission thumbnail URL:", error.message);
          return;
        }
        setSignedImage({ key: thumbnailKey, url: data.signedUrl });
      });
    return () => { cancelled = true; };
  }, [accessToken, thumbnailKey, thumbnailPath]);

  const imageUrl = thumbnailPath
    ? accessToken ? signedImage?.key === thumbnailKey ? signedImage.url : null : `/api/submissions/${encodeURIComponent(id)}/thumbnail`
    : videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;

  return (
    <div className={`submission-thumbnail category-${categorySlug} ${className}`.trim()} aria-label={`Thumbnail ${title}`}>
      <span className="submission-thumbnail-orbit" />
      <span className="submission-thumbnail-copy">
        <span>{category?.name ?? "Karya Widyaiswara"}</span>
        <strong>{title}</strong>
        <small>{contentType === "ebook" ? "DOKUMEN PDF" : "VIDEO PEMBELAJARAN"}</small>
      </span>
      <span className="submission-thumbnail-mark" aria-hidden="true">{contentType === "ebook"
        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" /><path d="M4 5.5v16M8 7h8M8 11h7" /></svg>
        : <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.8a1 1 0 0 1 1.5-.86l10 6.2a1 1 0 0 1 0 1.72l-10 6.2A1 1 0 0 1 8 18.2V5.8Z" /></svg>}</span>
      {imageUrl && <Image className="submission-thumbnail-image" src={imageUrl} alt="" fill sizes="(max-width: 700px) 100vw, 520px" unoptimized onError={(event) => { event.currentTarget.style.display = "none"; }} />}
      <span className="submission-thumbnail-overlay" />
    </div>
  );
}

function getYoutubeId(url: string) {
  try {
    const parsed = new URL(url);
    const id = parsed.hostname === "youtu.be"
      ? parsed.pathname.slice(1)
      : parsed.hostname === "youtube.com" || parsed.hostname.endsWith(".youtube.com")
        ? parsed.searchParams.get("v") ?? parsed.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1] ?? null
        : null;
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
