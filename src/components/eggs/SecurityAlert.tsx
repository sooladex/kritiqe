import type { EggEffectProps } from "../../lib/eggs/easterEggs";
import { EggShell } from "./EggShell";

/**
 * One Battle After Another — après la publication : une « alerte » volontairement
 * de travers, façon mémo tamponné. Oui et Non ferment tous les deux : la critique
 * est déjà enregistrée.
 */
export default function SecurityAlert({ onDone }: EggEffectProps) {
  return (
    <EggShell onClose={() => onDone()} announce="Fausse alerte humoristique. Ta critique est bien publiée." closeHint={false}>
      <div className="absolute inset-0 bg-black/45" />
      <div
        role="alertdialog"
        aria-labelledby="obaa-title"
        aria-describedby="obaa-desc"
        onClick={(e) => e.stopPropagation()}
        className="absolute left-1/2 top-1/2 w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 -rotate-2 rounded-[6px] bg-[#efe5d3] p-6 text-[#2b2018] shadow-[0_30px_60px_-20px_rgba(0,0,0,.6)]"
      >
        <div className="absolute -right-3 -top-4 rotate-12 rounded-[4px] border-2 border-[#f4550a] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#f4550a]">
          Très officiel
        </div>
        <h2 id="obaa-title" className="font-display text-4xl">
          Security Alert
        </h2>
        <p id="obaa-desc" className="mt-3 text-[15px] leading-relaxed">
          Cette critique a été signalée par le Christmas Adventurers Club. Continuer ?
        </p>
        <p className="mt-2 text-xs text-[#6b5a48]">Spoiler : quoi que tu répondes, elle est déjà publiée.</p>
        <div className="mt-6 flex gap-2">
          <button
            autoFocus
            onClick={() => onDone("yes")}
            className="flex-1 rounded-full bg-[#0059ff] px-5 py-3 text-sm font-medium text-white"
          >
            Oui
          </button>
          <button
            onClick={() => onDone("no")}
            className="flex-1 rounded-full border border-[#2b2018]/30 px-5 py-3 text-sm font-medium"
          >
            Non
          </button>
        </div>
      </div>
    </EggShell>
  );
}
