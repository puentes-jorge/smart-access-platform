import Link from "next/link";
import { icons } from "./icons";

const nav = [
  ["Dashboard", "/app", icons.dashboard], ["Residentes", "/app/residents", icons.residents], ["Zonas y reglas", "/app/zones", icons.zones], ["Incidentes", "/app/incidents", icons.incidents], ["Automatizaciones", "/app/automations", icons.automations], ["Dispositivos", "/app/devices", icons.devices], ["Reportes", "/app/reports", icons.reports], ["Reservaciones", "/app/reservations", icons.reservations]
] as const;

export function AppNav({ role }: { role: string }) {
  const items = role === "PLATFORM_OWNER" ? [...nav, ["Usuarios", "/app/users", icons.users] as const] : nav;
  return <aside className="sidebar"><div className="brand"><span className="brand-mark"><icons.shield size={20}/></span><span>Smart Access</span></div><div className="nav-label">Administración</div><nav>{items.map(([label, href, Icon]) => <Link className="nav-link" href={href} key={href}><Icon size={18}/><span>{label}</span></Link>)}</nav><div className="sidebar-foot"><form action="/api/auth/logout" method="post"><button className="secondary" style={{width:"100%"}}>Cerrar sesión</button></form></div></aside>;
}
