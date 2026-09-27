// src/components/expediente/FormularioGeneral.jsx
import React from 'react';

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
    <form onSubmit={handleGuardarGeneral} className="space-y-4 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Completo</label>
          <input type="text" value={formGeneral.nombre} onChange={(e) => setFormGeneral({ ...formGeneral, nombre: e.target.value })} className="w-full border border-slate-300 rounded-xl p-2 text-xs outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Teléfono WhatsApp</label>
          <input type="text" value={formGeneral.telefono} onChange={(e) => setFormGeneral({ ...formGeneral, telefono: e.target.value })} className="w-full border border-slate-300 rounded-xl p-2 text-xs outline-none focus:border-blue-500 font-mono" />
        </div>
      </div>
      
      {/* FECHA Y EDAD VINCULADAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Fecha de Nacimiento</label>
          <input 
            type="date" 
            value={formGeneral.fecha_nacimiento} 
            onChange={handleCambioFechaNac} 
            className="w-full border border-slate-300 bg-white rounded-xl p-2 text-xs outline-none focus:border-blue-500" 
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Edad (Años) <span className="text-blue-600 font-normal">⇄ Editable</span>
          </label>
          <input 
            type="number" 
            min="0"
            max="120"
            placeholder="Ej. 14"
            value={formGeneral.edad} 
            onChange={handleCambioEdad} 
            className="w-full border border-slate-300 bg-white text-slate-800 font-bold rounded-xl p-2 text-xs outline-none focus:border-blue-500" 
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Género</label>
          <select value={formGeneral.sexo} onChange={(e) => setFormGeneral({ ...formGeneral, sexo: e.target.value })} className="w-full border border-slate-300 rounded-xl p-2 text-xs bg-white outline-none focus:border-blue-500">
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
      </div>

      {/* MENOR DE EDAD / RESPONSABLE */}
      {esMenorDeEdad && (
        <div className="bg-amber-50/70 border-2 border-amber-300 p-4 rounded-2xl space-y-3 transition-all animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-base">👶</span>
            <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider">
              Paciente Menor de Edad (Datos del Tutor / Responsable)
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-amber-900 block mb-1">Nombre del Tutor *</label>
              <input 
                type="text" 
                required={esMenorDeEdad}
                placeholder="Ej. Carmen Rodríguez"
                value={formGeneral.responsable_nombre} 
                onChange={(e) => setFormGeneral({ ...formGeneral, responsable_nombre: e.target.value })} 
                className="w-full bg-white border border-amber-300 rounded-xl p-2 text-xs outline-none focus:border-amber-600" 
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-amber-900 block mb-1">Parentesco *</label>
              <select 
                value={formGeneral.responsable_parentesco} 
                onChange={(e) => setFormGeneral({ ...formGeneral, responsable_parentesco: e.target.value })}
                className="w-full bg-white border border-amber-300 rounded-xl p-2 text-xs outline-none focus:border-amber-600"
              >
                <option value="Madre">Madre</option>
                <option value="Padre">Padre</option>
                <option value="Tutor Legal">Tutor Legal</option>
                <option value="Abuelo/a">Abuelo/a</option>
                <option value="Tío/a">Tío/a</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-amber-900 block mb-1">Teléfono Tutor *</label>
              <input 
                type="text" 
                placeholder="Ej. +1 809-555-0199"
                value={formGeneral.responsable_telefono} 
                onChange={(e) => setFormGeneral({ ...formGeneral, responsable_telefono: e.target.value })} 
                className="w-full bg-white border border-amber-300 rounded-xl p-2 text-xs outline-none focus:border-amber-600 font-mono" 
              />
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="text-xs font-bold text-slate-700 block mb-1">Alergias</label>
        <input type="text" value={formGeneral.alergias} onChange={(e) => setFormGeneral({ ...formGeneral, alergias: e.target.value })} className="w-full border border-slate-300 rounded-xl p-2 text-xs outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="text-xs font-bold text-slate-700 block mb-1">Antecedentes Generales</label>
        <textarea rows="3" value={formGeneral.antecedentes} onChange={(e) => setFormGeneral({ ...formGeneral, antecedentes: e.target.value })} className="w-full border border-slate-300 rounded-xl p-2 text-xs outline-none focus:border-blue-500" />
      </div>

      <div className="pt-2 flex justify-end">
        <button type="submit" disabled={guardandoGeneral} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2 rounded-xl shadow transition cursor-pointer">
          {guardandoGeneral ? 'Guardando...' : '💾 Guardar Ficha'}
        </button>
      </div>
    </form>
  );
}