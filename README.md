# Backend Cocina Escolar — Deploy en Railway

API en Node.js + Express + MySQL (`mysql2`).

## Archivos incluidos
- `server.js` — servidor Express con todos los endpoints.
- `package.json` — con script `start` y Node >= 18.
- `railway.json` — configuración de build/deploy para Railway.
- `.gitignore`

## Pasos para subir a Railway

### 1. Crear el proyecto
1. Entrá a https://railway.app → **New Project**.
2. Elegí **Deploy from GitHub repo** (subí estos archivos a un repo) o **Empty Project** y luego subilos.

### 2. Agregar una base MySQL
1. Dentro del proyecto: **+ New** → **Database** → **Add MySQL**.
2. Railway crea automáticamente las variables `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`.

### 3. Configurar las variables del servicio del backend
En el servicio del backend → pestaña **Variables**, cargá (apuntando a tu MySQL):

| Variable      | Valor |
|---------------|-------|
| `DB_HOST`     | host de tu MySQL |
| `DB_PORT`     | 3306 (o el que indique Railway) |
| `DB_USER`     | usuario |
| `DB_PASSWORD` | contraseña |
| `DB_NAME`     | nombre de la base |

> El código también reconoce automáticamente las variables `MYSQLHOST`, `MYSQLUSER`, etc. que crea el plugin MySQL de Railway, así que si usás el MySQL de Railway no necesitás cargar nada más.

> **No** hace falta definir `PORT`: Railway la inyecta sola y el servidor ya la usa.

### 4. Crear las tablas
Usando la pestaña **Data** del MySQL de Railway (o un cliente como DBeaver/MySQL Workbench con los datos de conexión), creá las tablas que usa la app: `estudiantes`, `utensilios`, `movimientos`.

### 5. Deploy
Railway detecta Node automáticamente, corre `npm install` y luego `npm start`.
Cuando termine, en **Settings → Networking** generá un dominio público.

### 6. Probar
Abrí en el navegador la URL que te dio Railway. Deberías ver:
```json
{ "status": "ok", "mensaje": "API Cocina Escolar en línea" }
```

### 7. Conectar la app Flutter
En tu app `cocina_escolar_app`, reemplazá la URL base del backend por el dominio de Railway (ej: `https://tu-proyecto.up.railway.app`).

## Nota de seguridad
Las credenciales de la base ya **no están escritas en el código**: se leen de variables de entorno. No subas contraseñas al repositorio.
