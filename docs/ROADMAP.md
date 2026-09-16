# Hoja de ruta técnica

## Fase 1 Base funcional

- Panel administrativo y navegación.
- Sesión protegida.
- PostgreSQL y modelo multi-property.
- Residentes, zonas, incidentes, dispositivos y reservaciones.
- Contenedores y health check.

## Fase 2 Datos reales (en progreso)

- [x] Los 7 módulos leen y calculan sus datos desde Postgres vía Prisma (ya no hay información estática de muestra).
- [x] Usuarios persistentes en base de datos con contraseñas con hash (bcrypt), en vez de una sola cuenta fija por variable de entorno.
- [x] Rutas de `/app` protegidas por middleware server-side (antes solo dependían del navegador).
- [x] Alta de residentes desde la interfaz (`/app/residents`, crea unidad si no existe, credencial opcional). El resto de los módulos (zonas, incidentes, dispositivos, etc.) siguen de solo lectura — sus botones de acción todavía no están conectados.
- [x] Pantalla de administración de usuarios (`/app/users`, solo visible/usable para el rol Platform owner) — permite dar de alta usuarios con cualquier rol. Falta editar rol/estado y dar de baja desde la interfaz (por ahora eso sigue siendo vía `scripts/create-user.ts` o base de datos directa).
- [ ] CRUD completo (editar/eliminar) desde la interfaz para todos los módulos.
- [ ] Roles y permisos por propiedad más allá de la pantalla de usuarios (los roles ya existen en el modelo de datos, pero no restringen todavía qué ve o hace cada uno dentro de los módulos operativos).
- [ ] Auditoría de cambios.
- [ ] Importación CSV.
- [ ] API para app de residente.

## Fase 3 Tiempo real y seguridad

- WebSocket o Server-Sent Events.
- Consola de seguridad.
- Motor de alertas.
- Evidencia de cámaras.
- Notificaciones push, correo y SMS.

## Fase 4 Edge e IoT

- Gateway local.
- MQTT con certificados por dispositivo.
- Caché de reglas para operación offline.
- Drivers para controladores, relevadores, lectores y sensores.
- Actualizaciones y diagnóstico remoto.

## Fase 5 Aplicaciones móviles

- PWA o aplicación multiplataforma del residente.
- QR temporal.
- Apertura móvil con biometría del dispositivo.
- Invitados, amenidades y notificaciones.
