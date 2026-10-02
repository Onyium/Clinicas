import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import bcrypt from 'bcryptjs';
import { pool } from './db.js';
import whatsappRoutes from './whatsappRoutes.js';

import { 
  enviarMensajeCita,
  enviarRecetaClinica, 
  enviarResumenConsulta 
} from './whatsappService.js';

import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import os from 'os';
import fs from 'fs';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/whatsapp', whatsappRoutes);

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({ dest: os.tmpdir() });

// ==========================================
// AUTO-REPARACIÓN DE DATOS HUÉRFANOS AL INICIAR
// ==========================================
(async () => {
  try {
    // Asegura que los pacientes y citas creados antes tengan usuario_id = 1 (Dra. Liseyda)
    // Así nunca se mezclan con los doctores nuevos (ID 2, 3, etc.)
    await pool.query('UPDATE pacientes SET usuario_id = 1 WHERE usuario_id IS NULL OR usuario_id = 0');
    await pool.query('UPDATE citas SET usuario_id = 1 WHERE usuario_id IS NULL OR usuario_id = 0');
    console.log('🛡️ [BD] Aislamiento multi-doctor verificado correctamente.');
  } catch (err) {
    console.warn('⚠️ [BD] Aviso al verificar aislamiento:', err.message);
  }
})();

// Helper para obtener siempre el ID del doctor logueado
function obtenerUsuarioId(req) {
  const rawId = req.headers['x-usuario-id'] || req.body?.usuario_id || req.body?.clinicaId;
  return (rawId && rawId !== 'undefined' && !isNaN(rawId)) ? parseInt(rawId, 10) : 1;
}

// Función utilitaria para calcular hora de fin
function calcularHoraFin(horaInicio, duracionMinutos) {
  const [h, m] = horaInicio.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  date.setMinutes(date.getMinutes() + parseInt(duracionMinutos, 10));
  return String(date.getHours()).padStart(2, '0') + ':' + 
         String(date.getMinutes()).padStart(2, '0') + ':00';
}

// ==========================================
// WHATSAPP DIRECTO
// ==========================================
app.post('/api/recetas/enviar', async (req, res) => {
  const sessionKey = String(obtenerUsuarioId(req));
  const { paciente_telefono, paciente_nombre, indicaciones, doctor_nombre } = req.body;

  try {
    await enviarRecetaClinica(sessionKey, paciente_telefono, {
      paciente_nombre,
      doctor_nombre,
      indicaciones,
      nombre_clinica: req.body.nombre_clinica || 'Consultorio Médico'
    });

    res.json({ ok: true, mensaje: 'Receta enviada desde el WhatsApp vinculado' });
  } catch (error) {
    console.error('Error enviando receta:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Endpoint para subir el logo
app.post('/api/upload-logo', upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se envió ninguna imagen' });

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'clinica_logos',
    });

    fs.unlinkSync(req.file.path);
    res.json({ url: result.secure_url });
  } catch (error) {
    console.error('Error subiendo logo:', error);
    res.status(500).json({ error: 'Error al subir la imagen a Cloudinary' });
  }
});

// ==========================================
// AUTENTICACIÓN
// ==========================================
app.post('/api/login', async (req, res) => {
  const { usuario, password } = req.body;

  if (!usuario || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  try {
    const cleanUser = String(usuario).trim();
    const [rows] = await pool.query(
      'SELECT id, usuario, password, nombre FROM usuarios WHERE usuario = ?',
      [cleanUser]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = rows[0];
    let passwordValido = false;

    if (user.password && (user.password.startsWith('$2b$') || user.password.startsWith('$2a$'))) {
      passwordValido = await bcrypt.compare(password, user.password);
    } else {
      passwordValido = (password === user.password);

      if (passwordValido) {
        const nuevoHash = await bcrypt.hash(password, 10);
        await pool.query('UPDATE usuarios SET password = ? WHERE id = ?', [nuevoHash, user.id]);
        console.log(`🔐 Contraseña de ${user.usuario} migrada y encriptada exitosamente.`);
      }
    }

    if (!passwordValido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    res.json({
      ok: true,
      usuario: {
        id: user.id,
        usuario: user.usuario,
        nombre: user.nombre
      }
    });
  } catch (err) {
    console.error('Error en /api/login:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// CONFIGURACIÓN DE LA CLÍNICA
// ==========================================
app.get('/api/configuracion', async (req, res) => {
  const usuarioId = obtenerUsuarioId(req);
  try {
    const [rows] = await pool.query('SELECT * FROM configuracion WHERE id = ? OR id = 1 ORDER BY id DESC LIMIT 1', [usuarioId]);
    res.json(rows[0] || { nombre_clinica: 'Consultorio Médico' });
  } catch (err) {
    console.error('Error al obtener configuracion:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/configuracion', async (req, res) => {
  const usuarioId = obtenerUsuarioId(req);
  const { 
    nombre_clinica, 
    eslogan, 
    telefono_clinica, 
    direccion, 
    logo_url, 
    hora_apertura, 
    hora_cierre, 
    duracion_defecto_minutos,
    jvpm,
    horario_atencion,
    nombre_doctor
  } = req.body;

  try {
    await pool.query(`
      INSERT INTO configuracion (
        id, nombre_clinica, eslogan, telefono_clinica, direccion, logo_url, 
        hora_apertura, hora_cierre, duracion_defecto_minutos, jvpm, horario_atencion, nombre_doctor
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
      ON DUPLICATE KEY UPDATE
        nombre_clinica = VALUES(nombre_clinica),
        eslogan = VALUES(eslogan),
        telefono_clinica = VALUES(telefono_clinica),
        direccion = VALUES(direccion),
        logo_url = VALUES(logo_url),
        hora_apertura = VALUES(hora_apertura),
        hora_cierre = VALUES(hora_cierre),
        duracion_defecto_minutos = VALUES(duracion_defecto_minutos),
        jvpm = VALUES(jvpm),
        horario_atencion = VALUES(horario_atencion),
        nombre_doctor = VALUES(nombre_doctor)
    `, [
      usuarioId,
      nombre_clinica || 'Consultorio Médico',
      eslogan || null,
      telefono_clinica || null,
      direccion || null,
      logo_url || null,
      hora_apertura ? (hora_apertura.length === 5 ? `${hora_apertura}:00` : hora_apertura) : '08:00:00',
      hora_cierre ? (hora_cierre.length === 5 ? `${hora_cierre}:00` : hora_cierre) : '17:00:00',
      parseInt(duracion_defecto_minutos, 10) || 30,
      jvpm || null,
      horario_atencion || null,
      nombre_doctor || null
    ]);

    res.json({ ok: true, mensaje: 'Configuración guardada exitosamente' });
  } catch (err) {
    console.error('Error detallado en configuracion:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// CITAS Y CALENDARIO (CORREGIDO Y AISLADO POR DOCTOR)
// ==========================================
app.get('/api/citas', async (req, res) => {
  const usuarioId = obtenerUsuarioId(req);
  try {
    // ✅ Corregido: Ordenar por fecha_cita y hora_cita (antes decía "fecha" y daba Error 500)
    const [rows] = await pool.query(
      'SELECT * FROM citas WHERE usuario_id = ? ORDER BY fecha_cita DESC, hora_cita ASC', 
      [usuarioId]
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ Error en GET /api/citas:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/citas', async (req, res) => {
  const usuarioId = obtenerUsuarioId(req);
  const sessionKey = String(usuarioId);
  const { 
    paciente_id, 
    paciente_nombre, 
    paciente_telefono, 
    doctor_id, 
    doctor_nombre, 
    fecha_cita, 
    hora_cita, 
    duracion_minutos, 
    indicaciones, 
    estado 
  } = req.body;

  const duracion = parseInt(duracion_minutos, 10) || 30;
  const horaFin = hora_cita ? calcularHoraFin(hora_cita, duracion) : null;
  const estadoFinal = estado || 'CONFIRMADA';

  try {
    const [result] = await pool.query(
      `INSERT INTO citas (
        usuario_id, paciente_id, paciente_nombre, paciente_telefono, 
        doctor_id, doctor_nombre, fecha_cita, hora_cita, 
        duracion_minutos, hora_fin, indicaciones, estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        usuarioId,
        paciente_id || null,
        paciente_nombre || 'Paciente',
        paciente_telefono || '',
        doctor_id || null,
        doctor_nombre || 'Dr(a). Consulta',
        fecha_cita,
        hora_cita,
        duracion,
        horaFin,
        indicaciones || null,
        estadoFinal
      ]
    );

    const nuevaCitaId = result.insertId;

    res.json({ 
      ok: true, 
      id: nuevaCitaId, 
      mensaje: 'Cita guardada correctamente' 
    });

    setImmediate(async () => {
      try {
        if (paciente_telefono) {
          const mensaje = `Hola *${paciente_nombre}*, su cita ha sido reservada con éxito para el día *${fecha_cita}* a las *${hora_cita}* con ${doctor_nombre || 'el médico'}.`;
          await enviarMensajeCita(sessionKey, paciente_telefono, mensaje);
          console.log(`✅ [WhatsApp Cita] Enviado desde sesión [${sessionKey}].`);
        }
      } catch (waErr) {
        console.error(`❌ [WhatsApp Cita Error Sesión ${sessionKey}]:`, waErr.message);
      }
    });

  } catch (dbErr) {
    console.error('❌ Error guardando cita en MySQL:', dbErr);
    res.status(500).json({ error: dbErr.message });
  }
});

app.put('/api/citas/:id', async (req, res) => {
  const usuarioId = obtenerUsuarioId(req);
  const { id } = req.params;
  const { paciente_nombre, paciente_telefono, doctor_nombre, fecha_cita, hora_cita, duracion_minutos, indicaciones, estado } = req.body;

  const duracion = duracion_minutos || 30;
  const hora_fin = hora_cita ? calcularHoraFin(hora_cita, duracion) : null;

  try {
    await pool.query(
      `UPDATE citas 
       SET paciente_nombre = ?, paciente_telefono = ?, doctor_nombre = ?, 
           fecha_cita = ?, hora_cita = ?, duracion_minutos = ?, hora_fin = ?, 
           indicaciones = ?, estado = ?,
           requiere_atencion_humana = CASE WHEN ? = 'CONFIRMADA' THEN FALSE ELSE requiere_atencion_humana END
       WHERE id = ? AND usuario_id = ?`,
      [paciente_nombre, paciente_telefono, doctor_nombre, fecha_cita, hora_cita, duracion, hora_fin, indicaciones || null, estado, estado, id, usuarioId]
    );

    await pool.query(
      `UPDATE recetas_medicamentos 
       SET paciente_telefono = ?, paciente_nombre = ?
       WHERE cita_id = ?`,
      [paciente_telefono, paciente_nombre, id]
    );

    res.json({ message: 'Cita y recetas actualizadas correctamente' });
  } catch (error) {
    console.error('Error al actualizar cita:', error);
    res.status(500).json({ error: 'Error al actualizar cita' });
  }
});

app.delete('/api/citas/:id', async (req, res) => {
  const usuarioId = obtenerUsuarioId(req);
  try {
    await pool.query('DELETE FROM citas WHERE id = ? AND usuario_id = ?', [req.params.id, usuarioId]);
    res.json({ message: 'Cita eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar cita' });
  }
});

app.post('/api/citas/cancelar-jornada', async (req, res) => {
  const { fecha, doctor_nombre } = req.body;
  if (!fecha || !doctor_nombre) {
    return res.status(400).json({ error: 'Fecha y nombre del doctor requeridos' });
  }
  res.json({ message: 'Proceso de notificación de emergencia iniciado' });
});

// ==========================================
// DOCTORES
// ==========================================
app.get('/api/doctores', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM doctores WHERE activo = TRUE ORDER BY nombre ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener doctores' });
  }
});

app.post('/api/doctores/bloquear-fecha', async (req, res) => {
  const { doctor_id, fecha, motivo } = req.body;
  try {
    await pool.query(
      `INSERT INTO bloqueos_doctor (doctor_id, fecha_bloqueada, motivo) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE motivo = ?`,
      [doctor_id, fecha, motivo || 'Ausente', motivo || 'Ausente']
    );

    const [docs] = await pool.query('SELECT nombre FROM doctores WHERE id = ?', [doctor_id]);
    const doctorNombre = docs[0]?.nombre || 'el doctor';

    res.json({ message: `Jornada del ${fecha} bloqueada para ${doctorNombre}.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al bloquear fecha' });
  }
});

// ==========================================
// RECETAS INDEPENDIENTES
// ==========================================
app.post('/api/recetas/multiple', async (req, res) => {
  const sessionKey = String(obtenerUsuarioId(req));
  const { cita_id, paciente_nombre, paciente_telefono, doctor_nombre, medicamentos } = req.body;

  if (!medicamentos || medicamentos.length === 0) {
    return res.status(400).json({ error: 'No se enviaron medicamentos' });
  }

  try {
    await pool.query('UPDATE recetas_medicamentos SET activo = FALSE WHERE cita_id = ?', [cita_id]);

    for (const m of medicamentos) {
      if (!m.medicamento) continue;

      const dosis = `${m.frecuencia || 'Cada 8 horas'} - ${m.indicacion || ''}`.trim();
      const dias = Number(m.dias_tratamiento) || 5;

      await pool.query(
        `INSERT INTO recetas_medicamentos 
         (cita_id, paciente_nombre, paciente_telefono, medicamento, dosis_indicacion, fecha_inicio, dias_tratamiento, hora_recordatorio, activo)
         VALUES (?, ?, ?, ?, ?, CURDATE(), ?, '08:00:00', TRUE)`,
        [cita_id, paciente_nombre, paciente_telefono, m.medicamento, dosis, dias]
      );
    }

    res.json({ message: 'Receta guardada con éxito' });

    setImmediate(async () => {
      try {
        if (paciente_telefono) {
          const medTexto = medicamentos.map(m => `• *${m.medicamento}*: ${m.frecuencia || 'Cada 8 hrs'} durante ${m.dias_tratamiento || 5} días`).join('\n');
          await enviarRecetaClinica(sessionKey, paciente_telefono, {
            paciente_nombre,
            doctor_nombre,
            indicaciones: medTexto,
            nombre_clinica: 'Consultorio Médico'
          });
          console.log(`✅ [WhatsApp Receta] Enviada desde sesión [${sessionKey}].`);
        }
      } catch (err) {
        console.error(`❌ [WhatsApp Receta Error Sesión ${sessionKey}]:`, err.message);
      }
    });

  } catch (error) {
    console.error('Error insertando receta en MySQL:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// MÓDULO DE PACIENTES Y EXPEDIENTES (AISLADO POR DOCTOR)
// ==========================================
app.get('/api/pacientes', async (req, res) => {
  const usuarioId = obtenerUsuarioId(req);
  const q = (req.query.q || '').trim();

  try {
    // ✅ Sin "OR usuario_id IS NULL", así cada doctor ve estrictamente sus pacientes
    const [rows] = await pool.query(
      `SELECT * FROM pacientes 
       WHERE usuario_id = ? 
         AND (nombre LIKE ? OR telefono LIKE ?) 
       ORDER BY id DESC`,
      [usuarioId, `%${q}%`, `%${q}%`]
    );
    
    res.json(rows);
  } catch (err) {
    console.error('❌ Error al obtener pacientes:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/pacientes', async (req, res) => {
  const usuarioId = obtenerUsuarioId(req);

  const { 
    id,
    nombre, 
    telefono, 
    fecha_nacimiento, 
    sexo, 
    alergias, 
    antecedentes, 
    contacto_emergencia,
    telefono_emergencia,
    foto_url,
    responsable_nombre, 
    responsable_parentesco,
    responsable_telefono
  } = req.body;
  
  try {
    if (id) {
      const [updateResult] = await pool.query(
        `UPDATE pacientes SET 
          nombre = ?,
          telefono = ?,
          fecha_nacimiento = ?,
          sexo = ?,
          alergias = ?,
          antecedentes = ?,
          contacto_emergencia = ?,
          telefono_emergencia = ?,
          foto_url = ?,
          responsable_nombre = ?,
          responsable_parentesco = ?,
          responsable_telefono = ?
        WHERE id = ? AND usuario_id = ?`,
        [
          nombre,
          telefono || null,
          fecha_nacimiento || null,
          sexo || 'Otro',
          alergias || null,
          antecedentes || null,
          contacto_emergencia || null,
          telefono_emergencia || null,
          foto_url || null,
          responsable_nombre || null,
          responsable_parentesco || null,
          responsable_telefono || null,
          id,
          usuarioId
        ]
      );

      if (updateResult.affectedRows === 0) {
        return res.status(403).json({ error: 'No tienes permiso para modificar este paciente' });
      }

      return res.json({ ok: true, id, mensaje: 'Paciente actualizado exitosamente' });
    }

    const [result] = await pool.query(
      `INSERT INTO pacientes (
        usuario_id, nombre, telefono, fecha_nacimiento, sexo, alergias, 
        antecedentes, contacto_emergencia, telefono_emergencia, foto_url,
        responsable_nombre, responsable_parentesco, responsable_telefono
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        usuarioId, 
        nombre, 
        telefono || null, 
        fecha_nacimiento || null, 
        sexo || 'Otro', 
        alergias || null, 
        antecedentes || null,
        contacto_emergencia || null,
        telefono_emergencia || null,
        foto_url || null,
        responsable_nombre || null, 
        responsable_parentesco || null,
        responsable_telefono || null
      ]
    );

    res.json({ ok: true, id: result.insertId, mensaje: 'Paciente registrado exitosamente' });
  } catch (err) {
    console.error('Error al registrar paciente:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/pacientes/:id', async (req, res) => {
  const usuarioId = obtenerUsuarioId(req);
  const { id } = req.params;
  const {
    nombre,
    telefono,
    fecha_nacimiento,
    sexo,
    alergias,
    antecedentes,
    contacto_emergencia,
    telefono_emergencia,
    foto_url,
    responsable_nombre,
    responsable_parentesco,
    responsable_telefono
  } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE pacientes SET 
        nombre = ?,
        telefono = ?,
        fecha_nacimiento = ?,
        sexo = ?,
        alergias = ?,
        antecedentes = ?,
        contacto_emergencia = ?,
        telefono_emergencia = ?,
        foto_url = ?,
        responsable_nombre = ?,
        responsable_parentesco = ?,
        responsable_telefono = ?
      WHERE id = ? AND usuario_id = ?`,
      [
        nombre,
        telefono || null,
        fecha_nacimiento || null,
        sexo || 'Otro',
        alergias || null,
        antecedentes || null,
        contacto_emergencia || null,
        telefono_emergencia || null,
        foto_url || null,
        responsable_nombre || null,
        responsable_parentesco || null,
        responsable_telefono || null,
        id,
        usuarioId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    res.json({ ok: true, mensaje: 'Ficha médica actualizada exitosamente' });
  } catch (err) {
    console.error('Error al actualizar paciente:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/pacientes/:id', async (req, res) => {
  const usuarioId = obtenerUsuarioId(req);
  const { id } = req.params;
  try {
    // Verificar que el paciente pertenezca al doctor antes de borrar
    const [pac] = await pool.query('SELECT id FROM pacientes WHERE id = ? AND usuario_id = ?', [id, usuarioId]);
    if (pac.length === 0) {
      return res.status(404).json({ error: 'Paciente no encontrado o no autorizado' });
    }

    await pool.query('DELETE FROM tomas_medicamentos WHERE receta_id IN (SELECT id FROM recetas_medicamentos WHERE paciente_id = ?)', [id]);
    await pool.query('DELETE FROM recetas_medicamentos WHERE paciente_id = ?', [id]);
    await pool.query('DELETE FROM estudios_clinicos WHERE paciente_id = ?', [id]);
    await pool.query('DELETE FROM consultas_medicas WHERE paciente_id = ?', [id]);
    await pool.query('DELETE FROM citas WHERE paciente_id = ?', [id]);
    await pool.query('DELETE FROM pacientes WHERE id = ? AND usuario_id = ?', [id, usuarioId]);

    res.json({ ok: true, mensaje: 'Expediente y paciente eliminados correctamente' });
  } catch (err) {
    console.error('Error al eliminar paciente:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// EXPEDIENTE DETALLADO
// ==========================================
app.get('/api/pacientes/:id', async (req, res) => {
  const usuarioId = obtenerUsuarioId(req);
  const { id } = req.params;

  try {
    const [pacienteRows] = await pool.query(
      `SELECT *, DATE_FORMAT(fecha_nacimiento, '%Y-%m-%d') AS fecha_nacimiento_formateada 
       FROM pacientes WHERE id = ? AND usuario_id = ?`, 
      [id, usuarioId]
    );

    if (pacienteRows.length === 0) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }
    const paciente = pacienteRows[0];
    if (paciente.fecha_nacimiento_formateada) {
      paciente.fecha_nacimiento = paciente.fecha_nacimiento_formateada;
    }

    const [consultas] = await pool.query(
      `SELECT id, DATE_FORMAT(fecha, '%Y-%m-%d %H:%i') as fecha_formateada, 
              doctor_nombre, motivo_consulta, enfermedad_actual, 
              antecedentes_patologicos, examen_fisico, reporte_examenes, 
              diagnostico, plan_tratamiento, peso, talla, temperatura, presion_arterial, frecuencia_cardiaca, fecha
       FROM consultas_medicas 
       WHERE paciente_id = ? 
       ORDER BY fecha DESC`,
      [id]
    );

    const [recetas] = await pool.query(
      `SELECT * FROM recetas_medicamentos 
       WHERE paciente_id = ? 
       ORDER BY id DESC`,
      [id]
    );

    const [estudios] = await pool.query(
      `SELECT * FROM estudios_clinicos 
       WHERE paciente_id = ? 
       ORDER BY id DESC`,
      [id]
    );

    const recetasConSeguimiento = [];
    for (const r of recetas) {
      const [tomas] = await pool.query(
        `SELECT DATE_FORMAT(fecha_toma, '%Y-%m-%d') as fecha, hora_confirmacion 
         FROM tomas_medicamentos 
         WHERE receta_id = ? 
         ORDER BY fecha_toma ASC`,
        [r.id]
      );
      const porcentaje = Math.min(100, Math.round((tomas.length / r.dias_tratamiento) * 100));

      recetasConSeguimiento.push({
        ...r,
        tomas_realizadas: tomas.length,
        porcentaje_cumplimiento: porcentaje,
        historial: tomas
      });
    }

    res.json({
      paciente,
      consultas,
      tratamientos: recetasConSeguimiento,
      estudios
    });
  } catch (error) {
    console.error('Error al obtener expediente:', error);
    res.status(500).json({ error: 'Error al cargar expediente' });
  }
});

// ==========================================
// CONSULTAS MÉDICAS (CON SIGNOS VITALES COMPLETOS)
// ==========================================
app.post('/api/consultas-independientes', async (req, res) => {
  const sessionKey = String(obtenerUsuarioId(req));
  const {
    paciente_id,
    doctor_nombre,
    motivo_consulta,
    enfermedad_actual,
    antecedentes_patologicos,
    examen_fisico,
    reporte_examenes,
    diagnostico,
    plan_tratamiento,
    peso,
    talla,
    temperatura,
    presion_arterial,
    medicamentos,
    frecuencia_cardiaca,
    enviar_whatsapp,
    estudios_solicitados
  } = req.body;

  if (!paciente_id) {
    return res.status(400).json({ error: 'paciente_id es requerido' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO consultas_medicas 
        (paciente_id, doctor_nombre, motivo_consulta, enfermedad_actual, antecedentes_patologicos, examen_fisico, reporte_examenes, diagnostico, plan_tratamiento, peso, talla, temperatura, presion_arterial, frecuencia_cardiaca)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paciente_id,
        doctor_nombre || 'Dr(a). Consulta',
        motivo_consulta || 'Control / Consulta',
        enfermedad_actual || null,
        antecedentes_patologicos || null,
        examen_fisico || null,
        reporte_examenes || null,
        diagnostico || null,
        plan_tratamiento || null,
        peso || null,
        talla || null,
        temperatura || null,
        presion_arterial || null,
        frecuencia_cardiaca || null
      ]
    );

    const consultaId = result.insertId;

    const [pacRows] = await pool.query('SELECT nombre, telefono FROM pacientes WHERE id = ?', [paciente_id]);
    const pac = pacRows[0] || {};

    if (Array.isArray(medicamentos) && medicamentos.length > 0) {
      for (const m of medicamentos) {
        const nombreMed = (m.medicamento || '').trim();
        if (!nombreMed) continue;

        const frecuencia = (m.frecuencia || '').trim();
        const indicacion = (m.indicacion || '').trim();
        const dosis = [frecuencia, indicacion].filter(Boolean).join(' - ') || 'Según indicación médica';
        const dias = parseInt(m.dias_tratamiento, 10) || 5;

        await pool.query(
          `INSERT INTO recetas_medicamentos 
            (consulta_id, paciente_id, paciente_nombre, paciente_telefono, medicamento, dosis_indicacion, fecha_inicio, dias_tratamiento, hora_recordatorio, activo)
            VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?, '08:00:00', TRUE)`,
          [
            consultaId,
            paciente_id,
            pac.nombre || 'Paciente',
            pac.telefono || '',
            nombreMed,
            dosis,
            dias
          ]
        );
      }
    }

    const debeEnviar = enviar_whatsapp !== false;
    if (debeEnviar && pac.telefono) {
      setImmediate(async () => {
        try {
          await enviarResumenConsulta(sessionKey, pac.telefono, {
            nombre_clinica: req.body.nombre_clinica || 'Consultorio Maye',
            paciente_nombre: pac.nombre,
            doctor_nombre,
            diagnostico,
            plan_tratamiento,
            medicamentos: medicamentos || [],
            estudios: estudios_solicitados || []
          });
          console.log(`✅ [WhatsApp] Resumen integral entregado a ${pac.nombre} desde sesión [${sessionKey}]`);
        } catch (err) {
          console.error(`❌ Error enviando resumen integral [Sesión ${sessionKey}]:`, err.message);
        }
      });
    }

    res.json({ ok: true, id: consultaId, mensaje: 'Consulta y receta guardadas' });
  } catch (err) {
    console.error('Error al registrar consulta y medicamentos:', err);
    res.status(500).json({ error: err.message });
  }
});

// Atiende tanto a /api/consultas/:id como a /api/consultas-independientes/:id
app.put(['/api/consultas/:id', '/api/consultas-independientes/:id'], async (req, res) => {
  const { id } = req.params;
  const {
    doctor_nombre,
    motivo_consulta,
    enfermedad_actual,
    antecedentes_patologicos,
    examen_fisico,
    reporte_examenes,
    diagnostico,
    plan_tratamiento,
    peso,
    talla,
    temperatura,
    presion_arterial,
    frecuencia_cardiaca,
    medicamentos,
    enviar_whatsapp,
    paciente_telefono,
    estudios_solicitados
  } = req.body;

  try {
    await pool.query(
      `UPDATE consultas_medicas SET 
        doctor_nombre = ?,
        motivo_consulta = ?,
        enfermedad_actual = ?,
        antecedentes_patologicos = ?,
        examen_fisico = ?,
        reporte_examenes = ?,
        diagnostico = ?,
        plan_tratamiento = ?,
        peso = ?,
        talla = ?,
        temperatura = ?,
        presion_arterial = ?,
        frecuencia_cardiaca = ?
      WHERE id = ?`,
      [
        doctor_nombre || 'Dr(a). Consulta',
        motivo_consulta || null,
        enfermedad_actual || null,
        antecedentes_patologicos || null,
        examen_fisico || null,
        reporte_examenes || null,
        diagnostico || null,
        plan_tratamiento || null,
        peso || null,
        talla || null,
        temperatura || null,
        presion_arterial || null,
        frecuencia_cardiaca || null,
        id
      ]
    );

    const [consultaRows] = await pool.query('SELECT paciente_id FROM consultas_medicas WHERE id = ?', [id]);
    const pacienteId = consultaRows[0]?.paciente_id;

    let pac = {};

    if (pacienteId) {
      const [pacRows] = await pool.query('SELECT nombre, telefono FROM pacientes WHERE id = ?', [pacienteId]);
      pac = pacRows[0] || {};
    }

    if (pacienteId && Array.isArray(medicamentos)) {
      await pool.query('DELETE FROM recetas_medicamentos WHERE consulta_id = ?', [id]);

      for (const m of medicamentos) {
        const nombreMed = (m.medicamento || m.nombre || '').trim();
        if (!nombreMed) continue;

        const frecuencia = (m.frecuencia || '').trim();
        const indicacion = (m.indicacion || '').trim();
        const dosis = [frecuencia, indicacion].filter(Boolean).join(' - ') || 'Según indicación médica';
        const dias = parseInt(m.dias_tratamiento, 10) || 5;

        await pool.query(
          `INSERT INTO recetas_medicamentos 
            (consulta_id, paciente_id, paciente_nombre, paciente_telefono, medicamento, dosis_indicacion, fecha_inicio, dias_tratamiento, hora_recordatorio, activo)
            VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?, '08:00:00', TRUE)`,
          [
            id,
            pacienteId,
            pac.nombre || req.body.paciente_nombre || 'Paciente',
            pac.telefono || paciente_telefono || '',
            nombreMed,
            dosis,
            dias
          ]
        );
      }
    }

    const telefonoDestino = paciente_telefono || pac.telefono;
    const debeEnviar = enviar_whatsapp !== false;
    const sessionKey = String(obtenerUsuarioId(req));

    console.log('🔍 [Intento WhatsApp]:', { sessionKey, debeEnviar, telefonoDestino });

    if (debeEnviar && telefonoDestino) {
      setImmediate(async () => {
        try {
          await enviarResumenConsulta(sessionKey, telefonoDestino, {
            nombre_clinica: req.body.nombre_clinica || 'Consultorio Maye',
            paciente_nombre: pac.nombre || req.body.paciente_nombre || 'Estimado(a) Paciente',
            doctor_nombre: doctor_nombre || 'Médico tratante',
            diagnostico,
            plan_tratamiento,
            medicamentos: medicamentos || [],
            estudios: estudios_solicitados || []
          });
          console.log(`✅ [WhatsApp] Resumen entregado a ${telefonoDestino} vía sesión [${sessionKey}]`);
        } catch (err) {
          console.error(`❌ [WhatsApp Error Sesión ${sessionKey}]:`, err.message);
        }
      });
    }

    res.json({ ok: true, mensaje: 'Consulta y recetas actualizadas correctamente' });
  } catch (err) {
    console.error('Error al actualizar consulta médica:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/consultas-independientes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM estudios_clinicos WHERE consulta_id = ?', [id]);
    await pool.query('DELETE FROM recetas_medicamentos WHERE consulta_id = ?', [id]);
    await pool.query('DELETE FROM consultas_medicas WHERE id = ?', [id]);
    res.json({ ok: true, mensaje: 'Consulta eliminada del expediente' });
  } catch (err) {
    console.error('Error al eliminar consulta:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ESTUDIOS CLÍNICOS
// ==========================================
app.post('/api/estudios-clinicos', async (req, res) => {
  const { consulta_id, paciente_id, tipo_estudio, laboratorio, observaciones, archivo_url } = req.body;

  if (!consulta_id || !paciente_id || !tipo_estudio) {
    return res.status(400).json({ error: 'Consulta, paciente y tipo de estudio son obligatorios' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO estudios_clinicos 
       (consulta_id, paciente_id, tipo_estudio, laboratorio, observaciones, archivo_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        consulta_id,
        paciente_id,
        tipo_estudio,
        laboratorio || null,
        observaciones || null,
        archivo_url || null
      ]
    );

    res.json({ ok: true, id: result.insertId, mensaje: 'Estudio clínico registrado con éxito' });
  } catch (err) {
    console.error('Error al guardar estudio clínico:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/estudios-clinicos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM estudios_clinicos WHERE id = ?', [id]);
    res.json({ ok: true, mensaje: 'Estudio clínico eliminado' });
  } catch (err) {
    console.error('Error al eliminar estudio:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ping', (req, res) => {
  res.status(200).send('pong');
});

app.put('/api/estudios-clinicos/:id/resultado', async (req, res) => {
  const { id } = req.params;
  const { resultados_texto, documento_url, estado } = req.body;

  try {
    await pool.query(
      `UPDATE estudios_clinicos 
       SET resultados_texto = ?, documento_url = ?, estado = ? 
       WHERE id = ?`,
      [resultados_texto || null, documento_url || null, estado || 'Completado', id]
    );

    res.json({ ok: true, mensaje: 'Resultados guardados correctamente' });
  } catch (err) {
    console.error('Error al actualizar resultado de estudio:', err);
    res.status(500).json({ error: err.message });
  }
});

// Middleware global de errores en rutas Express
app.use((err, req, res, next) => {
  console.error('⚠️ Error capturado en ruta:', err.stack);
  res.status(500).json({ error: 'Inconveniente interno temporal. Intenta de nuevo.' });
});

process.on('uncaughtException', (err) => {
  console.error('🔥 Excepción no capturada atrapada:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Promesa no manejada:', reason);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend escuchando en http://localhost:${PORT}`);
});