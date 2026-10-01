import express from 'express';
import { 
  initWhatsAppSession, 
  getWhatsAppStatus, 
  enviarMensajeCita 
} from '../services/whatsappService.js';

const router = express.Router();

// Consultar estado o solicitar generación de QR
router.get('/estado/:clinicaId', async (req, res) => {
  const { clinicaId } = req.params;
  let data = getWhatsAppStatus(clinicaId);

  // Si no hay sesión iniciada, la creamos para que empiece a emitir el QR
  if (data.status === 'desconectado') {
    await initWhatsAppSession(clinicaId);
    data = getWhatsAppStatus(clinicaId);
  }

  res.json(data);
});

// Endpoint de prueba de envío
router.post('/enviar-cita', async (req, res) => {
  const { clinicaId, telefono, mensaje } = req.body;
  try {
    await enviarMensajeCita(clinicaId, telefono, mensaje);
    res.json({ ok: true, mensaje: 'Mensaje enviado exitosamente' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;