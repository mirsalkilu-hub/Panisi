"use client";

import { MouseEvent, useRef, useState } from "react";

type SocialNetwork = "whatsapp" | "facebook" | "linkedin" | "x";

export function WorkSocialShare({ title, href, compact = false }: { title: string; href: string; compact?: boolean }) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [feedback, setFeedback] = useState("");

  function getShareUrl() {
    return new URL(href, window.location.origin).toString();
  }

  function shareTo(event: MouseEvent<HTMLButtonElement>, network: SocialNetwork) {
    const url = getShareUrl();
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const shareUrls: Record<SocialNetwork, string> = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      x: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    };
    const openedWindow = window.open(shareUrls[network], "_blank", "noopener,noreferrer");
    if (!openedWindow) setFeedback("Izinkan tab baru untuk membagikan tautan.");
    menuRef.current?.removeAttribute("open");
    event.currentTarget.blur();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setFeedback("Tautan karya berhasil disalin.");
    } catch (error) {
      setFeedback(error instanceof Error
        ? `Tidak dapat menyalin: ${error.message}`
        : "Tidak dapat menyalin ke clipboard.");
    }
  }

  return (
    <details className={`work-social-share${compact ? " work-social-share-compact" : ""}`} ref={menuRef}>
      <summary aria-label={`Bagikan ${title} ke media sosial`} title="Bagikan ke media sosial">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.7 10.7 6.6-4.4M8.7 13.3l6.6 4.4" /></svg>
        {!compact && <span>Bagikan</span>}
      </summary>
      <div className="work-social-menu" aria-label="Pilih media sosial">
        <button type="button" onClick={(event) => shareTo(event, "whatsapp")}>WhatsApp</button>
        <button type="button" onClick={(event) => shareTo(event, "facebook")}>Facebook</button>
        <button type="button" onClick={(event) => shareTo(event, "linkedin")}>LinkedIn</button>
        <button type="button" onClick={(event) => shareTo(event, "x")}>X</button>
        <button type="button" onClick={() => void copyLink()}>Salin tautan</button>
        {feedback && <span role="status">{feedback}</span>}
      </div>
    </details>
  );
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
