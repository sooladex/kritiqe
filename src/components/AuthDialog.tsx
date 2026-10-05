import { useState } from "react";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";
import { toast } from "sonner";

export function AuthDialog() {
  const { authPrompt, closeAuth, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!authPrompt) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") await login(username, password);
      else await register(username, email, password);
      toast.success("Bienvenue sur kritiq.");
      closeAuth();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-sm animate-in fade-in duration-200 md:items-center"
      onClick={closeAuth}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
    >
      <div
        className="w-full max-w-md rounded-t-[18px] border border-[var(--line)] bg-[var(--surface)] p-7 text-[var(--foreground)] animate-in slide-in-from-bottom-6 duration-300 md:rounded-[14px]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="auth-title" className="font-display text-5xl">
          {mode === "login" ? "Se connecter" : "Créer un compte"}
        </h2>
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">{authPrompt}</p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <Field label="Pseudo" value={username} onChange={setUsername} autoComplete="username" required />
          {mode === "register" && (
            <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" required />
          )}
          <Field
            label="Mot de passe"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="mt-3 w-full rounded-full bg-[var(--primary)] px-5 py-3 font-medium text-[var(--primary-foreground)] disabled:opacity-60"
          >
            {loading ? "Un instant…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm">
          <button
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="text-[var(--muted-foreground)] underline-offset-4 hover:underline"
          >
            {mode === "login" ? "Pas encore de compte ?" : "J'ai déjà un compte"}
          </button>
          <button onClick={closeAuth} className="text-[var(--muted-foreground)] underline-offset-4 hover:underline">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="w-full rounded-[8px] border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-white outline-none focus:border-[var(--primary)]"
      />
    </label>
  );
}
