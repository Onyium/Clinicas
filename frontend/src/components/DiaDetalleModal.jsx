import React from 'react';

const STATUS_BADGES = {
  RESERVADA: 'bg-amber-100 text-amber-800 border-amber-300',
  CONFIRMADA: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  REAGENDAR: 'bg-rose-100 text-rose-800 border-rose-300',
  CANCELADA: 'bg-slate-100 text-slate-700 border-slate-300'
};

export default function DiaDetalleModal({ 
  isOpen, 
  onClose, 
  fecha, 
  citasDelDia, 
  onNuevaCitaEnFecha, 
  onSeleccionarCita,
  onAbrirReceta
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center pb-3 border-b">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Agenda del día: {fecha}
            </h2>
            <p className="text-xs text-slate-500">
              Total: {citasDelDia.length} {citasDelDia.length === 1 ? 'paciente agendado' : 'pacientes agendados'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-2">
          {citasDelDia.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No hay citas programadas para este día.
            </div>
          ) : (
            citasDelDia.map(c => (
              <div 
                key={c.id} 
                className="p-3 bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-xl flex items-center justify-between gap-3 transition"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {c.hora_cita.slice(0, 5)} - {c.hora_fin.slice(0, 5)}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_BADGES[c.estado] || 'bg-gray-100'}`}>
                      {c.estado}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">{c.paciente_nombre}</h4>
                  <p className="text-xs text-slate-500">
                    👨‍⚕️ {c.doctor_nombre} {c.indicaciones ? `| 📌 ${c.indicaciones}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onAbrirReceta(c);
                    }}
                    className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold border border-emerald-200"
                    title="Emitir Receta"
                  >
                    💊
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSeleccionarCita(c);
                    }}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700"
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t flex justify-between items-center">
          <button
            type="button"
            onClick={() => {
              onClose();
              onNuevaCitaEnFecha(fecha);
            }}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
          >
            + Agendar en este día
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 border rounded-lg text-xs text-slate-600 hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}