import { useEffect, useRef } from "react";

/**
 * Curseur personnalisé discret : un point crème qui s'agrandit en anneau sur les éléments
 * cliquables. Uniquement sur pointeur fin (souris), jamais au tactile.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const el = dot.current;
    if (!el) return;
    document.documentElement.classList.add("has-cursor");
    let x = -100;
    let y = -100;
    let cx = x;
    let cy = y;
    let raf = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      const t = e.target as Element | null;
      const interactive = t?.closest("a, button, [role=slider], input, textarea, label, [data-cursor=grow]");
      el.dataset.state = interactive ? "grow" : "dot";
      el.style.opacity = "1";
    };
    const hide = () => (el.style.opacity = "0");
    const loop = () => {
      cx += (x - cx) * (reduced ? 1 : 0.28);
      cy += (y - cy) * (reduced ? 1 : 0.28);
      el.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener("pointermove", move);
    document.addEventListener("pointerleave", hide);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", hide);
      document.documentElement.classList.remove("has-cursor");
    };
  }, []);

  return (
    <div
      ref={dot}
      aria-hidden
      data-state="dot"
      className="pointer-events-none fixed left-0 top-0 z-[100] hidden size-2.5 rounded-full bg-[var(--foreground)] opacity-0 mix-blend-difference transition-[width,height,background-color,border] duration-200 [@media(pointer:fine)]:block data-[state=grow]:size-10 data-[state=grow]:border data-[state=grow]:border-[var(--foreground)] data-[state=grow]:bg-transparent"
    />
  );
}
