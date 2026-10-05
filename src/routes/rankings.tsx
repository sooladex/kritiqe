import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { LeaderboardEntry, Work } from "../lib/types";
import { WORK_TYPE_LABEL } from "../lib/types";
import { AppShell, PageHeader } from "../components/AppShell";
import { LineSkeleton } from "../components/Skeletons";
import { EmptyState } from "../components/EmptyState";
import { useAuth } from "../lib/auth";

export const Route = createFileRoute("/rankings")({
  head: () => ({
    meta: [
      { title: "Classements — kritiq" },
      { name: "description", content: "Les œuvres et les membres les mieux classés sur kritiq." },
      { property: "og:title", content: "Classements — kritiq" },
      { property: "og:description", content: "Œuvres et membres au sommet." },
    ],
  }),
  component: RankingsPage,
});

function RankingsPage() {
  const [tab, setTab] = useState<"works" | "members">("works");

  return (
    <AppShell>
      <PageHeader title="Classements" intro="Les œuvres les mieux notées, et les membres qui notent le plus." />

      <div className="mb-8 inline-flex gap-1 rounded-full border border-[var(--line)] p-1" role="tablist">
        {(
          [
            ["works", "Œuvres"],
            ["members", "Membres"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`rounded-full px-5 py-2 text-sm font-medium ${
              tab === k ? "bg-[var(--primary)] text-white" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "works" ? <WorksBoard /> : <MembersBoard />}
    </AppShell>
  );
}

function WorksBoard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["works", "top"],
    queryFn: () => api<Work[]>(`/works`),
  });
  if (isLoading)
    return (
      <div>
        {Array.from({ length: 6 }).map((_, i) => (
          <LineSkeleton key={i} />
        ))}
      </div>
    );
  if (error) return <EmptyState title="Classement indisponible" message={(error as Error).message} />;
  const sorted = [...(data ?? [])].sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));
  if (sorted.length === 0) return <EmptyState title="Vide" message="Aucune œuvre à classer pour le moment." />;
  return (
    <ol className="border-b border-[var(--line)]">
      {sorted.slice(0, 50).map((w, i) => (
        <li key={w.id} className="border-t border-[var(--line)]">
          <Link to="/works/$id" params={{ id: w.id }} className="group flex items-center gap-5 py-4">
            <span
              className={`w-14 font-display tabular-nums ${i < 3 ? "text-5xl text-[var(--primary)]" : "text-3xl text-[var(--muted-foreground)]"}`}
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-2xl group-hover:text-[var(--primary)]">{w.title}</div>
              <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                {WORK_TYPE_LABEL[w.type]}, {w.ratingsCount ?? 0} note{(w.ratingsCount ?? 0) > 1 ? "s" : ""}
              </div>
            </div>
            <span className="font-display text-3xl tabular-nums">
              {w.avg != null ? (w.avg / 2).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) : <span className="font-sans text-sm text-[var(--muted-foreground)]">Pas de note</span>}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

function MembersBoard() {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => api<LeaderboardEntry[]>(`/users/leaderboard`),
  });

  if (isLoading)
    return (
      <div>
        {Array.from({ length: 6 }).map((_, i) => (
          <LineSkeleton key={i} />
        ))}
      </div>
    );
  if (error) return <EmptyState title="Classement indisponible" message={(error as Error).message} />;
  if (!data || data.length === 0) return <EmptyState title="Vide" message="Personne au tableau pour l'instant." />;

  const me = data.find((e) => e.username === user?.username);

  return (
    <div>
      {me && (
        <div className="mb-6 rounded-[10px] bg-[var(--ink)] px-5 py-4">
          <p className="label !text-[var(--foreground)]/70">Ta place</p>
          <MemberRow entry={me} highlight />
        </div>
      )}
      <ol className="border-b border-[var(--line)]">
        {data.map((e) => (
          <li key={e.username} className="border-t border-[var(--line)] py-4">
            <MemberRow entry={e} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function MemberRow({ entry, highlight }: { entry: LeaderboardEntry; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-5">
      <span
        className={`w-14 font-display tabular-nums ${
          entry.rank <= 3 ? "text-5xl text-[var(--primary)]" : highlight ? "text-3xl" : "text-3xl text-[var(--muted-foreground)]"
        }`}
      >
        {entry.rank}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{entry.username}</div>
        {entry.level && <div className="text-xs text-[var(--muted-foreground)]">{entry.level}</div>}
      </div>
      <span className="font-display text-2xl tabular-nums">
        {entry.points}
        <span className="ml-1 text-sm text-[var(--muted-foreground)]">pts</span>
      </span>
    </div>
  );
}
