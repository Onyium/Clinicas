// src/components/expediente/SidebarPaciente.jsx
import React from 'react';

export default function SidebarPaciente({ 
  paciente, 
  edadActual, 
  esMenorDeEdad, 
  seccionActiva, 
  setSeccionActiva, 
  setModoCrear, 
  setModoEditar,
  citasCount,
  onEliminarExpediente // 👈 Recibimos la función de eliminar
}) {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto justify-between">
      <div>
        {/* Cabecera y Foto del Paciente */}
        <div className="p-4 flex flex-col items-center text-center border-b border-slate-100">
          {paciente.foto_url ? (
            <img 
              src={paciente.foto_url} 
              alt={paciente.nombre} 
              className="w-16 h-16 rounded-full object-cover border-2 border-blue-200 shadow-inner mb-2" 
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center text-2xl font-black text-blue-700 shadow-inner mb-2">
              {paciente.nombre?.charAt(0) || 'P'}
            </div>
          )}
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">{paciente.nombre}</h2>
          
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap justify-center">
            <span className="text-[11px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md border border-emerald-200">
              🎂 {edadActual !== '' ? `${edadActual} años` : 'Edad sin definir'}
            </span>
            <span className="text-[11px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-md border border-blue-100">
              {paciente.sexo === 'M' ? 'Masculino' : paciente.sexo === 'F' ? 'Femenino' : 'Otro'}
            </span>
          </div>

          {esMenorDeEdad && (
            <div className="mt-2 w-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold p-1.5 rounded-lg text-left">
              👶 <strong>Menor de edad</strong>
              {paciente.responsable_nombre ? (
                <span className="block font-normal truncate">Resp: {paciente.responsable_nombre}</span>
              ) : (
                <span className="block font-normal text-rose-600">Requiere tutor registrado</span>
              )}
            </div>
          )}

          <span className="text-xs text-blue-600 font-mono font-bold mt-2">Folio: #{String(paciente.id || 0).padStart(4, '0')}</span>
          <span className="text-xs text-slate-500 font-mono mt-0.5">📞 {paciente.telefono || 'Sin teléfono'}</span>
          
          {paciente.alergias && paciente.alergias.toLowerCase() !== 'ninguna' && (
            <div className="mt-3 w-full bg-rose-600 text-white text-[11px] font-bold py-1 px-2 rounded-lg shadow-xs uppercase tracking-wider">
              ⚠️ Alergia: {paciente.alergias}
            </div>
          )}
        </div>

        {/* Menú de Navegación del Expediente */}
        <nav className="p-2 space-y-1 text-xs font-semibold">
          <button 
            type="button"
            onClick={() => { setSeccionActiva('inicio'); setModoCrear(false); setModoEditar(false); }} 
            className={`w-full text-left px-3 py-2.5 rounded-xl transition cursor-pointer ${seccionActiva === 'inicio' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            🩺 Historial de Consultas
          </button>
          <button 
            type="button"
            onClick={() => setSeccionActiva('citas')} 
            className={`w-full text-left px-3 py-2.5 rounded-xl transition cursor-pointer ${seccionActiva === 'citas' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            📅 Citas Agendadas ({citasCount})
          </button>
          <button 
            type="button"
            onClick={() => setSeccionActiva('general')} 
            className={`w-full text-left px-3 py-2.5 rounded-xl transition cursor-pointer ${seccionActiva === 'general' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            📋 Datos Generales / Ficha
          </button>
        </nav>
      </div>

      {/* Pie de la barra lateral: Antecedentes base y Botón Eliminar Expediente */}
      <div className="p-4 border-t border-slate-100 text-xs text-slate-500 space-y-2 mt-auto">
        <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block">Antecedentes Base</span>
        <p className="text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-slate-600 max-h-20 overflow-y-auto">
          {paciente.antecedentes || 'Sin antecedentes registrados.'}
        </p>
        
        <div className="pt-2">
          <button 
            type="button"
            onClick={onEliminarExpediente} 
            className="w-full bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 text-xs font-bold py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
          >
            🗑️ Eliminar Expediente
          </button>
        </div>
      </div>
    </aside>
  );
}