import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { emptyStore } from "@/domain/models";
import type { JsonValue } from "@/domain/models";
import { createActivityLogFn, getStoreFn } from "@/server/functions/store.functions";

export type {
  ActivityLog,
  Category,
  Client,
  Currency,
  FinanceCategory,
  FinanceEntry,
  InspectionIn,
  InspectionOut,
  Maintenance,
  MaintenanceType,
  Rental,
  RentalStatus,
  Store,
  UserAccount,
  Vehicle,
  VehicleCategory,
  VehicleComplianceAlert,
  VehiclePayback,
} from "@/domain/models";
export {
  FINANCE_CATEGORIES,
  FINANCE_CATEGORY_LABELS,
  calcVehiclePayback,
  fmtMoney,
  getComplianceExpiry,
  listVehicleComplianceAlerts,
} from "@/domain/models";

export const STORE_QUERY_KEY = ["store"] as const;
const STORE_CHANGE_EVENT = "locadora-store-change";

export function notifyStoreChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(STORE_CHANGE_EVENT));
  }
}

export function useStore() {
  const query = useQuery({
    queryKey: STORE_QUERY_KEY,
    queryFn: () => getStoreFn(),
    placeholderData: emptyStore,
    staleTime: 15_000,
    retry: false,
  });
  const { refetch } = query;

  useEffect(() => {
    const refresh = () => void refetch();
    window.addEventListener(STORE_CHANGE_EVENT, refresh);
    return () => window.removeEventListener(STORE_CHANGE_EVENT, refresh);
  }, [refetch]);

  return query.data ?? emptyStore;
}

export function logAction(
  _usuario: string,
  acao: string,
  opts: { categoria?: string; pagina?: string; detalhes?: Record<string, JsonValue> } = {},
) {
  void createActivityLogFn({
    data: {
      acao,
      categoria: opts.categoria,
      pagina: opts.pagina ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
      detalhes: opts.detalhes,
    },
  }).catch((error) => {
    console.error("Falha ao registrar atividade", error);
  });
}
