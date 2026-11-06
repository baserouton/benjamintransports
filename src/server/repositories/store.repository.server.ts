import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  TRANSFER_SERVICE_TYPE_LABELS,
  type ActivityLog,
  type Client,
  type FinanceCategory,
  type FinanceEntry,
  type InspectionIn,
  type InspectionOut,
  type Maintenance,
  type Rental,
  type RentalRenewal,
  type Store,
  type TransferService,
  type Vehicle,
  type VehicleCategory,
} from "@/domain/models";
import {
  applyUsdRates,
  backfillMissingFinanceUsd,
  getUsdRates,
  snapshotUsd,
  type UsdSnapshot,
} from "@/server/fx/exchange-rate.server";
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

function usdColumns(snap: UsdSnapshot) {
  return {
    valorUsd: snap.valorUsd,
    taxaUsd: snap.taxaUsd,
    cotacaoEm: snap.cotacaoEm,
    cotacaoFonte: snap.cotacaoFonte,
  };
}

const formatDateTime = (value: Date | string) =>
  typeof value === "string"
    ? value.replace("T", " ").slice(0, 19)
    : value.toISOString().replace("T", " ").slice(0, 19);

export async function findStore(): Promise<Store> {
  try {
    await backfillMissingFinanceUsd();
  } catch (error) {
    console.error("Falha ao converter lançamentos antigos para USD", error);
  }

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
      kmAtual: row.kmAtual ?? undefined,
      kmUltimaTrocaOleo: row.kmUltimaTrocaOleo ?? undefined,
      intervaloTrocaOleoKm: row.intervaloTrocaOleoKm ?? undefined,
      custoAquisicao: row.custoAquisicao ?? undefined,
      moedaAquisicao: row.moedaAquisicao ?? undefined,
    })),
    vehicleCategories: categoryRows.map(({ createdAt: _c, updatedAt: _u, ...row }) => row),
    clients: clientRows.map(({ createdAt: _createdAt, updatedAt, ...row }) => ({
      ...row,
      email: row.email ?? undefined,
      cnhUrl: row.cnhUrl ?? undefined,
      passaporteUrl: row.passaporteUrl ?? undefined,
      identiteitskaartUrl: row.identiteitskaartUrl ?? undefined,
      updatedAt: updatedAt ? formatDateTime(updatedAt) : undefined,
    })),
    rentals: rentalRows.map(({ createdAt: _createdAt, updatedAt: _updatedAt, ...row }) => ({
      ...row,
      seguroValor: row.seguroValor ?? undefined,
      seguroObs: row.seguroObs ?? undefined,
      caucaoValor: row.caucaoValor ?? undefined,
      caucaoStatus: row.caucaoStatus ?? undefined,
      vistoriaRetirada: row.vistoriaRetirada ?? undefined,
      vistoriaDevolucao: row.vistoriaDevolucao ?? undefined,
      prazoIndeterminado: Boolean(row.prazoIndeterminado),
      renovacoes: row.renovacoes ?? undefined,
      contratoAssinaturaUrl: row.contratoAssinaturaUrl ?? undefined,
      contratoAssinadoEm: row.contratoAssinadoEm ? formatDateTime(row.contratoAssinadoEm) : undefined,
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
        kmTroca: row.kmTroca ?? undefined,
        kmProxima: row.kmProxima ?? undefined,
      }),
    ),
    finance: financeRows.map(({ createdAt: _createdAt, ...row }) => ({
      ...row,
      valorUsd: row.valorUsd ?? (row.moeda === "USD" ? row.valor : 0),
      taxaUsd: row.taxaUsd ?? (row.moeda === "USD" ? 1 : 0),
      cotacaoEm: row.cotacaoEm ? formatDateTime(row.cotacaoEm) : undefined,
      cotacaoFonte: row.cotacaoFonte ?? undefined,
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
  const aquisicaoSnap =
    input.custoAquisicao != null && input.custoAquisicao > 0
      ? await snapshotUsd(input.custoAquisicao, input.moedaAquisicao ?? "USD")
      : null;
  await db.transaction(async (tx) => {
    await tx.insert(vehicles).values({
      id,
      modelo: input.modelo,
      placa: input.placa,
      categoria: input.categoria,
      fotos: input.fotos ?? [],
      ano: input.ano ?? null,
      disponivel: input.disponivel ?? true,
      oculto: input.oculto ?? false,
      seguroFeito,
      seguroValidade: seguroFeito ? (input.seguroValidade ?? null) : null,
      vistoriaFeita,
      vistoriaValidade: vistoriaFeita ? (input.vistoriaValidade ?? null) : null,
      kmAtual: input.kmAtual ?? null,
      kmUltimaTrocaOleo: input.kmUltimaTrocaOleo ?? null,
      intervaloTrocaOleoKm: input.intervaloTrocaOleoKm ?? 5000,
      custoAquisicao: input.custoAquisicao ?? null,
      moedaAquisicao: input.moedaAquisicao ?? null,
    });
    if (aquisicaoSnap && input.custoAquisicao != null && input.custoAquisicao > 0) {
      await tx.insert(financeEntries).values({
        id: randomUUID(),
        data: new Date().toISOString().slice(0, 10),
        descricao: `Aquisição — ${input.modelo} (${input.placa})`,
        valor: input.custoAquisicao,
        moeda: input.moedaAquisicao ?? "USD",
        tipo: "despesa",
        categoria: "aquisicao",
        manual: false,
        veiculoId: id,
        ...usdColumns(aquisicaoSnap),
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

export async function deleteVehicleCategory(id: string, migrateToCategoryId?: string) {
  const [current] = await db
    .select()
    .from(vehicleCategories)
    .where(eq(vehicleCategories.id, id))
    .limit(1);
  if (!current) throw new Error("Categoria não encontrada");

  const vehiclesInCategory = await db
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(eq(vehicles.categoria, current.nome));

  if (vehiclesInCategory.length > 0) {
    if (!migrateToCategoryId) {
      throw new Error(
        `Há ${vehiclesInCategory.length} veículo(s) nesta categoria. Escolha para onde migrar.`,
      );
    }
    if (migrateToCategoryId === id) {
      throw new Error("Escolha uma categoria diferente para migrar os veículos");
    }
    const [target] = await db
      .select()
      .from(vehicleCategories)
      .where(eq(vehicleCategories.id, migrateToCategoryId))
      .limit(1);
    if (!target) throw new Error("Categoria de destino não encontrada");

    await db.transaction(async (tx) => {
      await tx
        .update(vehicles)
        .set({ categoria: target.nome })
        .where(eq(vehicles.categoria, current.nome));
      await tx.delete(vehicleCategories).where(eq(vehicleCategories.id, id));
    });

    return {
      id,
      nome: current.nome,
      migratedTo: target.nome,
      vehiclesMoved: vehiclesInCategory.length,
    };
  }

  await db.delete(vehicleCategories).where(eq(vehicleCategories.id, id));
  return { id, nome: current.nome, migratedTo: null as string | null, vehiclesMoved: 0 };
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
  kmAtual?: number;
  kmUltimaTrocaOleo?: number;
  intervaloTrocaOleoKm?: number;
  custoAquisicao?: number;
  moedaAquisicao?: Vehicle["moedaAquisicao"];
  fotos?: string[];
};

export async function updateVehicle(id: string, input: VehicleUpdateInput) {
  const moeda = input.moedaAquisicao ?? "USD";
  const [existingAcq] =
    input.custoAquisicao != null && input.custoAquisicao > 0
      ? await db
          .select({
            id: financeEntries.id,
            valor: financeEntries.valor,
            moeda: financeEntries.moeda,
            valorUsd: financeEntries.valorUsd,
            taxaUsd: financeEntries.taxaUsd,
            cotacaoEm: financeEntries.cotacaoEm,
            cotacaoFonte: financeEntries.cotacaoFonte,
          })
          .from(financeEntries)
          .where(and(eq(financeEntries.veiculoId, id), eq(financeEntries.categoria, "aquisicao")))
          .limit(1)
      : [];
  const sameAcq =
    existingAcq &&
    existingAcq.valor === input.custoAquisicao &&
    existingAcq.moeda === moeda &&
    existingAcq.valorUsd != null;
  const aquisicaoSnap =
    input.custoAquisicao != null && input.custoAquisicao > 0 && !sameAcq
      ? await snapshotUsd(input.custoAquisicao, moeda)
      : sameAcq && existingAcq.valorUsd != null
        ? {
            valorUsd: existingAcq.valorUsd,
            taxaUsd: existingAcq.taxaUsd ?? 1,
            cotacaoEm:
              existingAcq.cotacaoEm instanceof Date
                ? existingAcq.cotacaoEm
                : new Date(existingAcq.cotacaoEm ?? Date.now()),
            cotacaoFonte: (existingAcq.cotacaoFonte as UsdSnapshot["cotacaoFonte"]) ?? "usd",
          }
        : null;

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
        kmAtual: input.kmAtual ?? null,
        kmUltimaTrocaOleo: input.kmUltimaTrocaOleo ?? null,
        intervaloTrocaOleoKm: input.intervaloTrocaOleoKm ?? 5000,
        custoAquisicao: input.custoAquisicao ?? null,
        moedaAquisicao: input.moedaAquisicao ?? null,
        ...(input.fotos ? { fotos: input.fotos } : {}),
      })
      .where(eq(vehicles.id, id));

    if (input.custoAquisicao != null && input.custoAquisicao > 0 && aquisicaoSnap) {
      const descricao = `Aquisição — ${input.modelo} (${input.placa})`;
      if (existingAcq) {
        await tx
          .update(financeEntries)
          .set({
            descricao,
            valor: input.custoAquisicao,
            moeda,
            ...usdColumns(aquisicaoSnap),
          })
          .where(eq(financeEntries.id, existingAcq.id));
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
          ...usdColumns(aquisicaoSnap),
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

export async function insertClient(input: Omit<Client, "id" | "updatedAt">) {
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

export async function updateClient(id: string, input: Omit<Client, "id" | "updatedAt">) {
  const [existing] = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, id)).limit(1);
  if (!existing) throw new Error("Cliente não encontrado");
  await db
    .update(clients)
    .set({
      nome: input.nome.trim(),
      rg: input.rg.trim(),
      cpf: input.cpf.trim(),
      endereco: input.endereco.trim(),
      whatsapp: input.whatsapp.trim(),
      email: input.email?.trim() || null,
      cnhUrl: input.cnhUrl || null,
      suriname: input.suriname ?? false,
      passaporteUrl: input.passaporteUrl || null,
      identiteitskaartUrl: input.identiteitskaartUrl || null,
    })
    .where(eq(clients.id, id));
  return { id };
}

export async function insertRental(input: Omit<Rental, "id" | "status">) {
  const id = randomUUID();
  const rates = await getUsdRates();
  const aluguelSnap = applyUsdRates(input.valorAluguel, input.moeda, rates);
  const seguroSnap =
    input.seguroValor != null && input.seguroValor > 0
      ? applyUsdRates(input.seguroValor, input.moeda, rates)
      : null;
  await db.transaction(async (tx) => {
    const {
      prazoIndeterminado,
      renovacoes,
      contratoAssinaturaUrl: _assinatura,
      contratoAssinadoEm: _assinadoEm,
      ...rentalFields
    } = input;
    await tx.insert(rentals).values({
      id,
      ...rentalFields,
      status: "pendente",
      seguroValor: input.seguroValor ?? null,
      seguroObs: input.seguroObs ?? null,
      caucaoValor: input.caucaoValor ?? null,
      caucaoStatus: input.caucaoValor ? "retido" : null,
      vistoriaRetirada: input.vistoriaRetirada ?? null,
      vistoriaDevolucao: input.vistoriaDevolucao ?? null,
      prazoIndeterminado: prazoIndeterminado ?? false,
      renovacoes: renovacoes ?? null,
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
      ...usdColumns(aluguelSnap),
    });
    if (seguroSnap && input.seguroValor != null && input.seguroValor > 0) {
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
        ...usdColumns(seguroSnap),
      });
    }
  });
  return id;
}

export async function insertMaintenance(input: Omit<Maintenance, "id">) {
  const id = randomUUID();
  const snap = await snapshotUsd(input.custo, input.moeda);
  await db.transaction(async (tx) => {
    await tx.insert(maintenance).values({
      id,
      veiculoId: input.veiculoId,
      tipo: input.tipo,
      pecas: input.pecas,
      custo: input.custo,
      moeda: input.moeda,
      data: input.data,
      obs: input.obs || null,
      kmTroca: input.kmTroca ?? null,
      kmProxima: input.kmProxima ?? null,
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
      ...usdColumns(snap),
    });
  });
  return id;
}

export type OilChangeInput = {
  veiculoId: string;
  kmTroca: number;
  custo: number;
  moeda: Maintenance["moeda"];
  data: string;
  obs?: string;
};

export async function registerOilChange(input: OilChangeInput) {
  if (Number.isNaN(input.kmTroca) || input.kmTroca < 0) {
    throw new Error("Informe o km da troca de óleo");
  }
  const id = randomUUID();
  const snap = await snapshotUsd(input.custo, input.moeda);
  await db.transaction(async (tx) => {
    const [vehicle] = await tx
      .select({
        placa: vehicles.placa,
        modelo: vehicles.modelo,
        kmAtual: vehicles.kmAtual,
        intervaloTrocaOleoKm: vehicles.intervaloTrocaOleoKm,
        oculto: vehicles.oculto,
      })
      .from(vehicles)
      .where(eq(vehicles.id, input.veiculoId))
      .limit(1);
    if (!vehicle) throw new Error("Veículo não encontrado");
    if (vehicle.oculto) throw new Error("Veículo oculto não pode registrar troca de óleo");
    if (vehicle.kmAtual != null && input.kmTroca < vehicle.kmAtual) {
      throw new Error(
        `Km da troca (${input.kmTroca}) não pode ser menor que o km atual (${vehicle.kmAtual})`,
      );
    }
    const intervalo = vehicle.intervaloTrocaOleoKm ?? 5000;
    const kmProxima = input.kmTroca + intervalo;
    const nextKmAtual =
      vehicle.kmAtual == null ? input.kmTroca : Math.max(vehicle.kmAtual, input.kmTroca);

    await tx.insert(maintenance).values({
      id,
      veiculoId: input.veiculoId,
      tipo: "troca_oleo",
      pecas: "Troca de óleo",
      custo: input.custo,
      moeda: input.moeda,
      data: input.data,
      obs: input.obs || null,
      kmTroca: input.kmTroca,
      kmProxima,
    });
    await tx
      .update(vehicles)
      .set({
        kmAtual: nextKmAtual,
        kmUltimaTrocaOleo: input.kmTroca,
      })
      .where(eq(vehicles.id, input.veiculoId));
    await tx.insert(financeEntries).values({
      id: randomUUID(),
      data: input.data,
      descricao: `Troca de óleo — ${vehicle.placa}`.trim(),
      valor: input.custo,
      moeda: input.moeda,
      tipo: "despesa",
      categoria: "manutencao",
      manual: false,
      veiculoId: input.veiculoId,
      ...usdColumns(snap),
    });
  });
  return id;
}

export async function signRentalContract(id: string, assinaturaUrl: string) {
  if (!assinaturaUrl.trim()) throw new Error("Assinatura inválida");
  const [rental] = await db
    .select({ id: rentals.id, status: rentals.status })
    .from(rentals)
    .where(eq(rentals.id, id))
    .limit(1);
  if (!rental) throw new Error("Locação não encontrada");
  if (rental.status !== "pendente") {
    throw new Error("Só é possível assinar contrato de locação pendente");
  }
  await db
    .update(rentals)
    .set({
      contratoAssinaturaUrl: assinaturaUrl.trim(),
      contratoAssinadoEm: new Date(),
    })
    .where(eq(rentals.id, id));
  return { id, contratoAssinaturaUrl: assinaturaUrl.trim() };
}

export async function deliverRental(id: string, inspection: InspectionOut) {
  if (inspection.km == null || Number.isNaN(inspection.km) || inspection.km < 0) {
    throw new Error("Informe a quilometragem da retirada");
  }
  if (!inspection.kmFotoUrl?.trim()) {
    throw new Error("Anexe a foto do odômetro na retirada");
  }
  if (!inspection.fotos?.length) {
    throw new Error("Anexe ao menos uma foto do veículo na retirada");
  }
  await db.transaction(async (tx) => {
    const [rental] = await tx
      .select({
        veiculoId: rentals.veiculoId,
        status: rentals.status,
        contratoAssinaturaUrl: rentals.contratoAssinaturaUrl,
      })
      .from(rentals)
      .where(eq(rentals.id, id))
      .limit(1);
    if (!rental) throw new Error("Locação não encontrada");
    if (rental.status !== "pendente") throw new Error("Locação já foi entregue ou devolvida");
    if (!rental.contratoAssinaturaUrl?.trim()) {
      throw new Error("O cliente precisa assinar o contrato antes da entrega");
    }

    const [vehicle] = await tx
      .select({ kmAtual: vehicles.kmAtual })
      .from(vehicles)
      .where(eq(vehicles.id, rental.veiculoId))
      .limit(1);
    if (vehicle?.kmAtual != null && inspection.km < vehicle.kmAtual) {
      throw new Error(
        `Km da retirada (${inspection.km}) não pode ser menor que o km atual do veículo (${vehicle.kmAtual})`,
      );
    }

    await tx
      .update(rentals)
      .set({ status: "entregue", vistoriaRetirada: inspection })
      .where(eq(rentals.id, id));
    await tx
      .update(vehicles)
      .set({ disponivel: false, kmAtual: inspection.km })
      .where(eq(vehicles.id, rental.veiculoId));
  });
}

export async function returnRental(id: string, inspection: InspectionIn) {
  if (inspection.km == null || Number.isNaN(inspection.km) || inspection.km < 0) {
    throw new Error("Informe a quilometragem da devolução");
  }
  if (!inspection.kmFotoUrl?.trim()) {
    throw new Error("Anexe a foto do odômetro na devolução");
  }
  if (!inspection.fotos?.length) {
    throw new Error("Anexe ao menos uma foto do veículo na devolução");
  }
  const rates = inspection.taxa > 0 ? await getUsdRates() : null;
  await db.transaction(async (tx) => {
    const [rental] = await tx.select().from(rentals).where(eq(rentals.id, id)).limit(1);
    if (!rental) throw new Error("Locação não encontrada");
    if (rental.status !== "entregue") throw new Error("Locação precisa estar entregue para devolução");

    const outKm = rental.vistoriaRetirada?.km;
    if (outKm != null && inspection.km < outKm) {
      throw new Error(
        `Km da devolução (${inspection.km}) não pode ser menor que o km da retirada (${outKm})`,
      );
    }

    await tx
      .update(rentals)
      .set({
        status: "devolvido",
        vistoriaDevolucao: inspection,
        caucaoStatus:
          inspection.semAvarias && rental.caucaoValor ? "devolvido" : rental.caucaoStatus,
      })
      .where(eq(rentals.id, id));
    await tx
      .update(vehicles)
      .set({ disponivel: true, kmAtual: inspection.km })
      .where(eq(vehicles.id, rental.veiculoId));
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
        ...usdColumns(applyUsdRates(inspection.taxa, rental.moeda, rates!)),
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
  const snap = await snapshotUsd(input.valor, input.moeda);

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
      ...usdColumns(snap),
    });
  });
  return id;
}

async function findLinkedTranslatoFinance(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  service: Pick<TransferService, "veiculoId" | "data" | "valor" | "destino">,
) {
  const rows = await tx
    .select({
      id: financeEntries.id,
      valor: financeEntries.valor,
      descricao: financeEntries.descricao,
    })
    .from(financeEntries)
    .where(
      and(
        eq(financeEntries.categoria, "translato"),
        eq(financeEntries.veiculoId, service.veiculoId),
        eq(financeEntries.data, service.data),
        eq(financeEntries.manual, false),
      ),
    );
  const byDestino = rows.filter(
    (row) =>
      Number(row.valor) === Number(service.valor) && row.descricao.includes(service.destino),
  );
  if (byDestino[0]) return byDestino[0];
  return rows.find((row) => Number(row.valor) === Number(service.valor)) ?? rows[0] ?? null;
}

export async function updateTransferService(
  id: string,
  input: Omit<TransferService, "id">,
) {
  const [existing] = await db
    .select()
    .from(transferServices)
    .where(eq(transferServices.id, id))
    .limit(1);
  if (!existing) throw new Error("Serviço avulso não encontrado");

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
  if (input.veiculoId !== existing.veiculoId && !vehicle.disponivel) {
    throw new Error("Só é possível trocar para um veículo disponível");
  }

  const tipoLabel = TRANSFER_SERVICE_TYPE_LABELS[input.tipoServico] ?? input.tipoServico;
  const snap = await snapshotUsd(input.valor, input.moeda);
  const destino = input.destino.trim();

  await db.transaction(async (tx) => {
    await tx
      .update(transferServices)
      .set({
        veiculoId: input.veiculoId,
        tipoServico: input.tipoServico,
        destino,
        data: input.data,
        valor: input.valor,
        moeda: input.moeda,
        clienteNome: input.clienteNome?.trim() || null,
        obs: input.obs?.trim() || null,
      })
      .where(eq(transferServices.id, id));

    const linked = await findLinkedTranslatoFinance(tx, {
      veiculoId: existing.veiculoId,
      data: existing.data,
      valor: existing.valor,
      destino: existing.destino,
    });
    const financeValues = {
      data: input.data,
      descricao: `Serviço avulso — ${tipoLabel} → ${destino} — ${vehicle.placa}`,
      valor: input.valor,
      moeda: input.moeda,
      tipo: "entrada" as const,
      categoria: "translato" as const,
      manual: false,
      veiculoId: input.veiculoId,
      ...usdColumns(snap),
    };
    if (linked) {
      await tx.update(financeEntries).set(financeValues).where(eq(financeEntries.id, linked.id));
    } else {
      await tx.insert(financeEntries).values({ id: randomUUID(), ...financeValues });
    }
  });
  return { id };
}

export async function deleteTransferService(id: string) {
  const [existing] = await db
    .select()
    .from(transferServices)
    .where(eq(transferServices.id, id))
    .limit(1);
  if (!existing) throw new Error("Serviço avulso não encontrado");

  await db.transaction(async (tx) => {
    const linked = await findLinkedTranslatoFinance(tx, existing);
    if (linked) {
      await tx.delete(financeEntries).where(eq(financeEntries.id, linked.id));
    }
    await tx.delete(transferServices).where(eq(transferServices.id, id));
  });
  return { id };
}

export async function insertFinanceEntry(
  input: Omit<FinanceEntry, "id" | "manual" | "valorUsd" | "taxaUsd" | "cotacaoEm" | "cotacaoFonte"> & {
    manual?: boolean;
  },
) {
  const id = randomUUID();
  const snap = await snapshotUsd(input.valor, input.moeda);
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
    ...usdColumns(snap),
  });
  return { id, ...snap };
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

export type RenewRentalInput = {
  id: string;
  prazoIndeterminado: boolean;
  dataSaida?: string;
  valor?: number;
  usuario?: string;
};

export async function renewRental(input: RenewRentalInput) {
  if (!input.prazoIndeterminado) {
    if (!input.dataSaida) throw new Error("Informe a nova data de devolução");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dataSaida)) {
      throw new Error("Data de devolução inválida");
    }
  }
  if (input.valor != null && input.valor < 0) {
    throw new Error("Informe um valor válido para a renovação");
  }

  const [rental] = await db.select().from(rentals).where(eq(rentals.id, input.id)).limit(1);
  if (!rental) throw new Error("Locação não encontrada");
  if (rental.status !== "entregue") {
    throw new Error("Só é possível renovar locação em andamento");
  }
  if (!input.prazoIndeterminado && input.dataSaida && input.dataSaida < rental.dataRetirada) {
    throw new Error("A nova devolução não pode ser antes da retirada");
  }

  const financeSnap =
    input.valor != null && input.valor > 0
      ? await snapshotUsd(input.valor, rental.moeda)
      : null;

  const renewal: RentalRenewal = {
    quando: new Date().toISOString().slice(0, 19).replace("T", " "),
    dataSaidaAnterior: rental.dataSaida,
    dataSaidaNova: input.prazoIndeterminado ? null : (input.dataSaida ?? null),
    prazoIndeterminado: input.prazoIndeterminado,
    valor: input.valor && input.valor > 0 ? input.valor : undefined,
    moeda: input.valor && input.valor > 0 ? rental.moeda : undefined,
    usuario: input.usuario,
  };
  const historico = [...(rental.renovacoes ?? []), renewal];
  const nextSaida = input.prazoIndeterminado ? rental.dataSaida : (input.dataSaida as string);

  await db.transaction(async (tx) => {
    await tx
      .update(rentals)
      .set({
        dataSaida: nextSaida,
        prazoIndeterminado: input.prazoIndeterminado,
        renovacoes: historico,
        valorAluguel: input.valor && input.valor > 0 ? input.valor : rental.valorAluguel,
      })
      .where(eq(rentals.id, input.id));

    if (financeSnap && input.valor && input.valor > 0) {
      const [vehicle] = await tx
        .select({ modelo: vehicles.modelo, placa: vehicles.placa })
        .from(vehicles)
        .where(eq(vehicles.id, rental.veiculoId))
        .limit(1);
      await tx.insert(financeEntries).values({
        id: randomUUID(),
        data: new Date().toISOString().slice(0, 10),
        descricao: `Renovação aluguel — ${vehicle?.modelo ?? ""} ${vehicle?.placa ?? ""}`.trim(),
        valor: input.valor,
        moeda: rental.moeda,
        tipo: "entrada",
        categoria: "aluguel",
        manual: false,
        veiculoId: rental.veiculoId,
        ...usdColumns(financeSnap),
      });
    }
  });

  return { id: input.id, ...renewal };
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
