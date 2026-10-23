"use client";

import { MouseEvent, useRef, useState } from "react";

type SocialNetwork = "whatsapp" | "instagram" | "facebook" | "x" | "linkedin" | "telegram" | "email";

export function WorkSocialShare({ title, href, compact = false, imageUrl, citation }: { title: string; href: string; compact?: boolean; imageUrl?: string; citation?: string }) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [feedback, setFeedback] = useState("");
  const [shareImage, setShareImage] = useState<File | null>(null);
  const [shareImageStatus, setShareImageStatus] = useState<"idle" | "loading" | "ready" | "unavailable">("idle");

  function getShareUrl() {
    const shareUrl = new URL(href, window.location.origin);
    const previewImageUrl = imageUrl ?? document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content;
    if (previewImageUrl) {
      const preview = new URL(previewImageUrl, window.location.origin);
      const version = preview.searchParams.get("v") ?? preview.pathname;
      shareUrl.searchParams.set("preview", version);
    }
    return shareUrl.toString();
  }

  function prepareShareImage() {
    if (shareImageStatus !== "idle") return;
    const previewImageUrl = imageUrl ?? document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content;
    if (!previewImageUrl) {
      setShareImageStatus("unavailable");
      return;
    }
    setShareImageStatus("loading");
    void fetch(previewImageUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`Gambar tidak dapat dimuat (${response.status}).`);
        return response.blob();
      })
      .then((image) => {
        if (!image.type.startsWith("image/")) throw new Error("Pratinjau bukan berkas gambar.");
        setShareImage(new File([image], "pinisi-share-image", { type: image.type }));
        setShareImageStatus("ready");
      })
      .catch((error: unknown) => {
        console.error("Unable to prepare social share image:", error);
        setFeedback(error instanceof Error
          ? `Gambar pratinjau tidak dapat disiapkan: ${error.message}`
          : "Gambar pratinjau tidak dapat disiapkan.");
        setShareImageStatus("unavailable");
      });
  }

  async function shareTo(event: MouseEvent<HTMLButtonElement>, network: SocialNetwork | "native" | "copy") {
    const button = event.currentTarget;
    menuRef.current?.removeAttribute("open");
    button.blur();
    const url = getShareUrl();
    const encodedUrl = encodeURIComponent(url);

    if (network === "instagram") {
      await shareToInstagram(url);
    } else if (network === "native") {
      if (navigator.share) {
        try {
          await navigator.share({ title, text: title, url });
          setFeedback("");
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setFeedback(error instanceof Error
            ? `Tidak dapat membuka menu berbagi: ${error.message}`
            : "Tidak dapat membuka menu berbagi.");
        }
      } else {
        await copyLink(url, "Tautan berhasil disalin.");
      }
    } else if (network === "copy") {
      await copyLink(url, "Tautan berhasil disalin.");
    } else {
      const shareUrls: Record<SocialNetwork, string> = {
        whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
        instagram: `https://www.instagram.com/`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodedUrl}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(title)}`,
        email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${title}\n${url}`)}`,
      };
      window.open(shareUrls[network], "_blank", "noopener,noreferrer");
    }
  }

  async function shareToInstagram(url: string) {
    if (!navigator.share) {
      await copyLink(url, "Tautan disalin. Tempelkan di Instagram untuk membagikan.");
      return;
    }

    if (shareImageStatus === "loading") {
      setFeedback("Gambar sedang disiapkan. Coba bagikan lagi sebentar.");
      return;
    }

    if (shareImage && navigator.canShare?.({ files: [shareImage] })) {
      try {
        await navigator.share({ files: [shareImage], title, text: `${title}\n${url}` });
        setFeedback("");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFeedback(error instanceof Error
          ? `Tidak dapat membagikan gambar ke Instagram: ${error.message}`
          : "Tidak dapat membagikan gambar ke Instagram.");
        return;
      }
    }

    try {
      await navigator.share({ title, text: `${title}\n${url}` });
      setFeedback("Tautan dibagikan. Perangkat ini tidak mendukung berbagi gambar langsung ke Instagram.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFeedback(error instanceof Error
        ? `Tidak dapat membuka menu berbagi: ${error.message}`
        : "Tidak dapat membuka menu berbagi.");
    }
  }

  async function copyLink(url: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(url);
      setFeedback(successMessage);
    } catch (error) {
      setFeedback(error instanceof Error
        ? `Tidak dapat menyalin tautan: ${error.message}`
        : "Tidak dapat menyalin tautan.");
    }
  }

  async function copyCitation() {
    if (!citation) return;
    try {
      await navigator.clipboard.writeText(`${citation} ${getShareUrl()}`);
      setFeedback("Sitasi berhasil disalin.");
    } catch (error) {
      setFeedback(error instanceof Error
        ? `Tidak dapat menyalin sitasi: ${error.message}`
        : "Tidak dapat menyalin sitasi.");
    }
  }

  return (
    <details
      className={`work-social-share${compact ? " work-social-share-compact" : ""}`}
      ref={menuRef}
      onToggle={(event) => {
        if (event.currentTarget.open) prepareShareImage();
      }}
    >
      <summary aria-label={`Bagikan ${title} ke media sosial`} title="Bagikan ke media sosial">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.7 10.7 6.6-4.4M8.7 13.3l6.6 4.4" /></svg>
        {!compact && <span>Bagikan</span>}
      </summary>
      <div className="work-social-backdrop" aria-hidden="true" onClick={() => menuRef.current?.removeAttribute("open")} />
      <div className="work-social-menu" role="group" aria-label="Pilih media sosial">
        <div className="work-social-menu-heading">Bagikan tautan</div>
        <div className="work-social-preview">
          <span className="work-social-preview-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l3-3A5 5 0 0 0 13 2.93l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.07 0l-3 3A5 5 0 0 0 11 21.07l1.71-1.71" /></svg>
          </span>
          <span className="work-social-preview-text"><strong>{title}</strong><span>{href}</span></span>
          <button className="work-social-copy" type="button" aria-label="Salin tautan" title="Salin tautan" onClick={(event) => void shareTo(event, "copy")}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></svg>
          </button>
        </div>
        <div className="work-social-options">
          <button className="work-social-option work-social-option-native" type="button" onClick={(event) => void shareTo(event, "native")}>
            <SocialIcon network="native" />
            <span>Bagikan lainnya</span>
          </button>
          {(["whatsapp", "instagram", "facebook", "x", "linkedin", "telegram", "email"] as const).map((network) => (
          <button
            className={`work-social-option work-social-option-${network}`}
            key={network}
            type="button"
            onClick={(event) => void shareTo(event, network)}
          >
            <SocialIcon network={network} />
            <span>{network === "whatsapp" ? "WhatsApp" : network === "instagram" ? "Instagram" : network === "facebook" ? "Facebook" : network === "x" ? "X" : network === "linkedin" ? "LinkedIn" : network === "telegram" ? "Telegram" : "Email"}</span>
          </button>
          ))}
          {citation && <button
            className="work-social-option work-social-option-citation"
            type="button"
            onClick={() => void copyCitation()}
          >
            <SocialIcon network="copy" />
            <span>Salin sitasi</span>
          </button>}
        </div>
      </div>
      {feedback && <span className="work-social-feedback" role="status">{feedback}</span>}
    </details>
  );
}

function SocialIcon({ network }: { network: SocialNetwork | "native" | "copy" }) {
  if (network === "native") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V3m0 0L7 8m5-5 5 5" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>;
  }
  if (network === "copy") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></svg>;
  }
  if (network === "whatsapp") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2a9.85 9.85 0 0 0-8.45 14.92L2.2 22l5.23-1.37A9.96 9.96 0 1 0 12.04 2Zm0 18.1a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.1.81.83-3.02-.2-.31a8.12 8.12 0 1 1 6.9 3.83Zm4.45-6.08c-.24-.12-1.43-.71-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.4h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.31.98 2.47c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.52.1.47-.07 1.43-.59 1.63-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" /></svg>;
  }
  if (network === "instagram") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="18" cy="6" r="1" fill="currentColor" stroke="none" /></svg>;
  }
  if (network === "facebook") return <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M13.6 21v-8.2h2.76l.41-3.2H13.6V7.56c0-.93.26-1.56 1.6-1.56h1.71V3.14A22.5 22.5 0 0 0 14.42 3c-2.47 0-4.16 1.5-4.16 4.26V9.6H7.47v3.2h2.79V21h3.34Z" /></svg>;
  if (network === "x") return <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-6.78 7.75L23.2 22h-6.25l-4.9-7.34L5.62 22H2.5l7.25-8.29L1.9 2h6.4l4.43 6.77L18.9 2Zm-1.1 18h1.73L7.37 3.9H5.51L17.8 20Z" /></svg>;
  if (network === "linkedin") return <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M5.2 3a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4ZM3.3 9h3.8v12H3.3V9Zm6.2 0h3.6v1.64h.05A3.95 3.95 0 0 1 16.7 8.7c3.84 0 4.55 2.53 4.55 5.82V21h-3.8v-5.75c0-1.37-.02-3.14-1.92-3.14-1.92 0-2.22 1.5-2.22 3.04V21H9.5V9Z" /></svg>;
  if (network === "telegram") return <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="m21.7 4.3-3.2 15.1c-.24 1.07-.87 1.33-1.76.83l-4.87-3.59-2.35 2.26c-.26.26-.48.48-.98.48l.35-4.95 9.01-8.14c.39-.35-.09-.54-.61-.19L6.15 13.2l-4.8-1.5c-1.04-.32-1.06-1.03.22-1.54l18.76-7.24c.87-.32 1.64.21 1.37 1.38Z" /></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>;
}

export function WorkShareActions({ title, citation, href }: { title: string; citation: string; href: string }) {
  return <div className="work-share-actions"><WorkSocialShare title={title} citation={citation} href={href} /></div>;
}
