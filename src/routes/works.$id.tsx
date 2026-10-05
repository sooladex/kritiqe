import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../lib/api";
import type { Work } from "../lib/types";
import { WORK_TYPE_LABEL } from "../lib/types";
import { useAuth } from "../lib/auth";
import { useEggs, useTripleTap } from "../lib/eggs/EggProvider";
import { StarRating } from "../components/StarRating";
import { toast } from "sonner";

export const Route = createFileRoute("/works/$id")({
  component: WorkSheet,
});

function WorkSheet() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { requireAuth } = useAuth();
  const { fire, variantFor } = useEggs();
  const [tab, setTab] = useState<"overview" | "episodes">("overview");
  const [rating, setRating] = useState<number | null>(null);
  const [rateBusy, setRateBusy] = useState(false);
  const lastCommitted = useRef<number | null>(null);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["work", id],
    queryFn: () => api<Work>(`/works/${id}`),
  });

  // Note déjà donnée par le membre, si l'API la renvoie.
  useEffect(() => {
    if (data?.myRating != null) {
      setRating(data.myRating);
      lastCommitted.current = data.myRating;
    }
  }, [data?.myRating]);

  // Egg à l'ouverture de la fiche.
  const openedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!data || openedFor.current === data.id) return;
    openedFor.current = data.id;
    void fire("on_open", data);
  }, [data, fire]);

  const onPosterTap = useTripleTap(() => {
    if (data) void fire("tap_x3", data);
  });

  async function submitRating(value: number, episodeId?: string) {
    if (!requireAuth("Connecte-toi pour noter une œuvre.")) return;
    if (value === lastCommitted.current && !episodeId) return;
    setRateBusy(true);
    void fire("on_save", data ?? null); // pendant l'enregistrement, n'attend pas
    try {
      await api(`/works/${id}/rate`, {
        method: "POST",
        body: { value, ...(episodeId ? { episodeId } : {}) },
      });
      lastCommitted.current = value;
      toast.success(`Note enregistrée : ${(value / 2).toLocaleString("fr-FR")} sur 5.`);
      void fire("on_rate", data ?? null);
      void qc.invalidateQueries({ queryKey: ["work", id] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Notation impossible.");
    } finally {
      setRateBusy(false);
    }
  }

  const buttons = data ? variantFor("coraline-buttons", data) : false;

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-[var(--background)] animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="mx-auto min-h-screen w-full max-w-[980px] px-4 pb-28 pt-6 md:px-8">
        <button
          onClick={() => navigate({ to: "/" })}
          className="mb-10 inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-4 py-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          Retour au fil
        </button>

        {isLoading && (
          <div className="grid animate-pulse gap-8 md:grid-cols-[300px_1fr]">
            <div className="aspect-[2/3] rounded-[10px] bg-[var(--surface)]" />
            <div className="space-y-4">
              <div className="h-20 w-3/4 rounded bg-[var(--surface)]" />
              <div className="h-6 w-1/2 rounded bg-[var(--surface)]" />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-[10px] border border-dashed border-[var(--line)] p-8 text-center">
            <p>{(error as Error).message}</p>
          </div>
        )}

        {data && (
          <div className="grid gap-10 md:grid-cols-[300px_1fr] md:gap-14">
            {/* Affiche (3 taps = surprise possible) */}
            <button
              type="button"
              onClick={onPosterTap}
              aria-label={`Affiche de ${data.title}`}
              className="group relative block aspect-[2/3] w-[58%] max-w-[300px] -rotate-1 md:w-full overflow-hidden rounded-[6px] bg-[var(--surface)] shadow-[0_24px_40px_-24px_rgba(0,0,0,.8)] transition-transform hover:rotate-0"
            >
              {data.posterUrl ? (
                <img src={data.posterUrl} alt="" className="size-full object-cover" />
              ) : (
                <div className="flex size-full flex-col justify-between bg-[var(--ink)] p-5 text-left">
                  <span className="text-5xl" aria-hidden>
                    {data.coverIcon ?? "◆"}
                  </span>
                  <span className="font-display text-4xl leading-[0.9]">{data.title}</span>
                </div>
              )}
            </button>

            <div>
              <p className="label">
                {WORK_TYPE_LABEL[data.type]}
                {data.year ? `, ${data.year}` : ""}
                {data.verified ? ", fiche vérifiée" : ""}
              </p>
              <h1 className="mt-3 font-display text-[clamp(56px,9vw,112px)]">{data.title}</h1>
              {data.subtitle && <p className="mt-4 text-[var(--muted-foreground)]">{data.subtitle}</p>}
              {data.overview && <p className="mt-5 max-w-[60ch] text-[15px] leading-relaxed text-[var(--foreground)]/88">{data.overview}</p>}
              {data.cast && data.cast.length > 0 && (
                <p className="mt-4 max-w-[60ch] text-sm text-[var(--muted-foreground)]">
                  Avec {data.cast.slice(0, 4).map((c) => c.name).join(", ")}.
                </p>
              )}

              <div className="mt-10 flex items-end gap-6 border-t border-[var(--line)] pt-6">
                <div>
                  <p className="label">Moyenne des membres</p>
                  {data.avg != null ? (
                    <p className="mt-2 font-display text-[88px] tabular-nums">
                      {(data.avg / 2).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}
                      <span className="ml-2 text-2xl text-[var(--muted-foreground)]">/ 5</span>
                    </p>
                  ) : (
                    <p className="mt-3 font-display text-4xl text-[var(--muted-foreground)]">Pas encore notée</p>
                  )}
                </div>
                <p className="pb-4 text-sm text-[var(--muted-foreground)]">
                  {data.ratingsCount ?? 0} note{(data.ratingsCount ?? 0) > 1 ? "s" : ""}
                </p>
              </div>

              {data.episodes && data.episodes.length > 0 && (
                <div className="mt-8 inline-flex gap-1 rounded-full border border-[var(--line)] p-1" role="tablist">
                  <button
                    role="tab"
                    aria-selected={tab === "overview"}
                    onClick={() => setTab("overview")}
                    className={`rounded-full px-4 py-2 text-sm ${
                      tab === "overview" ? "bg-[var(--primary)] text-white" : "text-[var(--muted-foreground)]"
                    }`}
                  >
                    Vue d'ensemble
                  </button>
                  <button
                    role="tab"
                    aria-selected={tab === "episodes"}
                    onClick={() => setTab("episodes")}
                    className={`rounded-full px-4 py-2 text-sm ${
                      tab === "episodes" ? "bg-[var(--primary)] text-white" : "text-[var(--muted-foreground)]"
                    }`}
                  >
                    Par épisode
                  </button>
                </div>
              )}

              {tab === "overview" && (
                <section className="mt-8 rounded-[10px] bg-[var(--surface)] p-6">
                  <h2 className="font-display text-3xl">Ta note</h2>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    Clique sur une moitié d'étoile pour mettre une demi-note. Au clavier : flèches, puis Entrée.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-5">
                    <StarRating
                      value={rating}
                      onChange={setRating}
                      onCommit={(v) => submitRating(v)}
                      disabled={rateBusy}
                      variant={buttons ? "buttons" : "stars"}
                      label={`Ta note pour ${data.title}`}
                    />
                    {rating ? (
                      <span className="font-display text-4xl tabular-nums">
                        {(rating / 2).toLocaleString("fr-FR")}
                        <span className="ml-1 text-lg text-[var(--muted-foreground)]">/ 5</span>
                      </span>
                    ) : null}
                  </div>
                </section>
              )}

              {tab === "episodes" && data.episodes && (
                <ol className="mt-6 border-b border-[var(--line)]">
                  {data.episodes.map((ep, i) => (
                    <li key={ep.id} className="flex items-center gap-4 border-t border-[var(--line)] py-4">
                      <span className="w-10 font-display text-2xl text-[var(--muted-foreground)] tabular-nums">
                        {String(ep.number ?? ep.order ?? i + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{ep.title}</span>
                      <span className="font-display text-2xl tabular-nums">
                        {ep.avg ? (ep.avg / 2).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) : <span className="font-sans text-sm text-[var(--muted-foreground)]">Pas de note</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
