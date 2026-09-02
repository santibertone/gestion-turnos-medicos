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

## Endpoints — Semana 3

Gestión de turnos, historial clínico y notificaciones. Los errores de validación
(horario no disponible, turno superpuesto, etc.) devuelven un código apropiado
(400/403/404/409), **nunca 500**.

**Turnos:**

| Método | Ruta                        | Protección                    | Descripción                                                        |
|--------|-----------------------------|-------------------------------|--------------------------------------------------------------------|
| POST   | `/turnos`                   | JWT + rol paciente/operador   | Alta de turno; el paciente para sí, el operador con `id_paciente`. Valida disponibilidad en agenda y no superposición. Cobertura tomada del paciente; estado `confirmado` |
| PUT    | `/turnos/:id/cancelar`      | JWT + rol paciente/operador/medico | Cancela (paciente el propio; operador/médico los de su sede). Estado `cancelado` |
| PUT    | `/turnos/:id/atender`       | JWT + rol medico              | El médico marca su turno como `atendido`                           |
| GET    | `/turnos/mis-turnos`        | JWT + rol paciente            | Turnos del paciente, del más próximo al menos próximo              |
| GET    | `/turnos/agenda-medico`     | JWT + rol medico              | Turnos programados del médico; filtro `?fecha=`                    |
| GET    | `/turnos/sede`              | JWT + rol operador            | Turnos de la sede del operador; filtro `?fecha=`                   |

> Cada cambio de estado (confirmado → cancelado / atendido) genera una **notificación interna** para el paciente.

**Historial clínico:**

| Método | Ruta                            | Protección              | Descripción                                                    |
|--------|---------------------------------|-------------------------|----------------------------------------------------------------|
| POST   | `/historial`                    | JWT + rol medico        | Registra diagnóstico/tratamiento/observaciones de un turno atendido propio |
| GET    | `/historial/paciente/:id`       | JWT + rol paciente/medico | Paciente: su historial completo. Médico: solo los registros de turnos que él atendió |

**Notificaciones** (se crean solo internamente; nunca por endpoint público):

| Método | Ruta                          | Protección | Descripción                                          |
|--------|-------------------------------|------------|------------------------------------------------------|
| GET    | `/notificaciones`             | JWT        | Notificaciones del usuario, de la más reciente a la más antigua |
| PUT    | `/notificaciones/:id/leida`   | JWT        | Marca una notificación propia como leída             |

## Endpoints — Semana 4

Auditoría de acciones sensibles y reportes/estadísticas. Todo el bloque es de acceso
**exclusivo del rol `administrador`** (otro rol → 403; sin token → 401).

**Auditoría (`log_auditoria`):** cada **alta, baja o modificación** sobre usuarios,
coberturas, especialidades y sedes se registra **automáticamente** mediante el
middleware `auditar(entidad)` (`src/middlewares/auditoria.js`), aplicado a nivel de
ruta — sin repetir código en cada controller. Un GET no se audita; una operación que
falla (400/404/409) tampoco genera registro.

| Método | Ruta          | Protección       | Descripción                                                                 |
|--------|---------------|------------------|-----------------------------------------------------------------------------|
| GET    | `/auditoria`  | JWT + rol admin  | Lista los logs (más reciente primero). Filtros: `?id_usuario=&entidad=&desde=&hasta=` (fechas `YYYY-MM-DD`, inclusivas) |

Cada log devuelve: `id`, `id_usuario`, `usuario` (apellido y nombre), `accion`
(`ALTA`/`BAJA`/`MODIFICACION`), `entidad`, `id_entidad`, `detalle` y `fecha`.

**Reportes y estadísticas:** consultas agregadas sobre `turno`/`agenda`/`especialidad`/`sede`.
Todos admiten filtro por rango de fechas del turno (`?desde=&hasta=`, `YYYY-MM-DD`).

| Método | Ruta                                  | Protección       | Descripción                                                        |
|--------|---------------------------------------|------------------|--------------------------------------------------------------------|
| GET    | `/reportes/turnos-por-especialidad`   | JWT + rol admin  | Cantidad de turnos agrupada por especialidad                       |
| GET    | `/reportes/turnos-por-sede`           | JWT + rol admin  | Cantidad de turnos agrupada por sede                               |
| GET    | `/reportes/ranking-medicos`           | JWT + rol admin  | Ranking de médicos por turnos **atendidos** (todos, no solo el 1º) |
| GET    | `/reportes/tasa-cancelacion`          | JWT + rol admin  | `total_turnos`, `cancelados`, `tasa_cancelacion` (0–1) y `porcentaje` |

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
