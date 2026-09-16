import { PrismaClient, UserRole, PersonType, DeviceStatus, IncidentStatus, AutomationStatus, AccessResult } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Demo-only password for the secondary accounts this seed creates (property
// manager and security guard). Change it via DEMO_USERS_PASSWORD, and treat
// these accounts as throwaway demo logins, not something to hand to a real
// client without replacing them first.
const DEMO_USERS_PASSWORD = process.env.DEMO_USERS_PASSWORD ?? "DemoAccess2026!";

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}
function daysFromNow(days: number, hour: number, minute: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: "ezentio-demo" },
    update: {},
    create: { name: "Ezentio Smart Access", slug: "ezentio-demo" }
  });

  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@smartaccess.local").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) throw new Error("ADMIN_PASSWORD must be set before seeding.");
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  const demoPasswordHash = await bcrypt.hash(DEMO_USERS_PASSWORD, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: adminPasswordHash, role: UserRole.PLATFORM_OWNER, active: true },
    create: { email: adminEmail, name: "Platform Administrator", role: UserRole.PLATFORM_OWNER, organizationId: organization.id, passwordHash: adminPasswordHash }
  });

  await prisma.user.upsert({
    where: { email: "manager@smartaccess.local" },
    update: { passwordHash: demoPasswordHash },
    create: { email: "manager@smartaccess.local", name: "Priya Patel", role: UserRole.PROPERTY_MANAGER, organizationId: organization.id, passwordHash: demoPasswordHash }
  });

  await prisma.user.upsert({
    where: { email: "guard@smartaccess.local" },
    update: { passwordHash: demoPasswordHash },
    create: { email: "guard@smartaccess.local", name: "Marcus Lee", role: UserRole.SECURITY_GUARD, organizationId: organization.id, passwordHash: demoPasswordHash }
  });

  let property = await prisma.property.findFirst({ where: { organizationId: organization.id, name: "Sunset Residences" } });
  if (!property) {
    property = await prisma.property.create({
      data: { name: "Sunset Residences", address: "El Paso, Texas", organizationId: organization.id }
    });
  }
  const propertyId = property.id;

  // --- Zones + access points ---
  const zoneSpecs = [
    { name: "North Pool", capacity: 40, openTime: "06:00", closeTime: "22:00", accessPoint: "North Pool Gate", antiPassback: true },
    { name: "Fitness Center", capacity: 20, openTime: "05:00", closeTime: "23:00", accessPoint: "Gym Door", antiPassback: false },
    { name: "Clubhouse", capacity: 60, openTime: "08:00", closeTime: "22:00", accessPoint: "Clubhouse Main Door", antiPassback: false },
    { name: "West Gate", capacity: null as number | null, openTime: null as string | null, closeTime: null as string | null, accessPoint: "West Gate Entry", antiPassback: true },
    { name: "Maintenance Room", capacity: null as number | null, openTime: null as string | null, closeTime: null as string | null, accessPoint: "Maintenance Door", antiPassback: false }
  ];

  const zones: Record<string, { id: string; accessPointId: string }> = {};
  for (const spec of zoneSpecs) {
    let zone = await prisma.zone.findFirst({ where: { propertyId, name: spec.name } });
    if (!zone) {
      zone = await prisma.zone.create({
        data: { name: spec.name, capacity: spec.capacity, openTime: spec.openTime, closeTime: spec.closeTime, propertyId }
      });
    }
    let accessPoint = await prisma.accessPoint.findFirst({ where: { zoneId: zone.id, name: spec.accessPoint } });
    if (!accessPoint) {
      accessPoint = await prisma.accessPoint.create({
        data: { name: spec.accessPoint, antiPassback: spec.antiPassback, zoneId: zone.id }
      });
    }
    zones[spec.name] = { id: zone.id, accessPointId: accessPoint.id };
  }

  // --- Units, residents, credentials ---
  type ResidentSpec = { unit: string; firstName: string; lastName: string; email?: string; active: boolean; credentials: { type: string; active: boolean }[] };
  const residentSpecs: ResidentSpec[] = [
    { unit: "204", firstName: "John", lastName: "Smith", email: "john@example.com", active: true, credentials: [{ type: "Mobile", active: true }, { type: "RFID", active: true }] },
    { unit: "318", firstName: "Sarah", lastName: "Miller", email: "sarah@example.com", active: true, credentials: [{ type: "Mobile", active: true }] },
    { unit: "105", firstName: "Daniel", lastName: "Ruiz", active: true, credentials: [{ type: "RFID", active: false }] },
    { unit: "412", firstName: "Amanda", lastName: "Lee", active: false, credentials: [{ type: "Mobile", active: false }, { type: "RFID", active: false }] }
  ];

  const people: Record<string, { id: string; credentialIds: { id: string; type: string }[] }> = {};
  for (const spec of residentSpecs) {
    let unit = await prisma.unit.findFirst({ where: { propertyId, label: spec.unit } });
    if (!unit) unit = await prisma.unit.create({ data: { label: spec.unit, propertyId } });

    let person = await prisma.person.findFirst({ where: { unitId: unit.id, firstName: spec.firstName, lastName: spec.lastName } });
    if (!person) {
      person = await prisma.person.create({
        data: { firstName: spec.firstName, lastName: spec.lastName, email: spec.email, type: PersonType.RESIDENT, active: spec.active, unitId: unit.id }
      });
    }

    const credentialIds: { id: string; type: string }[] = [];
    for (const credentialSpec of spec.credentials) {
      const identifier = `${spec.unit}-${credentialSpec.type}`.toUpperCase();
      let credential = await prisma.credential.findUnique({ where: { identifier } });
      if (!credential) {
        credential = await prisma.credential.create({
          data: { type: credentialSpec.type, identifier, active: credentialSpec.active, personId: person.id }
        });
      }
      credentialIds.push({ id: credential.id, type: credentialSpec.type });
    }
    people[`${spec.firstName} ${spec.lastName}`] = { id: person.id, credentialIds };
  }

  // --- Guest ---
  let guest = await prisma.person.findFirst({ where: { firstName: "Michael", lastName: "Brown" } });
  if (!guest) {
    guest = await prisma.person.create({ data: { firstName: "Michael", lastName: "Brown", type: PersonType.GUEST, active: true } });
  }
  let guestCredential = await prisma.credential.findUnique({ where: { identifier: "GUEST-QR-CLUBHOUSE" } });
  if (!guestCredential) {
    guestCredential = await prisma.credential.create({
      data: { type: "Temporary QR", identifier: "GUEST-QR-CLUBHOUSE", active: true, personId: guest.id, expiresAt: daysFromNow(1, 23, 59) }
    });
  }
  const johnId = people["John Smith"].id;
  const existingPass = await prisma.guestPass.findUnique({ where: { tokenHash: "seed-guest-pass-clubhouse" } });
  if (!existingPass) {
    await prisma.guestPass.create({
      data: { guestName: "Michael Brown", tokenHash: "seed-guest-pass-clubhouse", validFrom: hoursAgo(4), validUntil: daysFromNow(1, 23, 59), maxUses: 3, uses: 1, hostId: johnId }
    });
  }

  // --- Devices ---
  const deviceSpecs = [
    { name: "CTRL-NP-01", type: "ACCESS_CONTROLLER", status: DeviceStatus.ONLINE, firmware: "1.4.2", accessPointId: zones["North Pool"].accessPointId, lastSeenAt: hoursAgo(0.05) },
    { name: "QR-NP-02", type: "QR_READER", status: DeviceStatus.ONLINE, firmware: "2.1.0", accessPointId: zones["North Pool"].accessPointId, lastSeenAt: hoursAgo(0.02) },
    { name: "CAM-07", type: "IP_CAMERA", status: DeviceStatus.OFFLINE, firmware: "5.7.1", accessPointId: zones["North Pool"].accessPointId, lastSeenAt: hoursAgo(6) },
    { name: "EDGE-01", type: "EDGE_GATEWAY", status: DeviceStatus.ONLINE, firmware: "0.9.0", accessPointId: null, lastSeenAt: hoursAgo(0.03) },
    { name: "UPS-GW-01", type: "UPS", status: DeviceStatus.WARNING, firmware: "1.0.0", accessPointId: null, lastSeenAt: hoursAgo(0.5) },
    { name: "GYM-CTRL-01", type: "ACCESS_CONTROLLER", status: DeviceStatus.ONLINE, firmware: "1.4.2", accessPointId: zones["Fitness Center"].accessPointId, lastSeenAt: hoursAgo(0.1) },
    { name: "CLUB-CTRL-01", type: "ACCESS_CONTROLLER", status: DeviceStatus.ONLINE, firmware: "1.4.2", accessPointId: zones["Clubhouse"].accessPointId, lastSeenAt: hoursAgo(0.2) }
  ];
  for (const spec of deviceSpecs) {
    const existing = await prisma.device.findFirst({ where: { propertyId, name: spec.name } });
    if (!existing) {
      await prisma.device.create({ data: { ...spec, propertyId } });
    }
  }

  // --- Incidents ---
  const incidentSpecs = [
    { code: "INC-2026-0915", title: "Door held open", severity: "CRITICAL", status: IncidentStatus.ACKNOWLEDGED, zone: "North Pool", assignedTo: "Estación 01", description: "North Pool Gate remained open longer than configured threshold." },
    { code: "INC-2026-0914", title: "Cámara fuera de línea", severity: "MEDIUM", status: IncidentStatus.OPEN, zone: "North Pool", assignedTo: "Soporte IT", description: "CAM-07 dejó de reportar." },
    { code: "INC-2026-0912", title: "Intentos repetidos", severity: "HIGH", status: IncidentStatus.RESOLVED, zone: "West Gate", assignedTo: "Seguridad", description: "Varios intentos de acceso rechazados en un corto periodo." }
  ];
  for (const spec of incidentSpecs) {
    const existing = await prisma.incident.findUnique({ where: { code: spec.code } });
    if (!existing) {
      await prisma.incident.create({
        data: { code: spec.code, title: spec.title, severity: spec.severity, status: spec.status, description: spec.description, assignedTo: spec.assignedTo, zoneId: zones[spec.zone].id, propertyId }
      });
    }
  }

  // --- Automations ---
  const automationSpecs = [
    { name: "Puerta abierta prolongada", trigger: "Abierta > 30 seg", scope: "North Pool", status: AutomationStatus.ACTIVE, lastRunAt: hoursAgo(0.1) },
    { name: "Respuesta a entrada forzada", trigger: "Apertura sin autorización", scope: "Accesos exteriores", status: AutomationStatus.ACTIVE, lastRunAt: hoursAgo(30) },
    { name: "Intentos rechazados repetidos", trigger: "3 rechazos / 2 min", scope: "Todos los accesos", status: AutomationStatus.ACTIVE, lastRunAt: hoursAgo(1) },
    { name: "Gateway fuera de línea", trigger: "Offline > 90 seg", scope: "Todos los gateways", status: AutomationStatus.PAUSED, lastRunAt: null }
  ];
  for (const spec of automationSpecs) {
    const existing = await prisma.automation.findFirst({ where: { propertyId, name: spec.name } });
    if (!existing) {
      await prisma.automation.create({ data: { ...spec, propertyId } });
    }
  }

  // --- Reservations ---
  const reservationSpecs = [
    { title: "Carril de alberca", zone: "North Pool", start: daysFromNow(0, 7, 0), end: daysFromNow(0, 7, 45), unitLabel: "Sarah Miller · 318", status: "CONFIRMED" },
    { title: "Reunión familiar", zone: "Clubhouse", start: daysFromNow(0, 17, 30), end: daysFromNow(0, 20, 30), unitLabel: "John Smith · 204", status: "CONFIRMED" },
    { title: "Evento privado", zone: "Clubhouse", start: daysFromNow(1, 16, 0), end: daysFromNow(1, 21, 0), unitLabel: "Amanda Lee · 412", status: "PENDING" },
    { title: "Clase de yoga", zone: "Fitness Center", start: daysFromNow(3, 17, 0), end: daysFromNow(3, 18, 0), unitLabel: "Daniel Ruiz · 105", status: "CONFIRMED" }
  ];
  for (const spec of reservationSpecs) {
    const existing = await prisma.reservation.findFirst({ where: { propertyId, title: spec.title } });
    if (!existing) {
      await prisma.reservation.create({
        data: { title: spec.title, startsAt: spec.start, endsAt: spec.end, unitLabel: spec.unitLabel, status: spec.status, propertyId, zoneId: zones[spec.zone].id }
      });
    }
  }

  // --- Access events (for dashboard + reports) ---
  const johnCredential = people["John Smith"].credentialIds.find((c) => c.type === "Mobile")!;
  const sarahCredential = people["Sarah Miller"].credentialIds[0];
  const danielCredential = people["Daniel Ruiz"].credentialIds[0];
  const amandaCredential = people["Amanda Lee"].credentialIds[0];

  type EventSpec = { accessPoint: string; credentialId: string | null; result: AccessResult; reason: string | null; occurredAt: Date };
  const eventSpecs: EventSpec[] = [
    { accessPoint: "North Pool", credentialId: johnCredential.id, result: AccessResult.GRANTED, reason: null, occurredAt: hoursAgo(0.3) },
    { accessPoint: "North Pool", credentialId: johnCredential.id, result: AccessResult.GRANTED, reason: null, occurredAt: hoursAgo(5) },
    { accessPoint: "Fitness Center", credentialId: sarahCredential.id, result: AccessResult.GRANTED, reason: null, occurredAt: hoursAgo(1.2) },
    { accessPoint: "Clubhouse", credentialId: guestCredential.id, result: AccessResult.GRANTED, reason: null, occurredAt: hoursAgo(2) },
    { accessPoint: "North Pool", credentialId: null, result: AccessResult.DENIED, reason: "Unknown credential", occurredAt: hoursAgo(0.15) },
    { accessPoint: "North Pool", credentialId: danielCredential.id, result: AccessResult.DENIED, reason: "Expired QR", occurredAt: hoursAgo(3) },
    { accessPoint: "Fitness Center", credentialId: null, result: AccessResult.DENIED, reason: "Outside schedule", occurredAt: hoursAgo(20) },
    { accessPoint: "Clubhouse", credentialId: amandaCredential.id, result: AccessResult.DENIED, reason: "Disabled resident", occurredAt: hoursAgo(28) },
    { accessPoint: "West Gate", credentialId: null, result: AccessResult.DENIED, reason: "Unauthorized area", occurredAt: hoursAgo(50) },
    { accessPoint: "West Gate", credentialId: null, result: AccessResult.DENIED, reason: "Unauthorized area", occurredAt: hoursAgo(50.1) },
    { accessPoint: "West Gate", credentialId: null, result: AccessResult.DENIED, reason: "Unauthorized area", occurredAt: hoursAgo(50.2) },
    { accessPoint: "North Pool", credentialId: null, result: AccessResult.DENIED, reason: "Expired QR", occurredAt: hoursAgo(45) },
    { accessPoint: "North Pool", credentialId: johnCredential.id, result: AccessResult.GRANTED, reason: null, occurredAt: hoursAgo(29) }
  ];

  const accessPointIds = Object.values(zones).map((z) => z.accessPointId);
  const eventCount = await prisma.accessEvent.count({ where: { accessPointId: { in: accessPointIds } } });
  if (eventCount === 0) {
    for (const spec of eventSpecs) {
      const accessPointId = zones[spec.accessPoint].accessPointId;
      await prisma.accessEvent.create({
        data: { accessPointId, credentialId: spec.credentialId, result: spec.result, reason: spec.reason, occurredAt: spec.occurredAt }
      });
    }
  }
}

main()
  .then(() => console.log("🌱 Seed completo: usuarios, propiedad, zonas, dispositivos, incidentes, automatizaciones, reservaciones y eventos de acceso."))
  .finally(() => prisma.$disconnect());
