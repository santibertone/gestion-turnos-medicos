-- ============================================================================
--  seed_demo.sql - Datos de prueba para la defensa del frontend.
--  Se ejecuta DESPUES de clinica.sql:  mysql -u root clinica < db/seed_demo.sql
--
--  Incluye: coberturas y especialidades variadas, 3 medicos (uno con agenda en
--  mas de una sede), pacientes, agenda con fechas relativas a HOY (CURDATE) para
--  que el demo funcione cualquier dia, y turnos en los tres estados
--  (confirmado / cancelado / atendido) con su historial clinico.
--
--  Password de todos los usuarios = "clinica123".
-- ============================================================================
USE `clinica`;

-- --- Coberturas -------------------------------------------------------------
INSERT INTO `cobertura` (`id`, `nombre`) VALUES
  (2, 'OSDE'), (3, 'Swiss Medical'), (4, 'Particular')
  ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- --- Especialidades ---------------------------------------------------------
INSERT INTO `especialidad` (`id`, `descripcion`) VALUES
  (2, 'Clinica Medica'), (3, 'Pediatria'), (4, 'Cardiologia')
  ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- --- Usuarios (2 medicos nuevos + 1 paciente nuevo) -------------------------
-- hash bcrypt de "clinica123".
INSERT INTO `usuario`
  (`id`, `apellido`, `nombre`, `fecha_nacimiento`, `password`, `rol`, `email`, `telefono`, `dni`, `id_sede`, `id_cobertura`) VALUES
  (5, 'Garcia', 'Lucas', '1983-06-12', '$2b$10$KV4PC4WbL3/RGduQqbIPAemqV.2eagkp4K36kF1VyE0vLZvv7.PZ.', 'medico', 'lgarcia@clinica.com', '3424333444', '25333444', 1, NULL),
  (6, 'Martinez', 'Sofia', '1990-02-25', '$2b$10$KV4PC4WbL3/RGduQqbIPAemqV.2eagkp4K36kF1VyE0vLZvv7.PZ.', 'medico', 'smartinez@clinica.com', '3424555666', '30555666', 2, NULL),
  (7, 'Ramirez', 'Carla', '2001-09-05', '$2b$10$KV4PC4WbL3/RGduQqbIPAemqV.2eagkp4K36kF1VyE0vLZvv7.PZ.', 'paciente', 'cramirez@gmail.com', '3424777888', '42777888', NULL, 2)
  ON DUPLICATE KEY UPDATE apellido = VALUES(apellido);

-- --- Especialidades de cada medico ------------------------------------------
--  id 1 ya existe: medico 3 (Ana Lopez) -> Traumatologia.
INSERT INTO `medico_especialidad` (`id`, `id_medico`, `id_especialidad`) VALUES
  (2, 5, 2),  -- Garcia -> Clinica Medica
  (3, 5, 4),  -- Garcia -> Cardiologia
  (4, 6, 3)   -- Martinez -> Pediatria
  ON DUPLICATE KEY UPDATE id_medico = VALUES(id_medico);

-- --- Agenda (fechas relativas a HOY) ----------------------------------------
--  Ana Lopez (3) atiende HOY en la Sede Centro (1) Y en la Sede Norte (2): multi-sede.
INSERT INTO `agenda` (`id`, `hora_entrada`, `hora_salida`, `fecha`, `id_medico`, `id_especialidad`, `id_sede`) VALUES
  (3, '08:00', '12:00', CURDATE(),                      3, 1, 1),
  (4, '14:00', '18:00', CURDATE(),                      3, 1, 2),
  (5, '09:00', '13:00', CURDATE(),                      5, 2, 1),
  (6, '09:00', '12:00', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 5, 4, 1),
  (7, '10:00', '14:00', CURDATE(),                      6, 3, 2),
  (8, '09:00', '13:00', DATE_ADD(CURDATE(), INTERVAL 2 DAY), 6, 3, 2)
  ON DUPLICATE KEY UPDATE fecha = VALUES(fecha);

-- --- Turnos en los tres estados ---------------------------------------------
INSERT INTO `turno` (`id`, `nota`, `id_agenda`, `fecha`, `hora`, `id_paciente`, `id_cobertura`, `estado`) VALUES
  (3, 'Dolor de rodilla',       3, CURDATE(), '08:30', 2, 1, 'confirmado'),
  (4, 'Chequeo general',        5, CURDATE(), '09:30', 7, 2, 'cancelado'),
  (5, 'Control pediatrico',     7, CURDATE(), '10:30', 2, 1, 'atendido')
  ON DUPLICATE KEY UPDATE estado = VALUES(estado);

-- --- Historial del turno atendido (5) ---------------------------------------
INSERT INTO `historial_clinico`
  (`id`, `id_turno`, `id_medico`, `id_paciente`, `diagnostico`, `tratamiento`, `observaciones`) VALUES
  (2, 5, 6, 2, 'Cuadro viral leve', 'Hidratacion y reposo', 'Control si persiste la fiebre')
  ON DUPLICATE KEY UPDATE diagnostico = VALUES(diagnostico);

-- --- Notificaciones de ejemplo (no leidas) ----------------------------------
INSERT INTO `notificacion` (`id`, `id_usuario`, `tipo`, `mensaje`, `leida`) VALUES
  (3, 2, 'turno_confirmado', 'Tu turno de hoy a las 08:30 fue confirmado.', 0),
  (4, 3, 'turno_cancelado',  'Se cancelo un turno de tu agenda.', 0)
  ON DUPLICATE KEY UPDATE mensaje = VALUES(mensaje);

-- Reajustar los AUTO_INCREMENT para que las altas nuevas no choquen.
ALTER TABLE `cobertura` AUTO_INCREMENT = 5;
ALTER TABLE `especialidad` AUTO_INCREMENT = 5;
ALTER TABLE `usuario` AUTO_INCREMENT = 8;
ALTER TABLE `medico_especialidad` AUTO_INCREMENT = 5;
ALTER TABLE `agenda` AUTO_INCREMENT = 9;
ALTER TABLE `turno` AUTO_INCREMENT = 6;
ALTER TABLE `historial_clinico` AUTO_INCREMENT = 3;
ALTER TABLE `notificacion` AUTO_INCREMENT = 5;
