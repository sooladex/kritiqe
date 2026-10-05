import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, ApiError } from "../lib/api";
import type { Community } from "../lib/types";
import { AppShell, PageHeader } from "../components/AppShell";
import { LineSkeleton } from "../components/Skeletons";
import { EmptyState } from "../components/EmptyState";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [
      { title: "Messages & communautés — kritiq" },
      { name: "description", content: "Rejoins les communautés kritiq." },
      { property: "og:title", content: "Messages — kritiq" },
      { property: "og:description", content: "Rejoins les communautés kritiq." },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const { requireAuth } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["communities"],
    queryFn: () => api<Community[]>(`/communities`),
  });

  async function toggle(c: Community) {
    if (!requireAuth("Connecte-toi pour rejoindre une communauté.")) return;
    setBusy(c.id);
    try {
      const res = await api<{ joined: boolean }>(`/communities/${c.id}/join`, { method: "POST" });
      qc.setQueryData<Community[]>(["communities"], (old) =>
        old?.map((x) =>
          x.id === c.id
            ? {
                ...x,
                joined: res.joined,
                memberCount: x.memberCount + (res.joined ? 1 : -1),
              }
            : x,
        ),
      );
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Action impossible.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell>
      <PageHeader title="Communautés" intro="Trouve les gens qui partagent tes obsessions." />

      {isLoading && (
        <div>
          {Array.from({ length: 5 }).map((_, i) => (
            <LineSkeleton key={i} />
          ))}
        </div>
      )}

      {error && <EmptyState title="Communautés indisponibles" message={(error as Error).message} />}

      {data && data.length === 0 && (
        <EmptyState title="Bientôt" message="Aucune communauté pour l'instant. Reviens dans quelques jours." />
      )}

      <ul className="border-b border-[var(--line)]">
        {data?.map((c) => (
          <li key={c.id} className="border-t border-[var(--line)] py-5">
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-3xl">{c.name ?? c.slug}</h2>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {c.slug.startsWith("k/") ? c.slug : `k/${c.slug}`}, {c.memberCount} membre{c.memberCount > 1 ? "s" : ""}
                </p>
                {c.description && <p className="mt-2 max-w-[54ch] text-sm text-[var(--foreground)]/85">{c.description}</p>}
              </div>
              <button
                onClick={() => toggle(c)}
                disabled={busy === c.id}
                aria-pressed={c.joined}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
                  c.joined
                    ? "border border-[var(--line)] text-[var(--muted-foreground)]"
                    : "bg-[var(--primary)] text-[var(--primary-foreground)]"
                }`}
              >
                {c.joined ? "Membre" : "Rejoindre"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
