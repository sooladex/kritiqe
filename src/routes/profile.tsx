import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "../components/AppShell";
import { EmptyState } from "../components/EmptyState";
import { useAuth } from "../lib/auth";
import { useEggs } from "../lib/eggs/EggProvider";
import { api, ApiError } from "../lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profil — kritiq" },
      { name: "description", content: "Ton profil kritiq." },
      { property: "og:title", content: "Profil — kritiq" },
      { property: "og:description", content: "Ton profil kritiq." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, token, logout, setUser, openAuth } = useAuth();
  const [bio, setBio] = useState(user?.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [links, setLinks] = useState<{ platform: string; handle: string }[]>(user?.links ?? []);

  useEffect(() => {
    setBio(user?.bio ?? "");
    setLinks(user?.links ?? []);
  }, [user]);

  if (!token || !user) {
    return (
      <AppShell>
        <EmptyState
          title="Rejoins kritiq"
          message="Crée un compte pour noter, critiquer et grimper au classement."
          action={
            <button
              onClick={() => openAuth("Crée ton compte pour continuer.")}
              className="rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-medium text-[var(--primary-foreground)]"
            >
              Créer un compte
            </button>
          }
        />
        <div className="mt-10">
          <SurprisesSetting />
        </div>
      </AppShell>
    );
  }

  async function saveBio() {
    if (bio.length > 160) {
      toast.error("Bio limitée à 160 caractères.");
      return;
    }
    setSaving(true);
    try {
      const res = await api<{ user: import("../lib/types").User }>("/users/me", {
        method: "PATCH",
        body: { bio },
      });
      setUser(res.user ?? { ...user!, bio });
      toast.success("Bio enregistrée.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Impossible d'enregistrer.");
    } finally {
      setSaving(false);
    }
  }

  async function saveLinks() {
    setSaving(true);
    try {
      const clean = links.filter((l) => l.platform.trim() && l.handle.trim());
      const res = await api<{ user: import("../lib/types").User }>("/users/me/links", {
        method: "PUT",
        body: { links: clean },
      });
      setUser(res.user ?? { ...user!, links: clean });
      toast.success("Liens enregistrés.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Impossible d'enregistrer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <section className="relative overflow-hidden rounded-[14px] bg-[var(--ink)] p-7">
        <p className="label !text-[var(--foreground)]/70">{user.level ?? "Novice"}</p>
        <h1 className="mt-3 break-words font-display text-[clamp(56px,13vw,104px)]">{user.username}</h1>
        <dl className="mt-6 flex gap-10">
          <div>
            <dt className="label !text-[var(--foreground)]/70">Points</dt>
            <dd className="mt-1 font-display text-5xl tabular-nums">{user.points ?? 0}</dd>
          </div>
          {user.rank !== undefined && (
            <div>
              <dt className="label !text-[var(--foreground)]/70">Rang</dt>
              <dd className="mt-1 font-display text-5xl tabular-nums">#{user.rank}</dd>
            </div>
          )}
        </dl>
        <div className="absolute -right-10 -top-10 size-40 rounded-full bg-[var(--primary)]" aria-hidden />
      </section>

      <section className="mt-10 border-t border-[var(--line)] pt-6">
        <h2 className="font-display text-3xl">Bio</h2>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={160}
          rows={3}
          placeholder="Deux lignes pour te présenter."
          aria-label="Bio"
          className="mt-4 w-full resize-none rounded-[10px] bg-[var(--surface)] p-4 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-[var(--muted-foreground)] tabular-nums">{bio.length} / 160</span>
          <button
            onClick={saveBio}
            disabled={saving}
            className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-[var(--primary-foreground)] disabled:opacity-60"
          >
            Enregistrer la bio
          </button>
        </div>
      </section>

      <section className="mt-10 border-t border-[var(--line)] pt-6">
        <h2 className="font-display text-3xl">Liens</h2>
        <div className="mt-4 space-y-2">
          {links.map((l, i) => (
            <div key={i} className="flex gap-2">
              <input
                placeholder="Plateforme"
                aria-label="Plateforme"
                value={l.platform}
                onChange={(e) => {
                  const c = [...links];
                  c[i] = { ...c[i], platform: e.target.value };
                  setLinks(c);
                }}
                className="w-32 rounded-[8px] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
              <input
                placeholder="@pseudo"
                aria-label="Pseudo sur la plateforme"
                value={l.handle}
                onChange={(e) => {
                  const c = [...links];
                  c[i] = { ...c[i], handle: e.target.value };
                  setLinks(c);
                }}
                className="flex-1 rounded-[8px] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
              <button
                onClick={() => setLinks(links.filter((_, j) => j !== i))}
                className="rounded-full border border-[var(--line)] px-3 text-sm text-[var(--muted-foreground)]"
                aria-label="Supprimer ce lien"
              >
                ×
              </button>
            </div>
          ))}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setLinks([...links, { platform: "", handle: "" }])}
              className="rounded-full border border-[var(--line)] px-4 py-2 text-sm"
            >
              Ajouter un lien
            </button>
            <button
              onClick={saveLinks}
              disabled={saving}
              className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-[var(--primary-foreground)] disabled:opacity-60"
            >
              Enregistrer les liens
            </button>
          </div>
        </div>
      </section>

      <div className="mt-10">
        <SurprisesSetting />
      </div>

      <button
        onClick={logout}
        className="mt-10 w-full rounded-full border border-[var(--line)] px-5 py-3 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        Se déconnecter
      </button>
    </AppShell>
  );
}

/** Paramètre « Surprises » : active ou coupe les easter eggs (activé par défaut). */
function SurprisesSetting() {
  const { surprises, setSurprises } = useEggs();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      await setSurprises(!surprises);
      toast.success(surprises ? "Surprises désactivées." : "Surprises activées.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Impossible d'enregistrer ce réglage.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border-t border-[var(--line)] pt-6">
      <h2 className="font-display text-3xl">Paramètres</h2>
      <div className="mt-4 flex items-start justify-between gap-6">
        <div>
          <p id="surprises-label" className="font-medium">
            Surprises
          </p>
          <p id="surprises-desc" className="mt-1 max-w-[46ch] text-sm text-[var(--muted-foreground)]">
            De petits clins d'œil cachés sur certaines fiches. Ils ne bloquent rien, ne spoilent rien et se ferment en un clic.
          </p>
        </div>
        <button
          role="switch"
          aria-checked={surprises}
          aria-labelledby="surprises-label"
          aria-describedby="surprises-desc"
          disabled={busy}
          onClick={toggle}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
            surprises ? "bg-[var(--primary)]" : "bg-[var(--surface-high)]"
          }`}
        >
          <span
            className={`absolute top-1 size-6 rounded-full bg-[var(--foreground)] transition-[left] duration-200 ${
              surprises ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>
    </section>
  );
}
