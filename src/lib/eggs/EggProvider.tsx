import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import type { Work } from "../types";
import { eggsFor, type EasterEgg, type EggTrigger } from "./easterEggs";

type Seen = Record<string, { count: number; lastAt: string }>;

interface ActiveEgg {
  egg: EasterEgg;
  work: Work | null;
  resolve?: (result?: unknown) => void;
}

interface EggsState {
  surprises: boolean;
  setSurprises: (on: boolean) => Promise<void>;
  /** Déclenche les eggs liés à ce trigger pour cette œuvre. Résout quand l'egg est fermé
   *  (utile pour `before_log`) ou immédiatement s'il n'y a rien à jouer. */
  fire: (trigger: EggTrigger, work: Work | null) => Promise<unknown>;
  /** Vrai si un egg de type `variant` doit s'appliquer à cette œuvre (tiré une fois par ouverture). */
  variantFor: (eggId: string, work: Work | null) => boolean;
}

const Ctx = createContext<EggsState | null>(null);
const LOCAL_KEY = "kritiq_eggs";
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

function readLocal(): { surprises: boolean; seen: Seen } {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (raw) return { surprises: true, seen: {}, ...JSON.parse(raw) };
  } catch {}
  return { surprises: true, seen: {} };
}
function writeLocal(v: { surprises: boolean; seen: Seen }) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(v));
  } catch {}
}

function chanceFor(egg: EasterEgg, seen: Seen): number {
  const n = seen[egg.id]?.count ?? 0;
  return n === 0 ? egg.rarity : egg.rarity * 0.35;
}

export function EggProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [surprises, setSurprisesState] = useState(true);
  const [seen, setSeen] = useState<Seen>({});
  const [active, setActive] = useState<ActiveEgg | null>(null);
  const seenRef = useRef(seen);
  seenRef.current = seen;
  const surprisesRef = useRef(surprises);
  surprisesRef.current = surprises;
  const activeRef = useRef(active);
  activeRef.current = active;

  // Chargement de l'état : en base si connecté, sinon dans le navigateur.
  useEffect(() => {
    let cancelled = false;
    if (!token) {
      const l = readLocal();
      setSurprisesState(l.surprises);
      setSeen(l.seen);
      return;
    }
    api<{ surprises: boolean; seen: Seen }>("/eggs/state")
      .then((s) => {
        if (cancelled) return;
        setSurprisesState(s.surprises);
        setSeen(s.seen ?? {});
      })
      .catch(() => {
        const l = readLocal();
        if (!cancelled) {
          setSurprisesState(l.surprises);
          setSeen(l.seen);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const markSeen = useCallback(
    (egg: EasterEgg) => {
      const now = new Date().toISOString();
      setSeen((prev) => {
        const next = { ...prev, [egg.id]: { count: (prev[egg.id]?.count ?? 0) + 1, lastAt: now } };
        if (!token) writeLocal({ surprises: surprisesRef.current, seen: next });
        return next;
      });
      if (token) api(`/eggs/${egg.id}/seen`, { method: "POST" }).catch(() => {});
    },
    [token],
  );

  const setSurprises = useCallback(
    async (on: boolean) => {
      setSurprisesState(on);
      if (token) await api("/users/me/prefs", { method: "PATCH", body: { surprises: on } });
      else writeLocal({ surprises: on, seen: seenRef.current });
    },
    [token],
  );

  const fire = useCallback(
    (trigger: EggTrigger, work: Work | null) => {
      if (!surprisesRef.current || activeRef.current) return Promise.resolve();
      const candidates = eggsFor(trigger, work).filter((e) => e.presentation === "overlay");
      const egg = candidates.find((e) => Math.random() < chanceFor(e, seenRef.current));
      if (!egg) return Promise.resolve();
      markSeen(egg);
      return new Promise<unknown>((resolve) => setActive({ egg, work, resolve }));
    },
    [markSeen],
  );

  // Tirage unique par (egg, œuvre) pour les variantes d'UI, mémorisé le temps de la session.
  const variantDraws = useRef(new Map<string, boolean>());
  const variantFor = useCallback(
    (eggId: string, work: Work | null) => {
      if (!surprises || !work) return false;
      const egg = eggsFor("on_open", work).find((e) => e.id === eggId && e.presentation === "variant");
      if (!egg) return false;
      const key = `${eggId}:${work.id}`;
      if (!variantDraws.current.has(key)) {
        const on = Math.random() < chanceFor(egg, seenRef.current);
        variantDraws.current.set(key, on);
        // appelé pendant le rendu : on mémorise « vu » juste après, pas pendant
        if (on) queueMicrotask(() => markSeen(egg));
      }
      return variantDraws.current.get(key) ?? false;
    },
    [surprises, markSeen],
  );

  // Konami, n'importe où.
  useEffect(() => {
    let i = 0;
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      i = key === KONAMI[i] ? i + 1 : key === KONAMI[0] ? 1 : 0;
      if (i === KONAMI.length) {
        i = 0;
        void fire("konami", null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fire]);

  // Eggs datés : une fois par jour au chargement.
  useEffect(() => {
    const t = setTimeout(() => {
      const d = new Date();
      const mmdd = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const egg = eggsFor("date", null).find((e) => e.date === mmdd);
      if (!egg) return;
      const dayKey = `kritiq_egg_day_${egg.id}_${d.getFullYear()}`;
      try {
        if (window.localStorage.getItem(dayKey)) return;
        window.localStorage.setItem(dayKey, "1");
      } catch {}
      if (!surprisesRef.current || activeRef.current) return;
      markSeen(egg);
      setActive({ egg, work: null });
    }, 4000); // après l'intro
    return () => clearTimeout(t);
  }, [markSeen]);

  const close = useCallback((result?: unknown) => {
    const a = activeRef.current;
    setActive(null);
    a?.resolve?.(result);
  }, []);

  // Fermeture automatique pour les eggs à durée fixe, et Échap partout.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    const t = active.egg.durationMs > 0 ? setTimeout(() => close(), active.egg.durationMs) : undefined;
    return () => {
      window.removeEventListener("keydown", onKey);
      if (t) clearTimeout(t);
    };
  }, [active, close]);

  const value = useMemo(() => ({ surprises, setSurprises, fire, variantFor }), [surprises, setSurprises, fire, variantFor]);
  const Effect = active?.egg.effect;

  return (
    <Ctx.Provider value={value}>
      {children}
      {active && Effect && (
        <Suspense fallback={null}>
          <Effect work={active.work} onDone={close} durationMs={active.egg.durationMs} />
        </Suspense>
      )}
    </Ctx.Provider>
  );
}

export function useEggs() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useEggs must be used inside EggProvider");
  return c;
}

/** Détecte 3 taps rapides (< 700 ms) et appelle `onTriple`. */
export function useTripleTap(onTriple: () => void) {
  const taps = useRef<number[]>([]);
  return useCallback(() => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 700), now];
    if (taps.current.length >= 3) {
      taps.current = [];
      onTriple();
    }
  }, [onTriple]);
}
