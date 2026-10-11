"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { trackOnce } from "@/lib/analytics-client";

interface Props {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt: string;
  afterAlt: string;
  /** Used for analytics and the accessible label. */
  projectName: string;
  projectSlug?: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
  /** Aspect ratio of the frame, e.g. "16/10". Ignored when width/height are given. */
  aspect?: string;
  /** Intrinsic size of the photos; the frame follows their proportions. */
  width?: number | null;
  height?: number | null;
}

/**
 * Drag (mouse, touch or pen) or use the arrow keys to reveal the finished
 * paving. Before/After buttons give a one-tap alternative on phones.
 */
export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeAlt,
  afterAlt,
  projectName,
  projectSlug,
  priority = false,
  sizes = "(min-width: 1024px) 60vw, 100vw",
  className = "",
  aspect = "16/10",
  width,
  height,
}: Props) {
  const ratio = width && height ? `${width}/${height}` : aspect;
  // Portrait phone photos are capped so they are not upscaled into a very tall frame.
  const portrait = !!width && !!height && height > width;
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [animate, setAnimate] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const labelId = useId();

  const interacted = useCallback(() => {
    trackOnce(`ba:${projectSlug ?? projectName}`, "before_after_interaction", { project: projectSlug ?? projectName });
  }, [projectName, projectSlug]);

  const setFromClientX = useCallback((clientX: number) => {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => setFromClientX(e.clientX);
    const up = () => setDragging(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [dragging, setFromClientX]);

  const jumpTo = (value: number) => {
    setAnimate(true);
    setPosition(value);
    interacted();
    window.setTimeout(() => setAnimate(false), 450);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 4;
    let next: number | null = null;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = position - step;
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = position + step;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 100;
    if (next !== null) {
      e.preventDefault();
      setPosition(Math.min(100, Math.max(0, next)));
      interacted();
    }
  };

  const transition = animate ? "transition-[clip-path,left] duration-450 ease-out" : "";

  return (
    <div className={`${portrait ? "mx-auto w-full max-w-[30rem]" : ""} ${className}`}>
      <div
        ref={frame}
        className="relative w-full touch-pan-y overflow-hidden rounded-2xl bg-ink-200 select-none"
        style={{ aspectRatio: ratio }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          setDragging(true);
          setFromClientX(e.clientX);
          interacted();
        }}
      >
        {/* After (base layer) */}
        <Image src={afterSrc} alt={afterAlt} fill sizes={sizes} priority={priority} className="pointer-events-none object-cover" draggable={false} />
        {/* Before (clipped overlay) */}
        <div className={`absolute inset-0 ${transition}`} style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
          <Image src={beforeSrc} alt={beforeAlt} fill sizes={sizes} priority={priority} className="pointer-events-none object-cover" draggable={false} />
        </div>

        <span
          className={`pointer-events-none absolute top-3 left-3 rounded-full bg-ink-900/75 px-3 py-1 text-xs font-bold tracking-wider text-white uppercase backdrop-blur transition-opacity ${position < 12 ? "opacity-0" : "opacity-100"}`}
        >
          Before
        </span>
        <span
          className={`pointer-events-none absolute top-3 right-3 rounded-full bg-clay-500/90 px-3 py-1 text-xs font-bold tracking-wider text-white uppercase backdrop-blur transition-opacity ${position > 88 ? "opacity-0" : "opacity-100"}`}
        >
          After
        </span>

        {/* Divider + handle */}
        <div className={`pointer-events-none absolute inset-y-0 -ml-px w-0.5 bg-white shadow-[0_0_12px_rgba(0,0,0,0.4)] ${transition}`} style={{ left: `${position}%` }} />
        <div
          role="slider"
          tabIndex={0}
          aria-labelledby={labelId}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(position)}
          aria-valuetext={`${Math.round(position)}% before image shown`}
          onKeyDown={onKeyDown}
          className={`absolute top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border-2 border-white bg-clay-500 text-white shadow-lg outline-none focus-visible:ring-4 focus-visible:ring-white/70 ${dragging ? "scale-110" : ""} ${transition}`}
          style={{ left: `${position}%` }}
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 7-5 5 5 5M15 7l5 5-5 5" />
          </svg>
        </div>
        <span id={labelId} className="sr-only">
          Compare {projectName} before and after paving
        </span>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2" role="group" aria-label="Show before or after">
        <button
          type="button"
          onClick={() => jumpTo(100)}
          aria-pressed={position >= 99}
          className={`btn btn-sm min-w-24 ${position >= 99 ? "btn-dark" : "border border-ink-300 bg-white text-ink-800 hover:bg-sand-100"}`}
        >
          Before
        </button>
        <button
          type="button"
          onClick={() => jumpTo(50)}
          aria-label="Show both halves"
          className={`btn btn-sm ${position > 1 && position < 99 ? "btn-dark" : "border border-ink-300 bg-white text-ink-800 hover:bg-sand-100"}`}
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M12 3v18M4 7h5v10H4zM15 7h5v10h-5z" /></svg>
        </button>
        <button
          type="button"
          onClick={() => jumpTo(0)}
          aria-pressed={position <= 1}
          className={`btn btn-sm min-w-24 ${position <= 1 ? "btn-primary" : "border border-ink-300 bg-white text-ink-800 hover:bg-sand-100"}`}
        >
          After
        </button>
      </div>
    </div>
  );
}
