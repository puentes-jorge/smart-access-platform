import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "smart_access_session";

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  role: string;
};

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters");
  return new TextEncoder().encode(value);
}

export async function createSession(payload: SessionPayload) {
  return new SignJWT({ email: payload.email, name: payload.name, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret());
}

export async function verifySession(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || typeof payload.email !== "string") return null;
    return {
      sub: payload.sub,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : payload.email,
      role: typeof payload.role === "string" ? payload.role : "RESIDENT"
    };
  } catch {
    return null;
  }
}

// Server Components / Route Handlers only (uses next/headers).
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

const ROLE_LABELS: Record<string, string> = {
  PLATFORM_OWNER: "Platform owner",
  PROPERTY_MANAGER: "Property manager",
  SECURITY_SUPERVISOR: "Security supervisor",
  SECURITY_GUARD: "Security guard",
  RESIDENT: "Resident",
  TECHNICIAN: "Technician"
};

export function roleLabel(role: string) {
  return ROLE_LABELS[role] ?? role;
}
