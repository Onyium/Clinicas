import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = '${import.meta.env.VITE_API_URL}/api';

export default function ConfigModal({ isOpen, onClose, onSaved }) {
  const [config, setConfig] = useState({
    nombre_clinica: '',
    hora_apertura: '08:00',
    hora_cierre: '13:00',
    duracion_defecto_minutos: 30,
    permite_reprogramar_bot: true
  });

  useEffect(() => {
    if (isOpen) {
      axios.get(`${API_URL}/configuracion`).then(res => {
        if (res.data) {
          setConfig({
            ...res.data,
            hora_apertura: res.data.hora_apertura?.slice(0, 5) || '08:00',
            hora_cierre: res.data.hora_cierre?.slice(0, 5) || '13:00',
            permite_reprogramar_bot: Boolean(res.data.permite_reprogramar_bot)
          });
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/configuracion`, config);
      onSaved(config);
      onClose();
    } catch (err) {
      alert('Error al guardar la configuración');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">⚙️ Configuración del Consultorio</h2>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre de la Clínica</label>
            <input
              type="text"
              required
              value={config.nombre_clinica}
              onChange={(e) => setConfig({ ...config, nombre_clinica: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Hora Apertura</label>
              <input
                type="time"
                required
                value={config.hora_apertura}
                onChange={(e) => setConfig({ ...config, hora_apertura: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Hora Cierre</label>
              <input
                type="time"
                required
                value={config.hora_cierre}
                onChange={(e) => setConfig({ ...config, hora_cierre: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Duración Predeterminada por Cita</label>
            <select
              value={config.duracion_defecto_minutos}
              onChange={(e) => setConfig({ ...config, duracion_defecto_minutos: Number(e.target.value) })}
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value={15}>15 minutos</option>
              <option value={20}>20 minutos</option>
              <option value={30}>30 minutos (Estándar)</option>
              <option value={45}>45 minutos</option>
              <option value={60}>60 minutos (1 hora)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="reprogramar"
              checked={config.permite_reprogramar_bot}
              onChange={(e) => setConfig({ ...config, permite_reprogramar_bot: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <label htmlFor="reprogramar" className="text-xs text-slate-700 font-medium">
              Permitir que el bot ofrezca 4 slots y reprograme automáticamente por WhatsApp
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-xs text-slate-600 hover:bg-slate-50"
            >
              Cerrar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
            >
              Guardar Configuración
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}