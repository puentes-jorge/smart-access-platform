import { redirect } from "next/navigation";
import { getSession, roleLabel } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UsersView } from "@/components/users-view";

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role !== "PLATFORM_OWNER") {
    return (
      <div className="page">
        <section className="card">
          <h1>Acceso restringido</h1>
          <p className="muted">Solo un usuario con rol Platform owner puede administrar usuarios.</p>
        </section>
      </div>
    );
  }

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  const rows = users.map((user) => [
    user.name,
    user.email,
    roleLabel(user.role),
    user.active ? "Activo" : "Suspendido",
    user.lastLoginAt ? user.lastLoginAt.toLocaleString("es-MX") : "Nunca"
  ]);

  return (
    <UsersView
      columns={["Nombre", "Correo", "Rol", "Estado", "Último acceso"]}
      rows={rows}
      empty="Todavía no hay usuarios."
    />
  );
}
