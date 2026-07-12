"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  PHOTO_CATEGORIES,
  photos as seedPhotos,
  type PhotoCategory,
} from "@/content/kitchen";

type Filter = PhotoCategory | "all";

type SlotState = {
  /** Object URL for a just-dropped file, shown before/while it uploads. */
  preview?: string;
  status: "empty" | "filled" | "uploading" | "error";
  error?: string;
};

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 15 * 1024 * 1024;

function validate(file: File): string | null {
  if (!ACCEPTED.includes(file.type)) {
    return "That file is not a JPEG, PNG, WebP or AVIF image.";
  }
  if (file.size > MAX_BYTES) {
    return "That image is larger than 15 MB.";
  }
  return null;
}

export function Editor({ storageReady }: { storageReady: boolean }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [slots, setSlots] = useState<Record<number, SlotState>>({});
  const [dragOver, setDragOver] = useState<number | null>(null);
  const previews = useRef<string[]>([]);

  // Object URLs leak until revoked; release them when the editor unmounts.
  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const visible =
    filter === "all"
      ? seedPhotos
      : seedPhotos.filter((photo) => photo.category === filter);

  async function accept(slotId: number, file: File) {
    const problem = validate(file);
    if (problem) {
      setSlots((prev) => ({
        ...prev,
        [slotId]: { status: "error", error: problem },
      }));
      return;
    }

    const preview = URL.createObjectURL(file);
    previews.current.push(preview);

    setSlots((prev) => ({
      ...prev,
      [slotId]: { preview, status: storageReady ? "uploading" : "error" },
    }));

    if (!storageReady) {
      setSlots((prev) => ({
        ...prev,
        [slotId]: {
          preview,
          status: "error",
          error: "No storage backend configured yet — this preview is local only.",
        },
      }));
      return;
    }

    const body = new FormData();
    body.set("slot", String(slotId));
    body.set("file", file);

    try {
      const response = await fetch("/api/photos", { method: "POST", body });
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: "" }));
        throw new Error(error || `Upload failed (${response.status})`);
      }
      setSlots((prev) => ({ ...prev, [slotId]: { preview, status: "filled" } }));
    } catch (error) {
      setSlots((prev) => ({
        ...prev,
        [slotId]: {
          preview,
          status: "error",
          error: error instanceof Error ? error.message : "Upload failed.",
        },
      }));
    }
  }

  const tabs: { id: Filter; label: string }[] = [
    { id: "all", label: `All (${seedPhotos.length})` },
    ...PHOTO_CATEGORIES.map((category) => ({
      id: category.id as Filter,
      label: category.label,
    })),
  ];

  return (
    <>
      <div className="flex flex-wrap gap-2">
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
      </div>

      <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
        {visible.map((photo) => {
          const slot = slots[photo.id] ?? { status: "empty" as const };
          const isDragTarget = dragOver === photo.id;

          return (
            <div key={photo.id}>
              <label
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(photo.id);
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOver(null);
                  const file = event.dataTransfer.files[0];
                  if (file) void accept(photo.id, file);
                }}
                className={`relative flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded border-2 border-dashed transition-colors ${
                  isDragTarget
                    ? "border-plum bg-plum/5"
                    : slot.status === "error"
                      ? "border-plum/40 bg-white"
                      : "border-black/15 bg-white hover:border-plum/50"
                }`}
              >
                <input
                  type="file"
                  accept={ACCEPTED.join(",")}
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void accept(photo.id, file);
                    event.target.value = "";
                  }}
                />

                {slot.preview ? (
                  <Image
                    src={slot.preview}
                    alt={photo.caption}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="px-4 text-center">
                    <p className="font-display text-3xl font-bold text-black/15">
                      {photo.id}
                    </p>
                    <p className="label-mono mt-1 text-smoke/60">
                      Drop photo
                    </p>
                  </div>
                )}

                {slot.status === "uploading" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-charcoal/60">
                    <p className="label-mono text-white">Uploading…</p>
                  </div>
                )}
              </label>

              <p className="label-mono mt-2 text-plum">
                {PHOTO_CATEGORIES.find((c) => c.id === photo.category)?.label}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-smoke">
                {photo.caption}
              </p>

              {slot.status === "error" && slot.error && (
                <p role="alert" className="mt-1.5 text-xs leading-relaxed text-plum">
                  {slot.error}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
