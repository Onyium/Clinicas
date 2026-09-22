import React, { useState, useEffect } from 'react';
import axios from 'axios';
import api from '../api';
const FRECUENCIAS = [
  'Cada 8 horas',
  'Cada 12 horas',
  'Cada 24 horas (1 vez al día)',
  'Antes de dormir',
  'En caso de dolor'
];

const DURACIONES = [
  { label: '3 días', dias: 3 },
  { label: '5 días', dias: 5 },
  { label: '7 días (1 semana)', dias: 7 },
  { label: '10 días', dias: 10 },
  { label: '14 días (2 semanas)', dias: 14 },
  { label: '30 días (1 mes)', dias: 30 }
];

export default function RecetaModal({ isOpen, onClose, cita }) {
  const [tab, setTab] = useState('emitir'); // 'emitir' | 'historial'
  const [historialTratamiento, setHistorialTratamiento] = useState([]);
  const [medicamentos, setMedicamentos] = useState([
    { medicamento: '', frecuencia: 'Cada 8 horas', dias_tratamiento: 5, indicacion: '' }
  ]);
  const [enviando, setEnviando] = useState(false);

  const cargarSeguimiento = () => {
    if (cita?.id) {
      axios.get(`/api/recetas/seguimiento/${cita.id}`)
        .then(res => setHistorialTratamiento(res.data || []))
        .catch((err) => console.error('Error cargando auditoría:', err));
    }
  };

  useEffect(() => {
    if (isOpen) {
      cargarSeguimiento();
    }
  }, [isOpen, cita, tab]);

  if (!isOpen || !cita) return null;

  const agregarFila = () => {
    setMedicamentos([
      ...medicamentos,
      { medicamento: '', frecuencia: 'Cada 8 horas', dias_tratamiento: 5, indicacion: '' }
    ]);
  };

  const eliminarFila = (index) => {
    if (medicamentos.length === 1) return;
    setMedicamentos(medicamentos.filter((_, i) => i !== index));
  };

  const actualizarFila = (index, campo, valor) => {
    const nuevos = [...medicamentos];
    nuevos[index][campo] = valor;
    setMedicamentos(nuevos);
  };

  const handleGuardarYEnviar = async (e) => {
    e.preventDefault();
    setEnviando(true);

    try {
      await axios.post('/api/recetas/multiple', {
        cita_id: cita.id,
        paciente_nombre: cita.paciente_nombre,
        paciente_telefono: cita.paciente_telefono,
        doctor_nombre: cita.doctor_nombre,
        medicamentos
      });

      alert('¡Receta guardada y enviada al WhatsApp del paciente!');
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error guardando la receta');
    } finally {
      setEnviando(false);
    }
  };

  const handleProbarRecordatorioManual = async () => {
    if (!cita?.id) return;
    try {
      await axios.post(`/api/test/enviar-recordatorio-cita/${cita.id}`);
      alert(`🧪 Recordatorio de ${cita.paciente_nombre} enviado. Responde "1" en WhatsApp y dale a 🔄.`);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al enviar recordatorio de esta cita');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] flex flex-col">
        
        {/* Cabecera con selector de pestañas */}
        <div className="flex justify-between items-center pb-3 border-b">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              💊 Tratamiento Médico
            </h2>
            <p className="text-xs text-slate-500">
              Paciente: <span className="font-semibold text-slate-700">{cita.paciente_nombre}</span>
            </p>
          </div>
          
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setTab('emitir')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${tab === 'emitir' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-800'}`}
            >
              Emitir Receta
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('historial');
                cargarSeguimiento();
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${tab === 'historial' ? 'bg-white shadow text-emerald-600' : 'text-slate-600 hover:text-slate-800'}`}
            >
              Auditoría ({historialTratamiento.length})
            </button>
            
            {tab === 'historial' && (
              <button
                type="button"
                onClick={cargarSeguimiento}
                className="px-2 py-1 text-xs font-bold text-slate-600 hover:text-emerald-600 transition"
                title="Actualizar datos"
              >
                🔄
              </button>
            )}

            <button 
              type="button"
              onClick={onClose} 
              className="text-slate-400 hover:text-slate-600 text-sm px-1.5"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Pestaña 1: Emitir Receta */}
        {tab === 'emitir' ? (
          <form onSubmit={handleGuardarYEnviar} className="flex-1 overflow-y-auto py-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              {medicamentos.map((item, index) => (
                <div key={index} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-600">Medicamento #{index + 1}</span>
                    {medicamentos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => eliminarFila(index)}
                        className="text-xs text-rose-500 hover:text-rose-700 font-semibold"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="md:col-span-1">
                      <input
                        type="text"
                        required
                        placeholder="Ej. Amoxicilina 500mg"
                        value={item.medicamento}
                        onChange={(e) => actualizarFila(index, 'medicamento', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <select
                        value={item.frecuencia}
                        onChange={(e) => actualizarFila(index, 'frecuencia', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {FRECUENCIAS.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <select
                        value={item.dias_tratamiento}
                        onChange={(e) => actualizarFila(index, 'dias_tratamiento', Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {DURACIONES.map((d) => (
                          <option key={d.dias} value={d.dias}>{d.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Instrucción adicional (Ej. Tomar después del desayuno con abundante agua)"
                      value={item.indicacion}
                      onChange={(e) => actualizarFila(index, 'indicacion', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={agregarFila}
                className="w-full py-2 border-2 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 rounded-xl text-xs font-semibold transition"
              >
                + Agregar otro medicamento
              </button>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs border rounded-lg text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando}
                className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition disabled:opacity-50"
              >
                {enviando ? 'Guardando...' : 'Guardar y Enviar al Paciente'}
              </button>
            </div>
          </form>
        ) : (
          /* Pestaña 2: Auditoría de Adherencia */
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {historialTratamiento.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No hay recetas registradas para esta cita.
              </div>
            ) : (
              historialTratamiento.map((r) => (
                <div key={r.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{r.medicamento}</h4>
                      <p className="text-xs text-slate-500">
                        {r.dosis_indicacion} | Duración: {r.dias_tratamiento} días
                      </p>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-200">
                      {r.porcentaje_cumplimiento}% Apego
                    </span>
                  </div>

                  {/* Barra de progreso */}
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${r.porcentaje_cumplimiento}%` }}
                    />
                  </div>

                  {/* Días confirmados */}
                  <div className="pt-1">
                    <span className="text-[11px] font-semibold text-slate-600 block mb-1.5">
                      Dosis confirmadas por WhatsApp ({r.tomas_realizadas} de {r.dias_tratamiento}):
                    </span>
                    {r.historial?.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">Aún no hay confirmaciones registradas.</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {r.historial.map((t, idx) => (
                          <span key={idx} className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700">
                            🗓️ {t.fecha} ({t.hora_confirmacion?.slice(0, 5)})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            <div className="pt-3 border-t flex justify-between items-center mt-auto">
              <button
                type="button"
                onClick={handleProbarRecordatorioManual}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 rounded-lg text-xs font-bold transition flex items-center gap-1"
              >
                🧪 Probar Envío WhatsApp Ya
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs border rounded-lg text-slate-600 hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}