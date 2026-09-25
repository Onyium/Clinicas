import React, { useState, useEffect } from 'react';
import api from '../api';

export default function ConfigModal({ isOpen, onClose, onSaved }) {
  const [form, setForm] = useState({
    nombre_clinica: '',
    eslogan: '',
    telefono_clinica: '',
    direccion: '',
    logo_url: '',
    hora_apertura: '08:00',
    hora_cierre: '17:00',
    duracion_defecto_minutos: 30
  });
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const cargarConfig = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/configuracion');
        if (res.data) {
          setForm({
            nombre_clinica: res.data.nombre_clinica || '',
            eslogan: res.data.eslogan || '',
            telefono_clinica: res.data.telefono_clinica || '',
            direccion: res.data.direccion || '',
            logo_url: res.data.logo_url || '',
            hora_apertura: res.data.hora_apertura ? res.data.hora_apertura.slice(0, 5) : '08:00',
            hora_cierre: res.data.hora_cierre ? res.data.hora_cierre.slice(0, 5) : '17:00',
            duracion_defecto_minutos: res.data.duracion_defecto_minutos || 30
          });
        }
      } catch (err) {
        console.error('Error cargando configuración:', err);
      } finally {
        setLoading(false);
      }
    };

    cargarConfig();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await api.put('/api/configuracion', form);
      alert('✅ Configuración guardada correctamente.');
      
      // 1. Notifica al componente padre
      if (onSaved) onSaved(form);
      
      // 2. Mantiene los datos en el estado local del modal
      setForm(prev => ({ ...prev, ...form }));
      
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error al guardar la configuración');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Cabecera del modal */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-800">⚙️ Configuración del Consultorio</h2>
            <p className="text-xs text-slate-500">Personaliza tus recetas, membresías y horarios</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Cargando datos...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 py-3 flex-1 text-xs">
            
            {/* SECCIÓN 1: MEMBRETE Y DATOS DE LA CLÍNICA */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <span className="font-black text-slate-700 uppercase tracking-wider block text-[11px]">
                🏥 Membrete Institucional (Aparece en Recetas y PDF)
              </span>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre del Consultorio / Clínica *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej. Consultorio Médico Maye"
                  value={form.nombre_clinica}
                  onChange={(e) => setForm({ ...form, nombre_clinica: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Eslogan o Subtítulo (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ej. Cuidado y salud para toda la familia"
                  value={form.eslogan}
                  onChange={(e) => setForm({ ...form, eslogan: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Teléfono de Contacto</label>
                  <input 
                    type="text" 
                    placeholder="Ej. 6452-6988"
                    value={form.telefono_clinica}
                    onChange={(e) => setForm({ ...form, telefono_clinica: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Dirección del Consultorio</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Barrio El Centro, Sonsonate"
                    value={form.direccion}
                    onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">URL del Logo (Opcional)</label>
                <input 
                  type="url" 
                  placeholder="https://ejemplo.com/logo-clinica.png"
                  value={form.logo_url}
                  onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Pega un enlace de imagen pública o déjalo vacío si no usarás logo.
                </span>
              </div>
            </div>

            {/* SECCIÓN 2: HORARIOS DE LA AGENDA */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <span className="font-black text-slate-700 uppercase tracking-wider block text-[11px]">
                📅 Horarios de Atención (Agenda y Citas)
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hora de Apertura</label>
                  <input 
                    type="time" 
                    value={form.hora_apertura}
                    onChange={(e) => setForm({ ...form, hora_apertura: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hora de Cierre</label>
                  <input 
                    type="time" 
                    value={form.hora_cierre}
                    onChange={(e) => setForm({ ...form, hora_cierre: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Duración por Turno / Cita (Minutos)</label>
                <input 
                  type="number" 
                  min="10"
                  max="120"
                  step="5"
                  value={form.duracion_defecto_minutos}
                  onChange={(e) => setForm({ ...form, duracion_defecto_minutos: parseInt(e.target.value, 10) || 30 })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={guardando}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {guardando ? 'Guardando...' : '💾 Guardar Cambios'}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}