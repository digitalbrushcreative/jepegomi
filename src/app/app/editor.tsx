"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import {
  PHOTO_CATEGORIES,
  type Photo,
  type PhotoCategory,
} from "@/content/kitchen";
import { ACCEPTED_MIME, MAX_BYTES } from "@/lib/photo-rules";
import { deletePhotoAction, uploadPhotoAction } from "./actions";

type Filter = PhotoCategory | "all" | "beforeafter";

export type Slot = {
  key: string;
  label: string;
  caption: string;
  category: PhotoCategory | null;
  src: string;
};

function validate(file: File): string | null {
  if (!ACCEPTED_MIME.includes(file.type)) {
    return "Not a JPEG, PNG, WebP or AVIF image.";
  }
  if (file.size > MAX_BYTES) {
    return "Larger than 15 MB — please compress it first.";
  }
  return null;
}

function SlotCard({ slot }: { slot: Slot }) {
  const [src, setSrc] = useState(slot.src);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pending, startTransition] = useTransition();

  function upload(file: File) {
    const problem = validate(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setNotice(null);

    // When the writer commits to GitHub the file is not servable yet, so the
    // local preview is the only thing that can show what was just dropped.
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    const body = new FormData();
    body.set("slot", slot.key);
    body.set("file", file);

    startTransition(async () => {
      const result = await uploadPhotoAction(body);
      if (!result.ok) {
        setError(result.error);
        setPreview(null);
        URL.revokeObjectURL(localPreview);
        return;
      }

      if (result.immediate) {
        // Same filename can come back for a replacement, so bust the browser cache.
        setSrc(`${result.src}?v=${Date.now()}`);
        setPreview(null);
        URL.revokeObjectURL(localPreview);
      } else {
        setNotice(result.message ?? null);
      }
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deletePhotoAction(slot.key);
      if (result.ok) {
        setSrc("");
        setPreview(null);
        setError(null);
        setNotice(
          result.immediate
            ? null
            : "Removed from the repository. The site updates when it rebuilds.",
        );
      } else {
        setError(result.error);
      }
    });
  }

  const shown = preview ?? src;

  return (
    <div>
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          const file = event.dataTransfer.files[0];
          if (file) upload(file);
        }}
        className={`relative flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded border-2 border-dashed transition-colors ${
          dragOver
            ? "border-plum bg-plum/5"
            : error
              ? "border-plum/50 bg-white"
              : "border-black/15 bg-white hover:border-plum/50"
        }`}
      >
        <input
          type="file"
          accept={ACCEPTED_MIME.join(",")}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) upload(file);
            event.target.value = "";
          }}
        />

        {shown ? (
          <Image
            src={shown}
            alt={slot.caption}
            fill
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="px-4 text-center">
            <p className="font-display text-3xl font-bold text-black/15">
              {slot.label}
            </p>
            <p className="label-mono mt-1 text-smoke/60">Drop photo</p>
          </div>
        )}

        {pending && (
          <div className="absolute inset-0 flex items-center justify-center bg-charcoal/60">
            <p className="label-mono text-white">Working…</p>
          </div>
        )}
      </label>

      <div className="mt-2 flex items-baseline justify-between gap-2">
        <p className="label-mono text-plum">
          {slot.category
            ? PHOTO_CATEGORIES.find((c) => c.id === slot.category)?.label
            : "Before / After"}
        </p>
        {shown && !pending && (
          <button
            type="button"
            onClick={remove}
            className="label-mono cursor-pointer text-smoke/70 underline underline-offset-2 hover:text-plum"
          >
            Remove
          </button>
        )}
      </div>

      <p className="mt-1 text-xs leading-relaxed text-smoke">{slot.caption}</p>

      {notice && (
        <p className="mt-1.5 text-xs leading-relaxed text-green">{notice}</p>
      )}

      {error && (
        <p role="alert" className="mt-1.5 text-xs leading-relaxed text-plum">
          {error}
        </p>
      )}
    </div>
  );
}

export function Editor({
  gallery,
  beforeAfter,
}: {
  gallery: Photo[];
  beforeAfter: Slot[];
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const gallerySlots: Slot[] = gallery.map((photo) => ({
    key: String(photo.id),
    label: String(photo.id),
    caption: photo.caption,
    category: photo.category,
    src: photo.src,
  }));

  const visible =
    filter === "all"
      ? [...beforeAfter, ...gallerySlots]
      : filter === "beforeafter"
        ? beforeAfter
        : gallerySlots.filter((slot) => slot.category === filter);

  const filled = [...beforeAfter, ...gallerySlots].filter((s) => s.src).length;
  const total = beforeAfter.length + gallerySlots.length;

  const tabs: { id: Filter; label: string }[] = [
    { id: "all", label: `All (${total})` },
    { id: "beforeafter", label: "Before / After" },
    ...PHOTO_CATEGORIES.map((category) => ({
      id: category.id as Filter,
      label: category.label,
    })),
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            aria-pressed={filter === tab.id}
            className={`label-mono cursor-pointer rounded-full border px-5 py-2 transition-colors ${
              filter === tab.id
                ? "border-plum bg-plum text-white"
                : "border-plum/30 text-smoke hover:border-plum hover:text-plum"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <p className="label-mono ml-auto text-smoke">
          {filled} of {total} filled
        </p>
      </div>

      <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-5">
        {visible.map((slot) => (
          <SlotCard key={slot.key} slot={slot} />
        ))}
      </div>
    </>
  );
}
