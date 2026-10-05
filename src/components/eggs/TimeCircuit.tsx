import { useEffect, useState } from "react";
import type { EggEffectProps } from "../../lib/eggs/easterEggs";
import { EggShell, usePrefersReducedMotion } from "./EggShell";

/**
 * Retour vers le futur — au log : la date défile à toute vitesse pendant que le
 * compteur grimpe jusqu'à 88 mph, puis tout revient à la date du jour.
 */
const MONTHS = ["JAN", "FÉV", "MAR", "AVR", "MAI", "JUN", "JUL", "AOÛ", "SEP", "OCT", "NOV", "DÉC"];

function fmt(d: Date) {
  return {
    m: MONTHS[d.getMonth()],
    d: String(d.getDate()).padStart(2, "0"),
    y: String(d.getFullYear()),
  };
}

export default function TimeCircuit({ onDone, durationMs }: EggEffectProps) {
  const reduced = usePrefersReducedMotion();
  const today = new Date();
  const [shown, setShown] = useState(fmt(today));
  const [mph, setMph] = useState(0);
  const [phase, setPhase] = useState<"run" | "back">("run");

  useEffect(() => {
    if (reduced) {
      setMph(88);
      return;
    }
    const start = performance.now();
    const run = durationMs * 0.62;
    let raf = 0;
    const tick = (now: number) => {
      const t = now - start;
      if (t < run) {
        const p = t / run;
        setMph(Math.min(88, Math.round(88 * Math.pow(p, 0.7))));
        const r = new Date(1885 + Math.random() * 230, (Math.random() * 12) | 0, 1 + ((Math.random() * 28) | 0));
        setShown(fmt(r));
        raf = requestAnimationFrame(tick);
      } else {
        setMph(88);
        setShown(fmt(today));
        setPhase("back");
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationMs, reduced]);

  return (
    <EggShell onClose={() => onDone()} announce="Surprise : voyage dans le temps express, retour à aujourd'hui.">
      <div className="absolute inset-0 bg-black/55" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute left-1/2 top-1/2 w-[min(94vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-[10px] border border-[#5c5f63] bg-[#2a2c2f] p-5 shadow-[0_30px_60px_-20px_rgba(0,0,0,.7)]"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#d8d2c4]">Destination</p>
            <div className="mt-2 flex gap-2 font-mono text-3xl tabular-nums md:text-4xl">
              {[shown.m, shown.d, shown.y].map((v, i) => (
                <span key={i} className="rounded-[4px] bg-black px-2 py-1 text-[#ff6a3d]">
                  {v}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#d8d2c4]">mph</p>
            <p className="mt-1 font-display text-6xl tabular-nums text-[#efe5d3]">{mph}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-[#d8d2c4]">
          {phase === "run" ? "Accélération en cours…" : "Retour à aujourd'hui. Ta critique t'attend ici."}
        </p>
      </div>
    </EggShell>
  );
}
