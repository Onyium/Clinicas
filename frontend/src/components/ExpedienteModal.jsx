import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ExpedienteModal({ isOpen, onClose, pacienteId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({
    alergias: '',
    antecedentes: '',
    contacto_emergencia: '',
    telefono_emergencia: '',
    notas_generales: ''
  });

  const cargarExpediente = async () => {
    if (!pacienteId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/pacientes/${pacienteId}`);
      setData(res.data);
      setForm({
        alergias: res.data.paciente.alergias || 'Ninguna',
        antecedentes: res.data.paciente.antecedentes || '',
        contacto_emergencia: res.data.paciente.contacto_emergencia || '',
        telefono_emergencia: res.data.paciente.telefono_emergencia || '',
        notas_generales: res.data.paciente.notas_generales || ''
      });
    } catch (err) {
      console.error('Error cargando expediente:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      cargarExpediente();
      setEditando(false);
    }
  }, [isOpen, pacienteId]);

  const handleGuardarDatosClinicos = async (e) => {
    e.preventDefault();
    try {
      await axios.post('${import.meta.env.VITE_API_URL}/api/pacientes', {
        nombre: data.paciente.nombre,
        telefono: data.paciente.telefono,
        ...form
      });
      setEditando(false);
      cargarExpediente();
      alert('Datos clínicos actualizados con éxito');
    } catch (err) {
      alert('Error al guardar datos clínicos');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Cabecera */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-lg font-bold">
              {data?.paciente?.nombre?.charAt(0) || 'P'}
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Expediente Clínico: {data?.paciente?.nombre || 'Cargando...'}
              </h2>
              <p className="text-xs text-slate-300">
                Tel: <span className="font-mono text-emerald-400">{data?.paciente?.telefono}</span> | 
                Expediente #{data?.paciente?.id?.toString().padStart(4, '0')}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg px-2 py-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20 text-slate-400 text-sm">
            Cargando expediente médico...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Alerta de Alergias & Datos Rápidos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-xl border ${
                data.paciente.alergias && data.paciente.alergias.toLowerCase() !== 'ninguna' 
                  ? 'bg-rose-50 border-rose-200 text-rose-800' 
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}>
                <span className="text-xs font-bold uppercase tracking-wider block">⚠️ Alergias Conocidas</span>
                <p className="text-sm font-semibold mt-1">
                  {data.paciente.alergias || 'Ninguna registrada'}
                </p>
              </div>

              <div className="p-4 rounded-xl border bg-slate-50 border-slate-200 col-span-2 flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Antecedentes Médicos</span>
                  <p className="text-xs text-slate-700 mt-1">
                    {data.paciente.antecedentes || 'Sin antecedentes patológicos registrados.'}
                  </p>
                </div>
                <button
                  onClick={() => setEditando(!editando)}
                  className="text-xs bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-3 py-1 rounded-lg font-medium shadow-sm transition"
                >
                  {editando ? 'Cancelar' : '✏️ Editar Ficha'}
                </button>
              </div>
            </div>

            {/* Formulario de Edición de Ficha */}
            {editando && (
              <form onSubmit={handleGuardarDatosClinicos} className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-blue-900 uppercase">Actualizar Antecedentes y Ficha</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Alergias (Separadas por comas)</label>
                    <input
                      type="text"
                      value={form.alergias}
                      onChange={(e) => setForm({...form, alergias: e.target.value})}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej. Penicilina, AINES, Mariscos"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Antecedentes Patológicos</label>
                    <input
                      type="text"
                      value={form.antecedentes}
                      onChange={(e) => setForm({...form, antecedentes: e.target.value})}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej. Hipertensión arterial, Diabetes Tipo 2"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                  >
                    Guardar Cambios Clínicos
                  </button>
                </div>
              </form>
            )}

            {/* Sección de Historiales en 2 Columnas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Columna Izquierda: Consultas / Citas */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  🗓️ Historial de Consultas ({data.consultas.length})
                </h3>

                {data.consultas.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No hay citas registradas.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {data.consultas.map((c) => (
                      <div key={c.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800">
                            {c.fecha_cita?.slice(0, 10)} - {c.hora_cita?.slice(0, 5)}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.estado === 'CONFIRMADA' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {c.estado}
                          </span>
                        </div>
                        <p className="text-slate-500">Dr(a): {c.doctor_nombre}</p>
                        {c.indicaciones && (
                          <p className="text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100 text-[11px]">
                            📝 {c.indicaciones}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Columna Derecha: Auditoría de Tratamientos WhatsApp */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  💊 Tratamientos & Adherencia WhatsApp ({data.tratamientos.length})
                </h3>

                {data.tratamientos.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Sin prescripciones registradas.</p>
                ) : (
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {data.tratamientos.map((t) => (
                      <div key={t.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs text-xs space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-slate-800">{t.medicamento}</span>
                            <p className="text-[11px] text-slate-500">{t.dosis_indicacion}</p>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                            {t.porcentaje_cumplimiento}% Apego
                          </span>
                        </div>

                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full" 
                            style={{ width: `${t.porcentaje_cumplimiento}%` }} 
                          />
                        </div>

                        <span className="text-[10px] text-slate-400 block">
                          Tomas confirmadas: {t.tomas_realizadas} de {t.dias_tratamiento} días
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        <div className="p-3 bg-slate-50 border-t flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
          >
            Cerrar Expediente
          </button>
        </div>

      </div>
    </div>
  );
}