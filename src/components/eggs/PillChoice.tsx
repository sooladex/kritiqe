import { useEffect, useState } from "react";
import type { EggEffectProps } from "../../lib/eggs/easterEggs";
import { RainCanvas } from "./CodeRain";
import { EggShell } from "./EggShell";

/**
 * Matrix — avant de publier : pilule rouge ou bleue. Les deux publient.
 * La rouge déclenche 3 s de pluie de code avant de continuer.
 */
export default function PillChoice({ onDone }: EggEffectProps) {
  const [raining, setRaining] = useState(false);

  useEffect(() => {
    if (!raining) return;
    const t = setTimeout(() => onDone("red"), 3000);
    return () => clearTimeout(t);
  }, [raining, onDone]);

  if (raining) {
    return (
      <EggShell onClose={() => onDone("red")} announce="Pilule rouge. Pluie de code, puis publication.">
        <RainCanvas />
      </EggShell>
    );
  }

  return (
    <EggShell onClose={() => onDone("blue")} announce="Choisis une pilule. Les deux publient ta critique." closeHint={false}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="pill-title"
        className="absolute left-1/2 top-1/2 w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 text-center"
      >
        <h2 id="pill-title" className="font-display text-5xl text-[var(--foreground)]">
          Tu es sûr de toi ?
        </h2>
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">
          Tu publies dans les deux cas. La différence, c'est ce que tu vois avant.
        </p>
        <div className="mt-8 flex justify-center gap-6">
          <button
            autoFocus
            onClick={() => setRaining(true)}
            className="group flex flex-col items-center gap-3"
          >
            <span className="block h-10 w-24 rounded-full bg-gradient-to-b from-[#d4513f] to-[#8f2318] shadow-[inset_0_-6px_0_rgba(0,0,0,.25)] transition-transform group-hover:-translate-y-1" />
            <span className="label !text-[var(--foreground)]">Rouge</span>
          </button>
          <button onClick={() => onDone("blue")} className="group flex flex-col items-center gap-3">
            <span className="block h-10 w-24 rounded-full bg-gradient-to-b from-[#4b6fb8] to-[#1c2b4d] shadow-[inset_0_-6px_0_rgba(0,0,0,.25)] transition-transform group-hover:-translate-y-1" />
            <span className="label !text-[var(--foreground)]">Bleue</span>
          </button>
        </div>
      </div>
    </EggShell>
  );
}
