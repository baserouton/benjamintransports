import "dotenv/config";
import { sql } from "drizzle-orm";
import { pool, db } from "../src/server/db/client.server";
import { hashPassword } from "../src/server/auth/auth.server";
import {
  activityLogs,
  clients,
  financeEntries,
  maintenance,
  rentals,
  users,
  vehicles,
} from "../src/server/db/schema";

const adminPassword = process.env.SEED_ADMIN_PASSWORD;
if (!adminPassword || adminPassword.length < 8) {
  throw new Error("SEED_ADMIN_PASSWORD deve ter pelo menos 8 caracteres");
}

const passwordHash = await hashPassword(adminPassword);

await db
  .insert(vehicles)
  .values([
    {
      id: "v1",
      modelo: "Toyota Hilux",
      placa: "SUR-1023",
      categoria: "PICAPE",
      fotos: [],
      ano: 2022,
      disponivel: false,
      seguroValidade: "2026-11-15",
    },
    {
      id: "v2",
      modelo: "Mercedes Sprinter",
      placa: "SUR-2045",
      categoria: "VANS",
      fotos: [],
      ano: 2021,
      disponivel: true,
      seguroValidade: "2026-08-01",
    },
    {
      id: "v3",
      modelo: "Honda Civic",
      placa: "SUR-3312",
      categoria: "CARROS",
      fotos: [],
      ano: 2023,
      disponivel: true,
      seguroValidade: "2027-01-10",
    },
    {
      id: "v4",
      modelo: "Ford Ranger",
      placa: "SUR-4477",
      categoria: "PICAPE",
      fotos: [],
      ano: 2020,
      disponivel: false,
      seguroValidade: "2026-09-20",
    },
    {
      id: "v5",
      modelo: "Volkswagen Gol",
      placa: "SUR-5590",
      categoria: "CARROS",
      fotos: [],
      ano: 2019,
      disponivel: true,
      seguroValidade: "2026-12-05",
    },
    {
      id: "v6",
      modelo: "Fiat Ducato",
      placa: "SUR-6612",
      categoria: "VANS",
      fotos: [],
      ano: 2022,
      disponivel: true,
      seguroValidade: "2027-03-10",
    },
  ])
  .onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });

await db
  .insert(clients)
  .values([
    {
      id: "c1",
      nome: "Ravi Sharma",
      rg: "12.345.678-9",
      cpf: "123.456.789-00",
      endereco: "Paramaribo, Suriname",
      whatsapp: "+597 8123456",
      email: "ravi@example.com",
      suriname: true,
    },
    {
      id: "c2",
      nome: "Carlos Silva",
      rg: "22.111.333-0",
      cpf: "987.654.321-00",
      endereco: "Manaus, AM",
      whatsapp: "+55 92 99999-1111",
      email: "carlos@example.com",
      suriname: false,
    },
    {
      id: "c3",
      nome: "Aisha Doekhi",
      rg: "33.222.111-4",
      cpf: "555.444.333-22",
      endereco: "Nickerie, Suriname",
      whatsapp: "+597 8555111",
      suriname: true,
    },
  ])
  .onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });

await db
  .insert(users)
  .values([
    {
      id: "u1",
      nome: "Admin 1",
      email: "admin1@locadora.sr",
      login: "admin1",
      ativo: true,
      passwordHash,
    },
    {
      id: "u2",
      nome: "Admin 2",
      email: "admin2@locadora.sr",
      login: "admin2",
      ativo: true,
      passwordHash,
    },
    {
      id: "u3",
      nome: "Admin 3",
      email: "admin3@locadora.sr",
      login: "admin3",
      ativo: true,
      passwordHash,
    },
    {
      id: "u4",
      nome: "Admin 4",
      email: "admin4@locadora.sr",
      login: "admin4",
      ativo: true,
      passwordHash,
    },
  ])
  .onDuplicateKeyUpdate({
    set: { ativo: true, passwordHash, updatedAt: new Date() },
  });

await db
  .insert(rentals)
  .values([
    {
      id: "r1",
      veiculoId: "v1",
      clienteId: "c1",
      dataRetirada: "2026-07-10",
      dataSaida: "2026-07-25",
      status: "entregue",
      valorAluguel: 2800,
      moeda: "SRD",
      caucaoValor: 500,
      caucaoStatus: "retido",
    },
    {
      id: "r2",
      veiculoId: "v4",
      clienteId: "c2",
      dataRetirada: "2026-07-15",
      dataSaida: "2026-07-30",
      status: "pendente",
      valorAluguel: 3200,
      moeda: "USD",
      caucaoValor: 300,
      caucaoStatus: "retido",
      seguroValor: 200,
      seguroObs: "Cobertura ampliada",
    },
  ])
  .onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });

await db
  .insert(maintenance)
  .values([
    {
      id: "m1",
      veiculoId: "v1",
      tipo: "preventiva",
      pecas: "Óleo, filtros",
      custo: 450,
      moeda: "SRD",
      data: "2026-06-01",
    },
    {
      id: "m2",
      veiculoId: "v3",
      tipo: "corretiva",
      pecas: "Pastilhas de freio",
      custo: 680,
      moeda: "SRD",
      data: "2026-05-20",
    },
  ])
  .onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });

await db
  .insert(financeEntries)
  .values([
    {
      id: "f1",
      data: "2026-07-10",
      descricao: "Aluguel Hilux (Ravi)",
      valor: 2800,
      moeda: "SRD",
      tipo: "entrada",
      veiculoId: "v1",
    },
    {
      id: "f2",
      data: "2026-07-15",
      descricao: "Aluguel Ranger (Carlos)",
      valor: 3200,
      moeda: "USD",
      tipo: "entrada",
      veiculoId: "v4",
    },
    {
      id: "f3",
      data: "2026-06-01",
      descricao: "Manutenção preventiva Hilux",
      valor: 450,
      moeda: "SRD",
      tipo: "despesa",
      veiculoId: "v1",
    },
    {
      id: "f4",
      data: "2026-07-05",
      descricao: "Seguro anual Sprinter",
      valor: 1800,
      moeda: "SRD",
      tipo: "despesa",
      veiculoId: "v2",
    },
  ])
  .onDuplicateKeyUpdate({ set: { id: sql`id` } });

await db
  .insert(activityLogs)
  .values([
    {
      id: "l1",
      quando: new Date("2026-07-22T09:14:00"),
      usuario: "admin1",
      acao: "Cadastrou locação r2 (Ford Ranger)",
    },
    {
      id: "l2",
      quando: new Date("2026-07-20T16:02:00"),
      usuario: "admin2",
      acao: "Registrou manutenção em v3 (Civic)",
    },
    {
      id: "l3",
      quando: new Date("2026-07-19T11:30:00"),
      usuario: "admin1",
      acao: "Editou cliente c1 (Ravi Sharma)",
    },
  ])
  .onDuplicateKeyUpdate({ set: { id: sql`id` } });

console.log("Seed concluído: dados iniciais inseridos/atualizados.");
await pool.end();
