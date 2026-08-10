import "dotenv/config";
import { sql } from "drizzle-orm";
import { db, pool } from "../src/server/db/client.server";
import { hashPassword } from "../src/server/auth/auth.server";
import {
  activityLogs,
  clients,
  financeEntries,
  maintenance,
  rentals,
  sessions,
  users,
  vehicles,
} from "../src/server/db/schema";

/**
 * Limpa dados operacionais e mantém apenas os usuários admin,
 * para o cliente testar o sistema "do zero".
 */
async function main() {
  const password = process.env.SEED_ADMIN_PASSWORD ?? "2026suri";
  if (password.length < 8) {
    throw new Error("SEED_ADMIN_PASSWORD deve ter pelo menos 8 caracteres");
  }

  console.log("Limpando dados operacionais...");

  await db.delete(financeEntries);
  await db.delete(rentals);
  await db.delete(maintenance);
  await db.delete(activityLogs);
  await db.delete(sessions);
  await db.delete(vehicles);
  await db.delete(clients);

  const passwordHash = await hashPassword(password);
  await db.update(users).set({
    passwordHash,
    ativo: true,
    updatedAt: new Date(),
  });

  const [counts] = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM vehicles) AS vehicles,
      (SELECT COUNT(*) FROM clients) AS clients,
      (SELECT COUNT(*) FROM rentals) AS rentals,
      (SELECT COUNT(*) FROM maintenance) AS maintenance,
      (SELECT COUNT(*) FROM finance_entries) AS finance,
      (SELECT COUNT(*) FROM activity_logs) AS logs,
      (SELECT COUNT(*) FROM sessions) AS sessions
  `);

  console.log("Reset concluído. Contagens:", counts);
  console.log("Usuários mantidos: admin1, admin2, admin3, admin4");
  console.log(`Senha: ${password}`);
}

main()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
