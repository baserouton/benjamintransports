export type Category = "VANS" | "CARROS" | "PARTICULAR" | "PICAPE";
export type Currency = "SRD" | "USD" | "EUR";
export type RentalStatus = "pendente" | "entregue" | "devolvido";
export type MaintenanceType = "preventiva" | "corretiva";
export type JsonValue =
  string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

export interface Vehicle {
  id: string;
  modelo: string;
  placa: string;
  categoria: Category;
  fotos: string[];
  ano?: number;
  disponivel: boolean;
  seguroValidade?: string;
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

export interface FinanceEntry {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  moeda: Currency;
  tipo: "entrada" | "despesa";
  veiculoId?: string;
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
  clients: Client[];
  rentals: Rental[];
  maintenance: Maintenance[];
  finance: FinanceEntry[];
  users: UserAccount[];
  logs: ActivityLog[];
}

export const emptyStore: Store = {
  vehicles: [],
  clients: [],
  rentals: [],
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
