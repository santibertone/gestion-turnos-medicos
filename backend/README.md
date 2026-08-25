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

## Endpoints — Semana 2

CRUD de entidades base y agenda médica. Todos reutilizan `verificarToken` y `verificarRol`.

**Sedes / Especialidades / Coberturas — CRUD solo `administrador`** (un rol distinto responde 403):

| Método | Ruta                    | Protección          | Descripción                                  |
|--------|-------------------------|---------------------|----------------------------------------------|
| GET    | `/sedes`                | JWT + rol admin     | Lista sedes                                  |
| POST   | `/sedes`                | JWT + rol admin     | Alta de sede (`nombre`,`direccion`,`telefono`)|
| PUT    | `/sedes/:id`            | JWT + rol admin     | Modifica sede                                |
| DELETE | `/sedes/:id`            | JWT + rol admin     | Baja; 409 si tiene usuarios o agenda         |
| GET    | `/especialidades`       | JWT + rol admin     | Lista especialidades                         |
| POST   | `/especialidades`       | JWT + rol admin     | Alta (`descripcion`)                         |
| PUT    | `/especialidades/:id`   | JWT + rol admin     | Modifica especialidad                        |
| DELETE | `/especialidades/:id`   | JWT + rol admin     | Baja; 409 si está asociada a médico o agenda |
| POST   | `/coberturas`           | JWT + rol admin     | Alta (`nombre`)                              |
| PUT    | `/coberturas/:id`       | JWT + rol admin     | Modifica cobertura                           |
| DELETE | `/coberturas/:id`       | JWT + rol admin     | Baja; 409 si la usa un usuario o turno       |

> El `GET /coberturas` (listado público, Semana 1) sigue disponible para el registro.

**Agenda médica — acceden `medico` (solo la suya) y `operador` (cualquiera); `paciente` sin acceso:**

| Método | Ruta          | Protección              | Descripción                                        |
|--------|---------------|-------------------------|----------------------------------------------------|
| POST   | `/agenda`     | JWT + rol medico/operador | Alta de rango horario (varios por día permitidos)  |
| GET    | `/agenda`     | JWT + rol medico/operador | Lista; filtros `?id_medico=&id_sede=&fecha=`       |
| PUT    | `/agenda/:id` | JWT + rol medico/operador | Modifica un rango de agenda                        |
| DELETE | `/agenda/:id` | JWT + rol medico/operador | Baja; 409 si tiene turnos asociados                |

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
