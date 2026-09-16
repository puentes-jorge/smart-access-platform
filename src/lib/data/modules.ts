import { prisma } from "@/lib/db";
import { formatEventTime, formatRelative, formatTimeRange } from "@/lib/format";
import { getPrimaryProperty } from "@/lib/data/property";
import type { ModuleData } from "@/lib/data/types";

function statusClass(active: boolean) {
  return active ? "Activo" : "Suspendido";
}

export async function getResidentsModule(): Promise<ModuleData> {
  const property = await getPrimaryProperty();

  const units = await prisma.unit.findMany({
    where: { propertyId: property.id },
    include: { people: { include: { credentials: true } } },
    orderBy: { label: "asc" }
  });

  const people = units.flatMap((unit) => unit.people.map((person) => ({ ...person, unitLabel: unit.label })));

  const credentialIds = people.flatMap((person) => person.credentials.map((credential) => credential.id));
  const lastEvents = credentialIds.length
    ? await prisma.accessEvent.findMany({
        where: { credentialId: { in: credentialIds } },
        orderBy: { occurredAt: "desc" },
        take: 500,
        select: { credentialId: true, occurredAt: true }
      })
    : [];

  const lastAccessByCredential = new Map<string, Date>();
  for (const event of lastEvents) {
    if (event.credentialId && !lastAccessByCredential.has(event.credentialId)) {
      lastAccessByCredential.set(event.credentialId, event.occurredAt);
    }
  }

  const rows = people.map((person) => {
    const credentialLabel = person.credentials.length ? person.credentials.map((c) => c.type).join(" · ") : "Sin credencial";
    const lastAccess = person.credentials
      .map((c) => lastAccessByCredential.get(c.id))
      .filter((d): d is Date => Boolean(d))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const hasActiveCredential = person.credentials.some((c) => c.active);
    const status = !person.active ? "Suspendido" : person.credentials.length === 0 || !hasActiveCredential ? "Pendiente" : statusClass(true);
    return [`${person.firstName} ${person.lastName}`, person.unitLabel, credentialLabel, formatEventTime(lastAccess), status];
  });

  return {
    title: "Residentes y unidades",
    subtitle: "Personas, credenciales y permisos de la propiedad",
    action: "Agregar residente",
    columns: ["Residente", "Unidad", "Credenciales", "Último acceso", "Estado"],
    rows,
    empty: "Todavía no hay residentes registrados en esta propiedad."
  };
}

export async function getZonesModule(): Promise<ModuleData> {
  const property = await getPrimaryProperty();
  const zones = await prisma.zone.findMany({
    where: { propertyId: property.id },
    include: { accessPoints: true },
    orderBy: { name: "asc" }
  });

  const rows = zones.map((zone) => [
    zone.name,
    formatTimeRange(zone.openTime, zone.closeTime),
    zone.capacity ? String(zone.capacity) : "Sin límite",
    String(zone.accessPoints.length),
    zone.accessPoints.length > 0 ? "Configurada" : "Sin dispositivos"
  ]);

  return {
    title: "Zonas y reglas",
    subtitle: "Horarios, capacidad y dispositivos asociados",
    action: "Nueva zona",
    columns: ["Zona", "Horario", "Capacidad", "Accesos", "Estado"],
    rows,
    empty: "Todavía no hay zonas configuradas."
  };
}

export async function getIncidentsModule(): Promise<ModuleData> {
  const property = await getPrimaryProperty();
  const incidents = await prisma.incident.findMany({
    where: { propertyId: property.id },
    include: { zone: true },
    orderBy: { createdAt: "desc" }
  });

  const statusLabels: Record<string, string> = { OPEN: "Abierto", ACKNOWLEDGED: "Reconocido", RESOLVED: "Resuelto", CLOSED: "Cerrado" };

  const rows = incidents.map((incident) => [
    `${incident.code} · ${incident.title}`,
    incident.zone?.name ?? property.name,
    incident.severity,
    incident.assignedTo ?? "Sin asignar",
    statusLabels[incident.status] ?? incident.status
  ]);

  return {
    title: "Centro de incidentes",
    subtitle: "Alertas correlacionadas, evidencia y respuesta operativa",
    action: "Crear incidente",
    columns: ["Incidente", "Ubicación", "Severidad", "Responsable", "Estado"],
    rows,
    empty: "No hay incidentes registrados. Buena señal."
  };
}

export async function getAutomationsModule(): Promise<ModuleData> {
  const property = await getPrimaryProperty();
  const automations = await prisma.automation.findMany({
    where: { propertyId: property.id },
    orderBy: { name: "asc" }
  });

  const rows = automations.map((automation) => [
    automation.name,
    automation.trigger,
    automation.scope,
    formatEventTime(automation.lastRunAt),
    automation.status === "ACTIVE" ? "Activa" : "Pausada"
  ]);

  return {
    title: "Automatizaciones",
    subtitle: "Reglas que detectan eventos y ejecutan respuestas",
    action: "Nueva automatización",
    columns: ["Regla", "Disparador", "Alcance", "Última ejecución", "Estado"],
    rows,
    empty: "Todavía no hay automatizaciones configuradas."
  };
}

export async function getDevicesModule(): Promise<ModuleData> {
  const property = await getPrimaryProperty();
  const devices = await prisma.device.findMany({
    where: { propertyId: property.id },
    include: { accessPoint: { include: { zone: true } } },
    orderBy: { name: "asc" }
  });

  const statusLabels: Record<string, string> = { ONLINE: "Online", WARNING: "Alerta", OFFLINE: "Offline", MAINTENANCE: "Mantenimiento" };

  const online = devices.filter((d) => d.status === "ONLINE").length;
  const alerts = devices.filter((d) => d.status !== "ONLINE").length;
  const pct = devices.length ? Math.round((online / devices.length) * 1000) / 10 : 0;

  const rows = devices.map((device) => [
    device.name,
    device.accessPoint?.zone?.name ?? property.name,
    device.type,
    formatEventTime(device.lastSeenAt),
    statusLabels[device.status] ?? device.status
  ]);

  return {
    title: "Dispositivos y salud",
    subtitle: "Controladores, lectores, sensores, cámaras y gateways",
    action: "Agregar dispositivo",
    metrics: [
      { label: "Online", value: `${online} / ${devices.length}`, detail: `${pct}% disponible` },
      { label: "Alertas", value: String(alerts), detail: "Requieren atención" }
    ],
    columns: ["Dispositivo", "Ubicación", "Tipo", "Último reporte", "Estado"],
    rows,
    empty: "Todavía no hay dispositivos registrados."
  };
}

export async function getReportsModule(): Promise<ModuleData> {
  const property = await getPrimaryProperty();

  const events = await prisma.accessEvent.findMany({
    where: { accessPoint: { zone: { propertyId: property.id } } },
    select: { result: true, reason: true }
  });

  const total = events.length;
  const granted = events.filter((e) => e.result === "GRANTED").length;
  const denied = events.filter((e) => e.result === "DENIED");

  const byReason = new Map<string, number>();
  for (const event of denied) {
    const reason = event.reason ?? "Sin motivo registrado";
    byReason.set(reason, (byReason.get(reason) ?? 0) + 1);
  }

  const rows = [...byReason.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => [reason, String(count), denied.length ? `${Math.round((count / denied.length) * 100)}%` : "0%"]);

  const pct = (n: number) => (total ? `${Math.round((n / total) * 1000) / 10}%` : "0%");

  return {
    title: "Reportes de acceso",
    subtitle: "Actividad consolidada de la propiedad",
    action: "Generar reporte",
    metrics: [
      { label: "Intentos totales", value: String(total), detail: "Histórico" },
      { label: "Concedidos", value: String(granted), detail: pct(granted) },
      { label: "Rechazados", value: String(denied.length), detail: pct(denied.length) }
    ],
    columns: ["Motivo de rechazo", "Eventos", "Porcentaje"],
    rows,
    empty: "Todavía no hay eventos de acceso registrados."
  };
}

export async function getReservationsModule(): Promise<ModuleData> {
  const property = await getPrimaryProperty();
  const reservations = await prisma.reservation.findMany({
    where: { propertyId: property.id },
    include: { zone: true },
    orderBy: { startsAt: "asc" }
  });

  const statusLabels: Record<string, string> = { CONFIRMED: "Confirmada", PENDING: "Pendiente", CANCELLED: "Cancelada" };

  const rows = reservations.map((reservation) => [
    reservation.title,
    reservation.startsAt.toLocaleDateString("es-MX", { month: "short", day: "numeric" }),
    `${reservation.startsAt.toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" })} – ${reservation.endsAt.toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" })}`,
    reservation.unitLabel ?? "—",
    statusLabels[reservation.status] ?? reservation.status
  ]);

  return {
    title: "Reservaciones",
    subtitle: "Disponibilidad, capacidad y solicitudes de amenidades",
    action: "Nueva reservación",
    columns: ["Amenidad", "Fecha", "Horario", "Residente", "Estado"],
    rows,
    empty: "Todavía no hay reservaciones registradas."
  };
}

export type DashboardData = {
  metrics: { label: string; value: string; detail: string; warn?: boolean }[];
  liveEvents: { time: string; who: string; where: string; result: "Concedido" | "Rechazado" }[];
  alerts: { title: string; detail: string; severity: "critical" | "warning" }[];
};

export async function getDashboardData(): Promise<DashboardData> {
  const property = await getPrimaryProperty();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [devices, openIncidents, todaysReservations, recentEvents, alertIncidents] = await Promise.all([
    prisma.device.findMany({ where: { propertyId: property.id }, select: { status: true } }),
    prisma.incident.count({ where: { propertyId: property.id, status: { in: ["OPEN", "ACKNOWLEDGED"] } } }),
    prisma.reservation.count({ where: { propertyId: property.id, startsAt: { gte: startOfDay } } }),
    prisma.accessEvent.findMany({
      where: { accessPoint: { zone: { propertyId: property.id } } },
      orderBy: { occurredAt: "desc" },
      take: 6,
      include: { accessPoint: { include: { zone: true } }, credential: { include: { person: true } } }
    }),
    prisma.incident.findMany({
      where: { propertyId: property.id, status: { in: ["OPEN", "ACKNOWLEDGED"] } },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { zone: true }
    })
  ]);

  const eventsToday = await prisma.accessEvent.count({ where: { accessPoint: { zone: { propertyId: property.id } }, occurredAt: { gte: startOfDay } } });
  const online = devices.filter((d) => d.status === "ONLINE").length;

  const liveEvents = recentEvents.map((event) => {
    const person = event.credential?.person;
    const who = person ? `${person.firstName} ${person.lastName}` : event.credential ? "Credencial sin asignar" : "Credencial desconocida";
    const where = `${event.accessPoint.zone.name} · ${event.credential?.type ?? event.reason ?? "—"}`;
    return {
      time: event.occurredAt.toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" }),
      who,
      where,
      result: (event.result === "GRANTED" ? "Concedido" : "Rechazado") as "Concedido" | "Rechazado"
    };
  });

  const alerts = alertIncidents.map((incident) => ({
    title: incident.title,
    detail: `${incident.zone?.name ?? property.name} · ${formatRelative(incident.createdAt)}`,
    severity: (incident.severity.toLowerCase().includes("critic") ? "critical" : "warning") as "critical" | "warning"
  }));

  return {
    metrics: [
      { label: "Accesos hoy", value: String(eventsToday), detail: "Últimas 24h" },
      { label: "Reservaciones hoy", value: String(todaysReservations), detail: "Amenidades" },
      { label: "Dispositivos en línea", value: `${online} / ${devices.length}`, detail: devices.length ? `${Math.round((online / devices.length) * 100)}% disponible` : "Sin dispositivos" },
      { label: "Alertas activas", value: String(openIncidents), detail: openIncidents > 0 ? "Requieren atención" : "Todo en orden", warn: openIncidents > 0 }
    ],
    liveEvents,
    alerts
  };
}

export async function getModuleData(module: string): Promise<ModuleData | null> {
  switch (module) {
    case "residents":
      return getResidentsModule();
    case "zones":
      return getZonesModule();
    case "incidents":
      return getIncidentsModule();
    case "automations":
      return getAutomationsModule();
    case "devices":
      return getDevicesModule();
    case "reports":
      return getReportsModule();
    case "reservations":
      return getReservationsModule();
    default:
      return null;
  }
}
