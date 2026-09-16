import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPrimaryProperty } from "@/lib/data/property";

const schema = z
  .object({
    firstName: z.string().min(1, "El nombre es obligatorio."),
    lastName: z.string().min(1, "El apellido es obligatorio."),
    unitLabel: z.string().min(1, "La unidad es obligatoria."),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    type: z.enum(["RESIDENT", "HOUSEHOLD_MEMBER", "GUEST", "EMPLOYEE", "CONTRACTOR"]).default("RESIDENT"),
    credentialType: z.enum(["RFID", "Mobile"]).optional(),
    credentialIdentifier: z.string().optional()
  })
  .refine((data) => !data.credentialType || Boolean(data.credentialIdentifier?.trim()), {
    message: "Indica un identificador para la credencial.",
    path: ["credentialIdentifier"]
  });

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }

  const { firstName, lastName, unitLabel, email, phone, type, credentialType, credentialIdentifier } = parsed.data;
  const property = await getPrimaryProperty();

  let unit = await prisma.unit.findFirst({ where: { propertyId: property.id, label: unitLabel } });
  if (!unit) unit = await prisma.unit.create({ data: { propertyId: property.id, label: unitLabel } });

  const person = await prisma.person.create({
    data: {
      firstName,
      lastName,
      email: email || null,
      phone: phone || null,
      type,
      unitId: unit.id
    }
  });

  if (credentialType && credentialIdentifier) {
    try {
      await prisma.credential.create({
        data: { type: credentialType, identifier: credentialIdentifier.trim(), personId: person.id }
      });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "P2002") {
        return NextResponse.json({ error: "Ese identificador de credencial ya está en uso." }, { status: 409 });
      }
      throw err;
    }
  }

  return NextResponse.json({ ok: true, id: person.id }, { status: 201 });
}
