import { useEffect, useState, type ReactNode } from "react";

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/**
 * Coque commune des eggs : couche plein écran, fermeture au clic n'importe où (ou Échap,
 * géré par le provider), annonce discrète pour les lecteurs d'écran.
 * `passThrough` laisse la page utilisable dessous (l'egg ne bloque jamais rien).
 */
export function EggShell({
  children,
  onClose,
  announce,
  passThrough = false,
  closeHint = true,
}: {
  children: ReactNode;
  onClose: () => void;
  announce: string;
  passThrough?: boolean;
  closeHint?: boolean;
}) {
  return (
    <div
      className={`fixed inset-0 z-[80] ${passThrough ? "pointer-events-none" : ""}`}
      onClick={passThrough ? undefined : onClose}
    >
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
      {children}
      {closeHint && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="label pointer-events-auto absolute right-4 top-4 rounded-full bg-[var(--background)]/80 px-3 py-2 !text-[var(--foreground)] backdrop-blur"
        >
          Fermer
        </button>
      )}
    </div>
  );
}
