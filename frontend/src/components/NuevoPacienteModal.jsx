import React, { useState } from 'react';
import api from '../api';
import { toast } from 'sonner';
export default function NuevoPacienteModal({ isOpen, onClose, onPacienteCreado }) {
  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    sexo: 'M',
    fecha_nacimiento: ''
  });
  const [guardando, setGuardando] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const res = await api.post('/api/pacientes', form);
      // Enviamos el ID del paciente recién creado al componente principal
      onPacienteCreado(res.data.id);
      
      // Limpiamos el formulario
      setForm({ nombre: '', telefono: '', sexo: 'M', fecha_nacimiento: '' });
    } catch (err) {
      console.error(err);
      toast.error('Error al registrar el paciente');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
        <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
          <h2 className="text-lg font-black text-slate-800">🏥 Registrar Nuevo Paciente</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-xl cursor-pointer">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Completo *</label>
            <input 
              required 
              type="text" 
              value={form.nombre} 
              onChange={e => setForm({...form, nombre: e.target.value})} 
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#10a37f]" 
              placeholder="Ej. Juan Pérez" 
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Teléfono WhatsApp *</label>
            <input 
              required 
              type="text" 
              value={form.telefono} 
              onChange={e => setForm({...form, telefono: e.target.value})} 
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#10a37f] font-mono" 
              placeholder="Ej. 64526988" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Género</label>
              <select 
                value={form.sexo} 
                onChange={e => setForm({...form, sexo: e.target.value})} 
                className="w-full border border-slate-300 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#10a37f] bg-white cursor-pointer"
              >
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Fecha de Nacimiento</label>
              <input 
                type="date" 
                value={form.fecha_nacimiento} 
                onChange={e => setForm({...form, fecha_nacimiento: e.target.value})} 
                className="w-full border border-slate-300 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#10a37f]" 
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={guardando} 
              className="px-4 py-2 bg-[#10a37f] text-white rounded-xl text-sm font-bold hover:bg-[#0e8a6c] transition disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {guardando ? 'Guardando...' : 'Crear Paciente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}