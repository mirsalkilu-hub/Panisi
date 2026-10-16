"use client";

import { useState } from "react";

export function WorkShareActions({ title, citation }: { title: string; citation: string }) {
  const [feedback, setFeedback] = useState("");

  async function copyText(text: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback(successMessage);
    } catch (error) {
      setFeedback(error instanceof Error
        ? `Tidak dapat menyalin: ${error.message}`
        : "Tidak dapat menyalin ke clipboard.");
    }
  }

  async function shareWork() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text: title, url });
        setFeedback("Tautan karya berhasil dibagikan.");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFeedback(error instanceof Error
          ? `Karya tidak dapat dibagikan: ${error.message}`
          : "Karya tidak dapat dibagikan.");
      }
      return;
    }
    await copyText(url, "Tautan karya berhasil disalin.");
  }

  return (
    <div className="work-share-actions">
      <button type="button" onClick={shareWork}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.7 10.7 6.6-4.4M8.7 13.3l6.6 4.4" /></svg>
        Bagikan karya
      </button>
      <button type="button" onClick={() => void copyText(`${citation} ${window.location.href}`, "Sitasi berhasil disalin.")}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></svg>
        Salin sitasi
      </button>
      {feedback && <span className="work-share-feedback" role="status">{feedback}</span>}
    </div>
  );
}
