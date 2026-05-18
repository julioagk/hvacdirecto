# HvacDirecto Backend

Backend separado para Railway con PostgreSQL.

## Variables de entorno

Copia `.env.example` a `.env` y completa los valores reales.

## Scripts

```bash
npm install
npm run dev
```

## Endpoints

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`

## Despliegue (Railway)

Pasos rápidos para desplegar en Railway con PostgreSQL:

- Crea un nuevo proyecto en Railway y añade un plugin de PostgreSQL.
- Configura las variables de entorno en Railway: `DATABASE_URL` (proporcionada por el plugin) y `JWT_SECRET` (genera un valor seguro).
- Instala dependencias y ejecuta las migraciones:

```bash
npm install
npm run migrate
```

- Inicia la aplicación (Railway usará `Procfile` o el script `start`):

```bash
npm start
```

Notas:
- Asegúrate de que `VITE_API_BASE_URL` (frontend) apunte a la URL pública del servicio Railway.
- Si prefieres ejecutar migraciones desde Railway Console, sube el contenido de `sql/schema.sql` y ejecútalo directamente.

