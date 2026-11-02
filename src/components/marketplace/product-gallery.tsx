"use client";

import Image from "next/image";
import { useState } from "react";

export function ProductGallery({ images, name, label }: { images: string[]; name: string; label: string }) {
  const [index, setIndex] = useState(0);
  return (
    <div className="space-y-3" aria-label={label}>
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-muted md:aspect-[4/3]">
        <Image
          src={images[index]}
          alt={`${name} (${index + 1}/${images.length})`}
          fill
          unoptimized
          priority
          sizes="(min-width: 768px) 60vw, 100vw"
          className="object-contain p-4"
        />
      </div>
      {images.length > 1 && (
        <ul className="flex gap-2">
          {images.map((src, i) => (
            <li key={src}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`${name} ${i + 1}`}
                aria-pressed={i === index}
                className={`relative block size-16 overflow-hidden rounded-md border-2 ${i === index ? "border-primary" : "border-transparent"}`}
              >
                <Image src={src} alt="" fill unoptimized sizes="64px" className="object-contain bg-muted p-1" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
