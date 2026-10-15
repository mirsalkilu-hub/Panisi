"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";

type ReaderState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; document: PDFDocumentProxy };

export function PdfBookReader({ submissionId, title }: { submissionId: string; title: string }) {
  const [reader, setReader] = useState<ReaderState>({ status: "loading" });
  const [firstPageNumber, setFirstPageNumber] = useState(1);
  const [turnDirection, setTurnDirection] = useState<"next" | "previous">("next");
  const leftPage = useRef<HTMLCanvasElement>(null);
  const rightPage = useRef<HTMLCanvasElement>(null);
  const documentUrl = `/api/submissions/${encodeURIComponent(submissionId)}/document`;

  useEffect(() => {
    let cancelled = false;
    let loadingTask: import("pdfjs-dist").PDFDocumentLoadingTask | null = null;

    async function loadDocument() {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        loadingTask = pdfjs.getDocument({ url: documentUrl });
        const document = await loadingTask.promise;
        if (!cancelled) setReader({ status: "ready", document });
      } catch (error) {
        if (!cancelled) {
          setReader({
            status: "error",
            message: error instanceof Error ? error.message : "PDF tidak dapat dibuka.",
          });
        }
      }
    }

    void loadDocument();
    return () => {
      cancelled = true;
      if (loadingTask) void loadingTask.destroy();
    };
  }, [documentUrl]);

  useEffect(() => {
    if (reader.status !== "ready") return;
    const document = reader.document;
    let cancelled = false;
    const renderTasks: RenderTask[] = [];

    async function renderPage(pageNumber: number, canvas: HTMLCanvasElement | null) {
      if (!canvas || pageNumber > document.numPages) return;
      const page: PDFPageProxy = await document.getPage(pageNumber);
      if (cancelled) return;

      const baseViewport = page.getViewport({ scale: 1 });
      const availableWidth = Math.max(canvas.parentElement?.clientWidth ?? 0, 240);
      const scale = Math.min((availableWidth * 1.8) / baseViewport.width, 1.6);
      const viewport = page.getViewport({ scale });
      const outputScale = Math.min(window.devicePixelRatio || 1, 2);
      if (!canvas.getContext("2d")) throw new Error("Pembaca PDF tidak dapat menyiapkan kanvas.");

      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      renderTasks.push(page.render({
        canvas,
        viewport,
        transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
      }));
      await renderTasks[renderTasks.length - 1].promise;
    }

    void Promise.all([
      renderPage(firstPageNumber, leftPage.current),
      renderPage(firstPageNumber + 1, rightPage.current),
    ]).catch((error: unknown) => {
      if (!cancelled && !(error instanceof Error && error.name === "RenderingCancelledException")) {
        setReader({
          status: "error",
          message: error instanceof Error ? error.message : "Halaman PDF tidak dapat ditampilkan.",
        });
      }
    });

    return () => {
      cancelled = true;
      for (const task of renderTasks) task.cancel();
    };
  }, [firstPageNumber, reader]);

  function turnPage(direction: "next" | "previous") {
    if (reader.status !== "ready") return;
    setTurnDirection(direction);
    setFirstPageNumber((page) => direction === "next"
      ? Math.min(page + 2, Math.max(1, reader.document.numPages % 2 ? reader.document.numPages : reader.document.numPages - 1))
      : Math.max(1, page - 2));
  }

  const pageCount = reader.status === "ready" ? reader.document.numPages : 0;

  return (
    <section className="pdf-book-reader" aria-label={`Pembaca e-book: ${title}`}>
      <header className="pdf-book-reader-toolbar">
        <div className="pdf-book-reader-heading">
          <span className="pdf-book-reader-icon" aria-hidden="true">PDF</span>
          <div><strong>{title}</strong><span>E-Book · buka halaman seperti membaca buku</span></div>
        </div>
        <a href={documentUrl} target="_blank" rel="noreferrer">Buka PDF <span aria-hidden="true">↗</span></a>
      </header>
      {reader.status === "error" ? <div className="pdf-book-reader-error" role="alert">E-Book tidak dapat dimuat: {reader.message}</div>
        : reader.status === "loading" ? <div className="pdf-book-reader-loading" role="status">Menyiapkan halaman e-book…</div>
          : <>
            <div className={`pdf-book-stage turn-${turnDirection}`}>
              <div className="pdf-book-spread">
                <div className="pdf-book-leaf"><canvas ref={leftPage} aria-label={`Halaman ${firstPageNumber}`} /></div>
                <div className="pdf-book-leaf">{firstPageNumber + 1 <= pageCount
                  ? <canvas ref={rightPage} aria-label={`Halaman ${firstPageNumber + 1}`} />
                  : <div className="pdf-book-blank" aria-hidden="true" />}</div>
              </div>
            </div>
            <nav className="pdf-book-controls" aria-label="Navigasi halaman e-book">
              <button type="button" onClick={() => turnPage("previous")} disabled={firstPageNumber <= 1}>← Sebelumnya</button>
              <span>Halaman {firstPageNumber}{firstPageNumber + 1 <= pageCount ? `–${firstPageNumber + 1}` : ""} dari {pageCount}</span>
              <button type="button" onClick={() => turnPage("next")} disabled={firstPageNumber + 1 >= pageCount}>Berikutnya →</button>
            </nav>
          </>}
    </section>
  );
}
