import type { Client, InspectionIn, Maintenance, Rental, Vehicle } from "@/domain/models";
import {
  authenticate,
  destroySession,
  readSession,
  requireSession,
} from "@/server/auth/auth.server";
import {
  deliverRental,
  findStore,
  insertActivityLog,
  insertClient,
  insertMaintenance,
  insertRental,
  insertVehicle,
  returnRental,
} from "@/server/repositories/store.repository.server";

export async function loginHandler(data: { login: string; password: string }) {
  const user = await authenticate(data.login, data.password);
  if (!user) throw new Error("Senha ou login não compatível");
  // Não bloqueia a resposta do login pela auditoria (1 RTT remoto a menos).
  void insertActivityLog({
    usuario: user.login,
    acao: `Login efetuado (${user.nome})`,
    categoria: "auth",
  }).catch((error) => {
    console.error("Falha ao registrar login", error);
  });
  return user;
}

export async function logoutHandler() {
  const session = await requireSession();
  await insertActivityLog({
    usuario: session.login,
    acao: `Logout (${session.nome})`,
    categoria: "auth",
  });
  await destroySession();
  return { ok: true };
}

export async function currentUserHandler() {
  const session = await readSession();
  if (!session) return null;
  return {
    id: session.userId,
    login: session.login,
    nome: session.nome,
    email: session.email,
  };
}

export async function storeHandler() {
  await requireSession();
  return findStore();
}

export async function createVehicleHandler(data: Omit<Vehicle, "id">) {
  const session = await requireSession();
  const id = await insertVehicle(data);
  await insertActivityLog({
    usuario: session.login,
    acao: `Cadastrou veículo ${data.modelo} (${data.placa})`,
    categoria: "veiculo",
    detalhes: { id },
  });
  return { id };
}

export async function createClientHandler(data: Omit<Client, "id">) {
  const session = await requireSession();
  const id = await insertClient(data);
  await insertActivityLog({
    usuario: session.login,
    acao: `Cadastrou cliente ${data.nome}`,
    categoria: "cliente",
    detalhes: { id },
  });
  return { id };
}

export async function createRentalHandler(data: Omit<Rental, "id" | "status">) {
  const session = await requireSession();
  const id = await insertRental(data);
  await insertActivityLog({
    usuario: session.login,
    acao: `Registrou locação ${id.slice(0, 6)} (${data.dataRetirada} → ${data.dataSaida})`,
    categoria: "locacao",
    detalhes: { id },
  });
  return { id };
}

export async function createMaintenanceHandler(data: Omit<Maintenance, "id">) {
  const session = await requireSession();
  const id = await insertMaintenance(data);
  await insertActivityLog({
    usuario: session.login,
    acao: `Registrou manutenção ${data.tipo}`,
    categoria: "manutencao",
    detalhes: { id, veiculoId: data.veiculoId },
  });
  return { id };
}

export async function deliverRentalHandler(data: { id: string }) {
  const session = await requireSession();
  await deliverRental(data.id);
  await insertActivityLog({
    usuario: session.login,
    acao: `Marcou locação ${data.id.slice(0, 6)} como entregue`,
    categoria: "locacao",
  });
  return { ok: true };
}

export async function returnRentalHandler(data: { id: string; inspection: InspectionIn }) {
  const session = await requireSession();
  await returnRental(data.id, data.inspection);
  await insertActivityLog({
    usuario: session.login,
    acao: `Fechou locação ${data.id.slice(0, 6)}`,
    categoria: "locacao",
  });
  return { ok: true };
}

export async function activityLogHandler(data: {
  acao: string;
  categoria?: string;
  pagina?: string;
  detalhes?: Record<string, import("@/domain/models").JsonValue>;
}) {
  const session = await requireSession();
  await insertActivityLog({ usuario: session.login, ...data });
  return { ok: true };
}
