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
app.post('/api/login', async (req, res) => {
  const { usuario, password } = req.body;
  try {
    const [rows] = await pool.query(
      'SELECT id, usuario, nombre FROM usuarios WHERE usuario = ? AND password = ?',
      [usuario, password]
    );

    if (rows.length > 0) {
      res.json({ ok: true, usuario: rows[0] });
    } else {
      res.status(401).json({ error: 'Credenciales inválidas' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
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
  const { 
    nombre_clinica, 
    eslogan, 
    telefono_clinica, 
    direccion, 
    logo_url, 
    hora_apertura, 
    hora_cierre, 
    duracion_defecto_minutos 
  } = req.body;

  try {
    await pool.query(`
      INSERT INTO configuracion (
        id, nombre_clinica, eslogan, telefono_clinica, direccion, logo_url, 
        hora_apertura, hora_cierre, duracion_defecto_minutos
      ) VALUES (
        1, ?, ?, ?, ?, ?, ?, ?, ?
      )
      ON DUPLICATE KEY UPDATE
        nombre_clinica = VALUES(nombre_clinica),
        eslogan = VALUES(eslogan),
        telefono_clinica = VALUES(telefono_clinica),
        direccion = VALUES(direccion),
        logo_url = VALUES(logo_url),
        hora_apertura = VALUES(hora_apertura),
        hora_cierre = VALUES(hora_cierre),
        duracion_defecto_minutos = VALUES(duracion_defecto_minutos)
    `, [
      nombre_clinica || 'Consultorio Médico',
      eslogan || null,
      telefono_clinica || null,
      direccion || null,
      logo_url || null,
      hora_apertura ? (hora_apertura.length === 5 ? `${hora_apertura}:00` : hora_apertura) : '08:00:00',
      hora_cierre ? (hora_cierre.length === 5 ? `${hora_cierre}:00` : hora_cierre) : '17:00:00',
      parseInt(duracion_defecto_minutos, 10) || 30
    ]);

    res.json({ ok: true, mensaje: 'Configuración guardada exitosamente' });
  } catch (err) {
    console.error('Error detallado en configuracion:', err);
    res.status(500).json({ error: err.message });
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

// GET /api/citas
app.get('/api/citas', async (req, res) => {
  const usuarioId = req.headers['x-usuario-id'] || 1;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM citas WHERE usuario_id = ? ORDER BY fecha_cita ASC, hora_cita ASC',
      [usuarioId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/citas
app.post('/api/citas', async (req, res) => {
  const usuarioId = req.headers['x-usuario-id'] || 1;
  const { paciente_id, paciente_nombre, paciente_telefono, doctor_id, doctor_nombre, fecha_cita, hora_cita, duracion_minutos, indicaciones, estado } = req.body;
  
  try {
    const [result] = await pool.query(
      `INSERT INTO citas (usuario_id, paciente_id, paciente_nombre, paciente_telefono, doctor_id, doctor_nombre, fecha_cita, hora_cita, duracion_minutos, indicaciones, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [usuarioId, paciente_id, paciente_nombre, paciente_telefono, doctor_id, doctor_nombre, fecha_cita, hora_cita, duracion_minutos || 30, indicaciones, estado || 'RESERVADA']
    );
    res.json({ ok: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
// GET /api/pacientes
app.get('/api/pacientes', async (req, res) => {
  const usuarioId = req.headers['x-usuario-id'] || 1;
  const q = req.query.q || '';
  try {
    const [rows] = await pool.query(
      `SELECT * FROM pacientes 
       WHERE usuario_id = ? AND (nombre LIKE ? OR telefono LIKE ?) 
       ORDER BY id DESC`,
      [usuarioId, `%${q}%`, `%${q}%`]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pacientes (Crear paciente amarrado a este doctor)
app.post('/api/pacientes', async (req, res) => {
  const usuarioId = req.headers['x-usuario-id'] || 1;
  const { nombre, telefono, fecha_nacimiento, sexo, alergias, antecedentes } = req.body;
  
  try {
    const [result] = await pool.query(
      `INSERT INTO pacientes (usuario_id, nombre, telefono, fecha_nacimiento, sexo, alergias, antecedentes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [usuarioId, nombre, telefono, fecha_nacimiento || null, sexo || 'Otro', alergias || null, antecedentes || null]
    );
    res.json({ ok: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    examen_fisico,         // <--- NUEVO CAMPO
    reporte_examenes,      // <--- NUEVO CAMPO
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
       (paciente_id, doctor_nombre, motivo_consulta, enfermedad_actual, antecedentes_patologicos, examen_fisico, reporte_examenes, diagnostico, plan_tratamiento)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paciente_id,
        doctor_nombre || 'Dr(a). Consulta',
        motivo_consulta || 'Control / Consulta',
        enfermedad_actual || null,
        antecedentes_patologicos || null,
        examen_fisico || null,       // <--- NUEVO CAMPO
        reporte_examenes || null,    // <--- NUEVO CAMPO
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

// 4. ACTUALIZAR CONSULTA INDEPENDIENTE
app.put('/api/consultas-independientes/:id', async (req, res) => {
  const { id } = req.params;
  const {
    doctor_nombre,         // <--- Aseguramos que venga el doctor también
    motivo_consulta,
    enfermedad_actual,
    antecedentes_patologicos,
    examen_fisico,         // <--- NUEVO CAMPO
    reporte_examenes,      // <--- NUEVO CAMPO
    diagnostico,
    plan_tratamiento,
    medicamentos
  } = req.body;

  try {
    await pool.query(
      `UPDATE consultas_medicas 
       SET doctor_nombre = COALESCE(?, doctor_nombre), motivo_consulta = ?, enfermedad_actual = ?, antecedentes_patologicos = ?, 
           examen_fisico = ?, reporte_examenes = ?, diagnostico = ?, plan_tratamiento = ?
       WHERE id = ?`,
      [
        doctor_nombre || null,
        motivo_consulta || null,
        enfermedad_actual || null,
        antecedentes_patologicos || null,
        examen_fisico || null,       // <--- NUEVO CAMPO
        reporte_examenes || null,    // <--- NUEVO CAMPO
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

// 5. ELIMINAR CONSULTA INDEPENDIENTE
app.delete('/api/consultas-independientes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM estudios_clinicos WHERE consulta_id = ?', [id]); // <--- Limpieza en cascada extra
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
              antecedentes_patologicos,examen_fisico, reporte_examenes, diagnostico, plan_tratamiento, fecha
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

// 1. Obtener los datos del consultorio (para recetas y encabezados)
app.get('/api/configuracion', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM configuracion LIMIT 1');
    res.json(rows[0] || { nombre_clinica: 'Consultorio Médico' });
  } catch (err) {
    console.error('Error al obtener configuracion:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Guardar cambios de configuración desde el modal del engranaje ⚙️
app.put('/api/configuracion', async (req, res) => {
  const { 
    nombre_clinica, 
    eslogan, 
    telefono_clinica, 
    direccion, 
    logo_url, 
    hora_apertura, 
    hora_cierre, 
    duracion_defecto_minutos 
  } = req.body;

  try {
    await pool.query(`
      UPDATE configuracion 
      SET nombre_clinica = COALESCE(?, nombre_clinica),
          eslogan = ?,
          telefono_clinica = ?,
          direccion = ?,
          logo_url = ?,
          hora_apertura = COALESCE(?, hora_apertura),
          hora_cierre = COALESCE(?, hora_cierre),
          duracion_defecto_minutos = COALESCE(?, duracion_defecto_minutos)
      WHERE id = 1
    `, [
      nombre_clinica,
      eslogan || null,
      telefono_clinica || null,
      direccion || null,
      logo_url || null,
      hora_apertura,
      hora_cierre,
      duracion_defecto_minutos
    ]);

    res.json({ ok: true, mensaje: 'Configuración actualizada con éxito' });
  } catch (err) {
    console.error('Error al guardar configuracion:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend escuchando en http://localhost:${PORT}`);
});