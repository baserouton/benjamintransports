import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, eq, gt } from "drizzle-orm";
import { createMiddleware } from "@tanstack/react-start";
import { getRequest, getRequestHeader, setResponseHeader } from "@tanstack/react-start/server";
import { db } from "@/server/db/client.server";
import { sessions, users } from "@/server/db/schema";

const scrypt = promisify(scryptCallback);
const COOKIE_NAME = "locadora_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;
const DUMMY_PASSWORD_HASH = `scrypt$${"0".repeat(32)}$${"0".repeat(128)}`;

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, salt, expectedHex] = encoded.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function readCookie(name: string) {
  const header = getRequestHeader("cookie");
  if (!header) return null;
  for (const part of header.split(/;\s*/)) {
    const separator = part.indexOf("=");
    if (separator > 0 && part.slice(0, separator) === name) {
      return decodeURIComponent(part.slice(separator + 1));
    }
  }
  return null;
}

function sessionCookie(token: string, maxAge: number) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}

export async function issueSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await db.insert(sessions).values({
    id: tokenHash(token),
    userId,
    expiresAt,
  });
  setResponseHeader("Set-Cookie", sessionCookie(token, SESSION_TTL_SECONDS));
}

export async function authenticate(login: string, password: string) {
  assertSameOrigin();
  const [user] = await db
    .select({
      id: users.id,
      login: users.login,
      nome: users.nome,
      email: users.email,
      ativo: users.ativo,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.login, login))
    .limit(1);

  const validPassword = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!user?.ativo || !validPassword) return null;

  await issueSession(user.id);
  return { id: user.id, login: user.login, nome: user.nome, email: user.email };
}

export async function requireSession() {
  assertSameOrigin();
  const session = await readSession();
  if (!session) throw new Error("Não autenticado");
  return session;
}

export async function destroySession() {
  const token = readCookie(COOKIE_NAME);
  if (token) await db.delete(sessions).where(eq(sessions.id, tokenHash(token)));
  setResponseHeader("Set-Cookie", sessionCookie("", 0));
}

export async function readSession() {
  const token = readCookie(COOKIE_NAME);
  if (!token) return null;

  const [session] = await db
    .select({
      sessionId: sessions.id,
      userId: users.id,
      login: users.login,
      nome: users.nome,
      email: users.email,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.id, tokenHash(token)),
        gt(sessions.expiresAt, new Date()),
        eq(users.ativo, true),
      ),
    )
    .limit(1);

  return session ?? null;
}

function assertSameOrigin() {
  const request = getRequest();
  if (request.method === "GET" || request.method === "HEAD") return;
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
    throw new Error("Origem da requisição inválida");
  }
}

export const authMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  assertSameOrigin();
  const session = await readSession();
  if (!session) throw new Error("Não autenticado");
  return next({ context: { session } });
});
