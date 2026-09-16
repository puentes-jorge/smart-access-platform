// Utilidad de línea de comandos para crear o actualizar un usuario directamente
// en la base de datos. Existe porque, en esta fase, la interfaz todavía no
// tiene una pantalla de administración de usuarios (ver docs/ROADMAP.md,
// Fase 2 pendiente): los botones "Agregar residente" y similares en los
// módulos son visuales por ahora y no están conectados a ninguna acción.
//
// Uso (dentro del contenedor de build, que sí trae tsx y el cliente de Prisma):
//   npx tsx scripts/create-user.ts <email> <password> "<nombre>" <rol>
//
// Roles válidos: PLATFORM_OWNER, PROPERTY_MANAGER, SECURITY_GUARD, RESIDENT
//
// Si el email ya existe, actualiza su nombre, rol y contraseña en vez de
// duplicarlo.

import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function usageAndExit(message?: string): never {
  if (message) console.error(`Error: ${message}\n`);
  console.error(
    'Uso: npx tsx scripts/create-user.ts <email> <password> "<nombre>" <rol>\n' +
      `Roles válidos: ${Object.values(UserRole).join(", ")}`
  );
  process.exit(1);
}

async function main() {
  const [email, password, name, roleArg] = process.argv.slice(2);
  if (!email || !password || !name || !roleArg) usageAndExit("faltan argumentos.");

  if (password.length < 8) usageAndExit("la contraseña debe tener al menos 8 caracteres.");

  const role = roleArg.toUpperCase() as UserRole;
  if (!Object.values(UserRole).includes(role)) {
    usageAndExit(`rol "${roleArg}" no reconocido.`);
  }

  const organization = await prisma.organization.findFirst();
  if (!organization) {
    throw new Error("No hay ninguna organización todavía. Corre primero `npx prisma db seed`.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: { passwordHash, name, role, active: true },
    create: {
      email: normalizedEmail,
      name,
      role,
      organizationId: organization.id,
      passwordHash
    }
  });

  console.log(
    `${existing ? "Actualizado" : "Creado"}: ${user.email} — ${user.name} (${user.role})`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
