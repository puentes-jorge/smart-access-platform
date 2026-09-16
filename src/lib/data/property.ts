import { prisma } from "@/lib/db";

// This MVP operates on a single property per organization. Multi-property
// selection (the property picker in the top bar) is planned for a later
// phase, per docs/ROADMAP.md.
export async function getPrimaryProperty() {
  const property = await prisma.property.findFirst({ orderBy: { createdAt: "asc" } });
  if (!property) {
    throw new Error("No hay ninguna propiedad configurada todavía. Corre `npx prisma db seed`.");
  }
  return property;
}
