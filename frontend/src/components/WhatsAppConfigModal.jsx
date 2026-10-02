import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';

export default function WhatsAppConfigModal({ clinicaId, isOpen, onClose }) {
  // 1. Priorizar 'clinic_user_id' (como lo guarda tu sistema en main)
  const storedUserId = localStorage.getItem('clinic_user_id');
  const targetId = String(
    storedUserId || (clinicaId && clinicaId !== '1' ? clinicaId : '1')
  );

  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'esperando_qr' | 'conectado' | 'desconectado'
  const [qrSrc, setQrSrc] = useState(null);
  const [cargandoAccion, setCargandoAccion] = useState(false);

  const consultarEstado = useCallback(async () => {
    try {
      const res = await api.get(`/api/whatsapp/estado/${targetId}`);
      if (res.data) {
        setEstado(res.data.status);
        setQrSrc(res.data.qr || null);
      }
    } catch (error) {
      console.error(`Error consultando estado de WhatsApp para sesión ${targetId}:`, error);
      setEstado('desconectado');
    }
  }, [targetId]);

  useEffect(() => {
    if (!isOpen) return;

    // Consulta inicial al abrir el modal
    consultarEstado();

    // Polling cada 3 segundos mientras no esté conectado
    const interval = setInterval(() => {
      if (estado !== 'conectado') {
        consultarEstado();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, estado, consultarEstado]);

  const handleForzarReconexion = async () => {
    setCargandoAccion(true);
    setEstado('cargando');
    setQrSrc(null);
    try {
      const res = await api.get(`/api/whatsapp/estado/${targetId}`);
      if (res.data) {
        setEstado(res.data.status);
        setQrSrc(res.data.qr || null);
      }
    } catch (err) {
      console.error('Error al forzar reconexión:', err);
      setEstado('desconectado');
    } finally {
      setCargandoAccion(false);
    }
  };

  const handleDesconectar = async () => {
    const confirmar = window.confirm(
      '¿Seguro que deseas desvincular este WhatsApp? Tendrás que volver a escanear el código QR para enviar mensajes.'
    );
    if (!confirmar) return;

    setCargandoAccion(true);
    try {
      await api.post(`/api/whatsapp/desconectar/${targetId}`);
      setEstado('desconectado');
      setQrSrc(null);
    } catch (err) {
      console.error('Error al desconectar WhatsApp:', err);
    } finally {
      setCargandoAccion(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 border border-slate-100">
        
        {/* Cabecera del Modal */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">📱</span>
            <h3 className="font-bold text-slate-800 text-sm">
              Conexión de WhatsApp
            </h3>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer transition"
          >
            ✕
          </button>
        </div>

        {/* Contenedor de Estado Dinámico */}
        <div className="text-center py-2 space-y-3 min-h-[220px] flex flex-col justify-center items-center">
          
          {/* 1. ESTADO: CONECTADO */}
          {estado === 'conectado' && (
            <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs space-y-3">
              <div className="w-10 h-10 mx-auto bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-lg font-bold">
                ✓
              </div>
              <p className="font-bold text-sm text-emerald-900">WhatsApp Vinculado</p>
              <p className="text-emerald-700 leading-relaxed">
                El sistema está listo. Los resúmenes de consulta y recordatorios se enviarán de forma automática desde tu número.
              </p>

              {/* Botón para desconectar la sesión */}
              <button
                type="button"
                disabled={cargandoAccion}
                onClick={handleDesconectar}
                className="mt-2 w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
              >
                {cargandoAccion ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Desvinculando...
                  </>
                ) : (
                  'Desvincular WhatsApp'
                )}
              </button>
            </div>
          )}

          {/* 2. ESTADO: ESPERANDO ESCANEO DE QR */}
          {estado === 'esperando_qr' && qrSrc && (
            <div className="space-y-3 w-full">
              <p className="text-xs text-slate-600 px-2 leading-tight">
                Abre WhatsApp en tu teléfono &gt; <strong>Dispositivos vinculados</strong> &gt; <strong>Vincular un dispositivo</strong>:
              </p>
              <div className="flex justify-center">
                <div className="p-2 bg-white border border-slate-200 rounded-2xl shadow-inner inline-block">
                  <img 
                    src={qrSrc} 
                    alt="Código QR de WhatsApp" 
                    className="w-48 h-48 rounded-lg object-contain"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                El código se actualiza automáticamente cada 20 segundos.
              </p>
            </div>
          )}

          {/* 3. ESTADO: CARGANDO / GENERANDO ENLACE */}
          {(estado === 'cargando' || (estado === 'esperando_qr' && !qrSrc)) && (
            <div className="py-8 space-y-3 text-slate-500">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-medium">Generando enlace seguro con el servidor...</p>
            </div>
          )}

          {/* 4. ESTADO: DESCONECTADO O ERROR */}
          {estado === 'desconectado' && (
            <div className="w-full bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs space-y-3">
              <p className="font-bold text-sm text-rose-900">Sesión no iniciada</p>
              <p className="text-rose-700">
                No hay una sesión activa o se perdió la conexión con tu teléfono.
              </p>
              <button
                type="button"
                onClick={handleForzarReconexion}
                disabled={cargandoAccion}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs transition cursor-pointer disabled:opacity-50"
              >
                {cargandoAccion ? 'Cargando...' : 'Reintentar vinculación'}
              </button>
            </div>
          )}
        </div>

        {/* Botón Inferior */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}