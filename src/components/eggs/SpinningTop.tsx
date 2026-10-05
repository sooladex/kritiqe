import { useEffect, useRef } from "react";
import type { EggEffectProps } from "../../lib/eggs/easterEggs";
import { usePrefersReducedMotion } from "./EggShell";

/**
 * Inception — pendant l'enregistrement de la note, une toupie tourne dans le coin.
 * Elle ralentit, vacille de plus en plus… sans jamais tout à fait s'arrêter.
 * Ne recouvre pas la page : la notation reste utilisable.
 */
export default function SpinningTop({ onDone }: EggEffectProps) {
  const ref = useRef<SVGGElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    let raf = 0;
    let angle = 0;
    const start = performance.now();
    let last = start;
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const dt = (now - last) / 1000;
      last = now;
      // Vitesse qui décroît vers un plancher non nul : elle ne s'arrête jamais.
      const speed = 1500 * Math.exp(-t / 1.6) + 140; // °/s
      angle = (angle + speed * dt) % 360;
      const wobble = Math.min(14, 2 + t * 2.2) * Math.sin(t * (6 + t));
      if (ref.current) {
        ref.current.setAttribute("transform", `rotate(${wobble} 60 112)`);
        ref.current.style.setProperty("--spin", `${angle}deg`);
        const body = ref.current.querySelector<SVGGElement>("[data-body]");
        body?.setAttribute("transform", `translate(60 0) scale(${Math.cos((angle * Math.PI) / 180) * 0.15 + 0.85} 1) translate(-60 0)`);
      }
      raf = requestAnimationFrame(tick);
    };
    if (!reduced) raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  return (
    <button
      type="button"
      onClick={() => onDone()}
      aria-label="Fermer la toupie"
      className="fixed bottom-24 right-5 z-[80] grid size-28 place-items-center rounded-full bg-[var(--surface)]/90 backdrop-blur md:bottom-8"
    >
      <span className="sr-only" role="status">
        Une toupie tourne pendant l'enregistrement.
      </span>
      <svg viewBox="0 0 120 130" className="size-24" aria-hidden>
        <ellipse cx="60" cy="118" rx="26" ry="5" fill="#000" opacity="0.25" />
        <g ref={ref}>
          <g data-body>
            <rect x="56" y="10" width="8" height="26" rx="3" fill="#8c8f94" />
            <path d="M22 52 Q60 28 98 52 L64 112 Q60 118 56 112 Z" fill="#b9bcc1" />
            <path d="M22 52 Q60 70 98 52" fill="none" stroke="#6d7076" strokeWidth="3" />
            <path d="M38 58 L58 108" stroke="#d9dbde" strokeWidth="3" opacity="0.7" />
          </g>
        </g>
      </svg>
    </button>
  );
}
