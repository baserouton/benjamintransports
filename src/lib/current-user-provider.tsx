import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CurrentUserContext, type CurrentUser } from "./current-user-context";
import { getCurrentUserFn, getStoreFn, loginFn, logoutFn } from "@/server/functions/store.functions";
import { STORE_QUERY_KEY } from "./data-store";

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<CurrentUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getCurrentUserFn()
      .then((current) => {
        if (current) {
          setUser({
            login: current.login,
            nome: current.nome,
            loggedAt: new Date().toISOString(),
          });
        }
      })
      .catch((error) => {
        console.error("Falha ao recuperar sessão", error);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (loginId: string, password: string) => {
    try {
      const authenticated = await loginFn({ data: { login: loginId, password } });
      // Pré-carrega o painel enquanto a UI troca de tela.
      void queryClient.prefetchQuery({
        queryKey: STORE_QUERY_KEY,
        queryFn: () => getStoreFn(),
      });
      setUser({
        login: authenticated.login,
        nome: authenticated.nome,
        loggedAt: new Date().toISOString(),
      });
      return true;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    await logoutFn();
    queryClient.removeQueries({ queryKey: STORE_QUERY_KEY });
    setUser(null);
  };

  return (
    <CurrentUserContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </CurrentUserContext.Provider>
  );
}
