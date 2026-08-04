import { useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export function LoginGate({ children }: { children: ReactNode }) {
  const { user, loading, login } = useCurrentUser();
  const [id, setId] = useState("admin1");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">
        Carregando…
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm p-8 rounded-2xl">
        <div className="mb-6">
          <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold mb-3">
            L
          </div>
          <h1 className="text-lg font-bold">Locadora Admin</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Identifique-se para registrar suas ações no sistema.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="login">Login</Label>
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
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
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
                className="pr-10"
                aria-invalid={Boolean(authError)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:bg-transparent hover:text-foreground"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          {authError ? (
            <p role="alert" className="text-sm text-destructive">
              {authError}
            </p>
          ) : null}
          <Button
            type="submit"
            className="w-full"
            data-log="auth:submit-login"
            disabled={submitting}
          >
            {submitting ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
