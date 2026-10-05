import { useEffect } from "react";
import type { EggEffectProps } from "../../lib/eggs/easterEggs";
import { EggShell, usePrefersReducedMotion } from "./EggShell";

/**
 * Beetlejuice — 3 taps sur l'affiche : la page passe en noir et blanc et une main
 * fantomatique (dessin original) surgit du bas de l'écran.
 */
export default function GhostRise({ onDone, durationMs }: EggEffectProps) {
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("egg-grayscale");
    return () => root.classList.remove("egg-grayscale");
  }, []);

  return (
    <EggShell onClose={() => onDone()} announce="Surprise : la page passe en noir et blanc quelques secondes.">
      <div
        className="absolute bottom-0 left-1/2 w-[min(70vw,340px)] -translate-x-1/2"
        style={{
          animation: reduced ? undefined : `ghost-rise ${durationMs}ms cubic-bezier(.2,.9,.2,1) forwards`,
        }}
      >
        <svg viewBox="0 0 200 260" className="w-full" aria-hidden>
          {/* poignet en lambeaux */}
          <path
            d="M58 260 L62 170 Q64 150 72 140 L128 140 Q136 150 138 170 L142 260 Z"
            fill="#e9e4da"
          />
          <path d="M58 200 l10 -8 l8 10 l10 -9 l10 10 l10 -9 l10 9 l10 -8 l10 9 l4 -4" stroke="#030923" strokeWidth="3" fill="none" />
          {/* paume */}
          <path d="M70 146 Q60 110 72 92 L128 92 Q142 112 130 146 Z" fill="#f1ede5" />
          {/* doigts longs, légèrement tordus */}
          <path d="M74 98 Q66 60 70 30 Q74 18 80 30 Q84 62 86 96" fill="#f1ede5" />
          <path d="M90 94 Q88 46 94 12 Q100 2 104 14 Q106 50 104 94" fill="#f1ede5" />
          <path d="M108 94 Q112 52 120 24 Q127 14 130 28 Q124 62 120 98" fill="#f1ede5" />
          <path d="M124 104 Q138 80 150 66 Q158 60 158 72 Q146 96 132 120" fill="#f1ede5" />
          <path d="M70 120 Q50 104 40 86 Q36 76 46 78 Q60 96 76 110" fill="#f1ede5" />
          {/* ongles sombres */}
          <circle cx="76" cy="30" r="4" fill="#030923" />
          <circle cx="99" cy="13" r="4" fill="#030923" />
          <circle cx="126" cy="25" r="4" fill="#030923" />
          <circle cx="153" cy="68" r="4" fill="#030923" />
          <circle cx="43" cy="81" r="4" fill="#030923" />
        </svg>
      </div>
      <p className="label absolute bottom-6 left-6 !text-[var(--foreground)]">Trois fois, c'était une de trop.</p>
      <style>{`
        @keyframes ghost-rise {
          0% { transform: translate(-50%, 100%) rotate(-4deg); }
          18% { transform: translate(-50%, 8%) rotate(3deg); }
          30% { transform: translate(-50%, 14%) rotate(-2deg); }
          80% { transform: translate(-50%, 10%) rotate(1deg); }
          100% { transform: translate(-50%, 105%) rotate(-3deg); }
        }
      `}</style>
    </EggShell>
  );
}
