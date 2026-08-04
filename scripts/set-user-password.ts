import "dotenv/config";
import { eq } from "drizzle-orm";
import { hashPassword } from "../src/server/auth/auth.server";
import { db, pool } from "../src/server/db/client.server";
import { sessions, users } from "../src/server/db/schema";

const login = process.env.ADMIN_LOGIN;
const password = process.env.ADMIN_PASSWORD;

if (!login || !password) {
  throw new Error("Informe ADMIN_LOGIN e ADMIN_PASSWORD");
}

if (password.length < 8) {
  throw new Error("A senha deve ter pelo menos 8 caracteres");
}

const passwordHash = await hashPassword(password);
const [user] = await db.select({ id: users.id }).from(users).where(eq(users.login, login)).limit(1);

if (!user) throw new Error(`Usuário não encontrado: ${login}`);

await db.transaction(async (tx) => {
  await tx.update(users).set({ passwordHash }).where(eq(users.id, user.id));
  await tx.delete(sessions).where(eq(sessions.userId, user.id));
});

console.log(`Senha alterada para o usuário ${login}.`);
await pool.end();
