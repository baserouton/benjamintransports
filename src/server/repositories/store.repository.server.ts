import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  TRANSFER_SERVICE_TYPE_LABELS,
  type ActivityLog,
  type Client,
  type FinanceCategory,
  type FinanceEntry,
  type InspectionIn,
  type Maintenance,
  type Rental,
  type Store,
  type TransferService,
  type Vehicle,
  type VehicleCategory,
} from "@/domain/models";
import { db } from "@/server/db/client.server";
import {
  activityLogs,
  clients,
  financeEntries,
  maintenance,
  rentals,
  transferServices,
  users,
  vehicleCategories,
  vehicles,
} from "@/server/db/schema";

const formatDateTime = (value: Date | string) =>
  typeof value === "string"
    ? value.replace("T", " ").slice(0, 19)
    : value.toISOString().replace("T", " ").slice(0, 19);

export async function findStore(): Promise<Store> {
  const [
    vehicleRows,
    categoryRows,
    clientRows,
    rentalRows,
    transferRows,
    maintenanceRows,
    financeRows,
    userRows,
    logRows,
  ] = await Promise.all([
      db.select().from(vehicles).orderBy(vehicles.modelo),
      db.select().from(vehicleCategories).orderBy(vehicleCategories.nome),
      db.select().from(clients).orderBy(clients.nome),
      db.select().from(rentals).orderBy(desc(rentals.dataRetirada)),
      db.select().from(transferServices).orderBy(desc(transferServices.data)),
      db.select().from(maintenance).orderBy(desc(maintenance.data)),
      db.select().from(financeEntries).orderBy(desc(financeEntries.data)),
      db
        .select({
          id: users.id,
          nome: users.nome,
          email: users.email,
          login: users.login,
          ativo: users.ativo,
        })
        .from(users)
        .orderBy(users.nome),
      db.select().from(activityLogs).orderBy(desc(activityLogs.quando)).limit(1000),
    ]);

  return {
    vehicles: vehicleRows.map(({ createdAt: _createdAt, updatedAt: _updatedAt, ...row }) => ({
      ...row,
      ano: row.ano ?? undefined,
      seguroFeito: Boolean(row.seguroFeito),
      seguroValidade: row.seguroValidade ?? undefined,
      vistoriaFeita: Boolean(row.vistoriaFeita),
      vistoriaValidade: row.vistoriaValidade ?? undefined,
      custoAquisicao: row.custoAquisicao ?? undefined,
      moedaAquisicao: row.moedaAquisicao ?? undefined,
    })),
    vehicleCategories: categoryRows.map(({ createdAt: _c, updatedAt: _u, ...row }) => row),
    clients: clientRows.map(({ createdAt: _createdAt, updatedAt: _updatedAt, ...row }) => ({
      ...row,
      email: row.email ?? undefined,
      cnhUrl: row.cnhUrl ?? undefined,
      passaporteUrl: row.passaporteUrl ?? undefined,
      identiteitskaartUrl: row.identiteitskaartUrl ?? undefined,
    })),
    rentals: rentalRows.map(({ createdAt: _createdAt, updatedAt: _updatedAt, ...row }) => ({
      ...row,
      seguroValor: row.seguroValor ?? undefined,
      seguroObs: row.seguroObs ?? undefined,
      caucaoValor: row.caucaoValor ?? undefined,
      caucaoStatus: row.caucaoStatus ?? undefined,
      vistoriaRetirada: row.vistoriaRetirada ?? undefined,
      vistoriaDevolucao: row.vistoriaDevolucao ?? undefined,
    })),
    transferServices: transferRows.map(({ createdAt: _c, ...row }) => ({
      ...row,
      clienteNome: row.clienteNome ?? undefined,
      obs: row.obs ?? undefined,
    })),
    maintenance: maintenanceRows.map(
      ({ createdAt: _createdAt, updatedAt: _updatedAt, ...row }) => ({
        ...row,
        obs: row.obs ?? undefined,
      }),
    ),
    finance: financeRows.map(({ createdAt: _createdAt, ...row }) => ({
      ...row,
      categoria: (row.categoria as FinanceCategory) || "outro",
      manual: Boolean(row.manual),
      veiculoId: row.veiculoId ?? undefined,
    })),
    users: userRows,
    logs: logRows.map((row) => ({
      ...row,
      quando: formatDateTime(row.quando),
      categoria: row.categoria ?? undefined,
      pagina: row.pagina ?? undefined,
      detalhes: row.detalhes ?? undefined,
    })),
  };
}

export async function findActiveUser(login: string) {
  const [user] = await db
    .select({
      id: users.id,
      nome: users.nome,
      email: users.email,
      login: users.login,
      ativo: users.ativo,
    })
    .from(users)
    .where(eq(users.login, login))
    .limit(1);

  return user?.ativo ? user : null;
}

export async function assertVehicleCategoryExists(nome: string) {
  const normalized = nome.trim();
  const [row] = await db
    .select({ id: vehicleCategories.id })
    .from(vehicleCategories)
    .where(eq(vehicleCategories.nome, normalized))
    .limit(1);
  if (!row) throw new Error("Categoria não encontrada. Cadastre a categoria antes.");
  return normalized;
}

export async function insertVehicle(input: Omit<Vehicle, "id">) {
  const id = randomUUID();
  const seguroFeito = input.seguroFeito ?? false;
  const vistoriaFeita = input.vistoriaFeita ?? false;
  await db.transaction(async (tx) => {
    await tx.insert(vehicles).values({
      id,
      ...input,
      fotos: input.fotos ?? [],
      oculto: input.oculto ?? false,
      seguroFeito,
      seguroValidade: seguroFeito ? (input.seguroValidade ?? null) : null,
      vistoriaFeita,
      vistoriaValidade: vistoriaFeita ? (input.vistoriaValidade ?? null) : null,
    });
    if (input.custoAquisicao != null && input.custoAquisicao > 0) {
      await tx.insert(financeEntries).values({
        id: randomUUID(),
        data: new Date().toISOString().slice(0, 10),
        descricao: `Aquisição — ${input.modelo} (${input.placa})`,
        valor: input.custoAquisicao,
        moeda: input.moedaAquisicao ?? "SRD",
        tipo: "despesa",
        categoria: "aquisicao",
        manual: false,
        veiculoId: id,
      });
    }
  });
  return id;
}

export async function insertVehicleCategory(nome: string) {
  const normalized = nome.trim();
  if (!normalized) throw new Error("Informe o nome da categoria");
  const id = randomUUID();
  try {
    await db.insert(vehicleCategories).values({ id, nome: normalized, ativo: true });
  } catch {
    throw new Error("Já existe uma categoria com esse nome");
  }
  return { id, nome: normalized, ativo: true } satisfies VehicleCategory;
}

export async function updateVehicleCategory(id: string, nome: string) {
  const normalized = nome.trim();
  if (!normalized) throw new Error("Informe o nome da categoria");

  const [current] = await db
    .select()
    .from(vehicleCategories)
    .where(eq(vehicleCategories.id, id))
    .limit(1);
  if (!current) throw new Error("Categoria não encontrada");

  if (current.nome !== normalized) {
    const [dup] = await db
      .select({ id: vehicleCategories.id })
      .from(vehicleCategories)
      .where(eq(vehicleCategories.nome, normalized))
      .limit(1);
    if (dup) throw new Error("Já existe uma categoria com esse nome");

    await db.transaction(async (tx) => {
      await tx
        .update(vehicleCategories)
        .set({ nome: normalized })
        .where(eq(vehicleCategories.id, id));
      await tx
        .update(vehicles)
        .set({ categoria: normalized })
        .where(eq(vehicles.categoria, current.nome));
    });
  }

  return { id, nome: normalized, ativo: current.ativo } satisfies VehicleCategory;
}

export type VehicleUpdateInput = {
  modelo: string;
  placa: string;
  categoria: Vehicle["categoria"];
  ano?: number;
  seguroFeito: boolean;
  seguroValidade?: string;
  vistoriaFeita: boolean;
  vistoriaValidade?: string;
  custoAquisicao?: number;
  moedaAquisicao?: Vehicle["moedaAquisicao"];
  fotos?: string[];
};

export async function updateVehicle(id: string, input: VehicleUpdateInput) {
  await db.transaction(async (tx) => {
    await tx
      .update(vehicles)
      .set({
        modelo: input.modelo,
        placa: input.placa,
        categoria: input.categoria,
        ano: input.ano ?? null,
        seguroFeito: input.seguroFeito,
        seguroValidade: input.seguroFeito ? (input.seguroValidade ?? null) : null,
        vistoriaFeita: input.vistoriaFeita,
        vistoriaValidade: input.vistoriaFeita ? (input.vistoriaValidade ?? null) : null,
        custoAquisicao: input.custoAquisicao ?? null,
        moedaAquisicao: input.moedaAquisicao ?? null,
        ...(input.fotos ? { fotos: input.fotos } : {}),
      })
      .where(eq(vehicles.id, id));

    if (input.custoAquisicao != null && input.custoAquisicao > 0) {
      const [existing] = await tx
        .select({ id: financeEntries.id })
        .from(financeEntries)
        .where(
          and(eq(financeEntries.veiculoId, id), eq(financeEntries.categoria, "aquisicao")),
        )
        .limit(1);
      const descricao = `Aquisição — ${input.modelo} (${input.placa})`;
      const moeda = input.moedaAquisicao ?? "SRD";
      if (existing) {
        await tx
          .update(financeEntries)
          .set({
            descricao,
            valor: input.custoAquisicao,
            moeda,
          })
          .where(eq(financeEntries.id, existing.id));
      } else {
        await tx.insert(financeEntries).values({
          id: randomUUID(),
          data: new Date().toISOString().slice(0, 10),
          descricao,
          valor: input.custoAquisicao,
          moeda,
          tipo: "despesa",
          categoria: "aquisicao",
          manual: false,
          veiculoId: id,
        });
      }
    }
  });
}

export async function setVehicleHidden(id: string, oculto: boolean) {
  const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
  if (!vehicle) throw new Error("Veículo não encontrado");

  if (oculto) {
    const [active] = await db
      .select({ id: rentals.id })
      .from(rentals)
      .where(and(eq(rentals.veiculoId, id), inArray(rentals.status, ["pendente", "entregue"])))
      .limit(1);
    if (active) {
      throw new Error(
        "Não é possível ocultar: existe locação pendente ou em andamento. Finalize a locação antes.",
      );
    }
  }

  await db.update(vehicles).set({ oculto }).where(eq(vehicles.id, id));
  return vehicle;
}

export async function insertClient(input: Omit<Client, "id">) {
  const id = randomUUID();
  await db.insert(clients).values({
    id,
    ...input,
    email: input.email || null,
    cnhUrl: input.cnhUrl || null,
    passaporteUrl: input.passaporteUrl || null,
    identiteitskaartUrl: input.identiteitskaartUrl || null,
  });
  return id;
}

export async function insertRental(input: Omit<Rental, "id" | "status">) {
  const id = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(rentals).values({
      id,
      ...input,
      status: "pendente",
      seguroValor: input.seguroValor ?? null,
      seguroObs: input.seguroObs ?? null,
      caucaoValor: input.caucaoValor ?? null,
      caucaoStatus: input.caucaoValor ? "retido" : null,
      vistoriaRetirada: input.vistoriaRetirada ?? null,
      vistoriaDevolucao: input.vistoriaDevolucao ?? null,
    });
    await tx.update(vehicles).set({ disponivel: false }).where(eq(vehicles.id, input.veiculoId));
    const [vehicle] = await tx
      .select({ modelo: vehicles.modelo })
      .from(vehicles)
      .where(eq(vehicles.id, input.veiculoId))
      .limit(1);
    await tx.insert(financeEntries).values({
      id: randomUUID(),
      data: input.dataRetirada,
      descricao: `Aluguel ${vehicle?.modelo ?? ""}`.trim(),
      valor: input.valorAluguel,
      moeda: input.moeda,
      tipo: "entrada",
      categoria: "aluguel",
      manual: false,
      veiculoId: input.veiculoId,
    });
    if (input.seguroValor != null && input.seguroValor > 0) {
      await tx.insert(financeEntries).values({
        id: randomUUID(),
        data: input.dataRetirada,
        descricao: `Seguro locação — ${vehicle?.modelo ?? ""}`.trim(),
        valor: input.seguroValor,
        moeda: input.moeda,
        tipo: "entrada",
        categoria: "seguro",
        manual: false,
        veiculoId: input.veiculoId,
      });
    }
  });
  return id;
}

export async function insertMaintenance(input: Omit<Maintenance, "id">) {
  const id = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(maintenance).values({
      id,
      ...input,
      obs: input.obs || null,
    });
    const [vehicle] = await tx
      .select({ placa: vehicles.placa })
      .from(vehicles)
      .where(eq(vehicles.id, input.veiculoId))
      .limit(1);
    await tx.insert(financeEntries).values({
      id: randomUUID(),
      data: input.data,
      descricao: `Manutenção ${input.tipo} — ${vehicle?.placa ?? ""}`.trim(),
      valor: input.custo,
      moeda: input.moeda,
      tipo: "despesa",
      categoria: "manutencao",
      manual: false,
      veiculoId: input.veiculoId,
    });
  });
  return id;
}

export async function deliverRental(id: string) {
  await db.transaction(async (tx) => {
    const [rental] = await tx
      .select({ veiculoId: rentals.veiculoId })
      .from(rentals)
      .where(eq(rentals.id, id))
      .limit(1);
    if (!rental) throw new Error("Locação não encontrada");
    await tx.update(rentals).set({ status: "entregue" }).where(eq(rentals.id, id));
    await tx.update(vehicles).set({ disponivel: false }).where(eq(vehicles.id, rental.veiculoId));
  });
}

export async function returnRental(id: string, inspection: InspectionIn) {
  await db.transaction(async (tx) => {
    const [rental] = await tx.select().from(rentals).where(eq(rentals.id, id)).limit(1);
    if (!rental) throw new Error("Locação não encontrada");
    await tx
      .update(rentals)
      .set({
        status: "devolvido",
        vistoriaDevolucao: inspection,
        caucaoStatus:
          inspection.semAvarias && rental.caucaoValor ? "devolvido" : rental.caucaoStatus,
      })
      .where(eq(rentals.id, id));
    await tx.update(vehicles).set({ disponivel: true }).where(eq(vehicles.id, rental.veiculoId));
    if (inspection.taxa > 0) {
      const [vehicle] = await tx
        .select({ placa: vehicles.placa })
        .from(vehicles)
        .where(eq(vehicles.id, rental.veiculoId))
        .limit(1);
      await tx.insert(financeEntries).values({
        id: randomUUID(),
        data: new Date().toISOString().slice(0, 10),
        descricao: `Taxa não conformidade — ${vehicle?.placa ?? ""}`.trim(),
        valor: inspection.taxa,
        moeda: rental.moeda,
        tipo: "entrada",
        categoria: "taxa",
        manual: false,
        veiculoId: rental.veiculoId,
      });
    }
  });
}

export async function insertTransferService(input: Omit<TransferService, "id">) {
  const id = randomUUID();
  const [vehicle] = await db
    .select({
      id: vehicles.id,
      modelo: vehicles.modelo,
      placa: vehicles.placa,
      disponivel: vehicles.disponivel,
      oculto: vehicles.oculto,
    })
    .from(vehicles)
    .where(eq(vehicles.id, input.veiculoId))
    .limit(1);
  if (!vehicle) throw new Error("Veículo não encontrado");
  if (vehicle.oculto) throw new Error("Veículo oculto não pode ser usado no Translato");
  if (!vehicle.disponivel) {
    throw new Error("Só é possível usar veículos disponíveis (não alugados)");
  }

  const tipoLabel = TRANSFER_SERVICE_TYPE_LABELS[input.tipoServico] ?? input.tipoServico;

  await db.transaction(async (tx) => {
    await tx.insert(transferServices).values({
      id,
      veiculoId: input.veiculoId,
      tipoServico: input.tipoServico,
      destino: input.destino.trim(),
      data: input.data,
      valor: input.valor,
      moeda: input.moeda,
      clienteNome: input.clienteNome?.trim() || null,
      obs: input.obs?.trim() || null,
    });
    await tx.insert(financeEntries).values({
      id: randomUUID(),
      data: input.data,
      descricao: `Serviço avulso — ${tipoLabel} → ${input.destino.trim()} — ${vehicle.placa}`,
      valor: input.valor,
      moeda: input.moeda,
      tipo: "entrada",
      categoria: "translato",
      manual: false,
      veiculoId: input.veiculoId,
    });
  });
  return id;
}

export async function insertFinanceEntry(
  input: Omit<FinanceEntry, "id" | "manual"> & { manual?: boolean },
) {
  const id = randomUUID();
  await db.insert(financeEntries).values({
    id,
    data: input.data,
    descricao: input.descricao.trim(),
    valor: input.valor,
    moeda: input.moeda,
    tipo: input.tipo,
    categoria: input.categoria,
    manual: input.manual ?? true,
    veiculoId: input.veiculoId ?? null,
  });
  return id;
}

export async function deleteFinanceEntry(id: string) {
  const [row] = await db
    .select({ id: financeEntries.id, manual: financeEntries.manual })
    .from(financeEntries)
    .where(eq(financeEntries.id, id))
    .limit(1);
  if (!row) throw new Error("Lançamento não encontrado");
  if (!row.manual) {
    throw new Error("Só é possível excluir lançamentos manuais");
  }
  await db.delete(financeEntries).where(eq(financeEntries.id, id));
  return { id };
}

export async function insertActivityLog(input: Omit<ActivityLog, "id" | "quando">) {
  await db.insert(activityLogs).values({
    id: randomUUID(),
    usuario: input.usuario,
    acao: input.acao,
    categoria: input.categoria ?? null,
    pagina: input.pagina ?? null,
    detalhes: input.detalhes ?? null,
  });
}
