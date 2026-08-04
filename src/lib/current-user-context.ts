import { createContext } from "react";

export type CurrentUser = {
  login: string;
  nome: string;
  loggedAt: string;
} | null;

export type CurrentUserContextValue = {
  user: CurrentUser;
  loading: boolean;
  login: (login: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
};

export const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);
