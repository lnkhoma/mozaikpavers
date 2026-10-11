import { SignJWT, jwtVerify } from "jose";

/**
 * Admin session token (HS256 JWT in an httpOnly cookie). Kept free of
 * Node-only imports so the proxy can verify it before rendering admin routes.
 */
export const SESSION_COOKIE = "mp_admin_session";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

export interface SessionClaims {
  sub: string; // user id
  role: "admin" | "staff";
  name: string;
}

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters.");
  }
  return new TextEncoder().encode(value);
}

export async function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ role: claims.role, name: claims.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setIssuer("mozaik-pavers")
    .setAudience("mozaik-admin")
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: "mozaik-pavers", audience: "mozaik-admin", algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return { sub: payload.sub, role: payload.role === "admin" ? "admin" : "staff", name: String(payload.name ?? "") };
  } catch {
    return null;
  }
}
