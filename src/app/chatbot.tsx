"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

const suggestedQuestions = [
  "Bagaimana cara mengunggah karya?",
  "Apa saja kategori karya di PINISI?",
  "Bagaimana cara mendaftar sebagai kontributor?",
];

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const messageList = messageListRef.current;
    if (messageList) messageList.scrollTop = messageList.scrollHeight;
  }, [messages, isLoading, isOpen]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || isLoading) return;

    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setDraft("");
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.slice(-10) }),
      });
      let result: { reply?: string; error?: string };
      try {
        result = await response.json() as typeof result;
      } catch {
        throw new Error("Layanan AI mengirim respons yang tidak valid. Silakan coba lagi.");
      }
      const reply = result.reply;
      if (!response.ok) throw new Error(result.error || "Asisten belum dapat menjawab. Coba lagi.");
      if (!reply) throw new Error("Asisten mengirim jawaban kosong. Silakan coba lagi.");
      setMessages((current) => [...current, { role: "assistant", content: reply }]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Pesan gagal dikirim. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }

  function askSuggestedQuestion(question: string) {
    setDraft(question);
  }

  return (
    <div className="chatbot-widget">
      <section className="chatbot-panel" id="chatbot-panel" aria-label="Asisten AI PINISI" hidden={!isOpen}>
          <header className="chatbot-header">
            <span className="chatbot-avatar" aria-hidden="true">P</span>
            <span className="chatbot-heading">
              <strong>Asisten PINISI</strong>
              <small>Tanya seputar aplikasi</small>
            </span>
            <button className="chatbot-close" type="button" onClick={() => setIsOpen(false)} aria-label="Tutup chatbot">×</button>
          </header>

          <div className="chatbot-messages" ref={messageListRef} role="log" aria-live="polite" aria-relevant="additions text">
            {messages.length === 0 && (
              <div className="chatbot-welcome">
                <strong>Halo! Ada yang bisa saya bantu?</strong>
                <p>Saya bisa menjelaskan cara menggunakan PINISI, mengajukan karya, dan fitur lainnya.</p>
                <div className="chatbot-suggestions">
                  {suggestedQuestions.map((question) => (
                    <button key={question} type="button" onClick={() => askSuggestedQuestion(question)}>{question}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message, index) => (
              <p className={`chatbot-message chatbot-message-${message.role}`} key={`${index}-${message.role}`}>{message.content}</p>
            ))}
            {isLoading && <p className="chatbot-message chatbot-message-assistant" role="status">Sedang menyiapkan jawaban...</p>}
            {error && <p className="chatbot-error" role="alert">{error}</p>}
          </div>

          <form className="chatbot-form" onSubmit={sendMessage}>
            <label className="sr-only" htmlFor="chatbot-input">Tulis pertanyaan tentang PINISI</label>
            <input
              id="chatbot-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Tulis pertanyaan..."
              maxLength={1000}
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !draft.trim()} aria-label="Kirim pesan">Kirim</button>
          </form>
          <p className="chatbot-disclaimer">Jawaban AI dapat kurang tepat. Jangan kirim data pribadi.</p>
      </section>
      <button
        className="chatbot-launcher"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls="chatbot-panel"
        aria-label={isOpen ? "Tutup asisten PINISI" : "Buka asisten PINISI"}
      >
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {isOpen ? <path d="m18 6-12 12M6 6l12 12" /> : <><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3H13a8.5 8.5 0 0 1 8 8v.5Z" /><path d="M8 12h.01M12 12h.01M16 12h.01" /></>}
        </svg>
        <span>{isOpen ? "Tutup" : "Asisten PINISI"}</span>
      </button>
    </div>
  );
}
