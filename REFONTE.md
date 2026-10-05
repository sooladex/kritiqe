# Refonte Kritiq — octobre 2026

## A. Direction artistique « objet réel »

- **Palette** : celle d'origine de Kritiq. Fond bleu nuit `#030923`, surfaces `#041a53` et `#0b2a78`, bleu `#0059ff` pour les actions, orange `#f4550a` pour les notes et valeurs, texte blanc, gris-bleu `#7c8ac4`. Les tokens sont dans `src/styles.css`, et un grain léger s'applique sur toute l'app.
- **Typo** : Inter Tight 800 pour les titres (utilitaire `font-display`), Inter pour le texte, capitales espacées 11 px (utilitaire `label`).
- **Hero 3D** (`src/components/hero/`) : React Three Fiber, drei, postprocessing (grain, vignette, profondeur de champ sur desktop), GSAP ScrollTrigger et Lenis.
  - Visiteur déconnecté : intro de 2,4 s passable au clic, puis un récit en 3 sections. Le vinyle devient un ticket, puis un livre.
  - Membre connecté : hero compact, puis directement le fil.
  - L'intro n'est jouée qu'une fois par session. Le mouvement réduit est respecté, avec un repli CSS sans WebGL.
  - Pour passer à un vrai modèle 3D : renseigner `MODEL_URL` dans `Scene.tsx` (fichier .glb Draco dans `public/models/`).
- **Pages internes** : même palette et même typo, micro-animations, aucune scène 3D. Curseur personnalisé et hover magnétique sur les boutons principaux.
- **Notation** : 5 étoiles avec demi-points. L'API garde l'échelle 1–10 (1 = ½ étoile). La moyenne est affichée sur 5.

## B. Easter eggs

- Registre unique : `src/lib/eggs/easterEggs.ts`. Moteur : `src/lib/eggs/EggProvider.tsx`. Effets chargés à la demande : `src/components/eggs/`.
- **Déclencheurs** :

  | Déclencheur | Quand il se déclenche |
  |---|---|
  | `on_open` | ouverture d'une fiche |
  | `tap_x3` | 3 taps sur l'affiche |
  | `on_save` | pendant l'enregistrement d'une note |
  | `on_rate` | note enregistrée |
  | `before_log` | juste avant de publier une critique |
  | `on_log` | critique publiée |
  | `konami` | code Konami, n'importe où |
  | `date` | jour précis, au chargement |

- **Rareté** : chaque egg a une probabilité au premier passage (`rarity`). Un egg déjà vu revient avec une probabilité ×0,35.
- **Mémoire** :
  - Connecté : en base (`/api/eggs/state`, `/api/eggs/:id/seen`, `PATCH /api/users/me/prefs`).
  - Déconnecté : dans le navigateur.
- **Réglage** : interrupteur « Surprises » dans Profil → Paramètres, activé par défaut.
- **IDs TMDB** : ils ne sont jamais devinés. Une fois la clé TMDB configurée sur l'API, lancer `bun run eggs:resolve --write`. En attendant, le rattachement se fait par titre et année (titres FR compris).

## API (`server/kritiq-api/`)

- Hébergée sur le projet Vercel `kritiq-api` (région fra1), adresse `https://kritiq-api.vercel.app/api`.
- Base Postgres Neon `kritiq` (aws-eu-central-1, Francfort). Remplace l'ancienne base JSON sur Railway.
- Variables (projet Vercel `kritiq-api`) : `DATABASE_URL`, `JWT_SECRET` (obligatoires), `TMDB_API_KEY` (facultative : affiches, casting, IDs des easter eggs).
- Routes inchangées par rapport à l'ancienne API, plus : enrichissement TMDB, `myRating` sur `GET /works/:id`, `/api/tmdb/resolve`, `/api/eggs/state`, `/api/eggs/:id/seen`, `PATCH /api/users/me/prefs`.
- Mots de passe chiffrés avec scrypt. L'API refuse de répondre sans `JWT_SECRET`.
