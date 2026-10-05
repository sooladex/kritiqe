import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

/**
 * Notation 5 étoiles avec demi-points. La valeur reste sur l'échelle 1–10 de l'API
 * (1 = une demi-étoile, 10 = cinq étoiles). Accessible : rôle slider, flèches,
 * Début/Fin, Entrée pour valider.
 *
 * `variant="buttons"` : variante Coraline — mêmes valeurs, mêmes interactions,
 * les étoiles deviennent des boutons cousus.
 */
export function StarRating({
  value,
  onChange,
  onCommit,
  disabled,
  variant = "stars",
  size = 44,
  label = "Ta note",
}: {
  value: number | null;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
  disabled?: boolean;
  variant?: "stars" | "buttons";
  size?: number;
  label?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  const rowRef = useRef<HTMLDivElement>(null);
  const clipId = useId().replace(/:/g, "");

  function valueAt(clientX: number) {
    const el = rowRef.current;
    if (!el) return 1;
    const r = el.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - r.left, 0), r.width - 1);
    return Math.max(1, Math.min(10, Math.floor((x / r.width) * 10) + 1));
  }

  function onKey(e: KeyboardEvent) {
    if (disabled) return;
    const cur = value ?? 0;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = Math.min(10, cur + 1);
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = Math.max(1, cur - 1);
    if (e.key === "Home") next = 1;
    if (e.key === "End") next = 10;
    if (next != null) {
      e.preventDefault();
      onChange(next);
    }
    if ((e.key === "Enter" || e.key === " ") && value) {
      e.preventDefault();
      onCommit(value);
    }
  }

  const stars = shown / 2;
  const text = value ? `${(value / 2).toLocaleString("fr-FR")} sur 5` : "Pas encore notée";

  return (
    <div>
      <div
        ref={rowRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={1}
        aria-valuemax={10}
        aria-valuenow={value ?? undefined}
        aria-valuetext={text}
        aria-disabled={disabled}
        onKeyDown={onKey}
        onKeyUp={(e) => {
          if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key) && value) onCommit(value);
        }}
        onPointerMove={(e: PointerEvent) => !disabled && e.pointerType === "mouse" && setHover(valueAt(e.clientX))}
        onPointerLeave={() => setHover(null)}
        onPointerUp={(e: PointerEvent) => {
          if (disabled) return;
          const v = valueAt(e.clientX);
          onChange(v);
          onCommit(v);
        }}
        className={`inline-flex select-none gap-1.5 rounded-md ${disabled ? "opacity-60" : "cursor-pointer"}`}
        style={{ touchAction: "manipulation" }}
      >
        {Array.from({ length: 5 }).map((_, i) => {
          const fill = Math.max(0, Math.min(1, stars - i)); // 0, 0.5 ou 1
          return variant === "buttons" ? (
            <SewnButton key={i} fill={fill} size={size} clipId={`${clipId}-${i}`} />
          ) : (
            <Star key={i} fill={fill} size={size} clipId={`${clipId}-${i}`} />
          );
        })}
      </div>
    </div>
  );
}

function Star({ fill, size, clipId }: { fill: number; size: number; clipId: string }) {
  const d = "M24 3.5l6.1 13.4 14.6 1.6-10.9 9.9 3 14.4L24 35.5 11.2 42.8l3-14.4L3.3 18.5l14.6-1.6z";
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={48 * fill} height="48" />
        </clipPath>
      </defs>
      <path d={d} fill="none" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinejoin="round" />
      <path d={d} fill="var(--value)" clipPath={`url(#${clipId})`} />
    </svg>
  );
}

/** Bouton cousu (Coraline) : 4 trous, fil croisé. Rempli = bouton noir brillant, vide = contour pointillé. */
function SewnButton({ fill, size, clipId }: { fill: number; size: number; clipId: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={48 * fill} height="48" />
        </clipPath>
      </defs>
      <circle cx="24" cy="24" r="19" fill="none" stroke="var(--muted-foreground)" strokeWidth="2" strokeDasharray="3 3" />
      <g clipPath={`url(#${clipId})`}>
        <circle cx="24" cy="24" r="19" fill="#141016" />
        <circle cx="24" cy="24" r="15" fill="none" stroke="#2c2530" strokeWidth="2" />
        {[
          [18, 18],
          [30, 18],
          [18, 30],
          [30, 30],
        ].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r="2.6" fill="#030923" />
        ))}
        <path d="M18 18 L30 30 M30 18 L18 30" stroke="#f4550a" strokeWidth="2.2" strokeLinecap="round" />
        <ellipse cx="17" cy="13" rx="5" ry="2.4" fill="#fff" opacity="0.18" transform="rotate(-30 17 13)" />
      </g>
    </svg>
  );
}
