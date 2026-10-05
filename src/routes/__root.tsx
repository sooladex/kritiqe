import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "../lib/auth";
import { EggProvider } from "../lib/eggs/EggProvider";
import { Cursor } from "../components/Cursor";

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl">Oups.</h1>
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">
          Cette page n'a pas pu se charger. Réessaie, ou repars du fil.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--primary-foreground)]"
          >
            Réessayer
          </button>
          <a href="/" className="rounded-full border border-[var(--line)] px-5 py-2.5 text-sm font-medium">
            Retour au fil
          </a>
        </div>
      </div>
    </div>
  );
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h1 className="font-display text-[160px] text-[var(--primary)]">404</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">Cette page n'existe pas (encore).</p>
        <a
          href="/"
          className="mt-6 inline-flex rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--primary-foreground)]"
        >
          Retour au fil
        </a>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#030923" },
      { title: "kritiq — le réseau social culturel" },
      {
        name: "description",
        content:
          "kritiq est le réseau social culturel français où les membres notent, critiquent et classent leurs œuvres préférées.",
      },
      { property: "og:title", content: "kritiq — le réseau social culturel" },
      {
        property: "og:description",
        content: "Note, critique et classe films, séries, jeux, livres, manga, musique, concerts et mode.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@700;800&family=Inter:wght@400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <EggProvider>
          <Outlet />
          <Cursor />
          <Toaster
            position="top-center"
            theme="dark"
            toastOptions={{
              style: {
                background: "#0b2a78",
                border: "1px solid #0e2361",
                color: "#ffffff",
                borderRadius: "10px",
                fontFamily: "Inter, sans-serif",
              },
            }}
          />
        </EggProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
