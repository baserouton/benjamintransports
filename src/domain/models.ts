/** Nome da categoria de veículo (dinâmico, cadastrado pelo usuário). */
export type Category = string;
export type Currency = "SRD" | "USD" | "EUR";
export type RentalStatus = "pendente" | "entregue" | "devolvido";
export type MaintenanceType = "preventiva" | "corretiva";
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
  /** Valor pago na compra do veículo (base do payback). */
  custoAquisicao?: number;
  moedaAquisicao?: Currency;
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
