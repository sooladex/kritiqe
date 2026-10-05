import { Link, useRouterState } from "@tanstack/react-router";
import { Home, MessageCircle, Plus, Trophy, User } from "lucide-react";

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 md:bottom-auto md:left-6 md:top-6 md:translate-x-0"
      aria-label="Navigation principale"
    >
      <div className="flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)]/92 px-2 py-2 backdrop-blur md:flex-col md:gap-2 md:px-2 md:py-3">
        <NavItem to="/" pathname={pathname} icon={Home} label="Fil" />
        <NavItem to="/messages" pathname={pathname} icon={MessageCircle} label="Communautés" />
        <Link
          to="/compose"
          className="mx-1 grid size-12 -translate-y-3 place-items-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] transition-transform hover:rotate-90 md:mx-0 md:translate-y-0"
          aria-label="Publier une critique"
        >
          <Plus className="size-6" strokeWidth={2.5} />
        </Link>
        <NavItem to="/rankings" pathname={pathname} icon={Trophy} label="Classements" />
        <NavItem to="/profile" pathname={pathname} icon={User} label="Profil" />
      </div>
    </nav>
  );
}

function NavItem({
  to,
  pathname,
  icon: Icon,
  label,
}: {
  to: string;
  pathname: string;
  icon: typeof Home;
  label: string;
}) {
  const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
  return (
    <Link
      to={to}
      className={`relative grid size-11 place-items-center rounded-full transition-colors ${
        active ? "bg-[var(--primary)] text-white" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      }`}
      aria-label={label}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="size-5" />
    </Link>
  );
}
