// src/components/expediente/FormularioGeneral.jsx
import React from 'react';
import { toast } from 'sonner';
export default function FormularioGeneral({
  formGeneral,
  setFormGeneral,
  handleCambioFechaNac,
  handleCambioEdad,
  handleGuardarGeneral,
  guardandoGeneral,
  esMenorDeEdad
}) {
  return (
    <form onSubmit={handleGuardarGeneral} className="max-w-3xl space-y-6 bg-white p-6 rounded-2xl border border-slate-200">
      
      {/* DATOS BÁSICOS */}
      <div>
        <h4 className="text-xs font-black text-slate-800 uppercase border-b border-slate-200 pb-2 mb-4">
          Datos Básicos del Paciente
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Nombre Completo</label>
            <input 
              type="text" 
              required
              value={formGeneral.nombre || ''} 
              onChange={e => setFormGeneral({...formGeneral, nombre: e.target.value})} 
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 font-bold" 
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Teléfono</label>
            <input 
              type="text" 
              value={formGeneral.telefono || ''} 
              onChange={e => setFormGeneral({...formGeneral, telefono: e.target.value})} 
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500" 
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Fecha de Nacimiento</label>
            <input 
              type="date" 
              value={formGeneral.fecha_nacimiento || ''} 
              onChange={handleCambioFechaNac} 
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500" 
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Edad (Años)</label>
            <input 
              type="number" 
              value={formGeneral.edad || ''} 
              onChange={handleCambioEdad} 
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500" 
            />
          </div>
        </div>
      </div>

      {/* BLOQUE DEL TUTOR LEGAL (SE MUESTRA SI ES MENOR DE EDAD) */}
      {esMenorDeEdad && (
        <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200">
          <h4 className="text-xs font-black text-amber-900 uppercase mb-3 flex items-center gap-1.5">
            👶 Datos del Tutor / Responsable Legal
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className="text-[10px] font-bold text-amber-800 uppercase block mb-1">Nombre del Tutor</label>
              <input 
                type="text" 
                placeholder="Nombre del padre o madre"
                value={formGeneral.responsable_nombre || ''} 
                onChange={e => setFormGeneral({...formGeneral, responsable_nombre: e.target.value})} 
                className="w-full border border-amber-300 bg-white rounded-lg p-2 text-xs outline-none focus:border-amber-600" 
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-amber-800 uppercase block mb-1">Parentesco</label>
              <select 
                value={formGeneral.responsable_parentesco || 'Madre'} 
                onChange={e => setFormGeneral({...formGeneral, responsable_parentesco: e.target.value})} 
                className="w-full border border-amber-300 bg-white rounded-lg p-2 text-xs outline-none focus:border-amber-600"
              >
                <option value="Madre">Madre</option>
                <option value="Padre">Padre</option>
                <option value="Abuelo/a">Abuelo/a</option>
                <option value="Tutor Legal">Tutor Legal</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-amber-800 uppercase block mb-1">Teléfono Tutor</label>
              <input 
                type="text" 
                placeholder="6000-0000"
                value={formGeneral.responsable_telefono || ''} 
                onChange={e => setFormGeneral({...formGeneral, responsable_telefono: e.target.value})} 
                className="w-full border border-amber-300 bg-white rounded-lg p-2 text-xs outline-none focus:border-amber-600" 
              />
            </div>
          </div>
        </div>
      )}

      {/* ANTECEDENTES Y ALERGIAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Alergias Conocidas</label>
          <input 
            type="text" 
            placeholder="Ej. Penicilina, sulfas..." 
            value={formGeneral.alergias || ''} 
            onChange={e => setFormGeneral({...formGeneral, alergias: e.target.value})} 
            className="w-full border border-slate-300 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 text-rose-600 font-bold" 
          />
        </div>
        <div>
          <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Antecedentes Médicos / Familiares</label>
          <textarea 
            rows="2" 
            value={formGeneral.antecedentes || ''} 
            onChange={e => setFormGeneral({...formGeneral, antecedentes: e.target.value})} 
            className="w-full border border-slate-300 rounded-lg p-2 text-xs outline-none focus:border-blue-500" 
          />
        </div>
      </div>

      {/* BOTÓN GUARDAR FICHA */}
      <div className="flex justify-end pt-3 border-t border-slate-100">
        <button 
          type="submit" 
          disabled={guardandoGeneral} 
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
        >
          {guardandoGeneral ? 'Guardando Ficha...' : '💾 Guardar Ficha Médica'}
        </button>
      </div>

    </form>
  );
}