import type { EggEffectProps } from "../../lib/eggs/easterEggs";
import { EggShell } from "./EggShell";

/**
 * Catch Me If You Can — après la publication : avis de recherche avec la photo de profil
 * TMDB de l'acteur principal (premier nom du casting renvoyé par l'API).
 */
export default function WantedPoster({ work, onDone }: EggEffectProps) {
  const lead = work?.cast?.[0];

  return (
    <EggShell onClose={() => onDone()} announce="Avis de recherche humoristique. Ta critique est bien publiée.">
      <div className="absolute inset-0 bg-black/50" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute left-1/2 top-1/2 w-[min(88vw,360px)] -translate-x-1/2 -translate-y-1/2 rotate-[1.5deg] bg-[#e8dcc4] px-6 pb-6 pt-5 text-center text-[#241a12] shadow-[0_30px_60px_-20px_rgba(0,0,0,.65)]"
        style={{ animation: "wanted-in 520ms cubic-bezier(.2,.9,.2,1)" }}
      >
        <div className="absolute left-1/2 top-2 size-3 -translate-x-1/2 rounded-full bg-[#7a6a55]" />
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.3em]">FBI · avis de recherche</p>
        <h2 className="mt-2 font-display text-[44px] leading-[0.86]">Have you seen this man?</h2>
        <div className="mx-auto mt-4 aspect-[3/4] w-40 overflow-hidden border-4 border-[#241a12] bg-[#cdbd9f]">
          {lead?.profileUrl ? (
            <img
              src={lead.profileUrl}
              alt={`Photo de ${lead.name}`}
              className="size-full object-cover grayscale contrast-125 sepia-[.35]"
            />
          ) : (
            <svg viewBox="0 0 80 100" className="size-full" aria-hidden>
              <circle cx="40" cy="36" r="18" fill="#241a12" opacity=".75" />
              <path d="M8 100 Q12 64 40 62 Q68 64 72 100 Z" fill="#241a12" opacity=".75" />
            </svg>
          )}
        </div>
        {lead && <p className="mt-3 text-sm font-semibold uppercase tracking-[0.12em]">{lead.name}</p>}
        <p className="mt-2 text-[14px] leading-snug">
          Recherché pour s'être fait passer pour un pilote, un médecin et un avocat.
        </p>
        <button
          autoFocus
          onClick={() => onDone()}
          className="mt-5 rounded-full bg-[#241a12] px-5 py-2.5 text-sm font-medium text-[#e8dcc4]"
        >
          Je n'ai rien vu
        </button>
      </div>
      <style>{`@keyframes wanted-in { from { transform: translate(-50%,-40%) rotate(-8deg); opacity: 0 } }`}</style>
    </EggShell>
  );
}
