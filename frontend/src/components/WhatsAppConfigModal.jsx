import React, { useState, useEffect } from 'react';

export default function WhatsAppConfigModal({ clinicaId, isOpen, onClose }) {
  const [estado, setEstado] = useState('cargando');
  const [qrSrc, setQrSrc] = useState(null);

  const consultarEstado = async () => {
    try {
      const res = await fetch(`/api/whatsapp/estado/${clinicaId}`);
      const data = await res.json();
      setEstado(data.status);
      setQrSrc(data.qr);
    } catch (error) {
      console.error('Error al consultar estado de WhatsApp:', error);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    consultarEstado();
    // Sondeo (polling) cada 3 segundos mientras no esté conectado
    const interval = setInterval(() => {
      if (estado !== 'conectado') {
        consultarEstado();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, estado]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            📱 Conexión de WhatsApp
          </h3>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <div className="text-center py-2 space-y-3">
          {estado === 'conectado' && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-xs space-y-1">
              <p className="font-bold text-sm">✅ Vinculado y Activo</p>
              <p>Los recordatorios automáticos de citas saldrán desde el número de la clínica.</p>
            </div>
          )}

          {estado === 'esperando_qr' && qrSrc && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Abra WhatsApp en el celular del consultorio &gt; Dispositivos vinculados &gt; Escanee este código:
              </p>
              <div className="flex justify-center">
                <img src={qrSrc} alt="Código QR WhatsApp" className="w-52 h-52 border rounded-xl p-1" />
              </div>
            </div>
          )}

          {(estado === 'conectando' || estado === 'cargando') && (
            <div className="py-8 text-xs text-slate-400">
              Generando enlace seguro...
            </div>
          )}

          {estado === 'desconectado' && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs">
              ⚠️ Sesión desconectada. Cargue de nuevo para generar el código.
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}