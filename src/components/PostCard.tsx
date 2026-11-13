import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { Post } from "../lib/types";
import { WORK_TYPE_LABEL } from "../lib/types";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const s = Math.max(1, Math.floor((Date.now() - d) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const j = Math.floor(h / 24);
  if (j < 7) return `${j}j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function PostCard({ post }: { post: Post }) {
  const { requireAuth } = useAuth();
  const [score, setScore] = useState(post.score);
  const [myVote, setMyVote] = useState<1 | -1 | 0>(post.myVote ?? 0);
  const [reveal, setReveal] = useState(false);
  const [voting, setVoting] = useState(false);
  const [bump, setBump] = useState(0);

  async function vote(value: 1 | -1) {
    if (!requireAuth("Connecte-toi pour voter.")) return;
    if (voting) return;
    const next = myVote === value ? 0 : value;
    setVoting(true);
    try {
      const res = await api<{ score: number }>(`/posts/${post.id}/vote`, {
        method: "POST",
        body: { value },
      });
      setScore(res.score);
      setMyVote(next);
      setBump((b) => b + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Vote impossible.");
    } finally {
      setVoting(false);
    }
  }

  const initial = post.author.username.charAt(0).toUpperCase();

  return (
    <article className="glass mb-3 grid grid-cols-[1fr_auto] gap-x-5 rounded-[1.5rem] p-5 md:p-6">
      <div className="min-w-0">
        <header className="flex items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--ink)] font-display text-base text-[var(--foreground)]">
            {initial}
          </div>
          <div className="min-w-0 text-sm leading-tight">
            <div className="truncate font-medium">{post.author.username}</div>
            <div className="truncate text-xs text-[var(--muted-foreground)]">
              {post.author.level ? `${post.author.level}, ` : ""}il y a {timeAgo(post.createdAt)}
            </div>
          </div>
        </header>

        <Link
          to="/works/$id"
          params={{ id: post.work.id }}
          className="group mt-4 flex max-w-full items-baseline gap-3"
        >
          <span className="truncate font-display text-[28px] transition-colors group-hover:text-[var(--primary)]">
            {post.work.title}
          </span>
          <span className="label shrink-0">{WORK_TYPE_LABEL[post.work.type]}</span>
        </Link>

        <div className="relative mt-3">
          {post.spoiler && !reveal ? (
            <button
              onClick={() => setReveal(true)}
              className="w-full rounded-[8px] border border-dashed border-[var(--line)] px-4 py-5 text-left text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              Cette critique contient un spoiler. Touche pour la lire.
            </button>
          ) : (
            <p className="max-w-[62ch] whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--foreground)]/92">
              {post.body}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-0.5 pt-1" aria-label="Votes">
        <button
          onClick={() => vote(1)}
          aria-label="Voter pour"
          aria-pressed={myVote === 1}
          className={`grid size-8 place-items-center rounded-full transition-colors ${
            myVote === 1 ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          <ChevronUp className="size-4" />
        </button>
        <span
          key={bump}
          className="min-w-[2ch] text-center font-display text-2xl tabular-nums animate-in zoom-in-75 duration-200"
        >
          {score}
        </span>
        <button
          onClick={() => vote(-1)}
          aria-label="Voter contre"
          aria-pressed={myVote === -1}
          className={`grid size-8 place-items-center rounded-full transition-colors ${
            myVote === -1 ? "bg-[var(--ink)] text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          <ChevronDown className="size-4" />
        </button>
      </div>
    </article>
  );
}
