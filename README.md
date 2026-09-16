# Smart Access Management Platform

Base funcional para administrar accesos a albercas y áreas comunes en complejos residenciales. Incluye panel administrativo responsive, autenticación, modelo multi-property, PostgreSQL, Prisma, Docker y HTTPS automático con Caddy.

## Vistas incluidas

- Login protegido por sesión HTTP-only.
- Dashboard operativo.
- Residentes y unidades.
- Zonas y reglas.
- Incidentes.
- Automatizaciones.
- Dispositivos.
- Reportes.
- Reservaciones.

## Requisitos

- Docker Engine 24 o superior.
- Docker Compose v2.
- Un servidor Linux con puertos 80 y 443 disponibles.
- Un dominio (o subdominio) con un registro DNS tipo A apuntando a la IP del VPS **antes** de levantar el proxy, para que Caddy pueda emitir el certificado HTTPS automáticamente.

## Inicio rápido

1. Copiar las variables de entorno:

   ```bash
   cp .env.example .env
   ```

2. Cambiar todas las variables marcadas con `CHANGE_ME`, generar un `SESSION_SECRET` de al menos 32 caracteres (`sh scripts/generate-secrets.sh`), y definir `DOMAIN` y `ACME_EMAIL` con tu dominio real.

3. Construir y levantar servicios:

   ```bash
   docker compose up -d --build
   ```

4. Crear el esquema y datos de demostración. La imagen final de producción no incluye el CLI de Prisma ni `tsx` (se quitan a propósito para aligerarla), así que este paso se corre contra la etapa de build, que sí los tiene:

   ```bash
   docker build --target builder -t smart-access-builder .
   docker run --rm --network smart-access_smartaccess --env-file .env smart-access-builder npx prisma db push
   docker run --rm --network smart-access_smartaccess --env-file .env smart-access-builder npx prisma db seed
   ```

   (Si tu `.env` tiene los valores entre comillas dobles, `docker run --env-file` no las quita como sí lo hace `docker compose`. Genera una copia sin comillas solo para este paso: `sed -e 's/^\([^=]*\)="\(.*\)"$/\1=\2/' .env > .env.norun` y usa `--env-file .env.norun` en su lugar.)

5. Abrir `https://TU_DOMINIO` e iniciar sesión con `ADMIN_EMAIL` y `ADMIN_PASSWORD` definidos en `.env`. Caddy emite y renueva el certificado automáticamente; los primeros segundos puede tardar mientras obtiene el certificado de Let's Encrypt.

## Usuarios de demostración

El seed crea tres cuentas reales en la base de datos (contraseñas con hash, no texto plano):

- `ADMIN_EMAIL` / `ADMIN_PASSWORD` (los que pusiste en `.env`) — rol Platform owner.
- `manager@smartaccess.local` / `DEMO_USERS_PASSWORD` — rol Property manager.
- `guard@smartaccess.local` / `DEMO_USERS_PASSWORD` — rol Security guard.

Las dos últimas son solo para demostrar que hay múltiples usuarios y roles — cámbiales la contraseña o bórralas antes de que un cliente real use la plataforma. Por ahora los roles no restringen todavía qué puede ver o hacer cada uno (ver `docs/ROADMAP.md`).

## Desarrollo local sin Docker

```bash
npm install
cp .env.example .env
npx prisma generate
npm run dev
```

Se requiere una instancia PostgreSQL accesible mediante `DATABASE_URL`.

## Estructura

```text
src/app/               Rutas y pantallas Next.js
src/components/        Navegación y componentes reutilizables
src/lib/               Sesión y datos de demostración
prisma/                Modelo de datos y seed
infra/caddy/           Proxy inverso con HTTPS automático
docs/                  Despliegue, alcance y siguientes fases
```

## Estado actual

El panel, la autenticación y los 7 módulos ya leen datos reales de Postgres vía Prisma (seed incluido para poblarlos). El login valida contra usuarios persistentes con contraseña con hash (bcrypt), y las rutas de `/app` están protegidas por middleware. Lo que falta para producción real con clientes: formularios de creación/edición (los módulos son de solo lectura por ahora), aplicar permisos por rol, MFA, y la conexión física con controladores y sensores (planeada como servicio de edge gateway en una fase posterior). Ver `docs/ROADMAP.md` para el detalle.

## Seguridad antes de producción

- Cambiar todas las contraseñas y secretos (nunca dejar los valores `CHANGE_ME`), incluyendo `DEMO_USERS_PASSWORD` o eliminar esas cuentas.
- Confirmar que el certificado de Caddy se emitió correctamente (`docker compose logs proxy`).
- Restringir acceso SSH y al puerto de PostgreSQL.
- Crear respaldos automáticos.
- Configurar firewall y actualizaciones del sistema.
- Aplicar permisos por rol y agregar MFA antes del acceso de clientes reales.

Consulta `docs/VPS_DEPLOYMENT.md` para el procedimiento de despliegue.
