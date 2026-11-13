import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Post, Work, WorkType } from "../lib/types";
import { WORK_TYPE_LABEL } from "../lib/types";
import { WORK_TYPES } from "../lib/types";
import { AppShell } from "../components/AppShell";
import { PostCard } from "../components/PostCard";
import { PostSkeleton } from "../components/Skeletons";
import { EmptyState } from "../components/EmptyState";
import { useAuth } from "../lib/auth";

// La 3D ne se charge que dans le navigateur, et uniquement sur cette page.
const Hero = lazy(() => import("../components/hero/Hero"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fil — kritiq" },
      { name: "description", content: "Le fil des critiques kritiq." },
      { property: "og:title", content: "Fil — kritiq" },
      { property: "og:description", content: "Le fil des critiques kritiq." },
    ],
  }),
  component: Index,
});

function Index() {
  const { token, openAuth } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<"pourtoi" | "abonnements">("pourtoi");
  const [type, setType] = useState<WorkType | "all">(() => {
    if (typeof window === "undefined") return "all";
    return (window.localStorage.getItem("kritiq_feed_type") as WorkType | "all") || "all";
  });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("kritiq_feed_type", type);
    }
  }, [type]);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (type !== "all") p.set("type", type);
    p.set("sort", tab === "pourtoi" ? "top" : "recent");
    return p.toString();
  }, [type, tab]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["posts", type, tab],
    queryFn: () => api<Post[]>(`/posts?${query}`),
  });

  const { data: worksData } = useQuery({
    queryKey: ["works", "top"],
    queryFn: () => api<Work[]>(`/works`),
  });
  const works = worksData ?? [];
  const topWorks = useMemo(() => [...works].sort((x, y) => (y.avg ?? 0) - (x.avg ?? 0)), [works]);

  const loggedIn = mounted && (token ?? (typeof window !== "undefined" ? window.localStorage.getItem("kritiq_token") : null));

  return (
    <AppShell wide>
      <div className="mx-auto max-w-none">
        {mounted ? (
          <Suspense fallback={<HeroPlaceholder />}>
            <Hero
              key={loggedIn ? "compact" : "story"}
              mode={loggedIn ? "compact" : "story"}
              onSignup={() => openAuth("Crée ton compte pour noter et critiquer.")}
            />
          </Suspense>
        ) : (
          <HeroPlaceholder />
        )}
      </div>

      <div className="mx-auto grid max-w-[1400px] gap-6 px-4 pt-10 md:pl-28 md:pr-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <Featured works={works} />

          {works.length > 0 && (
            <section className="mt-10">
              <div className="mb-4 flex items-end justify-between gap-4">
                <h2 className="font-display text-3xl md:text-4xl">Œuvres à la une</h2>
                <Link to="/rankings" className="glass rounded-full px-4 py-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                  Classement
                </Link>
              </div>
              <div className="shelf -mx-1">
                {works.slice(0, 18).map((w) => (
                  <WorkPoster key={w.id} work={w} />
                ))}
              </div>
            </section>
          )}

      <section id="fil" className="relative scroll-mt-8 pt-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-[clamp(44px,8vw,72px)]">Le fil</h2>
          <div className="glass flex gap-1 rounded-full p-1" role="tablist" aria-label="Tri du fil">
            <TabBtn active={tab === "pourtoi"} onClick={() => setTab("pourtoi")}>
              Pour toi
            </TabBtn>
            <TabBtn
              active={tab === "abonnements"}
              onClick={() => {
                if (!token) {
                  openAuth("Connecte-toi pour voir tes abonnements.");
                  return;
                }
                setTab("abonnements");
              }}
            >
              Abonnements
            </TabBtn>
          </div>
        </div>

        <div className="mb-4 -mx-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
          <div className="flex w-max gap-x-5 gap-y-2">
            <Chip active={type === "all"} onClick={() => setType("all")}>
              Tout
            </Chip>
            {WORK_TYPES.map((t) => (
              <Chip key={t.value} active={type === t.value} onClick={() => setType(t.value)}>
                {t.label}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          {isLoading && Array.from({ length: 4 }).map((_, i) => <PostSkeleton key={i} />)}

          {error && (
            <div className="border-t border-[var(--line)] pt-6">
              <EmptyState
                title="Fil indisponible"
                message={error instanceof Error ? error.message : "Impossible de charger le fil."}
              />
            </div>
          )}

          {data && data.length === 0 && (
            <div className="border-t border-[var(--line)] py-6">
              <EmptyState
                title="Rien à lire"
                message="Personne n'a encore publié dans cette catégorie. La première critique peut être la tienne."
              />
            </div>
          )}

          {data && data.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      </section>
        </div>

        <aside className="hidden xl:block">
          <div className="glass sticky top-6 rounded-[1.75rem] p-5">
            <p className="text-lg font-bold">Les mieux notées 🔥</p>
            <p className="text-xs text-[var(--muted-foreground)]">Moyenne de la communauté</p>
            <div className="mt-4 space-y-3">
              {topWorks.slice(0, 6).map((w) => (
                <Link
                  key={w.id}
                  to="/works/$id"
                  params={{ id: w.id }}
                  className="group relative block h-24 overflow-hidden rounded-2xl bg-[var(--surface)]"
                >
                  {(w.backdropUrl || w.posterUrl) && (
                    <img
                      src={(w.backdropUrl || w.posterUrl)!}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover transition duration-700 group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#030923] via-[#030923]/40 to-transparent" />
                  <div className="absolute inset-x-3 bottom-2.5 flex items-end justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{w.title}</span>
                    {w.avg != null && (
                      <span className="glass shrink-0 rounded-full px-2 py-0.5 text-[11px] text-[var(--value)]">
                        ★ {(w.avg / 2).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function HeroPlaceholder() {
  return (
    <div className="relative h-[82vh] min-h-[540px] bg-[#030923]">
      <div className="absolute inset-x-0 bottom-0 px-5 pb-24 md:px-8 md:pb-10">
        <h1 className="font-display text-[clamp(84px,19vw,300px)] opacity-0">Kritiq</h1>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        active ? "bg-[var(--primary)] text-white" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      }`}
    >
      {children}
    </button>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`relative shrink-0 py-1.5 text-sm transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-[2px] after:origin-left after:bg-[var(--primary)] after:transition-transform ${
        active
          ? "text-[var(--foreground)] after:scale-x-100"
          : "text-[var(--muted-foreground)] after:scale-x-0 hover:text-[var(--foreground)]"
      }`}
    >
      {children}
    </button>
  );
}

/** Bandeau vedette : l'œuvre la plus commentée, image en plein cadre. */
function Featured({ works }: { works: Work[] }) {
  const picks = useMemo(() => works.filter((w) => w.backdropUrl || w.posterUrl).slice(0, 5), [works]);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (picks.length < 2) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % picks.length), 7000);
    return () => window.clearInterval(t);
  }, [picks.length]);
  if (!picks.length) return null;
  const w = picks[Math.min(i, picks.length - 1)];
  const img = (x: Work) => (x.backdropUrl || x.posterUrl)!;

  return (
    <section className="glass relative overflow-hidden rounded-[2rem]">
      <div className="relative h-[400px] md:h-[440px]">
        {picks.map((p, n) => (
          <img
            key={p.id}
            src={img(p)}
            alt=""
            aria-hidden={n !== i}
            className={`absolute inset-0 size-full object-cover transition-all duration-[1200ms] ${
              p.backdropUrl ? "" : "scale-110 blur-2xl"
            } ${n === i ? "opacity-100" : "opacity-0"}`}
          />
        ))}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(3_9_35/0.95)_0%,rgb(3_9_35/0.55)_50%,transparent_80%)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#030923]/90 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
          <span className="glass mb-4 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-[11px]">
            <span className="size-1.5 rounded-full bg-[var(--value)]" /> À la une · {WORK_TYPE_LABEL[w.type]}
          </span>
          <h2 key={w.id} className="max-w-[14ch] font-display text-[clamp(44px,7vw,84px)] animate-in fade-in slide-in-from-bottom-4 duration-700">
            {w.title}
          </h2>
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">
            {[w.year, w.avg != null ? `★ ${(w.avg / 2).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}` : null, w.ratingsCount ? `${w.ratingsCount} notes` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <Link
              to="/works/$id"
              params={{ id: w.id }}
              className="rounded-full bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgb(0_89_255/0.9)]"
            >
              Noter
            </Link>
            <Link to="/compose" className="glass grid size-10 place-items-center rounded-full text-lg" aria-label="Écrire une critique">
              +
            </Link>
          </div>
        </div>
        <div className="absolute right-6 bottom-6 hidden gap-2 lg:flex">
          {picks.map((p, n) => (
            <button
              key={p.id}
              onClick={() => setI(n)}
              aria-label={p.title}
              className={`h-14 w-24 overflow-hidden rounded-xl border-2 transition ${n === i ? "border-[var(--value)]" : "border-white/10 opacity-60 hover:opacity-100"}`}
            >
              <img src={img(p)} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkPoster({ work: w }: { work: Work }) {
  const src = w.posterUrl || w.backdropUrl;
  return (
    <Link to="/works/$id" params={{ id: w.id }} className="group block w-40 md:w-44">
      <div className="relative aspect-[2/3] overflow-hidden rounded-[1.25rem] border border-white/10 bg-[var(--surface)]">
        {src ? (
          <img src={src} alt="" loading="lazy" className="size-full object-cover transition duration-700 group-hover:scale-105" />
        ) : (
          <div className="grid size-full place-items-center p-3 text-center font-display text-xl">{w.title}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#030923]/90 via-transparent to-transparent" />
        <span className="glass absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider">
          {WORK_TYPE_LABEL[w.type]}
        </span>
        <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
          <span className="truncate text-sm font-semibold">{w.title}</span>
          {w.avg != null && <span className="shrink-0 text-xs text-[var(--value)]">★ {(w.avg / 2).toFixed(1)}</span>}
        </div>
      </div>
    </Link>
  );
}
