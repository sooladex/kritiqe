import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { AuthDialog } from "./AuthDialog";

export function AppShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className={`min-h-screen pb-28 md:pb-8 ${wide ? "" : "md:pl-24"}`}>
      <div
        className={`mx-auto w-full ${wide ? "max-w-none" : "max-w-[680px] px-4 pt-8 md:px-6 md:pt-14"}`}
      >
        {children}
      </div>
      <BottomNav />
      <AuthDialog />
    </div>
  );
}

/** En-tête de page : grand titre, petit chapeau en dessous. */
export function PageHeader({ title, intro, aside }: { title: string; intro?: string; aside?: ReactNode }) {
  return (
    <header className="mb-8 flex items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[clamp(52px,11vw,88px)]">{title}</h1>
        {intro && <p className="mt-3 max-w-[44ch] text-[15px] text-[var(--muted-foreground)]">{intro}</p>}
      </div>
      {aside}
    </header>
  );
}
