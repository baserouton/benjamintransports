import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";
import { Languages, LogOut, Moon, Sun } from "lucide-react";

import appCss from "../styles.css?url";
import { reportRuntimeError } from "../lib/error-reporting";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { CurrentUserProvider } from "@/lib/current-user-provider";
import { useCurrentUser, useLogger } from "@/lib/current-user";
import { LoginGate } from "@/components/login-gate";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O recurso solicitado não existe ou foi movido.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao painel
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportRuntimeError(error, { boundary: "root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Algo deu errado
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tente novamente ou volte para o painel.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Voltar
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Locadora Admin — Painel de Aluguel de Carros" },
      {
        name: "description",
        content:
          "Painel administrativo interno para gestão de veículos, clientes, locações, manutenção e financeiro.",
      },
      { name: "author", content: "Locadora Admin" },
      { property: "og:title", content: "Locadora Admin — Painel de Aluguel de Carros" },
      {
        property: "og:description",
        content: "Gestão completa de frota, clientes e locações.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon-32.png?v=2", type: "image/png", sizes: "32x32" },
      { rel: "icon", href: "/favicon.ico?v=2", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png?v=2", sizes: "180x180" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt">
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

function TopBar() {
  const { lang, setLang } = useI18n();
  const { user, logout } = useCurrentUser();
  const log = useLogger();
  const toggleTheme = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    log(`Alterou tema para ${next ? "escuro" : "claro"}`, {
      categoria: "preferencia",
      detalhes: { tema: next ? "dark" : "light" },
    });
  };
  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur flex items-center justify-between px-3 sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <span className="text-sm text-muted-foreground hidden sm:inline">
          Painel administrativo
        </span>
      </div>
      <div className="flex items-center gap-2">
        {user && (
          <div className="hidden sm:flex flex-col items-end leading-tight mr-1">
            <span className="text-xs font-semibold">{user.nome}</span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {user.login} · desde {user.loggedAt.slice(11, 16)}
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const next = lang === "pt" ? "nl" : "pt";
            setLang(next);
            log(`Alterou idioma para ${next.toUpperCase()}`, {
              categoria: "preferencia",
              detalhes: { idioma: next },
            });
          }}
          className="gap-1.5 text-xs"
          data-log="topbar:toggle-language"
        >
          <Languages className="h-4 w-4" />
          {lang.toUpperCase()}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Tema"
          data-log="topbar:toggle-theme"
        >
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="h-4 w-4 hidden dark:block" />
        </Button>
        {user && (
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            aria-label="Sair"
            data-log="topbar:logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  );
}

/**
 * Tracks navigation (route changes) and delegated clicks on elements with
 * data-log or on standard interactive elements (buttons / links).
 */
function ActivityTracker() {
  const { user } = useCurrentUser();
  const log = useLogger();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const lastPath = useRef<string | null>(null);

  // Route changes
  useEffect(() => {
    if (!user) return;
    if (lastPath.current === pathname) return;
    const de = lastPath.current;
    lastPath.current = pathname;
    log(`Navegou para ${pathname}`, {
      categoria: "navegacao",
      pagina: pathname,
      detalhes: { de, para: pathname },
    });
  }, [pathname, user, log]);

  // Delegated click tracking
  useEffect(() => {
    if (!user) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const el = target.closest<HTMLElement>(
        "[data-log], button, a[href], [role='tab'], [role='menuitem']"
      );
      if (!el) return;
      // Ignore purely presentational or sidebar toggle noise
      if (el.getAttribute("aria-hidden") === "true") return;
      const tag =
        el.getAttribute("data-log") ||
        el.getAttribute("aria-label") ||
        (el.textContent ?? "").trim().slice(0, 60);
      if (!tag) return;
      const href = el.getAttribute("href");
      log(`Clicou em "${tag}"`, {
        categoria: "clique",
        detalhes: {
          elemento: el.tagName.toLowerCase(),
          rotulo: tag,
          href: href ?? null,
        },
      });
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [user, log]);

  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <CurrentUserProvider>
          <LoginGate>
            <SidebarProvider>
              <ActivityTracker />
              <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />
                <div className="flex-1 flex flex-col min-w-0">
                  <TopBar />
                  <main className="flex-1 p-4 sm:p-6 lg:p-8">
                    <Outlet />
                  </main>
                </div>
              </div>
              <Toaster position="top-right" />
            </SidebarProvider>
          </LoginGate>
        </CurrentUserProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
