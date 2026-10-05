import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "../lib/api";
import type { Work, WorkType } from "../lib/types";
import { WORK_TYPES } from "../lib/types";
import { AppShell, PageHeader } from "../components/AppShell";
import { useAuth } from "../lib/auth";
import { useEggs } from "../lib/eggs/EggProvider";
import { toast } from "sonner";

export const Route = createFileRoute("/compose")({
  head: () => ({
    meta: [
      { title: "Publier — kritiq" },
      { name: "description", content: "Publie une critique sur kritiq." },
      { property: "og:title", content: "Publier — kritiq" },
      { property: "og:description", content: "Publie une critique sur kritiq." },
    ],
  }),
  component: ComposePage,
});

const STEPS = ["Type", "Œuvre", "Critique"];

function ComposePage() {
  const { token, openAuth } = useAuth();
  const { fire } = useEggs();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [type, setType] = useState<WorkType | null>(null);
  const [work, setWork] = useState<Work | null>(null);
  const [q, setQ] = useState("");
  const [body, setBody] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Le jeton est relu par AuthProvider après ce premier rendu : on vérifie aussi le stockage
    // pour ne pas demander la connexion à quelqu'un qui est déjà connecté.
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("kritiq_token") : null;
    if (!token && !stored) openAuth("Connecte-toi pour publier une critique.");
  }, [token, openAuth]);

  const search = useQuery({
    queryKey: ["works", type, q],
    queryFn: () => {
      const p = new URLSearchParams();
      if (type) p.set("type", type);
      if (q) p.set("q", q);
      return api<Work[]>(`/works?${p.toString()}`);
    },
    enabled: step === 2 && !!type,
  });

  async function submit() {
    if (!work || !body.trim()) return;
    setSubmitting(true);
    try {
      // Egg éventuel juste avant la publication : quel que soit le choix, on publie.
      await fire("before_log", work);
      await api(`/posts`, {
        method: "POST",
        body: { workId: work.id, body: body.trim(), spoiler },
      });
      toast.success("Critique publiée.");
      void fire("on_log", work); // s'affiche par-dessus le fil, ne retarde rien
      navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Publication impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Publier"
        aside={
          <ol className="flex gap-4 pb-2" aria-label="Étapes">
            {STEPS.map((label, i) => (
              <li
                key={label}
                aria-current={step === i + 1 ? "step" : undefined}
                className={`label ${step >= i + 1 ? "!text-[var(--foreground)]" : ""}`}
              >
                {i + 1}. {label}
              </li>
            ))}
          </ol>
        }
      />

      {step === 1 && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h2 className="font-display text-3xl">Quel type d'œuvre ?</h2>
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {WORK_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setType(t.value);
                  setStep(2);
                }}
                className={`rounded-[10px] border px-4 py-5 text-left font-display text-2xl transition-colors ${
                  type === t.value
                    ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "border-[var(--line)] hover:border-[var(--foreground)]/40"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h2 className="font-display text-3xl">Choisis l'œuvre</h2>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un titre"
            aria-label="Rechercher un titre"
            className="mt-4 w-full border-b-2 border-[var(--line)] bg-transparent py-3 text-xl outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)]"
          />
          <ul className="mt-4 border-b border-[var(--line)]">
            {search.isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="h-16 animate-pulse border-t border-[var(--line)]" />
              ))}
            {search.data?.map((w) => (
              <li key={w.id} className="border-t border-[var(--line)]">
                <button
                  onClick={() => {
                    setWork(w);
                    setStep(3);
                  }}
                  className="group flex w-full items-center gap-4 py-4 text-left"
                >
                  <span className="text-2xl" aria-hidden>
                    {w.coverIcon ?? "◆"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-2xl group-hover:text-[var(--primary)]">{w.title}</span>
                    {w.subtitle && <span className="block truncate text-xs text-[var(--muted-foreground)]">{w.subtitle}</span>}
                  </span>
                  {w.avg != null && (
                    <span className="font-display text-2xl tabular-nums">
                      {(w.avg / 2).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}
                    </span>
                  )}
                </button>
              </li>
            ))}
            {search.data && search.data.length === 0 && (
              <li className="border-t border-[var(--line)] py-4 text-sm text-[var(--muted-foreground)]">
                Aucun titre ne correspond. Essaie avec moins de mots.
              </li>
            )}
          </ul>
          <button
            onClick={() => setStep(1)}
            className="mt-6 rounded-full border border-[var(--line)] px-4 py-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            Changer de type
          </button>
        </div>
      )}

      {step === 3 && work && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-baseline justify-between gap-4 border-b border-[var(--line)] pb-4">
            <h2 className="truncate font-display text-4xl">{work.title}</h2>
            <button onClick={() => setStep(2)} className="shrink-0 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              Changer d'œuvre
            </button>
          </div>

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 2000))}
            rows={9}
            placeholder="Ce que tu en penses, franchement."
            aria-label="Ta critique"
            className="mt-5 w-full resize-none rounded-[10px] bg-[var(--surface)] p-5 text-[16px] leading-relaxed outline-none placeholder:text-[var(--muted-foreground)] focus:ring-2 focus:ring-[var(--primary)]"
          />
          <div className="mt-3 flex items-center justify-between text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={spoiler}
                onChange={(e) => setSpoiler(e.target.checked)}
                className="size-4 accent-[var(--primary)]"
              />
              <span>Contient un spoiler</span>
            </label>
            <span className="text-[var(--muted-foreground)] tabular-nums">{body.length} / 2000</span>
          </div>

          <button
            onClick={submit}
            disabled={!body.trim() || submitting}
            className="mt-8 w-full rounded-full bg-[var(--primary)] px-5 py-4 font-medium text-[var(--primary-foreground)] transition-opacity disabled:opacity-50"
          >
            {submitting ? "Publication…" : "Publier"}
          </button>
        </div>
      )}
    </AppShell>
  );
}
