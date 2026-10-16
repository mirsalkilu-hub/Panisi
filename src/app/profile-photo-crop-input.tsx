"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import NextImage from "next/image";

const maxOutputSize = 500 * 1024;
const cropOutputSize = 512;
const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

type CropImage = {
  file: File;
  image: HTMLImageElement;
  url: string;
};

type CropOffset = { x: number; y: number };

export function ProfilePhotoCropInput({
  id,
  name,
  label,
  helpText = "JPG, PNG, atau WebP · maksimal 500 KB · dipotong menjadi persegi 1:1",
  disabled = false,
}: {
  id: string;
  name: string;
  label: string;
  helpText?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cropViewportRef = useRef<HTMLDivElement>(null);
  const dragOrigin = useRef<{ pointerId: number; clientX: number; clientY: number; offset: CropOffset } | null>(null);
  const [cropImage, setCropImage] = useState<CropImage | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [frameSize, setFrameSize] = useState(320);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<CropOffset>({ x: 0, y: 0 });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const baseScale = cropImage
    ? Math.max(frameSize / cropImage.image.naturalWidth, frameSize / cropImage.image.naturalHeight)
    : 1;
  const renderScale = baseScale * zoom;
  const imageWidth = cropImage ? cropImage.image.naturalWidth * renderScale : frameSize;
  const imageHeight = cropImage ? cropImage.image.naturalHeight * renderScale : frameSize;

  const assignSelectedFile = useCallback((file: File | null) => {
    const input = inputRef.current;
    if (!input) return;
    if (!file) {
      input.value = "";
      return;
    }
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
  }, []);

  const cancelCrop = useCallback(() => {
    if (busy) return;
    setCropImage(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    assignSelectedFile(selectedFile);
  }, [assignSelectedFile, busy, selectedFile]);

  const clampOffset = useCallback((nextOffset: CropOffset, scale: number, image: CropImage | null, size: number) => {
    if (!image) return { x: 0, y: 0 };
    const width = image.image.naturalWidth * scale;
    const height = image.image.naturalHeight * scale;
    return {
      x: Math.max(size / 2 - width / 2, Math.min(width / 2 - size / 2, nextOffset.x)),
      y: Math.max(size / 2 - height / 2, Math.min(height / 2 - size / 2, nextOffset.y)),
    };
  }, []);

  useEffect(() => {
    if (!cropImage || !cropViewportRef.current) return;
    const viewport = cropViewportRef.current;
    const observer = new ResizeObserver(([entry]) => {
      const nextSize = entry.contentRect.width;
      if (nextSize <= 0) return;
      setFrameSize(nextSize);
      setOffset((current) => clampOffset(current, baseScale * zoom, cropImage, nextSize));
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [baseScale, clampOffset, cropImage, zoom]);

  useEffect(() => {
    if (!cropImage) return;
    return () => URL.revokeObjectURL(cropImage.url);
  }, [cropImage]);

  useEffect(() => {
    if (!cropImage) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) cancelCrop();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, cancelCrop, cropImage]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    setError("");
    if (!file) return;
    if (!supportedTypes.has(file.type)) {
      setError("Pilih foto berformat JPG, PNG, atau WebP.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("Ukuran foto asli maksimal 15 MB sebelum dipotong.");
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setCropImage({ file, image, url });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setError("Foto tidak dapat dibuka. Pilih file gambar yang valid.");
    };
    image.src = url;
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!cropImage) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragOrigin.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      offset,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const origin = dragOrigin.current;
    if (!origin || origin.pointerId !== event.pointerId) return;
    setOffset(clampOffset(
      { x: origin.offset.x + event.clientX - origin.clientX, y: origin.offset.y + event.clientY - origin.clientY },
      renderScale,
      cropImage,
      frameSize,
    ));
  }

  function handleZoomChange(value: number) {
    const nextZoom = value;
    const nextScale = baseScale * nextZoom;
    setZoom(nextZoom);
    setOffset((current) => clampOffset(current, nextScale, cropImage, frameSize));
  }

  async function createCroppedFile() {
    if (!cropImage || frameSize <= 0) return;
    setBusy(true);
    setError("");
    try {
      const sourceSize = frameSize / renderScale;
      const sourceX = Math.max(0, Math.min(
        cropImage.image.naturalWidth - sourceSize,
        (imageWidth / 2 - frameSize / 2 - offset.x) / renderScale,
      ));
      const sourceY = Math.max(0, Math.min(
        cropImage.image.naturalHeight - sourceSize,
        (imageHeight / 2 - frameSize / 2 - offset.y) / renderScale,
      ));
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Browser tidak dapat memproses foto ini.");

      let blob: Blob | null = null;
      for (const size of [cropOutputSize, 448, 384, 320]) {
        canvas.width = size;
        canvas.height = size;
        context.fillStyle = "#fff";
        context.fillRect(0, 0, size, size);
        context.drawImage(
          cropImage.image,
          sourceX,
          sourceY,
          sourceSize,
          sourceSize,
          0,
          0,
          size,
          size,
        );
        for (const quality of [0.9, 0.8, 0.7, 0.6, 0.5]) {
          blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
          if (blob && blob.size <= maxOutputSize) break;
        }
        if (blob && blob.size <= maxOutputSize) break;
      }
      if (!blob || blob.size > maxOutputSize) throw new Error("Foto hasil crop masih melebihi batas 500 KB.");

      const croppedFile = new File(
        [blob],
        `${cropImage.file.name.replace(/\.[^.]+$/, "") || "foto-profil"}-crop.jpg`,
        { type: "image/jpeg", lastModified: Date.now() },
      );
      assignSelectedFile(croppedFile);
      setSelectedFile(croppedFile);
      setCropImage(null);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Foto tidak dapat dipotong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <label htmlFor={id}>{label}</label>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        disabled={disabled}
      />
      <small className="profile-photo-crop-help">
        {selectedFile ? `Foto siap diunggah: ${selectedFile.name} · JPG · maksimal 500 KB` : helpText}
      </small>
      {error && <p className="profile-photo-crop-error" role="alert">{error}</p>}
      {cropImage && <div className="profile-photo-crop-backdrop" role="presentation">
        <section className="profile-photo-crop-dialog" role="dialog" aria-modal="true" aria-labelledby={`${id}-crop-title`}>
          <div className="profile-photo-crop-heading">
            <div><span className="eyebrow">FOTO PROFIL</span><h2 id={`${id}-crop-title`}>Atur potongan 1:1</h2></div>
            <button type="button" className="profile-photo-crop-close" onClick={cancelCrop} disabled={busy} aria-label="Batal memilih foto">×</button>
          </div>
          <p className="profile-photo-crop-instructions">Geser foto untuk mengatur posisi di dalam bingkai persegi.</p>
          <div
            ref={cropViewportRef}
            className="profile-photo-crop-viewport"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={(event) => {
              if (dragOrigin.current?.pointerId === event.pointerId) dragOrigin.current = null;
            }}
            onPointerCancel={() => { dragOrigin.current = null; }}
          >
            <NextImage
              src={cropImage.url}
              alt="Pratinjau foto yang sedang dipotong"
              draggable={false}
              unoptimized
              width={Math.ceil(imageWidth)}
              height={Math.ceil(imageHeight)}
              style={{
                height: imageHeight,
                left: frameSize / 2 + offset.x,
                top: frameSize / 2 + offset.y,
                transform: "translate(-50%, -50%)",
                width: imageWidth,
              }}
            />
            <span className="profile-photo-crop-frame" aria-hidden="true" />
          </div>
          <label className="profile-photo-zoom" htmlFor={`${id}-crop-zoom`}>
            <span>Perbesar foto</span><input
              id={`${id}-crop-zoom`}
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(event) => handleZoomChange(Number(event.currentTarget.value))}
              disabled={busy}
            />
          </label>
          {error && <p className="profile-photo-crop-error" role="alert">{error}</p>}
          <div className="profile-photo-crop-actions">
            <button type="button" className="button button-outline" onClick={cancelCrop} disabled={busy}>Batal</button>
            <button type="button" className="button button-primary" onClick={() => void createCroppedFile()} disabled={busy}>{busy ? "Memproses foto..." : "Gunakan foto ini"}</button>
          </div>
        </section>
      </div>}
    </>
  );
}
