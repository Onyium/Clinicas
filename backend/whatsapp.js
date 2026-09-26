import makeWASocket, { 
  useMultiFileAuthState, 
  DisconnectReason,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import { pool } from './db.js';

let sock = null;

// Algoritmo: Busca slots libres del doctor específico ignorando sus fechas bloqueadas
export async function obtenerProximosSlots(duracion = 30, fechaBaseExcluida = null, doctorId = null) {
  const [configs] = await pool.query('SELECT * FROM configuracion_clinica LIMIT 1');
  const config = configs[0] || { hora_apertura: '08:00:00', hora_cierre: '13:00:00' };

  const slotsDisponibles = [];
  const apertura = parseInt(config.hora_apertura.split(':')[0], 10);
  const cierre = parseInt(config.hora_cierre.split(':')[0], 10);

  const fechaPivote = fechaBaseExcluida ? new Date(fechaBaseExcluida + 'T00:00:00') : new Date();

  // Consultar días bloqueados para este doctor
  let fechasBloqueadas = [];
  if (doctorId) {
    const [bloqueos] = await pool.query(
      'SELECT DATE_FORMAT(fecha_bloqueada, "%Y-%m-%d") as fecha FROM bloqueos_doctor WHERE doctor_id = ?',
      [doctorId]
    );
    fechasBloqueadas = bloqueos.map(b => b.fecha);
  }

  for (let offset = 1; offset <= 10 && slotsDisponibles.length < 4; offset++) {
    const fechaEvaluada = new Date(fechaPivote);
    fechaEvaluada.setDate(fechaEvaluada.getDate() + offset);

    if (fechaEvaluada.getDay() === 0) continue; // Ignorar domingos

    const fechaStr = fechaEvaluada.toISOString().split('T')[0];

    // Si el doctor bloqueó ese día completo, lo saltamos
    if (fechasBloqueadas.includes(fechaStr)) continue;

    // Consultar citas de ESE doctor en específico
    const [citasDelDia] = await pool.query(
      `SELECT hora_cita, hora_fin FROM citas 
       WHERE fecha_cita = ? AND doctor_id = ? AND estado != 'CANCELADA'`,
      [fechaStr, doctorId]
    );

    let cursorMinutos = apertura * 60;
    const limiteMinutos = cierre * 60;

    while (cursorMinutos + duracion <= limiteMinutos && slotsDisponibles.length < 4) {
      const hInicio = String(Math.floor(cursorMinutos / 60)).padStart(2, '0') + ':' + 
                      String(cursorMinutos % 60).padStart(2, '0') + ':00';
      
      const finMinutos = cursorMinutos + duracion;
      const hFin = String(Math.floor(finMinutos / 60)).padStart(2, '0') + ':' + 
                   String(finMinutos % 60).padStart(2, '0') + ':00';

      const solapada = citasDelDia.some(c => (hInicio < c.hora_fin && hFin > c.hora_cita));

      if (!solapada) {
        slotsDisponibles.push({
          opcion: slotsDisponibles.length + 1,
          fecha: fechaStr,
          hora_inicio: hInicio.slice(0, 5),
          hora_fin: hFin.slice(0, 5)
        });
      }

      cursorMinutos += duracion;
    }
  }

  return slotsDisponibles;
}

export async function enviarRecordatorioPorCita(cita_id) {
  if (!sock) {
    throw new Error('El servicio de WhatsApp no está conectado');
  }

  const [recetas] = await pool.query(
    `SELECT * FROM recetas_medicamentos WHERE cita_id = ? AND activo = TRUE`,
    [cita_id]
  );

  if (recetas.length === 0) {
    throw new Error('No hay recetas activas para esta cita');
  }

  for (const r of recetas) {
    const digitos = String(r.paciente_telefono || '').replace(/\D/g, '');
    if (digitos.length < 8) {
      console.warn(`[Aviso] Teléfono inválido para ${r.paciente_nombre}: ${r.paciente_telefono}`);
      continue;
    }

    const telefonoCompleto = digitos.length === 8 ? `503${digitos}` : digitos;
    const jid = `${telefonoCompleto}@s.whatsapp.net`;

    const mensaje = 
`💊 *Recordatorio de Medicación*

Hola *${r.paciente_nombre}*, le saludamos de su consultorio médico.

Le corresponde su dosis programada:
💊 *Medicamento:* ${r.medicamento}
📝 *Indicación:* ${r.dosis_indicacion}

_Por favor responda con el número *1* cuando haya tomado su dosis para registrar su avance médico._`;

    await sock.sendMessage(jid, { text: mensaje });
    console.log(`🧪 [TEST Cita #${cita_id}] Recordatorio enviado a ${r.paciente_nombre} (${r.medicamento})`);
    
    await new Promise(res => setTimeout(res, 500));
  }

  return true;
}
export async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('baileys_auth');
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n================ ESCANEA ESTE CÓDIGO QR ================');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) connectToWhatsApp();
    } else if (connection === 'open') {
      console.log('✅ ¡WhatsApp Web conectado exitosamente con Baileys!');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    if (!messages || messages.length === 0) return;

    for (const msg of messages) {
      if (msg.key.fromMe) continue;

      const remoteJid = msg.key.remoteJid;
      if (!remoteJid || remoteJid.includes('@g.us')) continue;

      const rawText = 
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.ephemeralMessage?.message?.conversation ||
        msg.message?.ephemeralMessage?.message?.extendedTextMessage?.text ||
        '';

      const texto = rawText.trim().toLowerCase();
      if (!texto) continue;

      const rawSender = msg.key.remoteJidAlt || msg.key.participant || msg.participant || remoteJid;
      const numeroRemitente = rawSender.split('@')[0].split(':')[0];
      const ultimos8 = numeroRemitente.slice(-8);

      try {
        // 1. Obtener la última cita del paciente
        const [citas] = await pool.query(
          `SELECT * FROM citas WHERE paciente_telefono LIKE ? ORDER BY id DESC LIMIT 1`,
          [`%${ultimos8}%`]
        );

        let cita = citas.length > 0 ? citas[0] : null;

        // Fallback para identificadores privados (@lid)
        if (!cita) {
          const [citasPendientes] = await pool.query(
            `SELECT * FROM citas WHERE estado IN ('RESERVADA', 'REAGENDAR') ORDER BY id DESC LIMIT 1`
          );
          if (citasPendientes.length > 0) cita = citasPendientes[0];
        }

        if (!cita) {
          await sock.sendMessage(remoteJid, {
            text: `Hola, le saludamos del consultorio médico. No localizamos una cita activa vinculada a este número. Por favor contacte con recepción.`
          });
          continue;
        }

        const [configs] = await pool.query('SELECT * FROM configuracion_clinica LIMIT 1');
        const configClinica = configs[0];

        // PASO A: Verificar si el paciente está eligiendo un slot de reprogramación (1, 2, 3 o 4)
        if (cita.estado === 'REAGENDAR' && cita.opciones_reprogramacion) {
          const opciones = typeof cita.opciones_reprogramacion === 'string' 
            ? JSON.parse(cita.opciones_reprogramacion) 
            : cita.opciones_reprogramacion;

          const seleccion = opciones.find(o => String(o.opcion) === texto);

          if (seleccion) {
            await pool.query(
              `UPDATE citas 
               SET fecha_cita = ?, hora_cita = ?, hora_fin = ?, estado = 'CONFIRMADA', 
                   opciones_reprogramacion = NULL, requiere_atencion_humana = FALSE
               WHERE id = ?`,
              [seleccion.fecha, seleccion.hora_inicio + ':00', seleccion.hora_fin + ':00', cita.id]
            );

            await sock.sendMessage(remoteJid, {
              text: `🎉 *¡Cita Reprogramada con éxito!*\n\n` +
                    `📅 *Nueva Fecha:* ${seleccion.fecha}\n` +
                    `⏰ *Nuevo Horario:* ${seleccion.hora_inicio} a ${seleccion.hora_fin}\n` +
                    `👨‍⚕️ *Especialista:* ${cita.doctor_nombre}\n\n` +
                    `_Su horario ha quedado actualizado y confirmado en la agenda clínica._`
            });
            console.log(`[Reagendamiento] Cita #${cita.id} confirmada para ${seleccion.fecha} ${seleccion.hora_inicio}`);
            continue;
          }
        }

        // PASO B: Registrar confirmación de toma de medicamentos al responder "1", "si" o "tomada"
        if (['1', 'si', 'sí', 'tomada', 'ya lo tome', 'listo'].includes(texto)) {
          // 1. Buscar la receta activa más reciente vinculada al teléfono del paciente
          const [recetasActivas] = await pool.query(`
            SELECT r.id, r.medicamento, r.cita_id
            FROM recetas_medicamentos r
            LEFT JOIN tomas_medicamentos t 
              ON r.id = t.receta_id AND t.fecha_toma = CURDATE()
            WHERE (r.paciente_telefono LIKE ? OR r.paciente_telefono LIKE ?)
              AND r.activo = TRUE
              AND t.id IS NULL
            ORDER BY r.id DESC
            LIMIT 1
          `, [`%${ultimos8}%`, `%${numeroRemitente}%`]);

          if (recetasActivas.length > 0) {
            const receta = recetasActivas[0];

            await pool.query(`
              INSERT INTO tomas_medicamentos (receta_id, paciente_telefono, fecha_toma, hora_confirmacion)
              VALUES (?, ?, CURDATE(), CURTIME())
            `, [receta.id, numeroRemitente]);

            console.log(`💊 [Toma Registrada] Receta #${receta.id} (${receta.medicamento}) confirmada por ${numeroRemitente}`);

            await sock.sendMessage(remoteJid, {
              text: `✅ *Dosis registrada*: Anotamos en su expediente la toma de *${receta.medicamento}* de hoy. ¡Excelente apego al tratamiento!`
            });
            continue; // Detiene el flujo para que NO confirme la cita por error
          }
        }
        

        // PASO C: Consultar detalles de la cita
        if (texto.includes('cita') || texto.includes('cuando') || texto.includes('cuándo') || texto.includes('hora')) {
          const fechaFormat = cita.fecha_cita.toString().split('T')[0];
          await sock.sendMessage(remoteJid, {
            text: `📋 *Detalle de su Consulta:*\n\n` +
                  `👤 *Paciente:* ${cita.paciente_nombre}\n` +
                  `📅 *Fecha:* ${fechaFormat}\n` +
                  `⏰ *Horario:* ${cita.hora_cita.slice(0, 5)} a ${cita.hora_fin.slice(0, 5)}\n` +
                  `👨‍⚕️ *Especialista:* ${cita.doctor_nombre}\n` +
                  `📌 *Indicaciones:* ${cita.indicaciones || 'Ninguna'}\n` +
                  `🏷️ *Estado:* ${cita.estado}\n\n` +
                  `_Responda "1" para confirmar asistencia o "2" para solicitar reprogramación._`
          });
          continue;
        }

        // PASO D: Iniciar solicitud de reprogramación ("2", "reagendar")
        if (['2', 'reagendar', 'cambiar', 'mover'].includes(texto)) {
          if (!configClinica?.permite_reprogramar_bot) {
            await pool.query('UPDATE citas SET estado = "REAGENDAR", requiere_atencion_humana = TRUE WHERE id = ?', [cita.id]);
            await sock.sendMessage(remoteJid, {
              text: `Estimado(a) ${cita.paciente_nombre}, para reprogramar su consulta por favor comuníquese directamente con recepción. Un asistente le atenderá en breve.`
            });
            continue;
          }

          const fechaActualCita = cita.fecha_cita.toString().split('T')[0];
          const slots = await obtenerProximosSlots(
            cita.duracion_minutos || 30, 
            fechaActualCita, 
            cita.doctor_id
          );
          
          if (slots.length === 0) {
            await sock.sendMessage(remoteJid, {
              text: `No hay cupos disponibles en los próximos días con su especialista. Recepción se pondrá en contacto con usted.`
            });
            continue;
          }

          await pool.query(
            'UPDATE citas SET estado = "REAGENDAR", opciones_reprogramacion = ? WHERE id = ?',
            [JSON.stringify(slots), cita.id]
          );

          let mensajeSlots = `🗓️ *Espacios disponibles para reprogramar su cita:*\n\n`;
          slots.forEach(s => {
            mensajeSlots += `*${s.opcion}* ➔ ${s.fecha} a las ${s.hora_inicio}\n`;
          });
          mensajeSlots += `\n_Responda únicamente con el número (1, 2, 3 o 4) de la opción que prefiere._`;

          await sock.sendMessage(remoteJid, { text: mensajeSlots });
          continue;
        }

        // PASO E: Confirmación simple de asistencia de cita pendiente
        if (['1', 'si', 'sí', 'confirmo'].includes(texto)) {
          await pool.query('UPDATE citas SET estado = "CONFIRMADA", chat_iniciado = TRUE WHERE id = ?', [cita.id]);
          await sock.sendMessage(remoteJid, {
            text: `✅ *Cita confirmada*. Muchas gracias ${cita.paciente_nombre}, le esperamos el día indicado.`
          });
          continue;
        }

        // Registro de interacción genérica
        await pool.query('UPDATE citas SET chat_iniciado = TRUE WHERE id = ?', [cita.id]);

      } catch (err) {
        console.error('Error al procesar mensaje de WhatsApp:', err);
      }
    }
  });

  return sock;
}

// Envío al registrar por primera vez
export async function enviarMensajeReserva(cita) {
  if (!sock) {
    console.warn('⚠️ [WhatsApp] Socket no conectado al intentar enviar reserva.');
    return;
  }

  try {
    const telRaw = cita.paciente_telefono || cita.telefono || '';
    const digitos = String(telRaw).replace(/\D/g, '');
    
    if (digitos.length < 8) {
      console.warn(`⚠️ [WhatsApp Cita] Teléfono inválido o muy corto: "${telRaw}"`);
      return;
    }

    const telefonoCompleto = digitos.length === 8 ? `503${digitos}` : digitos;
    const jid = `${telefonoCompleto}@s.whatsapp.net`;

    // Formateo seguro de fecha
    const fechaStr = cita.fecha_cita 
      ? String(cita.fecha_cita).split('T')[0] 
      : (cita.fecha ? String(cita.fecha).split('T')[0] : 'Fecha asignada');

    // Manejo a prueba de fallos de hora de inicio y fin (sin riesgo de error por slice)
    const hInicio = cita.hora_cita ? String(cita.hora_cita).slice(0, 5) : '08:00';
    let hFin = '';
    if (cita.hora_fin) {
      hFin = ` - ${String(cita.hora_fin).slice(0, 5)}`;
    }

    const paciente = cita.paciente_nombre || cita.nombre || 'Paciente';
    const doctor = cita.doctor_nombre || cita.doctor || 'Dra. Liseyda Maye';
    const indicaciones = cita.indicaciones || cita.notas || '';

    const mensaje = 
`Hola *${paciente}*, le saludamos de su consultorio médico.

Le confirmamos que su cita médica ha quedado agendada:
📅 *Fecha:* ${fechaStr}
⏰ *Horario:* ${hInicio}${hFin}
👨‍⚕️ *Doctor(a):* ${doctor}
${indicaciones ? `📌 *Indicaciones:* ${indicaciones}\n` : ''}
Puede escribir *"cita"* en cualquier momento para revisar esta información o *"reagendar"* para solicitar un cambio de horario.

Por favor responda a este mensaje con:
*1* para Confirmar asistencia
*2* para Cancelar o Reagendar`;

    console.log(`📤 Enviando confirmación de cita a ${jid}...`);
    await sock.sendMessage(jid, { text: mensaje });
    console.log(`✅ [WhatsApp Cita] Confirmación entregada con éxito a ${paciente}`);

    // Intentar actualizar en base de datos si existe el campo
    try {
      if (cita.id) {
        await pool.query('UPDATE citas SET mensaje_bienvenida_enviado = TRUE WHERE id = ?', [cita.id]);
      }
    } catch (ignoreErr) {
      // Si la columna mensaje_bienvenida_enviado no existe, se ignora silenciosamente
    }

  } catch (error) {
    console.error(`❌ Error en enviarMensajeReserva:`, error.message || error);
  }
}

// Envío cuando la clínica EDITA una cita desde el panel web
export async function notificarEdicionCita(cita) {
  if (!sock) return;
  const digitos = String(cita.paciente_telefono).replace(/\D/g, '');
  const telefonoCompleto = digitos.length === 8 ? `503${digitos}` : digitos;
  const jid = `${telefonoCompleto}@s.whatsapp.net`;
  const fechaStr = cita.fecha_cita.toString().split('T')[0];

  const mensaje = 
`🔔 *Aviso de Modificación de Cita*

Estimado(a) *${cita.paciente_nombre}*, se ha actualizado la información de su cita médica en el sistema:

📅 *Nueva Fecha:* ${fechaStr}
⏰ *Nuevo Horario:* ${cita.hora_cita.slice(0, 5)} - ${cita.hora_fin.slice(0, 5)}
👨‍⚕️ *Doctor(a):* ${cita.doctor_nombre}
${cita.indicaciones ? `📌 *Indicaciones:* ${cita.indicaciones}\n` : ''}
Estado actual: *${cita.estado}*

_Si tiene dudas sobre este cambio, puede responder directamente a este mensaje._`;

  try {
    await sock.sendMessage(jid, { text: mensaje });
    console.log(`[Notificación] Modificación de cita enviada a ${cita.paciente_nombre}`);
  } catch (err) {
    console.error(`Error notificando edición de cita:`, err);
  }
}

// Envío de emergencia cuando el médico no puede asistir en la fecha seleccionada
export async function cancelarJornadaYNotificar(fecha, doctorNombre) {
  if (!sock) return;

  const [citas] = await pool.query(
    `SELECT * FROM citas WHERE fecha_cita = ? AND doctor_nombre = ? AND estado != 'CANCELADA'`,
    [fecha, doctorNombre]
  );

  console.log(`[Emergencia] Cancelando jornada del ${fecha} para Dr. ${doctorNombre}. Citas afectadas: ${citas.length}`);

  for (const cita of citas) {
    const digitos = String(cita.paciente_telefono).replace(/\D/g, '');
    const telefonoCompleto = digitos.length === 8 ? `503${digitos}` : digitos;
    const jid = `${telefonoCompleto}@s.whatsapp.net`;

    // Buscar opciones libres de reemplazo
    const slots = await obtenerProximosSlots(cita.duracion_minutos || 30,fecha);
    await pool.query(
      `UPDATE citas SET estado = 'REAGENDAR', opciones_reprogramacion = ?, requiere_atencion_humana = TRUE WHERE id = ?`,
      [JSON.stringify(slots), cita.id]
    );

    let mensaje = 
`⚠️ *AVISO IMPORTANTE - CONSULTORIO MÉDICO*

Estimado(a) *${cita.paciente_nombre}*, lamentamos informarle que por motivos de fuerza mayor el/la *${doctorNombre}* no podrá atender consultas programadas para hoy (*${fecha}*).

Para su comodidad, hemos apartado los siguientes espacios más próximos para reagendar su atención:

`;
    slots.forEach(s => {
      mensaje += `*${s.opcion}* ➔ ${s.fecha} a las ${s.hora_inicio}\n`;
    });

    mensaje += `\nPor favor elija respondiendo con el número (*1, 2, 3 o 4*) o responda para coordinar con recepción.`;

    try {
      await sock.sendMessage(jid, { text: mensaje });
    } catch (e) {
      console.error(`Error en notificación de emergencia a ${cita.paciente_nombre}:`, e);
    }

    await new Promise(r => setTimeout(r, 4000));
  }
}

// Cron Job de recordatorios 24h
export async function procesarRecordatoriosManana() {
  if (!sock) return;
  try {
    const [citas] = await pool.query(`
      SELECT * FROM citas 
      WHERE fecha_cita = CURDATE() + INTERVAL 1 DAY 
        AND estado = 'RESERVADA' 
        AND recordatorio_enviado = FALSE
    `);

    for (const cita of citas) {
      const digitos = String(cita.paciente_telefono).replace(/\D/g, '');
      const telefonoCompleto = digitos.length === 8 ? `503${digitos}` : digitos;
      const jid = `${telefonoCompleto}@s.whatsapp.net`;

      const mensaje = 
`Hola *${cita.paciente_nombre}*, le saludamos de la clínica.

Le recordamos su cita para *mañana* a las *${cita.hora_cita.slice(0, 5)}* con el/la Dr(a). *${cita.doctor_nombre}*.
${cita.indicaciones ? `\n📌 *Recordatorio:* ${cita.indicaciones}\n` : ''}
Por favor confirme su asistencia respondiendo:
*1* para Confirmar asistencia
*2* para Reagendar`;

      try {
        await sock.sendMessage(jid, { text: mensaje });
        await pool.query('UPDATE citas SET recordatorio_enviado = TRUE WHERE id = ?', [cita.id]);
      } catch (err) {
        console.error(err);
      }
      await new Promise(r => setTimeout(r, 5000));
    }
  } catch (error) {
    console.error(error);
  }
}



export async function enviarRecetaCompleta({ paciente_nombre, paciente_telefono, doctor_nombre, medicamentos }) {
  if (!sock) return;

  const digitos = String(paciente_telefono).replace(/\D/g, '');
  const telefonoCompleto = digitos.length === 8 ? `503${digitos}` : digitos;
  const jid = `${telefonoCompleto}@s.whatsapp.net`;

  let mensaje = `📋 *RECETA MÉDICA - CONSULTORIO*\n\n`;
  mensaje += `Paciente: *${paciente_nombre}*\n`;
  mensaje += `Médico: *${doctor_nombre}*\n\n`;
  mensaje += `*Indicaciones de Tratamiento:*\n`;

  medicamentos.forEach((m, idx) => {
    if (!m.medicamento) return;
    mensaje += `\n*${idx + 1}. ${m.medicamento}*\n`;
    mensaje += `   ⏱️ ${m.frecuencia}\n`;
    mensaje += `   📅 Durante ${m.dias_tratamiento} días\n`;
    if (m.indicacion) mensaje += `   📌 ${m.indicacion}\n`;
  });

  mensaje += `\n_Conserve este mensaje para el control de su medicación._`;

  try {
    await sock.sendMessage(jid, { text: mensaje });
  } catch (err) {
    console.error('Error enviando receta por WhatsApp:', err);
  }
}

export async function procesarRecordatoriosMedicamentos() {
  if (!sock) {
    console.log('⚠️ [Medicamento] Socket de WhatsApp no está conectado.');
    return;
  }

  try {
    const [recetas] = await pool.query(`
      SELECT * FROM recetas_medicamentos 
      WHERE activo = TRUE 
        AND CURDATE() <= DATE_ADD(fecha_inicio, INTERVAL dias_tratamiento DAY)
    `);

    console.log(`📋 [Medicamento] Filas activas encontradas: ${recetas.length}`);

    if (recetas.length === 0) {
      console.log('⚠️ No hay recetas activas con fecha vigente para hoy.');
      return;
    }

    for (const r of recetas) {
      const digitos = String(r.paciente_telefono || '').replace(/\D/g, '');
      console.log(`🔎 Evaluando receta #${r.id} | Paciente: ${r.paciente_nombre} | Tel: "${r.paciente_telefono}" (Dígitos: "${digitos}")`);

      if (digitos.length < 8) {
        console.error(`❌ [Medicamento] El número "${r.paciente_telefono}" no es válido (tiene menos de 8 dígitos). Actualiza el teléfono de la cita.`);
        continue;
      }

      const telefonoCompleto = digitos.length === 8 ? `503${digitos}` : digitos;
      const jid = `${telefonoCompleto}@s.whatsapp.net`;

      const mensaje = 
`💊 *Recordatorio de Medicación*

Hola *${r.paciente_nombre}*, le saludamos de su consultorio médico.

Le corresponde su dosis programada:
💊 *Medicamento:* ${r.medicamento}
📝 *Indicación:* ${r.dosis_indicacion}

_Por favor responda con el número *1* cuando haya tomado su dosis para registrar su avance médico._`;

      console.log(`📤 Enviando recordatorio a ${jid}...`);
      await sock.sendMessage(jid, { text: mensaje });
      console.log(`✅ [Medicamento] Mensaje entregado con éxito a ${r.paciente_nombre} (${jid})`);

      await new Promise(res => setTimeout(res, 1000));
    }
  } catch (error) {
    console.error('❌ Error general en recordatorios:', error);
  }
}