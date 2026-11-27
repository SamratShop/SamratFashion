"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

export interface PDPLightboxModalProps {
  isOpen?: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
  productName: string;
}

export function PDPLightboxModal({
  onClose,
  images,
  initialIndex = 0,
  productName,
}: PDPLightboxModalProps) {
  const [lightboxIndex, setLightboxIndex] = useState(initialIndex);
  const [loadedLightboxSrc, setLoadedLightboxSrc] = useState<string | null>(null);

  const lightboxImageSrc = images[lightboxIndex] || images[0] || "";
  const isLightboxImageLoading = Boolean(lightboxImageSrc) && loadedLightboxSrc !== lightboxImageSrc;

  const lightboxPrev = () =>
    setLightboxIndex((i) => (i - 1 + images.length) % images.length);
  const lightboxNext = () =>
    setLightboxIndex((i) => (i + 1) % images.length);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && images.length > 1) lightboxPrev();
      if (e.key === "ArrowRight" && images.length > 1) lightboxNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [images.length, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${productName} image viewer`}
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 backdrop-blur-sm transition-opacity duration-200"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-5 right-5 text-white/80 hover:text-white bg-white/10 rounded-full p-2 transition-colors hover:bg-white/20 z-10"
        aria-label="Close lightbox"
      >
        <X className="w-6 h-6" />
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              lightboxPrev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-white/10 rounded-full p-3 transition-colors hover:bg-white/20 z-10"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              lightboxNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-white/10 rounded-full p-3 transition-colors hover:bg-white/20 z-10"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      <div
        className="relative w-full max-w-2xl max-h-[90vh] mx-6"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={images[lightboxIndex] || images[0]}
          alt={`${productName} – full view`}
          width={900}
          height={1200}
          className="object-contain w-full max-h-[90vh] rounded-lg select-none"
          priority
          onLoad={() => setLoadedLightboxSrc(lightboxImageSrc)}
          onError={() => setLoadedLightboxSrc(lightboxImageSrc)}
        />
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-150 ${
            isLightboxImageLoading ? "opacity-100 delay-100" : "opacity-0 delay-0"
          }`}
        >
          <Loader2 className="w-8 h-8 animate-spin text-white/80" />
        </div>
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setLightboxIndex(i)}
                className={`w-1.5 h-1.5 rounded-full transition-[background-color,transform] duration-200 ${
                  i === lightboxIndex ? "bg-white scale-125" : "bg-white/40 hover:bg-white/70"
                }`}
                aria-label={`View image ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PDPLightboxModal;
