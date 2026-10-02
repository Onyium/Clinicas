import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion 
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';

// Guardamos las conexiones en memoria: { [clinicaId]: { sock, qrBase64, status } }
const sessions = new Map();

export const initWhatsAppSession = async (clinicaId) => {
  const sessionDir = path.resolve(`./auth_sessions/clinica_${clinicaId}`);

  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    defaultQueryTimeoutMs: undefined,
  });

  // Estructura de estado en memoria
  sessions.set(clinicaId, {
    sock,
    qrBase64: null,
    status: 'conectando'
  });

  // Guardar credenciales conforme se actualizan los tokens
  sock.ev.on('creds.update', saveCreds);

  // Escuchar cambios de conexión y QR
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    const currentSession = sessions.get(clinicaId) || {};

    if (qr) {
      try {
        const qrImage = await QRCode.toDataURL(qr);
        sessions.set(clinicaId, { 
          ...currentSession, 
          qrBase64: qrImage, 
          status: 'esperando_qr' 
        });
      } catch (err) {
        console.error('Error generando DataURL del QR:', err);
      }
    }

    if (connection === 'open') {
      console.log(`[WhatsApp] Clínica ${clinicaId} conectada exitosamente.`);
      sessions.set(clinicaId, { 
        ...currentSession, 
        qrBase64: null, 
        status: 'conectado' 
      });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`[WhatsApp] Conexión cerrada para clínica ${clinicaId}. Reconectar: ${shouldReconnect}`);

      if (shouldReconnect) {
        sessions.set(clinicaId, { ...currentSession, status: 'reconectando' });
        initWhatsAppSession(clinicaId);
      } else {
        // El usuario cerró sesión explícitamente desde WhatsApp Web en el celular
        sessions.set(clinicaId, { sock: null, qrBase64: null, status: 'desconectado' });
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
    }
  });

  return sock;
};

// Función para obtener estado actual y QR
export const getWhatsAppStatus = (clinicaId) => {
  const session = sessions.get(clinicaId);
  if (!session) {
    return { status: 'desconectado', qr: null };
  }
  return { status: session.status, qr: session.qrBase64 };
};

// Función robusta para enviar confirmación o recordatorio
export const enviarMensajeCita = async (clinicaId, telefono, mensaje) => {
  const session = sessions.get(clinicaId);

  if (!session || session.status !== 'conectado') {
    throw new Error('El WhatsApp de la clínica no está vinculado o conectado.');
  }

  // Limpieza del número: quitar guiones, espacios y asegurar prefijo 503
  let limpio = telefono.replace(/\D/g, '');
  if (!limpio.startsWith('503')) {
    limpio = `503${limpio}`;
  }

  const jid = `${limpio}@s.whatsapp.net`;

  return await session.sock.sendMessage(jid, { text: mensaje });
};

export const desconectarWhatsApp = async (clinicaId) => {
  const session = sessions.get(clinicaId);
  const sessionDir = path.resolve(`./auth_sessions/clinica_${clinicaId}`);

  if (session?.sock) {
    try {
      await session.sock.logout();
    } catch (err) {
      console.warn('Error en socket logout (puede que ya estuviera cerrado):', err.message);
    }
  }

  // Limpiar memoria
  sessions.delete(clinicaId);

  // Borrar carpeta de credenciales para forzar nuevo QR al reconectar
  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true });
  }

  return { ok: true, status: 'desconectado' };
};

export const enviarResumenConsulta = async (clinicaId, telefono, datos) => {
  const session = sessions.get(String(clinicaId));

  if (!session || session.status !== 'conectado') {
    throw new Error('El WhatsApp de la clínica no está vinculado o activo.');
  }

  // Normalizar número a formato SV
  let limpio = String(telefono).replace(/\D/g, '');
  if (limpio.length === 8) limpio = `503${limpio}`;
  const jid = `${limpio}@s.whatsapp.net`;

  // Construcción del texto
  let mensaje = `📋 *RESUMEN DE CONSULTA MÉDICA*\n`;
  mensaje += `🏥 *${datos.nombre_clinica || 'Consultorio Médico'}*\n`;
  mensaje += `━━━━━━━━━━━━━━━━━━━━━\n`;
  mensaje += `👤 *Paciente:* ${datos.paciente_nombre}\n`;
  mensaje += `👨‍⚕️ *Médico:* ${datos.doctor_nombre || 'Médico tratante'}\n`;
  mensaje += `📅 *Fecha:* ${datos.fecha || new Date().toLocaleDateString('es-SV')}\n\n`;

  if (datos.diagnostico) {
    mensaje += `📝 *DIAGNÓSTICO:*\n${datos.diagnostico}\n\n`;
  }

  // Sección de medicamentos
  if (Array.isArray(datos.medicamentos) && datos.medicamentos.length > 0) {
    mensaje += `💊 *TRATAMIENTO / MEDICAMENTOS:*\n`;
    datos.medicamentos.forEach((m) => {
      const med = m.medicamento || m.nombre;
      const dosis = m.frecuencia || 'Según indicación';
      const tiempo = m.dias_tratamiento ? ` por ${m.dias_tratamiento} días` : '';
      const nota = m.indicacion ? `\n  _${m.indicacion}_` : '';
      mensaje += `• *${med}*: ${dosis}${tiempo}${nota}\n`;
    });
    mensaje += `\n`;
  }

  // Sección de laboratorios / estudios
  if (datos.estudios && datos.estudios.length > 0) {
    mensaje += `🧪 *ESTUDIOS / LABORATORIOS INDICADOS:*\n`;
    if (Array.isArray(datos.estudios)) {
      datos.estudios.forEach((e) => {
        mensaje += `• ${typeof e === 'string' ? e : e.tipo_estudio || e.nombre}\n`;
      });
    } else {
      mensaje += `${datos.estudios}\n`;
    }
    mensaje += `\n`;
  }

  // Indicaciones o plan general
  if (datos.plan_tratamiento) {
    mensaje += `📌 *INDICACIONES GENERALES:*\n${datos.plan_tratamiento}\n\n`;
  }

  mensaje += `━━━━━━━━━━━━━━━━━━━━━\n`;
  mensaje += `_Comprobante informativo emitido por su médico tratante._`;

  return await session.sock.sendMessage(jid, { text: mensaje.trim() });
};