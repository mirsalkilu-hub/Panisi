"use client";

import { MouseEvent, useRef, useState } from "react";

type SocialNetwork = "whatsapp" | "instagram" | "facebook";

export function WorkSocialShare({ title, href, compact = false }: { title: string; href: string; compact?: boolean }) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [feedback, setFeedback] = useState("");

  function getShareUrl() {
    return new URL(href, window.location.origin).toString();
  }

  function shareTo(event: MouseEvent<HTMLButtonElement>, network: SocialNetwork) {
    const url = getShareUrl();
    const encodedUrl = encodeURIComponent(url);
    if (network === "instagram") {
      void shareToInstagram(url);
    } else {
      const shareUrl = network === "whatsapp"
        ? `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`
        : `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
      const openedWindow = window.open(shareUrl, "_blank", "noopener,noreferrer");
      if (!openedWindow) setFeedback("Izinkan tab baru untuk membagikan tautan.");
    }
    menuRef.current?.removeAttribute("open");
    event.currentTarget.blur();
  }

  async function shareToInstagram(url: string) {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: title, url });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFeedback(error instanceof Error
          ? `Tidak dapat membuka menu berbagi: ${error.message}`
          : "Tidak dapat membuka menu berbagi.");
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setFeedback("Tautan disalin. Tempelkan di Instagram untuk membagikan.");
    } catch (error) {
      setFeedback(error instanceof Error
        ? `Tidak dapat menyalin tautan untuk Instagram: ${error.message}`
        : "Tidak dapat menyalin tautan untuk Instagram.");
    }
  }

  return (
    <details className={`work-social-share${compact ? " work-social-share-compact" : ""}`} ref={menuRef}>
      <summary aria-label={`Bagikan ${title} ke media sosial`} title="Bagikan ke media sosial">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.7 10.7 6.6-4.4M8.7 13.3l6.6 4.4" /></svg>
        {!compact && <span>Bagikan</span>}
      </summary>
      <div className="work-social-menu" role="group" aria-label="Pilih media sosial">
        {(["whatsapp", "instagram", "facebook"] as const).map((network) => (
          <button
            className={`work-social-option work-social-option-${network}`}
            key={network}
            type="button"
            onClick={(event) => shareTo(event, network)}
          >
            <SocialIcon network={network} />
            <span>{network === "whatsapp" ? "WhatsApp" : network === "instagram" ? "Instagram" : "Facebook"}</span>
          </button>
        ))}
        {feedback && <span role="status">{feedback}</span>}
      </div>
    </details>
  );
}

function SocialIcon({ network }: { network: SocialNetwork }) {
  if (network === "whatsapp") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2a9.85 9.85 0 0 0-8.45 14.92L2.2 22l5.23-1.37A9.96 9.96 0 1 0 12.04 2Zm0 18.1a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.1.81.83-3.02-.2-.31a8.12 8.12 0 1 1 6.9 3.83Zm4.45-6.08c-.24-.12-1.43-.71-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.4h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.31.98 2.47c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.52.1.47-.07 1.43-.59 1.63-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" /></svg>;
  }
  if (network === "instagram") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="18" cy="6" r="1" fill="currentColor" stroke="none" /></svg>;
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M13.6 21v-8.2h2.76l.41-3.2H13.6V7.56c0-.93.26-1.56 1.6-1.56h1.71V3.14A22.5 22.5 0 0 0 14.42 3c-2.47 0-4.16 1.5-4.16 4.26V9.6H7.47v3.2h2.79V21h3.34Z" /></svg>;
}

export function WorkShareActions({ title, citation, href }: { title: string; citation: string; href: string }) {
  const [feedback, setFeedback] = useState("");

  async function copyCitation() {
    const url = new URL(href, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(`${citation} ${url}`);
      setFeedback("Sitasi berhasil disalin.");
    } catch (error) {
      setFeedback(error instanceof Error
        ? `Tidak dapat menyalin: ${error.message}`
        : "Tidak dapat menyalin ke clipboard.");
    }
  }

  return (
    <div className="work-share-actions">
      <WorkSocialShare title={title} href={href} />
      <button type="button" onClick={copyCitation}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></svg>
        Salin sitasi
      </button>
      {feedback && <span className="work-share-feedback" role="status">{feedback}</span>}
    </div>
  );
}
