import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { pool } from './db.js';
import { 
  connectToWhatsApp, 
  enviarMensajeReserva, 
  notificarEdicionCita,
  cancelarJornadaYNotificar,
  procesarRecordatoriosManana,
  enviarRecetaCompleta,
  procesarRecordatoriosMedicamentos,
  enviarRecordatorioPorCita
} from './whatsapp.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

connectToWhatsApp();

// Cron job diario a las 09:00 AM
cron.schedule('0 9 * * *', () => {
  console.log('⏰ [Cron] Ejecutando recordatorios automáticos...');
  procesarRecordatoriosManana();
});

// Función utilitaria para calcular hora de fin
function calcularHoraFin(horaInicio, duracionMinutos) {
  const [h, m] = horaInicio.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  date.setMinutes(date.getMinutes() + parseInt(duracionMinutos, 10));
  return String(date.getHours()).padStart(2, '0') + ':' + 
         String(date.getMinutes()).padStart(2, '0') + ':00';
}

// 1. Obtener configuración de la clínica
app.get('/api/configuracion', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM configuracion_clinica LIMIT 1');
    res.json(rows[0] || {});
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

// 2. Guardar configuración de la clínica
app.put('/api/configuracion', async (req, res) => {
  const { duracion_defecto_minutos, hora_apertura, hora_cierre, permite_reprogramar_bot } = req.body;
  try {
    await pool.query(
      `UPDATE configuracion_clinica 
       SET duracion_defecto_minutos = ?, hora_apertura = ?, hora_cierre = ?, permite_reprogramar_bot = ?
       WHERE id = 1`,
      [duracion_defecto_minutos, hora_apertura, hora_cierre, permite_reprogramar_bot]
    );
    res.json({ message: 'Configuración actualizada con éxito' });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar configuración' });
  }
});

// Endpoint de prueba inmediata para disparar recordatorios diarios sin esperar el cron
app.get('/api/test/enviar-recordatorios', async (req, res) => {
  try {
    console.log('\n🧪 [TEST] Ejecutando manualmente el envío de recordatorios de medicamentos...');
    await procesarRecordatoriosMedicamentos();
    res.json({ ok: true, mensaje: 'Recordatorios ejecutados exitosamente en segundo plano' });
  } catch (err) {
    console.error('Error en prueba manual de recordatorios:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Listar citas
app.get('/api/citas', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM citas ORDER BY fecha_cita, hora_cita ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener citas' });
  }
});

// 4. Crear nueva cita
app.post('/api/citas', async (req, res) => {
  const { paciente_nombre, paciente_telefono, doctor_nombre, fecha_cita, hora_cita, duracion_minutos, indicaciones } = req.body;

  if (!paciente_nombre || !paciente_telefono || !doctor_nombre || !fecha_cita || !hora_cita) {
    return res.status(400).json({ error: 'Todos los campos requeridos deben estar completos' });
  }

  const duracion = duracion_minutos || 30;
  const hora_fin = calcularHoraFin(hora_cita, duracion);

  try {
    let paciente_id = null;
    const [pacienteExistente] = await pool.query('SELECT id FROM pacientes WHERE telefono = ? LIMIT 1', [paciente_telefono]);
    
    if (pacienteExistente.length > 0) {
      paciente_id = pacienteExistente[0].id;
    } else {
      const [nuevoPac] = await pool.query('INSERT INTO pacientes (nombre, telefono) VALUES (?, ?)', [paciente_nombre, paciente_telefono]);
      paciente_id = nuevoPac.insertId;
    }

    const [result] = await pool.query(
      `INSERT INTO citas (paciente_id, paciente_nombre, paciente_telefono, doctor_nombre, fecha_cita, hora_cita, duracion_minutos, hora_fin, indicaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [paciente_id, paciente_nombre, paciente_telefono, doctor_nombre, fecha_cita, hora_cita, duracion, hora_fin, indicaciones || null]
    );

    const nuevaCita = {
      id: result.insertId,
      paciente_id,
      paciente_nombre,
      paciente_telefono,
      doctor_nombre,
      fecha_cita,
      hora_cita,
      duracion_minutos: duracion,
      hora_fin,
      indicaciones
    };

    enviarMensajeReserva(nuevaCita);
    res.status(201).json({ id: result.insertId, message: 'Cita agendada y expediente actualizado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al agendar cita' });
  }
});

// 5. Editar cita
app.put('/api/citas/:id', async (req, res) => {
  const { id } = req.params;
  const { paciente_nombre, paciente_telefono, doctor_nombre, fecha_cita, hora_cita, duracion_minutos, indicaciones, estado } = req.body;

  const duracion = duracion_minutos || 30;
  const hora_fin = calcularHoraFin(hora_cita, duracion);

  try {
    await pool.query(
      `UPDATE citas 
       SET paciente_nombre = ?, paciente_telefono = ?, doctor_nombre = ?, 
           fecha_cita = ?, hora_cita = ?, duracion_minutos = ?, hora_fin = ?, 
           indicaciones = ?, estado = ?,
           requiere_atencion_humana = CASE WHEN ? = 'CONFIRMADA' THEN FALSE ELSE requiere_atencion_humana END
       WHERE id = ?`,
      [paciente_nombre, paciente_telefono, doctor_nombre, fecha_cita, hora_cita, duracion, hora_fin, indicaciones || null, estado, estado, id]
    );

    await pool.query(
      `UPDATE recetas_medicamentos 
       SET paciente_telefono = ?, paciente_nombre = ?
       WHERE cita_id = ?`,
      [paciente_telefono, paciente_nombre, id]
    );

    const citaActualizada = {
      id,
      paciente_nombre,
      paciente_telefono,
      doctor_nombre,
      fecha_cita,
      hora_cita,
      duracion_minutos: duracion,
      hora_fin,
      indicaciones,
      estado
    };
    notificarEdicionCita(citaActualizada);

    res.json({ message: 'Cita y recetas actualizadas correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar cita' });
  }
});

// 6. Eliminar cita
app.delete('/api/citas/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM citas WHERE id = ?', [req.params.id]);
    res.json({ message: 'Cita eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar cita' });
  }
});

// 7. Botón de Emergencia
app.post('/api/citas/cancelar-jornada', async (req, res) => {
  const { fecha, doctor_nombre } = req.body;
  if (!fecha || !doctor_nombre) {
    return res.status(400).json({ error: 'Fecha y nombre del doctor requeridos' });
  }
  cancelarJornadaYNotificar(fecha, doctor_nombre);
  res.json({ message: 'Proceso de notificación de emergencia iniciado' });
});

// Obtener doctores activos
app.get('/api/doctores', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM doctores WHERE activo = TRUE ORDER BY nombre ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener doctores' });
  }
});

// Bloquear fecha por ausencia
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

    cancelarJornadaYNotificar(fecha, doctorNombre, doctor_id);

    res.json({ message: `Jornada del ${fecha} bloqueada para ${doctorNombre} y pacientes notificados.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al bloquear fecha' });
  }
});

app.post('/api/recetas/multiple', async (req, res) => {
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

    setImmediate(() => {
      if (typeof enviarRecetaCompleta === 'function') {
        enviarRecetaCompleta({ paciente_nombre, paciente_telefono, doctor_nombre, medicamentos })
          .then(() => console.log(`[Receta] WhatsApp entregado a ${paciente_nombre}`))
          .catch((err) => console.error('[WhatsApp Receta Error Background]:', err.message));
      }
    });

  } catch (error) {
    console.error('Error insertando receta en MySQL:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/test/enviar-recordatorio-cita/:cita_id', async (req, res) => {
  const { cita_id } = req.params;
  try {
    await enviarRecordatorioPorCita(cita_id);
    res.json({ ok: true, mensaje: `Recordatorio enviado para la cita #${cita_id}` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// ==========================================
// MÓDULO DE EXPEDIENTES CLÍNICOS Y CONSULTAS
// ==========================================

// 1. Listar pacientes
app.get('/api/pacientes', async (req, res) => {
  const { q } = req.query;
  try {
    let query = `
      SELECT p.*, 
             COUNT(DISTINCT c.id) AS total_citas,
             COUNT(DISTINCT r.id) AS total_recetas
      FROM pacientes p
      LEFT JOIN consultas_medicas c ON c.paciente_id = p.id
      LEFT JOIN recetas_medicamentos r ON r.paciente_id = p.id
    `;
    const params = [];

    if (q) {
      query += ` WHERE p.nombre LIKE ? OR p.telefono LIKE ? `;
      params.push(`%${q}%`, `%${q}%`);
    }

    query += ` GROUP BY p.id ORDER BY p.nombre ASC`;

    const [pacientes] = await pool.query(query, params);
    res.json(pacientes);
  } catch (error) {
    console.error('Error al listar pacientes:', error);
    res.status(500).json({ error: 'Error al obtener pacientes' });
  }
});

// 2. CREAR O ACTUALIZAR PACIENTE
app.post('/api/pacientes', async (req, res) => {
  // En POST /api/pacientes de tu server.js:
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
  notas_generales,
  foto_url // <--- Añadir aquí
} = req.body;

  if (!nombre || !telefono) {
    return res.status(400).json({ error: 'Nombre y teléfono son obligatorios' });
  }

  try {
    if (id) {
      await pool.query(
        `UPDATE pacientes SET 
           nombre = ?, telefono = ?, fecha_nacimiento = ?, sexo = ?, 
           alergias = ?, antecedentes = ?, contacto_emergencia = ?, 
           telefono_emergencia = ?, notas_generales = ?, foto_url = ?
         WHERE id = ?`,
        [
          nombre, telefono, fecha_nacimiento || null, sexo || 'Otro',
          alergias || 'Ninguna', antecedentes || null, contacto_emergencia || null,
          telefono_emergencia || null, notas_generales || null, foto_url || null, id
        ]
      );
      return res.json({ ok: true, id, mensaje: 'Paciente actualizado con éxito' });
    } else {
      const [result] = await pool.query(
        `INSERT INTO pacientes 
         (nombre, telefono, fecha_nacimiento, sexo, alergias, antecedentes, contacto_emergencia, telefono_emergencia, notas_generales, foto_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nombre, telefono, fecha_nacimiento || null, sexo || 'Otro',
          alergias || 'Ninguna', antecedentes || null, contacto_emergencia || null,
          telefono_emergencia || null, notas_generales || null, foto_url || null
        ]
      );
      return res.json({ ok: true, id: result.insertId, mensaje: 'Paciente creado con éxito' });
    }
  } catch (error) {
    console.error('Error guardando paciente:', error);
    res.status(500).json({ error: 'Error al guardar paciente' });
  }
});

// Eliminar un paciente completo y todo su historial clínico
app.delete('/api/pacientes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Opcional: Eliminar recetas, estudios y consultas asociadas para evitar errores de llave foránea
    await pool.query('DELETE FROM tomas_medicamentos WHERE receta_id IN (SELECT id FROM recetas_medicamentos WHERE paciente_id = ?)', [id]);
    await pool.query('DELETE FROM recetas_medicamentos WHERE paciente_id = ?', [id]);
    await pool.query('DELETE FROM estudios_clinicos WHERE paciente_id = ?', [id]);
    await pool.query('DELETE FROM consultas_medicas WHERE paciente_id = ?', [id]);
    await pool.query('DELETE FROM citas WHERE paciente_id = ?', [id]);
    
    // Finalmente, eliminar al paciente
    const [result] = await pool.query('DELETE FROM pacientes WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    res.json({ ok: true, mensaje: 'Expediente y paciente eliminados correctamente' });
  } catch (err) {
    console.error('Error al eliminar paciente:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. REGISTRAR CONSULTA MÉDICA INDEPENDIENTE CON RECETA
app.post('/api/consultas-independientes', async (req, res) => {
  const {
    paciente_id,
    doctor_nombre,
    motivo_consulta,
    enfermedad_actual,
    antecedentes_patologicos,
    diagnostico,
    plan_tratamiento,
    medicamentos
  } = req.body;

  if (!paciente_id) {
    return res.status(400).json({ error: 'paciente_id es requerido' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO consultas_medicas 
       (paciente_id, doctor_nombre, motivo_consulta, enfermedad_actual, antecedentes_patologicos, diagnostico, plan_tratamiento)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        paciente_id,
        doctor_nombre || 'Dr(a). Consulta',
        motivo_consulta || 'Control / Consulta',
        enfermedad_actual || null,
        antecedentes_patologicos || null,
        diagnostico || null,
        plan_tratamiento || null
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

    res.json({ ok: true, id: consultaId, mensaje: 'Consulta y receta guardadas' });
  } catch (err) {
    console.error('Error al registrar consulta y medicamentos:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. ACTUALIZAR CONSULTA INDEPENDIENTE (NUEVO)
app.put('/api/consultas-independientes/:id', async (req, res) => {
  const { id } = req.params;
  const {
    motivo_consulta,
    enfermedad_actual,
    antecedentes_patologicos,
    diagnostico,
    plan_tratamiento,
    medicamentos
  } = req.body;

  try {
    await pool.query(
      `UPDATE consultas_medicas 
       SET motivo_consulta = ?, enfermedad_actual = ?, antecedentes_patologicos = ?, 
           diagnostico = ?, plan_tratamiento = ?
       WHERE id = ?`,
      [
        motivo_consulta || null,
        enfermedad_actual || null,
        antecedentes_patologicos || null,
        diagnostico || null,
        plan_tratamiento || null,
        id
      ]
    );

    if (Array.isArray(medicamentos)) {
      await pool.query('DELETE FROM recetas_medicamentos WHERE consulta_id = ?', [id]);

      const [conRows] = await pool.query('SELECT paciente_id FROM consultas_medicas WHERE id = ?', [id]);
      const pacienteId = conRows[0]?.paciente_id;

      if (pacienteId) {
        const [pacRows] = await pool.query('SELECT nombre, telefono FROM pacientes WHERE id = ?', [pacienteId]);
        const pac = pacRows[0] || {};

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
            [id, pacienteId, pac.nombre || 'Paciente', pac.telefono || '', nombreMed, dosis, dias]
          );
        }
      }
    }

    res.json({ ok: true, mensaje: 'Consulta y receta actualizadas con éxito' });
  } catch (err) {
    console.error('Error al actualizar consulta:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. ELIMINAR CONSULTA INDEPENDIENTE (NUEVO)
app.delete('/api/consultas-independientes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM recetas_medicamentos WHERE consulta_id = ?', [id]);
    await pool.query('DELETE FROM consultas_medicas WHERE id = ?', [id]);
    res.json({ ok: true, mensaje: 'Consulta eliminada del expediente' });
  } catch (err) {
    console.error('Error al eliminar consulta:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6. OBTENER EXPEDIENTE COMPLETO DEL PACIENTE (CON ESTUDIOS CLÍNICOS)
app.get('/api/pacientes/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [pacienteRows] = await pool.query('SELECT * FROM pacientes WHERE id = ?', [id]);
    if (pacienteRows.length === 0) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }
    const paciente = pacienteRows[0];

    const [consultas] = await pool.query(
      `SELECT id, DATE_FORMAT(fecha, '%Y-%m-%d %H:%i') as fecha_formateada, 
              doctor_nombre, motivo_consulta, enfermedad_actual, 
              antecedentes_patologicos, diagnostico, plan_tratamiento, fecha
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

    // NUEVO: Obtener los estudios clínicos de este paciente
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
      estudios // <-- Se incluye aquí para que el frontend pueda filtrarlos por cada consulta_id
    });
  } catch (error) {
    console.error('Error al obtener expediente:', error);
    res.status(500).json({ error: 'Error al cargar expediente' });
  }
});
// ==========================================
// MÓDULO DE ESTUDIOS CLÍNICOS / LABORATORIOS
// ==========================================

// 1. Registrar un estudio clínico para una consulta específica
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

// 2. Eliminar un estudio clínico
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend escuchando en http://localhost:${PORT}`);
});