import {
  boolean,
  date,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import type { InspectionIn, InspectionOut, JsonValue } from "@/domain/models";

const id = () => varchar("id", { length: 36 });
const money = (name: string) => decimal(name, { precision: 14, scale: 2, mode: "number" });

export const vehicleCategories = mysqlTable(
  "vehicle_categories",
  {
    id: id().primaryKey(),
    nome: varchar("nome", { length: 80 }).notNull(),
    ativo: boolean("ativo").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("vehicle_categories_nome_unique").on(table.nome),
    index("vehicle_categories_ativo_idx").on(table.ativo),
  ],
);

export const vehicles = mysqlTable(
  "vehicles",
  {
    id: id().primaryKey(),
    modelo: varchar("modelo", { length: 160 }).notNull(),
    placa: varchar("placa", { length: 32 }).notNull(),
    categoria: varchar("categoria", { length: 80 }).notNull(),
    fotos: json("fotos").$type<string[]>().notNull(),
    ano: int("ano"),
    disponivel: boolean("disponivel").notNull().default(true),
    oculto: boolean("oculto").notNull().default(false),
    seguroValidade: date("seguro_validade", { mode: "string" }),
    custoAquisicao: money("custo_aquisicao"),
    moedaAquisicao: mysqlEnum("moeda_aquisicao", ["SRD", "USD", "EUR"]),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("vehicles_placa_unique").on(table.placa),
    index("vehicles_categoria_idx").on(table.categoria),
    index("vehicles_disponivel_idx").on(table.disponivel),
    index("vehicles_oculto_idx").on(table.oculto),
  ],
);

export const clients = mysqlTable(
  "clients",
  {
    id: id().primaryKey(),
    nome: varchar("nome", { length: 180 }).notNull(),
    rg: varchar("rg", { length: 40 }).notNull().default(""),
    cpf: varchar("cpf", { length: 40 }).notNull().default(""),
    endereco: varchar("endereco", { length: 500 }).notNull().default(""),
    whatsapp: varchar("whatsapp", { length: 40 }).notNull().default(""),
    email: varchar("email", { length: 254 }),
    cnhUrl: varchar("cnh_url", { length: 1000 }),
    suriname: boolean("suriname").notNull().default(false),
    passaporteUrl: varchar("passaporte_url", { length: 1000 }),
    identiteitskaartUrl: varchar("identiteitskaart_url", { length: 1000 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [index("clients_nome_idx").on(table.nome), index("clients_cpf_idx").on(table.cpf)],
);

export const rentals = mysqlTable(
  "rentals",
  {
    id: id().primaryKey(),
    veiculoId: varchar("veiculo_id", { length: 36 })
      .notNull()
      .references(() => vehicles.id, { onDelete: "restrict", onUpdate: "cascade" }),
    clienteId: varchar("cliente_id", { length: 36 })
      .notNull()
      .references(() => clients.id, { onDelete: "restrict", onUpdate: "cascade" }),
    dataRetirada: date("data_retirada", { mode: "string" }).notNull(),
    dataSaida: date("data_saida", { mode: "string" }).notNull(),
    status: mysqlEnum("status", ["pendente", "entregue", "devolvido"])
      .notNull()
      .default("pendente"),
    valorAluguel: money("valor_aluguel").notNull(),
    moeda: mysqlEnum("moeda", ["SRD", "USD", "EUR"]).notNull(),
    seguroValor: money("seguro_valor"),
    seguroObs: varchar("seguro_obs", { length: 1000 }),
    caucaoValor: money("caucao_valor"),
    caucaoStatus: mysqlEnum("caucao_status", ["retido", "devolvido"]),
    vistoriaRetirada: json("vistoria_retirada").$type<InspectionOut>(),
    vistoriaDevolucao: json("vistoria_devolucao").$type<InspectionIn>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("rentals_veiculo_idx").on(table.veiculoId),
    index("rentals_cliente_idx").on(table.clienteId),
    index("rentals_status_idx").on(table.status),
    index("rentals_periodo_idx").on(table.dataRetirada, table.dataSaida),
  ],
);

export const maintenance = mysqlTable(
  "maintenance",
  {
    id: id().primaryKey(),
    veiculoId: varchar("veiculo_id", { length: 36 })
      .notNull()
      .references(() => vehicles.id, { onDelete: "restrict", onUpdate: "cascade" }),
    tipo: mysqlEnum("tipo", ["preventiva", "corretiva"]).notNull(),
    pecas: varchar("pecas", { length: 1000 }).notNull(),
    custo: money("custo").notNull(),
    moeda: mysqlEnum("moeda", ["SRD", "USD", "EUR"]).notNull(),
    data: date("data", { mode: "string" }).notNull(),
    obs: varchar("obs", { length: 2000 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("maintenance_veiculo_idx").on(table.veiculoId),
    index("maintenance_data_idx").on(table.data),
  ],
);

export const financeEntries = mysqlTable(
  "finance_entries",
  {
    id: id().primaryKey(),
    data: date("data", { mode: "string" }).notNull(),
    descricao: varchar("descricao", { length: 500 }).notNull(),
    valor: money("valor").notNull(),
    moeda: mysqlEnum("moeda", ["SRD", "USD", "EUR"]).notNull(),
    tipo: mysqlEnum("tipo", ["entrada", "despesa"]).notNull(),
    veiculoId: varchar("veiculo_id", { length: 36 }).references(() => vehicles.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("finance_data_idx").on(table.data),
    index("finance_tipo_idx").on(table.tipo),
    index("finance_veiculo_idx").on(table.veiculoId),
  ],
);

export const users = mysqlTable(
  "users",
  {
    id: id().primaryKey(),
    nome: varchar("nome", { length: 180 }).notNull(),
    email: varchar("email", { length: 254 }).notNull(),
    login: varchar("login", { length: 80 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    ativo: boolean("ativo").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    uniqueIndex("users_login_unique").on(table.login),
  ],
);

export const sessions = mysqlTable(
  "sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("sessions_user_idx").on(table.userId),
    index("sessions_expires_idx").on(table.expiresAt),
  ],
);

export const activityLogs = mysqlTable(
  "activity_logs",
  {
    id: id().primaryKey(),
    quando: timestamp("quando").notNull().defaultNow(),
    usuario: varchar("usuario", { length: 80 }).notNull(),
    acao: varchar("acao", { length: 1000 }).notNull(),
    categoria: varchar("categoria", { length: 80 }),
    pagina: varchar("pagina", { length: 500 }),
    detalhes: json("detalhes").$type<Record<string, JsonValue>>(),
  },
  (table) => [
    index("activity_logs_quando_idx").on(table.quando),
    index("activity_logs_usuario_idx").on(table.usuario),
    index("activity_logs_categoria_idx").on(table.categoria),
  ],
);
