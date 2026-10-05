import type { EggEffectProps } from "../../lib/eggs/easterEggs";
import { EggShell, usePrefersReducedMotion } from "./EggShell";

/**
 * The Shining — à l'ouverture de la fiche (pas à chaque fois) : la page se fend comme
 * une porte de bois défoncée, puis les éclats retombent. Laisse la page utilisable.
 */
const CRACKS = [
  "M50 50 L44 30 L47 18 L41 0",
  "M50 50 L58 34 L55 20 L62 6",
  "M50 50 L30 46 L18 50 L0 44",
  "M50 50 L70 54 L84 49 L100 56",
  "M50 50 L46 66 L52 80 L47 100",
  "M50 50 L62 64 L74 70 L86 88",
  "M50 50 L36 60 L24 72 L10 84",
  "M50 50 L64 42 L80 32 L94 18",
];

export default function DoorCrack({ onDone, durationMs }: EggEffectProps) {
  const reduced = usePrefersReducedMotion();
  return (
    <EggShell onClose={() => onDone()} announce="Surprise : la page se fissure un instant." passThrough closeHint={false}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
        style={{ animation: reduced ? undefined : `crack-out ${durationMs}ms ease-in forwards` }}
        aria-hidden
      >
        <polygon points="50,50 44,30 58,34" fill="#120c08" style={{ animation: "crack-hole 300ms 120ms both" }} />
        <polygon points="50,50 58,34 64,42 70,54" fill="#120c08" style={{ animation: "crack-hole 300ms 260ms both" }} />
        {CRACKS.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="#120c08"
            strokeWidth={0.7}
            vectorEffect="non-scaling-stroke"
            pathLength={1}
            style={{
              strokeWidth: 3,
              strokeDasharray: 1,
              strokeDashoffset: reduced ? 0 : 1,
              animation: reduced ? undefined : `crack-draw 380ms ${i * 45}ms cubic-bezier(.3,.9,.3,1) forwards`,
            }}
          />
        ))}
      </svg>
      <style>{`
        @keyframes crack-draw { to { stroke-dashoffset: 0 } }
        @keyframes crack-hole { from { opacity: 0; transform: scale(.4); transform-origin: 50% 50% } }
        @keyframes crack-out { 0%, 75% { opacity: 1 } 100% { opacity: 0 } }
      `}</style>
    </EggShell>
  );
}
