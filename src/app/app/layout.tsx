import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { getSession, roleLabel } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const initials = session.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return <div className="app-shell"><AppNav/><div className="content"><header className="topbar"><button className="property-picker">Sunset Residences · El Paso, TX ▾</button><div className="user-menu"><div><strong>{session.name}</strong><div className="muted" style={{fontSize:12}}>{roleLabel(session.role)}</div></div><span className="avatar">{initials}</span></div></header>{children}</div></div>;
}
