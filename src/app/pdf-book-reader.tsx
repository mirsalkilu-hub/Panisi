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
  const [isTurning, setIsTurning] = useState(false);
  const [isAnimatingTurn, setIsAnimatingTurn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const readerElement = useRef<HTMLElement>(null);
  const leftPage = useRef<HTMLCanvasElement>(null);
  const rightPage = useRef<HTMLCanvasElement>(null);
  const underLeftPage = useRef<HTMLCanvasElement>(null);
  const underRightPage = useRef<HTMLCanvasElement>(null);
  const turningFront = useRef<HTMLCanvasElement>(null);
  const turningBack = useRef<HTMLCanvasElement>(null);
  const turnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTurn = useRef<"next" | "previous" | null>(null);
  const documentUrl = `/api/submissions/${encodeURIComponent(submissionId)}/document`;

  function startTurn(direction: "next" | "previous", document: PDFDocumentProxy) {
    if (turnTimer.current) clearTimeout(turnTimer.current);
    setIsAnimatingTurn(true);
    turnTimer.current = setTimeout(() => {
      setFirstPageNumber((page) => direction === "next"
        ? Math.min(page + 2, Math.max(1, document.numPages % 2 ? document.numPages : document.numPages - 1))
        : Math.max(1, page - 2));
      setIsAnimatingTurn(false);
      setIsTurning(false);
    }, 650);
  }

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
      if (pageNumber < 1) return;
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

    const underFirstPage = turnDirection === "next" ? firstPageNumber + 2 : Math.max(1, firstPageNumber - 2);
    const frontPageNumber = turnDirection === "next" ? firstPageNumber + 1 : firstPageNumber;
    const backPageNumber = turnDirection === "next" ? firstPageNumber + 2 : firstPageNumber - 1;
    void Promise.all([
      renderPage(firstPageNumber, leftPage.current),
      renderPage(firstPageNumber + 1, rightPage.current),
      renderPage(underFirstPage, underLeftPage.current),
      renderPage(underFirstPage + 1, underRightPage.current),
      renderPage(frontPageNumber, turningFront.current),
      renderPage(backPageNumber, turningBack.current),
    ]).then(() => {
      if (!cancelled && pendingTurn.current === turnDirection) {
        pendingTurn.current = null;
        startTurn(turnDirection, document);
      }
    }).catch((error: unknown) => {
      if (!cancelled && !(error instanceof Error && error.name === "RenderingCancelledException")) {
        pendingTurn.current = null;
        setIsTurning(false);
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
  }, [firstPageNumber, reader, turnDirection]);

  useEffect(() => () => {
    if (turnTimer.current) clearTimeout(turnTimer.current);
  }, []);

  useEffect(() => {
    function updateFullscreenState() {
      setIsFullscreen(document.fullscreenElement === readerElement.current);
    }
    document.addEventListener("fullscreenchange", updateFullscreenState);
    return () => document.removeEventListener("fullscreenchange", updateFullscreenState);
  }, []);

  function turnPage(direction: "next" | "previous") {
    if (reader.status !== "ready" || isTurning || pendingTurn.current) return;
    setIsTurning(true);
    if (direction === turnDirection) startTurn(direction, reader.document);
    else {
      pendingTurn.current = direction;
      setTurnDirection(direction);
    }
  }

  const pageCount = reader.status === "ready" ? reader.document.numPages : 0;
  const isSinglePage = pageCount === 1;

  async function toggleFullscreen() {
    try {
      setFullscreenError("");
      if (document.fullscreenElement) await document.exitFullscreen();
      else await readerElement.current?.requestFullscreen();
    } catch (error) {
      setFullscreenError(error instanceof Error
        ? `Mode layar penuh tidak dapat dibuka: ${error.message}`
        : "Mode layar penuh tidak dapat dibuka.");
    }
  }

  return (
    <section ref={readerElement} className="pdf-book-reader" aria-label={`Pembaca PDF: ${title}`}>
      <header className="pdf-book-reader-toolbar">
        <div className="pdf-book-reader-heading">
          <span className="pdf-book-reader-icon" aria-hidden="true">PDF</span>
          <div><strong>{title}</strong><span>Dokumen PDF · baca per halaman</span></div>
        </div>
        <div className="pdf-book-reader-actions">
          <button type="button" onClick={() => void toggleFullscreen()} aria-label="Buka atau tutup mode layar penuh">
            {isFullscreen ? "Keluar layar penuh" : "Layar penuh"}
          </button>
          <a href={`${documentUrl}?download=1`}>Unduh PDF <span aria-hidden="true">↓</span></a>
          <a href={documentUrl} target="_blank" rel="noreferrer">Buka PDF <span aria-hidden="true">↗</span></a>
        </div>
      </header>
      {fullscreenError && <p className="pdf-book-reader-error" role="alert">{fullscreenError}</p>}
      {reader.status === "error" ? <div className="pdf-book-reader-error" role="alert">PDF tidak dapat dimuat: {reader.message}</div>
        : reader.status === "loading" ? <div className="pdf-book-reader-loading" role="status">Menyiapkan halaman PDF…</div>
          : <>
            <div className={`pdf-book-stage${isSinglePage ? " is-single-page" : ""}${isAnimatingTurn ? ` is-turning turn-${turnDirection}` : ""}`}>
              <div className="pdf-book-spread pdf-book-spread-under" aria-hidden="true">
                <div className="pdf-book-leaf"><canvas ref={underLeftPage} /></div>
                <div className="pdf-book-leaf">{firstPageNumber + (turnDirection === "next" ? 3 : -1) <= pageCount
                  ? <canvas ref={underRightPage} />
                  : <div className="pdf-book-blank" />}</div>
              </div>
              <div className="pdf-book-spread pdf-book-spread-current">
                <div className="pdf-book-leaf"><canvas ref={leftPage} aria-label={`Halaman ${firstPageNumber}`} /></div>
                <div className="pdf-book-leaf">{firstPageNumber + 1 <= pageCount
                  ? <canvas ref={rightPage} aria-label={`Halaman ${firstPageNumber + 1}`} />
                  : <div className="pdf-book-blank" aria-hidden="true" />}</div>
              </div>
              <div className={`pdf-book-turn-sheet${isAnimatingTurn ? " is-turning" : ""}`} aria-hidden="true">
                <div className="pdf-book-turn-face pdf-book-turn-front"><canvas ref={turningFront} /></div>
                <div className="pdf-book-turn-face pdf-book-turn-back"><canvas ref={turningBack} /></div>
              </div>
            </div>
            <nav className="pdf-book-controls" aria-label="Navigasi halaman dokumen PDF">
              <button type="button" onClick={() => turnPage("previous")} disabled={firstPageNumber <= 1 || isTurning}>← Sebelumnya</button>
              <span>Halaman {firstPageNumber}{firstPageNumber + 1 <= pageCount ? `–${firstPageNumber + 1}` : ""} dari {pageCount}</span>
              <button type="button" onClick={() => turnPage("next")} disabled={firstPageNumber + 1 >= pageCount || isTurning}>Berikutnya →</button>
            </nav>
          </>}
    </section>
  );
}
