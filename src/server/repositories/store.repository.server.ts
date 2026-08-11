import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import type {
  ActivityLog,
  Client,
  InspectionIn,
  Maintenance,
  Rental,
  Store,
  Vehicle,
  VehicleCategory,
} from "@/domain/models";
import { db } from "@/server/db/client.server";
import {
  activityLogs,
  clients,
  financeEntries,
  maintenance,
  rentals,
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
    maintenanceRows,
    financeRows,
    userRows,
    logRows,
  ] = await Promise.all([
      db.select().from(vehicles).orderBy(vehicles.modelo),
      db.select().from(vehicleCategories).orderBy(vehicleCategories.nome),
      db.select().from(clients).orderBy(clients.nome),
      db.select().from(rentals).orderBy(desc(rentals.dataRetirada)),
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
      seguroValidade: row.seguroValidade ?? undefined,
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
    maintenance: maintenanceRows.map(
      ({ createdAt: _createdAt, updatedAt: _updatedAt, ...row }) => ({
        ...row,
        obs: row.obs ?? undefined,
      }),
    ),
    finance: financeRows.map(({ createdAt: _createdAt, ...row }) => ({
      ...row,
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
  await db.insert(vehicles).values({
    id,
    ...input,
    fotos: input.fotos ?? [],
    oculto: input.oculto ?? false,
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
  seguroValidade?: string;
  custoAquisicao?: number;
  moedaAquisicao?: Vehicle["moedaAquisicao"];
  fotos?: string[];
};

export async function updateVehicle(id: string, input: VehicleUpdateInput) {
  await db
    .update(vehicles)
    .set({
      modelo: input.modelo,
      placa: input.placa,
      categoria: input.categoria,
      ano: input.ano ?? null,
      seguroValidade: input.seguroValidade ?? null,
      custoAquisicao: input.custoAquisicao ?? null,
      moedaAquisicao: input.moedaAquisicao ?? null,
      ...(input.fotos ? { fotos: input.fotos } : {}),
    })
    .where(eq(vehicles.id, id));
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
      veiculoId: input.veiculoId,
    });
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
        veiculoId: rental.veiculoId,
      });
    }
  });
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
