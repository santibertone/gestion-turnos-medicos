# Sistema de Gestión de Turnos Médicos — Backend

TP Integrador · Programación II · Node.js + Express + MySQL + JWT.

## Requisitos

- Node.js 18+ y npm
- MySQL / MariaDB

## Puesta en marcha

1. **Instalar dependencias**
   ```bash
   npm install
   ```

2. **Crear la base de datos** (importar el script provisto)
   ```bash
   mysql -u root -p < db/clinica.sql
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   ```
   Editar `.env` con las credenciales de tu MySQL local.

4. **Levantar el servidor**
   ```bash
   npm run dev
   ```
   Servidor en `http://localhost:3000`.

## Usuarios de prueba (contraseña: `clinica123`)

| Rol      | DNI       |
|----------|-----------|
| admin    | 18222333  |
| operador | 15200548  |
| medico   | 20111222  |
| paciente | 36000960  |

## Formato de respuesta uniforme

Todos los endpoints (éxito y error) responden:
```json
{ "codigo": 200, "estado": "ok", "datos": { } }
```

## Endpoints — Semana 1

| Método | Ruta             | Protección        | Descripción                      |
|--------|------------------|-------------------|----------------------------------|
| GET    | `/health`        | pública           | Prueba conexión a la base        |
| GET    | `/coberturas`    | pública           | Lista coberturas (para registro) |
| POST   | `/auth/registro` | pública           | Alta de paciente (bcrypt)        |
| POST   | `/auth/login`    | pública           | Devuelve JWT                     |
| GET    | `/auth/perfil`   | JWT               | Datos del usuario logueado       |
| GET    | `/admin/ping`    | JWT + rol admin   | Prueba de `verificarRol` (403)   |

## Estructura del proyecto

```
src/
  config/       conexión a la base (pool)
  controllers/  lógica de cada endpoint
  routes/       definición de rutas
  middlewares/  verificarToken, verificarRol
  utils/        respuesta uniforme
  index.js      punto de entrada
db/             script SQL de la base
postman/        colección de pruebas
```
