"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PHOTO_CATEGORIES, type Photo, type PhotoCategory } from "@/content/kitchen";

type Filter = PhotoCategory | "all";

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const visible = useMemo(
    () => (filter === "all" ? photos : photos.filter((p) => p.category === filter)),
    [filter, photos],
  );

  const close = useCallback(() => setLightboxIndex(null), []);

  const step = useCallback(
    (delta: number) =>
      setLightboxIndex((index) =>
        index === null ? null : (index + delta + visible.length) % visible.length,
      ),
    [visible.length],
  );

  useEffect(() => {
    if (lightboxIndex === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "ArrowRight") step(1);
    };

    document.addEventListener("keydown", onKeyDown);
    // Stop the page behind the lightbox from scrolling under it.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [lightboxIndex, close, step]);

  const active = lightboxIndex === null ? null : visible[lightboxIndex];

  const tabs: { id: Filter; label: string }[] = [
    { id: "all", label: `All (${photos.length})` },
    ...PHOTO_CATEGORIES.map((category) => ({
      id: category.id as Filter,
      label: category.label,
    })),
  ];

  return (
    <>
      <div className="flex flex-wrap justify-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            aria-pressed={filter === tab.id}
            className={`label-mono cursor-pointer rounded-full border px-5 py-2 transition-colors ${
              filter === tab.id
                ? "border-plum bg-plum text-white"
                : "border-plum/50 text-white/40 hover:bg-plum hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-9 grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-2.5">
        {visible.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setLightboxIndex(index)}
            className="group cursor-pointer overflow-hidden rounded-sm bg-[#1e1018] text-left"
          >
            <div className="aspect-[4/3] overflow-hidden">
              <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-[#2a1018] to-[#180c14] transition-transform duration-300 group-hover:scale-[1.04]">
                {photo.src ? (
                  <Image
                    src={photo.src}
                    alt={photo.caption}
                    fill
                    sizes="(max-width: 768px) 100vw, 300px"
                    loading="lazy"
                    className="object-cover"
                  />
                ) : (
                  <span className="font-display text-4xl font-bold text-plum/30">
                    {photo.id}
                  </span>
                )}
              </div>
            </div>
            <div className="px-3.5 pt-2.5 pb-3.5">
              <p className="label-mono text-plum-light">
                {PHOTO_CATEGORIES.find((c) => c.id === photo.category)?.label}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white/45">
                {photo.caption}
              </p>
            </div>
          </button>
        ))}
      </div>

      {active && lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.caption}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
          className="fixed inset-0 z-200 flex items-center justify-center bg-black/95 p-5"
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute top-5 right-6 cursor-pointer text-2xl text-white/40 hover:text-white"
          >
            ✕
          </button>

          <div className="w-full max-w-3xl">
            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-sm bg-[#111]">
              {active.src ? (
                <Image
                  src={active.src}
                  alt={active.caption}
                  fill
                  sizes="(max-width: 768px) 100vw, 760px"
                  className="object-contain"
                />
              ) : (
                <span className="font-display text-6xl text-white/8">
                  {active.id}
                </span>
              )}
            </div>

            <p className="mt-4 text-center text-sm text-white/50">
              {active.caption}
            </p>

            <div className="mt-4 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous photo"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25"
              >
                ←
              </button>
              <span className="label-mono min-w-16 text-center text-white/30">
                {lightboxIndex + 1} / {visible.length}
              </span>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next photo"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25"
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
