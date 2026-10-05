import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Post, WorkType } from "../lib/types";
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

      <section id="fil" className="relative mx-auto max-w-[680px] scroll-mt-8 px-4 pt-14 md:box-content md:pl-28 md:pr-6 lg:pl-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-[clamp(52px,11vw,88px)]">Le fil</h2>
          <div className="flex gap-1 rounded-full border border-[var(--line)] p-1" role="tablist" aria-label="Tri du fil">
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

        <div className="border-b border-[var(--line)]">
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
