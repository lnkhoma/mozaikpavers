import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { clientIp } from "@/lib/security/request";
import { DUMMY_HASH, verifyPassword } from "./password";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession } from "./token";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "staff";
}

/**
 * Data-access-layer check used by every admin page, action and route. The
 * proxy redirects anonymous visitors early, but this is the real gate: it
 * re-verifies the token and that the account is still active.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const claims = await verifySession(token);
  if (!claims) return null;
  const db = await getDb();
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(and(eq(users.id, claims.sub), eq(users.active, true)))
    .limit(1);
  return user ?? null;
}

export async function requireAdmin(): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return user;
}

/** Pricing and user changes are restricted to the admin role. */
export async function requireRole(role: "admin"): Promise<AdminUser> {
  const user = await requireAdmin();
  if (user.role !== role) redirect("/admin?error=forbidden");
  return user;
}

export async function requestIp(): Promise<string> {
  return clientIp(await headers());
}

export async function authenticate(email: string, password: string): Promise<AdminUser | null> {
  const db = await getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email.toLowerCase()}`)
    .limit(1);
  // Always run a hash comparison so response time does not reveal whether the account exists.
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid || !user.active) return null;
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function startSession(user: AdminUser): Promise<void> {
  const token = await signSession({ sub: user.id, role: user.role, name: user.name });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
