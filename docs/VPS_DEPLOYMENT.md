# Despliegue en VPS

## Especificación inicial recomendada

- Debian 13 o Ubuntu 24.04 LTS.
- 4 vCPU.
- 8 GB de RAM.
- 80 GB NVMe.
- Docker Engine y Docker Compose.
- Dominio o subdominio dedicado.

## Preparación segura

1. Apuntar el registro DNS tipo A del dominio (o subdominio) a la IP del VPS. Este paso debe completarse **antes** de levantar el proxy, porque Caddy solicita el certificado HTTPS en cuanto arranca.
2. Crear un usuario de despliegue sin acceso directo como root.
3. Agregar una llave pública SSH temporal.
4. Permitir únicamente los puertos 22, 80 y 443 en el firewall (por ejemplo `ufw allow 22,80,443/tcp` y `ufw enable`).
5. Configurar actualizaciones de seguridad automáticas.
6. Instalar Docker Engine y el plugin de Docker Compose.
7. Copiar el proyecto en `/opt/smart-access`.
8. Crear `.env` desde `.env.example`, protegerlo con permisos `600`, generar `SESSION_SECRET`/`POSTGRES_PASSWORD` con `sh scripts/generate-secrets.sh` y definir `DOMAIN` con el dominio real y `ACME_EMAIL` con un correo de contacto.
9. Levantar el proyecto con `docker compose up -d --build`.
10. Ejecutar el esquema y el seed contra la etapa de build (la imagen final no trae el CLI de Prisma ni `tsx`): `docker build --target builder -t smart-access-builder .`, luego `docker run --rm --network smart-access_smartaccess --env-file .env smart-access-builder npx prisma db push` y lo mismo con `db seed`. Ver el README para el detalle de las comillas en `--env-file`.
11. Verificar `https://TU_DOMINIO/api/health` y revisar `docker compose logs proxy` si el certificado tarda en emitirse.
12. Configurar respaldo diario de PostgreSQL fuera del VPS (por ejemplo `docker compose exec db pg_dump` vía cron, enviado a almacenamiento externo).

## Actualizaciones

```bash
cd /opt/smart-access
docker compose build app
docker compose up -d app
docker compose ps
```

Antes de actualizar el esquema de base de datos se debe generar un respaldo y ejecutar migraciones de Prisma.

## Información requerida para el despliegue asistido

- Dirección IP o hostname.
- Puerto SSH.
- Usuario temporal.
- Llave pública autorizada.
- Dominio o subdominio.
- Proveedor del VPS.
- Sistema operativo instalado.

No se debe compartir por chat una contraseña, llave privada o acceso root permanente.
