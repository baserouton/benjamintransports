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
  setVehicleHidden,
  updateVehicle,
  type VehicleUpdateInput,
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
  const id = await insertVehicle({ ...data, oculto: false });
  await insertActivityLog({
    usuario: session.login,
    acao: `Cadastrou veículo ${data.modelo} (${data.placa})`,
    categoria: "veiculo",
    detalhes: { id, fotos: data.fotos.length },
  });
  return { id };
}

export async function updateVehicleHandler(data: { id: string } & VehicleUpdateInput) {
  const session = await requireSession();
  const { id, ...input } = data;
  await updateVehicle(id, input);
  await insertActivityLog({
    usuario: session.login,
    acao: `Atualizou veículo ${input.modelo} (${input.placa})`,
    categoria: "veiculo",
    detalhes: { id },
  });
  return { id };
}

export async function hideVehicleHandler(data: { id: string }) {
  const session = await requireSession();
  const vehicle = await setVehicleHidden(data.id, true);
  await insertActivityLog({
    usuario: session.login,
    acao: `Ocultou veículo ${vehicle.modelo} (${vehicle.placa}) — histórico preservado`,
    categoria: "veiculo",
    detalhes: { id: data.id, oculto: true },
  });
  return { id: data.id };
}

export async function restoreVehicleHandler(data: { id: string }) {
  const session = await requireSession();
  const vehicle = await setVehicleHidden(data.id, false);
  await insertActivityLog({
    usuario: session.login,
    acao: `Restaurou veículo ${vehicle.modelo} (${vehicle.placa}) na lista`,
    categoria: "veiculo",
    detalhes: { id: data.id, oculto: false },
  });
  return { id: data.id };
}

export async function uploadVehiclePhotosHandler(data: { images: string[] }) {
  const session = await requireSession();
  const { saveVehiclePhotoDataUrls } = await import("@/server/uploads/storage.server");
  const urls = await saveVehiclePhotoDataUrls(data.images);
  await insertActivityLog({
    usuario: session.login,
    acao: `Enviou ${urls.length} foto(s) de veículo`,
    categoria: "veiculo",
    detalhes: { count: urls.length },
  });
  return { urls };
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
