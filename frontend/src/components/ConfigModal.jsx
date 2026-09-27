import React, { useState, useEffect } from 'react';
import api from '../api';

export default function ConfigModal({ isOpen, onClose, onSaved }) {
  const [form, setForm] = useState({
    nombre_clinica: '',
    nombre_doctor: '',
    jvpm: '',
    eslogan: '',
    telefono_clinica: '',
    direccion: '',
    horario_atencion: '',
    logo_url: '',
    hora_apertura: '08:00',
    hora_cierre: '17:00',
    duracion_defecto_minutos: 30
  });

  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.get('/api/configuracion')
        .then(res => {
          if (res.data) {
            setForm({
              nombre_clinica: res.data.nombre_clinica || '',
              nombre_doctor: res.data.nombre_doctor || '',
              jvpm: res.data.jvpm || '',
              eslogan: res.data.eslogan || '',
              telefono_clinica: res.data.telefono_clinica || '',
              direccion: res.data.direccion || '',
              horario_atencion: res.data.horario_atencion || '',
              logo_url: res.data.logo_url || '',
              hora_apertura: res.data.hora_apertura?.slice(0, 5) || '08:00',
              hora_cierre: res.data.hora_cierre?.slice(0, 5) || '17:00',
              duracion_defecto_minutos: res.data.duracion_defecto_minutos || 30
            });
          }
        })
        .catch(err => console.error("Error al cargar configuracion:", err));
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      await api.put('/api/configuracion', form);
      alert('✅ Configuración actualizada con éxito.');
      if (onSaved) onSaved(form);
      onClose();
    } catch (err) {
      alert('Error al guardar configuración');
    } finally {
      setCargando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl my-8">
        
        <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-slate-50 rounded-t-2xl">
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            ⚙️ Configuración del Sistema
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl font-bold cursor-pointer">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* SECCIÓN 1: MEMBRETE DE IMPRESIÓN */}
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <h3 className="text-xs font-black text-blue-900 uppercase tracking-wider mb-4 border-b border-blue-200 pb-2">
              📄 Datos del Membrete (Recetas y Exámenes)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Nombre del Doctor(a) Titular</label>
                <input type="text" placeholder="Ej. Dra. Liseyda Driscla Maye Menjivar" value={form.nombre_doctor} onChange={e => setForm({...form, nombre_doctor: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 font-bold" />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Nombre de la Clínica</label>
                <input type="text" placeholder="Ej. Clínica Médica Familiar Maye" value={form.nombre_clinica} onChange={e => setForm({...form, nombre_clinica: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
              
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Especialidad / Eslogan</label>
                <input type="text" placeholder="Ej. Atención Integral para toda la familia" value={form.eslogan} onChange={e => setForm({...form, eslogan: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Número JVPM / Registro</label>
                <input type="text" placeholder="Ej. JVPM No. 15381" value={form.jvpm} onChange={e => setForm({...form, jvpm: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 font-mono" />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Teléfono / WhatsApp (Impresión)</label>
                <input type="text" placeholder="Ej. 6142-8924" value={form.telefono_clinica} onChange={e => setForm({...form, telefono_clinica: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500" />
              </div>

              <div className="md:col-span-2">
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Dirección Física</label>
                <input type="text" placeholder="Ej. Avenida San Juan número 9..." value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500" />
              </div>

              <div className="md:col-span-2">
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Días y Horarios de Atención (Texto libre)</label>
                <input type="text" placeholder="Ej. Lunes a Sábado de 8:00 AM - 4:00 PM" value={form.horario_atencion} onChange={e => setForm({...form, horario_atencion: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500" />
              </div>

              <div className="md:col-span-2">
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">URL del Logo (Opcional)</label>
                <input type="text" placeholder="https://imgur.com/tu-logo.png" value={form.logo_url} onChange={e => setForm({...form, logo_url: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 text-blue-600" />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: AGENDA Y TURNOS */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">
              📅 Sistema de Agenda (Calendario)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Hora de Apertura</label>
                <input type="time" value={form.hora_apertura} onChange={e => setForm({...form, hora_apertura: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Hora de Cierre</label>
                <input type="time" value={form.hora_cierre} onChange={e => setForm({...form, hora_cierre: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Turno (Minutos)</label>
                <select value={form.duracion_defecto_minutos} onChange={e => setForm({...form, duracion_defecto_minutos: Number(e.target.value)})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white outline-none focus:border-blue-500">
                  <option value={15}>15 minutos</option>
                  <option value={20}>20 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={45}>45 minutos</option>
                  <option value={60}>1 hora</option>
                </select>
              </div>
            </div>
          </div>

          {/* BOTONES */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition cursor-pointer">
              Cancelar
            </button>
            <button type="submit" disabled={cargando} className="px-6 py-2.5 bg-[#10a37f] hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition cursor-pointer">
              {cargando ? 'Guardando...' : '💾 Guardar Configuración'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}