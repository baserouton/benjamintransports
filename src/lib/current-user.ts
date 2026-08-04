import { useContext } from "react";
import type { JsonValue } from "@/domain/models";
import { logAction } from "./data-store";
import { CurrentUserContext } from "./current-user-context";

export function useCurrentUser() {
  const context = useContext(CurrentUserContext);
  if (!context) throw new Error("useCurrentUser outside provider");
  return context;
}

export function useLogger() {
  const { user } = useCurrentUser();
  return (
    action: string,
    options: {
      categoria?: string;
      pagina?: string;
      detalhes?: Record<string, JsonValue>;
    } = {},
  ) => logAction(user?.login ?? "anonimo", action, options);
}
