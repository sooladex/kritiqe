import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { Work } from "../types";

/**
 * Registre unique des easter eggs Kritiq.
 *
 * Règles :
 *  - un egg ne bloque jamais l'action en cours, ne spoile rien et se ferme en un clic ;
 *  - `tmdbId` vient de l'API TMDB (via `bun run eggs:resolve`), jamais deviné. Tant qu'il vaut
 *    `null`, l'egg se rattache à l'œuvre par titre + année (repli) ;
 *  - `rarity` = probabilité au premier passage. Un egg déjà vu revient plus rarement (×0,35).
 */

export type EggKind = "movie" | "tv" | "album" | "person";

export type EggTrigger =
  | "on_open" // ouverture d'une fiche
  | "on_rate" // note enregistrée
  | "on_save" // pendant l'enregistrement de la note
  | "on_log" // critique publiée (le « log » de Kritiq)
  | "before_log" // juste avant de publier (l'action continue quel que soit le choix)
  | "tap_x3" // 3 taps rapides sur l'affiche / le titre
  | "konami" // ↑ ↑ ↓ ↓ ← → ← → B A, n'importe où
  | "date"; // un jour précis de l'année, au chargement

/** `overlay` = composant plein écran temporaire ; `variant` = remplace un élément d'UI (la notation). */
export type EggPresentation = "overlay" | "variant";

export interface EggEffectProps {
  work: Work | null;
  /** À appeler pour fermer l'egg (clic, Échap, ou fin de l'animation). */
  onDone: (result?: unknown) => void;
  durationMs: number;
}

export interface EasterEgg {
  id: string;
  title: string; // titre de l'œuvre, sert aussi de repli pour le rattachement
  year?: number;
  tmdbId: number | null;
  type: EggKind;
  trigger: EggTrigger;
  /** Pour `date` : "MM-JJ". */
  date?: string;
  presentation: EggPresentation;
  effect?: LazyExoticComponent<ComponentType<EggEffectProps>>;
  durationMs: number;
  rarity: number;
}

export const EASTER_EGGS: EasterEgg[] = [
  {
    id: "beetlejuice-tap",
    title: "Beetlejuice",
    year: 1988,
    tmdbId: null,
    type: "movie",
    trigger: "tap_x3",
    presentation: "overlay",
    effect: lazy(() => import("../../components/eggs/GhostRise")),
    durationMs: 5000,
    rarity: 1,
  },
  {
    id: "obaa-alert",
    title: "One Battle After Another",
    year: 2025,
    tmdbId: null,
    type: "movie",
    trigger: "on_log",
    presentation: "overlay",
    effect: lazy(() => import("../../components/eggs/SecurityAlert")),
    durationMs: 0, // reste ouvert jusqu'au clic
    rarity: 1,
  },
  {
    id: "coraline-buttons",
    title: "Coraline",
    year: 2009,
    tmdbId: null,
    type: "movie",
    trigger: "on_open",
    presentation: "variant", // la notation passe en boutons cousus (voir StarRating)
    durationMs: 0,
    rarity: 1,
  },
  {
    id: "inception-top",
    title: "Inception",
    year: 2010,
    tmdbId: null,
    type: "movie",
    trigger: "on_save",
    presentation: "overlay",
    effect: lazy(() => import("../../components/eggs/SpinningTop")),
    durationMs: 7000,
    rarity: 1,
  },
  {
    id: "catchme-wanted",
    title: "Catch Me If You Can",
    year: 2002,
    tmdbId: null,
    type: "movie",
    trigger: "on_log",
    presentation: "overlay",
    effect: lazy(() => import("../../components/eggs/WantedPoster")),
    durationMs: 0,
    rarity: 1,
  },
  // ---- Propositions supplémentaires ----
  {
    id: "matrix-pills",
    title: "The Matrix",
    year: 1999,
    tmdbId: null,
    type: "movie",
    trigger: "before_log",
    presentation: "overlay",
    effect: lazy(() => import("../../components/eggs/PillChoice")),
    durationMs: 0,
    rarity: 1,
  },
  {
    id: "matrix-konami",
    title: "The Matrix",
    year: 1999,
    tmdbId: null,
    type: "movie",
    trigger: "konami",
    presentation: "overlay",
    effect: lazy(() => import("../../components/eggs/CodeRain")),
    durationMs: 3000,
    rarity: 1,
  },
  {
    id: "shining-crack",
    title: "The Shining",
    year: 1980,
    tmdbId: null,
    type: "movie",
    trigger: "on_open",
    presentation: "overlay",
    effect: lazy(() => import("../../components/eggs/DoorCrack")),
    durationMs: 2600,
    rarity: 0.35,
  },
  {
    id: "bttf-88",
    title: "Back to the Future",
    year: 1985,
    tmdbId: null,
    type: "movie",
    trigger: "on_log",
    presentation: "overlay",
    effect: lazy(() => import("../../components/eggs/TimeCircuit")),
    durationMs: 3600,
    rarity: 1,
  },
  {
    // 21 octobre : le jour où Marty arrive dans le futur. Une fois par an, au chargement.
    id: "bttf-date",
    title: "Back to the Future Part II",
    year: 1989,
    tmdbId: null,
    type: "movie",
    trigger: "date",
    date: "10-21",
    presentation: "overlay",
    effect: lazy(() => import("../../components/eggs/TimeCircuit")),
    durationMs: 3600,
    rarity: 1,
  },
];

// Titres alternatifs FR fréquents, pour le rattachement par titre.
const ALIASES: Record<string, string[]> = {
  "catch me if you can": ["arrete moi si tu peux"],
  "the matrix": ["matrix"],
  "the shining": ["shining"],
  "back to the future": ["retour vers le futur"],
  "one battle after another": ["une bataille apres l'autre"],
  inception: ["origine"],
};

export function normalizeTitle(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+[—-]\s+s\d+.*$/i, "")
    .replace(/[^a-z0-9' ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function eggMatchesWork(egg: EasterEgg, work: Work | null): boolean {
  if (!work) return false;
  if (egg.tmdbId != null && work.tmdbId != null) return egg.tmdbId === work.tmdbId;
  const wt = normalizeTitle(work.title);
  const base = normalizeTitle(egg.title);
  const names = [base, ...(ALIASES[base] ?? [])];
  if (!names.includes(wt)) return false;
  // Si les deux années sont connues, elles doivent concorder (évite les remakes).
  if (egg.year && work.year) return Math.abs(egg.year - work.year) <= 1;
  return true;
}

export function eggsFor(trigger: EggTrigger, work: Work | null): EasterEgg[] {
  return EASTER_EGGS.filter(
    (e) => e.trigger === trigger && (trigger === "konami" || trigger === "date" || eggMatchesWork(e, work)),
  );
}
