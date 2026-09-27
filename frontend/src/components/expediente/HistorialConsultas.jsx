// src/components/expediente/HistorialConsultas.jsx
import React from 'react';



export default function HistorialConsultas({
  consultas,
  consultaSeleccionada,
  modoCrear,
  modoEditar,
  seccionActiva, // 👈 AQUÍ FALTABA RECIBIRLO
  setConsultaSeleccionada,
  setModoCrear,
  setModoEditar,
  setSeccionActiva,
  setSubTab,
  setFormConsulta,
  setMedicamentos,
  setEstudiosNuevos
}) {
  
  const iniciarNuevaConsulta = () => {
    setModoCrear(true); 
    setModoEditar(false); 
    setSeccionActiva('inicio'); 
    setSubTab('historia'); 
    setFormConsulta({ 
      doctor_nombre: 'Dra. Liseyda Maye', 
      motivo_consulta: '', 
      enfermedad_actual: '', 
      antecedentes_patologicos: '', 
      examen_fisico: '', 
      reporte_examenes: '', 
      diagnostico: '', 
      plan_tratamiento: '', 
      peso: '', 
      talla: '', 
      temperatura: '', 
      presion_arterial: '' 
    }); 
    setMedicamentos([{ medicamento: '', frecuencia: 'Cada 8 horas', dias_tratamiento: 5, indicacion: '' }]); 
    setEstudiosNuevos([{ tipo_estudio: '', laboratorio: '', observaciones: '' }]);
  };

  const seleccionarConsulta = (c) => {
    setConsultaSeleccionada(c); 
    setModoCrear(false); 
    setModoEditar(false); 
    setSeccionActiva('inicio'); 
    setSubTab('historia');
  };

  return (
    <aside className="w-72 bg-slate-50 flex flex-col shrink-0 overflow-y-auto p-4 space-y-4 border-l border-slate-200">
      <div className="space-y-2">
        <button onClick={iniciarNuevaConsulta} className="w-full bg-[#10a37f] hover:bg-emerald-700 text-white font-bold text-xs p-2.5 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer">
          ➕ Nueva Consulta
        </button>
      </div>
      
      <div className="flex-1">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Historial ({consultas.length})</span>
        {consultas.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No hay atenciones pasadas.</p>
        ) : (
          <div className="space-y-2">
            {consultas.map((c) => {
              const activa = seccionActiva === 'inicio' && !modoCrear && !modoEditar && consultaSeleccionada?.id === c.id;
              const fechaStr = c.fecha_formateada ? c.fecha_formateada.slice(0, 10) : (c.fecha ? String(c.fecha).slice(0, 10) : 'Fecha');
              return (
                <button key={c.id} onClick={() => seleccionarConsulta(c)} className={`w-full text-left p-3 rounded-xl border text-xs transition cursor-pointer flex flex-col gap-1 ${activa ? 'bg-[#1b4e7b] border-[#1b4e7b] text-white font-bold shadow-xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                  <span className={`text-xs font-bold ${activa ? 'text-white' : 'text-slate-800'}`}>📅 {fechaStr}</span>
                  <span className={`block text-[11px] truncate mt-0.5 ${activa ? 'text-blue-100' : 'text-slate-500'}`}>{c.doctor_nombre}</span>
                  {c.diagnostico && (<span className={`block text-[10px] truncate italic ${activa ? 'text-blue-100' : 'text-blue-600'}`}>Dx: {c.diagnostico}</span>)}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}