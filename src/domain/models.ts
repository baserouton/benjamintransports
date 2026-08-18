/** Nome da categoria de veículo (dinâmico, cadastrado pelo usuário). */
export type Category = string;
export type Currency = "SRD" | "USD" | "EUR";
export type RentalStatus = "pendente" | "entregue" | "devolvido";
export type MaintenanceType = "preventiva" | "corretiva" | "troca_oleo";
export type JsonValue =
  string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

export interface VehicleCategory {
  id: string;
  nome: string;
  ativo: boolean;
}

export interface Vehicle {
  id: string;
  modelo: string;
  placa: string;
  categoria: Category;
  fotos: string[];
  ano?: number;
  disponivel: boolean;
  /** Soft-delete: some da lista de veículos, mas mantém histórico. */
  oculto: boolean;
  /** Seguro do veículo foi contratado/emitido. */
  seguroFeito: boolean;
  seguroValidade?: string;
  /** Vistoria veicular (documento) foi realizada. */
  vistoriaFeita: boolean;
  vistoriaValidade?: string;
  /** Quilometragem atual do odômetro. */
  kmAtual?: number;
  /** Km na última troca de óleo. */
  kmUltimaTrocaOleo?: number;
  /** Intervalo de troca de óleo em km (padrão 5000). */
  intervaloTrocaOleoKm?: number;
  /** Valor pago na compra do veículo (base do payback). */
  custoAquisicao?: number;
  moedaAquisicao?: Currency;
}

export const DEFAULT_OIL_CHANGE_INTERVAL_KM = 5000;
export const OIL_CHANGE_ALERT_KM = 300;

export type VehicleOilStatusKind =
  | "km_pending"
  | "ok"
  | "due_soon"
  | "overdue";

export interface VehicleOilStatus {
  kind: VehicleOilStatusKind;
  kmAtual?: number;
  kmUltimaTrocaOleo?: number;
  intervaloKm: number;
  nextChangeKm?: number;
  remainingKm?: number;
}

export function getVehicleOilStatus(
  vehicle: Pick<
    Vehicle,
    "kmAtual" | "kmUltimaTrocaOleo" | "intervaloTrocaOleoKm" | "oculto"
  >,
): VehicleOilStatus | null {
  if (vehicle.oculto) return null;
  const intervalo = vehicle.intervaloTrocaOleoKm ?? DEFAULT_OIL_CHANGE_INTERVAL_KM;
  if (vehicle.kmAtual == null) {
    return { kind: "km_pending", intervaloKm: intervalo };
  }
  if (vehicle.kmUltimaTrocaOleo == null) {
    return null;
  }
  const nextChangeKm = vehicle.kmUltimaTrocaOleo + intervalo;
  const remainingKm = nextChangeKm - vehicle.kmAtual;
  if (remainingKm <= 0) {
    return {
      kind: "overdue",
      kmAtual: vehicle.kmAtual,
      kmUltimaTrocaOleo: vehicle.kmUltimaTrocaOleo,
      intervaloKm: intervalo,
      nextChangeKm,
      remainingKm,
    };
  }
  if (remainingKm <= OIL_CHANGE_ALERT_KM) {
    return {
      kind: "due_soon",
      kmAtual: vehicle.kmAtual,
      kmUltimaTrocaOleo: vehicle.kmUltimaTrocaOleo,
      intervaloKm: intervalo,
      nextChangeKm,
      remainingKm,
    };
  }
  return {
    kind: "ok",
    kmAtual: vehicle.kmAtual,
    kmUltimaTrocaOleo: vehicle.kmUltimaTrocaOleo,
    intervaloKm: intervalo,
    nextChangeKm,
    remainingKm,
  };
}

export interface VehicleOilAlert {
  vehicleId: string;
  modelo: string;
  placa: string;
  kind: Exclude<VehicleOilStatusKind, "ok">;
  remainingKm?: number;
  nextChangeKm?: number;
  kmAtual?: number;
}

export function listVehicleOilAlerts(
  vehicles: Array<
    Pick<
      Vehicle,
      | "id"
      | "modelo"
      | "placa"
      | "oculto"
      | "kmAtual"
      | "kmUltimaTrocaOleo"
      | "intervaloTrocaOleoKm"
    >
  >,
): VehicleOilAlert[] {
  const alerts: VehicleOilAlert[] = [];
  for (const v of vehicles) {
    const status = getVehicleOilStatus(v);
    if (!status || status.kind === "ok") continue;
    alerts.push({
      vehicleId: v.id,
      modelo: v.modelo,
      placa: v.placa,
      kind: status.kind,
      remainingKm: status.remainingKm,
      nextChangeKm: status.nextChangeKm,
      kmAtual: status.kmAtual,
    });
  }
  const order: Record<VehicleOilAlert["kind"], number> = {
    overdue: 0,
    due_soon: 1,
    km_pending: 2,
  };
  return alerts.sort((a, b) => order[a.kind] - order[b.kind] || a.placa.localeCompare(b.placa));
}

export type ComplianceExpiryKind = "seguro" | "vistoria";
export type ComplianceExpiryLevel = "expired" | "upcoming";

export interface VehicleComplianceAlert {
  vehicleId: string;
  modelo: string;
  placa: string;
  kind: ComplianceExpiryKind;
  level: ComplianceExpiryLevel;
  validade: string;
  daysLeft: number;
}

/** Status de vencimento: 1 mês (30 dias) antes = upcoming. */
export function getComplianceExpiry(
  validade: string | undefined,
  now = new Date(),
): { level: ComplianceExpiryLevel; daysLeft: number } | null {
  if (!validade) return null;
  const end = new Date(`${validade}T12:00:00`);
  if (Number.isNaN(end.getTime())) return null;
  const start = new Date(now);
  start.setHours(12, 0, 0, 0);
  const daysLeft = Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
  if (daysLeft < 0) return { level: "expired", daysLeft };
  if (daysLeft <= 30) return { level: "upcoming", daysLeft };
  return null;
}

export function listVehicleComplianceAlerts(
  vehicles: Array<
    Pick<
      Vehicle,
      | "id"
      | "modelo"
      | "placa"
      | "oculto"
      | "seguroFeito"
      | "seguroValidade"
      | "vistoriaFeita"
      | "vistoriaValidade"
    >
  >,
  now = new Date(),
): VehicleComplianceAlert[] {
  const alerts: VehicleComplianceAlert[] = [];
  for (const v of vehicles) {
    if (v.oculto) continue;
    if (v.seguroFeito) {
      const status = getComplianceExpiry(v.seguroValidade, now);
      if (status && v.seguroValidade) {
        alerts.push({
          vehicleId: v.id,
          modelo: v.modelo,
          placa: v.placa,
          kind: "seguro",
          level: status.level,
          validade: v.seguroValidade,
          daysLeft: status.daysLeft,
        });
      }
    }
    if (v.vistoriaFeita) {
      const status = getComplianceExpiry(v.vistoriaValidade, now);
      if (status && v.vistoriaValidade) {
        alerts.push({
          vehicleId: v.id,
          modelo: v.modelo,
          placa: v.placa,
          kind: "vistoria",
          level: status.level,
          validade: v.vistoriaValidade,
          daysLeft: status.daysLeft,
        });
      }
    }
  }
  return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
}

export interface Client {
  id: string;
  nome: string;
  rg: string;
  cpf: string;
  endereco: string;
  whatsapp: string;
  email?: string;
  cnhUrl?: string;
  suriname?: boolean;
  passaporteUrl?: string;
  identiteitskaartUrl?: string;
  /** Última alteração do cadastro (ISO datetime string). */
  updatedAt?: string;
}

export interface InspectionOut {
  tanque: boolean;
  limpo: boolean;
  semAvarias: boolean;
  obs: string;
  /** Quilometragem no odômetro no momento da vistoria. */
  km?: number;
  /** Foto do painel / odômetro. */
  kmFotoUrl?: string;
}

export interface InspectionIn extends InspectionOut {
  taxa: number;
}

export interface Rental {
  id: string;
  veiculoId: string;
  clienteId: string;
  dataRetirada: string;
  dataSaida: string;
  status: RentalStatus;
  valorAluguel: number;
  moeda: Currency;
  seguroValor?: number;
  seguroObs?: string;
  caucaoValor?: number;
  caucaoStatus?: "retido" | "devolvido";
  vistoriaRetirada?: InspectionOut;
  vistoriaDevolucao?: InspectionIn;
}

export interface Maintenance {
  id: string;
  veiculoId: string;
  tipo: MaintenanceType;
  pecas: string;
  custo: number;
  moeda: Currency;
  data: string;
  obs?: string;
  /** Km no odômetro no momento da troca de óleo. */
  kmTroca?: number;
  /** Km previsto para a próxima troca. */
  kmProxima?: number;
}

/** Classificação do lançamento no financeiro da empresa. */
export type FinanceCategory =
  | "aluguel"
  | "taxa"
  | "manutencao"
  | "aquisicao"
  | "seguro"
  | "vistoria"
  | "translato"
  | "operacional"
  | "outro";

export const FINANCE_CATEGORIES: FinanceCategory[] = [
  "aluguel",
  "taxa",
  "manutencao",
  "aquisicao",
  "seguro",
  "vistoria",
  "translato",
  "operacional",
  "outro",
];

export const FINANCE_CATEGORY_LABELS: Record<FinanceCategory, string> = {
  aluguel: "Aluguel",
  taxa: "Taxa",
  manutencao: "Manutenção",
  aquisicao: "Aquisição de veículo",
  seguro: "Seguro",
  vistoria: "Vistoria",
  translato: "Serviço avulso",
  operacional: "Operacional",
  outro: "Outro",
};

/** Tipos de serviço avulso (Translato). */
export type TransferServiceType =
  | "aeroporto_hotel"
  | "hotel_aeroporto"
  | "ponto_a_ponto"
  | "outro";

export const TRANSFER_SERVICE_TYPES: TransferServiceType[] = [
  "aeroporto_hotel",
  "hotel_aeroporto",
  "ponto_a_ponto",
  "outro",
];

export const TRANSFER_SERVICE_TYPE_LABELS: Record<TransferServiceType, string> = {
  aeroporto_hotel: "Aeroporto → Hotel / destino",
  hotel_aeroporto: "Hotel / origem → Aeroporto",
  ponto_a_ponto: "Ponto a ponto",
  outro: "Outro",
};

export interface TransferService {
  id: string;
  veiculoId: string;
  tipoServico: TransferServiceType;
  destino: string;
  data: string;
  valor: number;
  moeda: Currency;
  clienteNome?: string;
  obs?: string;
}

export interface FinanceEntry {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  moeda: Currency;
  tipo: "entrada" | "despesa";
  categoria: FinanceCategory;
  /** true = criado manualmente na tela Financeiro (pode excluir). */
  manual: boolean;
  veiculoId?: string;
}

export interface VehiclePayback {
  currency: Currency;
  cost: number;
  rented: number;
  expenses: number;
  remaining: number;
  pct: number;
  achieved: boolean;
}

/** Payback = faturamento (entradas) vs custo de aquisição, na mesma moeda.
 * remaining = custo − faturamento (positivo = ainda a recuperar; negativo = já lucrativo). */
export function calcVehiclePayback(
  vehicle: Pick<Vehicle, "id" | "custoAquisicao" | "moedaAquisicao">,
  finance: FinanceEntry[],
): VehiclePayback | null {
  const cost = vehicle.custoAquisicao;
  if (cost == null || cost <= 0) return null;
  const currency = vehicle.moedaAquisicao ?? "SRD";
  let rented = 0;
  let expenses = 0;
  for (const entry of finance) {
    if (entry.veiculoId !== vehicle.id || entry.moeda !== currency) continue;
    // Aquisição não entra de novo nas despesas operacionais do payback.
    if (entry.categoria === "aquisicao") continue;
    if (entry.tipo === "entrada") rented += entry.valor;
    else expenses += entry.valor;
  }
  return {
    currency,
    cost,
    rented,
    expenses,
    remaining: cost - rented,
    pct: (rented / cost) * 100,
    achieved: rented >= cost,
  };
}

export interface UserAccount {
  id: string;
  nome: string;
  email: string;
  login: string;
  ativo: boolean;
}

export interface ActivityLog {
  id: string;
  quando: string;
  usuario: string;
  acao: string;
  categoria?: string;
  pagina?: string;
  detalhes?: Record<string, JsonValue>;
}

export interface Store {
  vehicles: Vehicle[];
  vehicleCategories: VehicleCategory[];
  clients: Client[];
  rentals: Rental[];
  transferServices: TransferService[];
  maintenance: Maintenance[];
  finance: FinanceEntry[];
  users: UserAccount[];
  logs: ActivityLog[];
}

export const emptyStore: Store = {
  vehicles: [],
  vehicleCategories: [],
  clients: [],
  rentals: [],
  transferServices: [],
  maintenance: [],
  finance: [],
  users: [],
  logs: [],
};

export function fmtMoney(value: number, currency: Currency) {
  const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "SRD";
  return `${symbol} ${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
