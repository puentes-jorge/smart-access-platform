import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  name: z.string().min(1, "El nombre es obligatorio."),
  email: z.string().email("Correo inválido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  role: z.enum(["PLATFORM_OWNER", "PROPERTY_MANAGER", "SECURITY_SUPERVISOR", "SECURITY_GUARD", "RESIDENT", "TECHNICIAN"])
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (session.role !== "PLATFORM_OWNER") {
    return NextResponse.json({ error: "Solo un Platform owner puede crear usuarios." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Ya existe un usuario con ese correo." }, { status: 409 });

  const currentUser = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!currentUser) return NextResponse.json({ error: "Sesión inválida." }, { status: 401 });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      role: parsed.data.role,
      passwordHash,
      organizationId: currentUser.organizationId
    }
  });

  return NextResponse.json({ ok: true, id: user.id }, { status: 201 });
}
