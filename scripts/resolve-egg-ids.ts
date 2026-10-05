/**
 * Remplit les `tmdbId` du registre d'easter eggs à partir de l'API TMDB,
 * via la route /api/tmdb/resolve de kritiq-api (la clé TMDB reste côté serveur).
 *
 *   bun run eggs:resolve            → affiche les IDs trouvés
 *   bun run eggs:resolve --write    → les écrit dans src/lib/eggs/easterEggs.ts
 *
 * Variable optionnelle : KRITIQ_API (par défaut l'API de production).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { EASTER_EGGS } from "../src/lib/eggs/easterEggs";

const API = process.env.KRITIQ_API ?? "https://kritiq-api.vercel.app/api";
const FILE = new URL("../src/lib/eggs/easterEggs.ts", import.meta.url);
const write = process.argv.includes("--write");

let src = readFileSync(FILE, "utf8");
const done = new Set<string>();

for (const egg of EASTER_EGGS) {
  if (egg.type !== "movie" && egg.type !== "tv") continue;
  const key = `${egg.id}`;
  if (done.has(key)) continue;
  done.add(key);
  const url = `${API}/tmdb/resolve?kind=${egg.type}&q=${encodeURIComponent(egg.title)}${egg.year ? `&year=${egg.year}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`✗ ${egg.id}: ${res.status} ${await res.text()}`);
    continue;
  }
  const r = (await res.json()) as { tmdbId: number | null; title?: string; date?: string };
  if (!r.tmdbId) {
    console.warn(`? ${egg.id}: aucun résultat pour « ${egg.title} » (${egg.year ?? "?"})`);
    continue;
  }
  console.log(`✓ ${egg.id}: ${r.tmdbId}  (${r.title}, ${r.date})`);
  // remplace `tmdbId: …` dans le bloc dont l'id correspond
  const re = new RegExp(`(id: "${egg.id}",[\\s\\S]*?tmdbId: )(null|\\d+)`);
  src = src.replace(re, `$1${r.tmdbId}`);
}

if (write) {
  writeFileSync(FILE, src);
  console.log("Registre mis à jour.");
}
