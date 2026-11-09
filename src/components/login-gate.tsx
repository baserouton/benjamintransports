import { useState, type ReactNode } from "react";
import { Eye, EyeOff, Languages } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/current-user";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand-logo";

export function LoginGate({ children }: { children: ReactNode }) {
  const { user, loading, login } = useCurrentUser();
  const { t, lang, setLang } = useI18n();
  const [id, setId] = useState("admin1");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-svh grid place-items-center bg-zinc-950 text-sm text-white/60">
        {t("loginLoading")}
      </div>
    );
  }

  if (user) return <>{children}</>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setSubmitting(true);
    if (!(await login(id.trim(), password))) {
      const message = "Senha ou login não compatível";
      setAuthError(message);
      toast.error(message);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-2">
      <aside className="relative overflow-hidden bg-zinc-950 text-white px-8 py-10 lg:flex lg:min-h-svh lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-white/10 blur-3xl"
        />
        <div className="relative">
          <BrandLogo inverted adaptive={false} className="w-56 sm:w-64" />
          <p className="mt-6 text-[11px] uppercase tracking-[0.28em] text-white/45">
            {t("loginInternal")}
          </p>
        </div>
        <div className="relative mt-10 max-w-md lg:mt-0">
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight leading-tight">
            {t("loginBrandLine")}
          </h1>
        </div>
        <p className="relative mt-10 hidden text-xs text-white/35 lg:block">
          Benjamin Transport N.V. · KKF 87747
        </p>
      </aside>

      <section className="relative flex items-center justify-center bg-neutral-50 px-6 py-12 text-zinc-950">
        <button
          type="button"
          onClick={() => setLang(lang === "pt" ? "nl" : "pt")}
          className="absolute right-5 top-5 inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900"
        >
          <Languages className="h-3.5 w-3.5" />
          {lang.toUpperCase()}
        </button>

        <div className="w-full max-w-[400px]">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight">{t("loginAccess")}</h2>
            <p className="mt-2 text-sm text-zinc-500">{t("loginHint")}</p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="login" className="text-zinc-700">
                Login
              </Label>
              <Input
                id="login"
                value={id}
                onChange={(e) => {
                  setId(e.target.value);
                  if (authError) setAuthError(null);
                }}
                placeholder="admin1"
                autoFocus
                aria-invalid={Boolean(authError)}
                className="h-11 bg-white border-zinc-200 text-zinc-950 shadow-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-zinc-700">
                {t("password")}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  autoComplete="current-password"
                  required
                  className="h-11 bg-white border-zinc-200 pr-10 text-zinc-950 shadow-none"
                  aria-invalid={Boolean(authError)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 text-zinc-400 hover:bg-transparent hover:text-zinc-800"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {authError ? (
              <p role="alert" className="text-sm text-red-600">
                {authError}
              </p>
            ) : null}
            <Button
              type="submit"
              className="h-11 w-full bg-zinc-950 text-white hover:bg-zinc-800"
              data-log="auth:submit-login"
              disabled={submitting}
            >
              {submitting ? t("loginSubmitting") : t("loginSubmit")}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
