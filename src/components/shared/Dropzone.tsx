"use client";

import Image from "next/image";
import { Image as ImageIcon, X } from "lucide-react";
import type { DragEvent, KeyboardEvent, RefObject } from "react";

interface DropzoneProps {
  imagePreview: string | null;
  isDragActive: boolean;
  batchCount: number;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onDropzoneClick: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
  onDragEnter: (event: DragEvent) => void;
  onDragOver: (event: DragEvent) => void;
  onDragLeave: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
  onRemoveImage: (event: React.MouseEvent) => void;
}

export function Dropzone({
  imagePreview,
  isDragActive,
  batchCount,
  onDropzoneClick,
  onKeyDown,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemoveImage,
}: DropzoneProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onDropzoneClick}
      onKeyDown={onKeyDown}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative grid min-h-[150px] flex-1 cursor-pointer place-items-center overflow-hidden rounded-2xl border-2 border-dashed transition-all 2xl:min-h-[220px] ${
        isDragActive
          ? "border-forest bg-forest/[0.05] ring-2 ring-forest/20"
          : "border-forest/10 bg-forest/[0.02] hover:bg-forest/[0.04]"
      }`}
      aria-label="Upload atau drag and drop gambar soal"
    >
      {imagePreview ? (
        <>
          <Image
            src={imagePreview}
            alt="Preview soal"
            fill
            unoptimized
            sizes="(min-width: 1280px) 46vw, 260px"
            className="object-contain p-2"
          />
          <button
            type="button"
            onClick={onRemoveImage}
            className="absolute right-2 top-2 grid size-8 place-items-center rounded-xl bg-forest/80 text-white shadow-premium backdrop-blur-md transition hover:bg-forest active:scale-90"
            aria-label="Hapus gambar"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </>
      ) : batchCount > 0 ? (
        <div className="grid justify-items-center gap-3 px-4 text-center text-sm">
          <div className="grid size-14 place-items-center rounded-2xl bg-forest/5 text-forest shadow-inner">
            <ImageIcon size={30} aria-hidden="true" />
          </div>
          <div className="grid gap-1">
            <span className="font-bold text-forest">
              {batchCount} gambar siap OCR
            </span>
            <span className="text-xs font-medium text-[#45544e]">
              Cek hasil OCR tiap item sebelum generate.
            </span>
          </div>
        </div>
      ) : (
        <div className="grid justify-items-center gap-3 px-4 text-center text-sm">
          <div className="grid size-14 place-items-center rounded-2xl bg-white text-forest shadow-premium">
            <ImageIcon size={30} aria-hidden="true" />
          </div>
          <div className="grid gap-1">
            <span className="font-bold text-forest">
              Tarik gambar ke sini
            </span>
            <span className="text-xs font-medium text-[#45544e]">
              atau klik untuk memilih file
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
