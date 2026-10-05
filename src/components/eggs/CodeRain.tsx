import { useEffect, useRef } from "react";
import type { EggEffectProps } from "../../lib/eggs/easterEggs";
import { EggShell, usePrefersReducedMotion } from "./EggShell";

/** Pluie de code verte, sur canvas. Utilisée par le Konami et par la pilule rouge. */
export function RainCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      c.width = window.innerWidth * dpr;
      c.height = window.innerHeight * dpr;
    };
    resize();
    const size = 16 * dpr;
    const cols = Math.ceil(c.width / size);
    const drops = Array.from({ length: cols }, () => Math.random() * -40);
    const glyphs = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ0123456789KRITQ";
    ctx.font = `${size}px monospace`;
    let raf = 0;
    const draw = () => {
      ctx.fillStyle = "rgba(8, 14, 10, 0.12)";
      ctx.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < cols; i++) {
        const ch = glyphs[(Math.random() * glyphs.length) | 0];
        ctx.fillStyle = Math.random() > 0.96 ? "#d7f5dc" : "#3fa860";
        ctx.fillText(ch, i * size, drops[i] * size);
        if (drops[i] * size > c.height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += reduced ? 0.15 : 1;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [reduced]);

  return <canvas ref={ref} className="absolute inset-0 size-full bg-[#080e0a]" aria-hidden />;
}

export default function CodeRain({ onDone }: EggEffectProps) {
  return (
    <EggShell onClose={() => onDone()} announce="Surprise : pluie de code pendant trois secondes.">
      <RainCanvas />
    </EggShell>
  );
}
