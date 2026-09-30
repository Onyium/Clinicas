import React, { useState, useEffect } from 'react';
import api from '../api';
import { toast } from 'sonner';

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
  const [subiendoLogo, setSubiendoLogo] = useState(false);

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

  const handleSubirLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('logo', file);

    setSubiendoLogo(true);
    try {
      // Llamamos a nuestra nueva ruta en el backend
      const res = await api.post('/api/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Actualizamos el estado con la URL de Cloudinary
      setForm({ ...form, logo_url: res.data.url });
    } catch (err) {
      console.error(err);
      toast.error('Error al subir la imagen al servidor.');
    } finally {
      setSubiendoLogo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      await api.put('/api/configuracion', form);
      toast.success('✅ Configuración actualizada con éxito.');
      if (onSaved) onSaved(form);
      onClose();
    } catch (err) {
      toast.error('Error al guardar configuración');
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
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Días y Horarios de Atención</label>
                <input type="text" placeholder="Ej. Lunes a Sábado de 8:00 AM - 4:00 PM" value={form.horario_atencion} onChange={e => setForm({...form, horario_atencion: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500" />
              </div>

              {/* SECCIÓN DE SUBIDA DE IMAGEN A CLOUDINARY */}
              <div className="md:col-span-2 bg-white p-3 border border-slate-200 rounded-xl">
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-2">Logo de la Clínica</label>
                <div className="flex items-center gap-4">
                  {form.logo_url ? (
                    <img src={form.logo_url} alt="Logo Clínica" className="w-16 h-16 object-contain border border-slate-200 rounded-lg bg-slate-50 p-1" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-2xl">
                      ⚕️
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleSubirLogo} 
                      disabled={subiendoLogo}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 outline-none cursor-pointer disabled:opacity-50" 
                    />
                    {subiendoLogo ? (
                      <span className="text-xs text-blue-600 font-bold block mt-1.5 animate-pulse">⏳ Subiendo y procesando imagen...</span>
                    ) : (
                      <span className="text-[10px] text-slate-400 block mt-1.5">Formatos permitidos: JPG, PNG, WEBP.</span>
                    )}
                  </div>
                </div>
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
            <button type="submit" disabled={cargando || subiendoLogo} className="px-6 py-2.5 bg-[#10a37f] hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition cursor-pointer disabled:opacity-50">
              {cargando ? 'Guardando...' : '💾 Guardar Configuración'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}