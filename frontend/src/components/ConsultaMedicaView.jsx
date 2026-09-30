import React, { useState, useEffect } from 'react';
import api from '../api';

export default function ConsultaMedicaView({ cita, onVolver }) {
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [form, setForm] = useState({
    motivo_consulta: '',
    enfermedad_actual: '',
    antecedentes_patologicos: '',
    diagnostico: '',
    plan_tratamiento: ''
  });

  const [medicamentos, setMedicamentos] = useState([
    { medicamento: '', frecuencia: 'Cada 8 horas', dias_tratamiento: 5, indicacion: '' }
  ]);

  useEffect(() => {
    if (!cita?.id) return;
    setLoading(true);

    // Cargar datos previos de la cita y medicamentos usando la instancia 'api'
    Promise.all([
      api.get(`/api/citas`),
      api.get(`/api/recetas/seguimiento/${cita.id}`).catch(() => ({ data: [] }))
    ]).then(([resCitas, resRecetas]) => {
      const actual = resCitas.data.find(c => c.id === cita.id);
      if (actual) {
        setForm({
          motivo_consulta: actual.motivo_consulta || actual.indicaciones || '',
          enfermedad_actual: actual.enfermedad_actual || '',
          antecedentes_patologicos: actual.antecedentes_patologicos || '',
          diagnostico: actual.diagnostico || '',
          plan_tratamiento: actual.plan_tratamiento || ''
        });
      }

      if (resRecetas.data && resRecetas.data.length > 0) {
        setMedicamentos(resRecetas.data.map(r => ({
          medicamento: r.medicamento,
          frecuencia: r.dosis_indicacion?.split(' - ')[0] || 'Cada 8 horas',
          dias_tratamiento: r.dias_tratamiento,
          indicacion: r.dosis_indicacion?.split(' - ')[1] || ''
        })));
      }
    }).finally(() => setLoading(false));
  }, [cita]);

  const agregarMedicamento = () => {
    setMedicamentos([...medicamentos, { medicamento: '', frecuencia: 'Cada 8 horas', dias_tratamiento: 5, indicacion: '' }]);
  };

  const eliminarMedicamento = (idx) => {
    setMedicamentos(medicamentos.filter((_, i) => i !== idx));
  };

  const actualizarMed = (idx, campo, valor) => {
    const copia = [...medicamentos];
    copia[idx][campo] = valor;
    setMedicamentos(copia);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await api.put(`/api/consultas/${cita.id}`, {
        ...form,
        medicamentos: medicamentos.filter(m => m.medicamento.trim() !== '')
      });
      toast.success('✅ Consulta clínica y receta guardadas correctamente.');
    } catch (err) {
      toast.error('Error al guardar la consulta');
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-slate-500">Cargando expediente de la consulta...</div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-5xl mx-auto space-y-6">
      
      {/* Barra superior */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold tracking-wider text-blue-600 uppercase">Expediente Clínico / Consulta Médica</span>
          <h1 className="text-xl font-black text-slate-800">{cita.paciente_nombre}</h1>
          <p className="text-xs text-slate-500">Tel: {cita.paciente_telefono} | Dr(a): {cita.doctor_nombre}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onVolver}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            ← Volver a Agenda
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={guardando}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {guardando ? 'Guardando...' : '💾 Guardar Consulta'}
          </button>
        </div>
      </div>

      <form onSubmit={handleGuardar} className="space-y-6">
        
        {/* Bloque 1: Motivo y Enfermedad Actual */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
              1. Motivo de Consulta
            </label>
            <input
              type="text"
              placeholder="Ej. Fiebre persistente de 3 días y dolor de garganta"
              value={form.motivo_consulta}
              onChange={(e) => setForm({ ...form, motivo_consulta: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
              2. Antecedentes Personales / Patologías Previas
            </label>
            <input
              type="text"
              placeholder="Ej. Hipertensión controlada, alérgica a sulfas"
              value={form.antecedentes_patologicos}
              onChange={(e) => setForm({ ...form, antecedentes_patologicos: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Bloque 2: Historia de la Enfermedad Actual */}
        <div>
          <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
            3. Historia de la Enfermedad Actual
          </label>
          <textarea
            rows="3"
            placeholder="Detalle evolución de los síntomas, intensidad, medicamentos auto-administrados, etc."
            value={form.enfermedad_actual}
            onChange={(e) => setForm({ ...form, enfermedad_actual: e.target.value })}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Bloque 3: Diagnóstico */}
        <div>
          <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
            4. Diagnóstico Clínico
          </label>
          <input
            type="text"
            placeholder="Ej. Faringoamigdalitis bacteriana aguda"
            value={form.diagnostico}
            onChange={(e) => setForm({ ...form, diagnostico: e.target.value })}
            className="w-full bg-white border-2 border-slate-300 rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
          />
        </div>

        {/* Bloque 4: Plan de Tratamiento y Prescripción Médica */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                💊 5. Tratamiento y Receta Médica
              </h3>
              <p className="text-[11px] text-slate-500">Se enlaza directo al seguimiento de WhatsApp</p>
            </div>
            <button
              type="button"
              onClick={agregarMedicamento}
              className="text-xs font-bold text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              + Agregar Medicamento
            </button>
          </div>

          <div className="space-y-3">
            {medicamentos.map((item, index) => (
              <div key={index} className="p-3 bg-white border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <div className="md:col-span-4">
                  <input
                    type="text"
                    placeholder="Medicamento (ej. Azitromicina 500mg)"
                    value={item.medicamento}
                    onChange={(e) => actualizarMed(index, 'medicamento', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-3">
                  <input
                    type="text"
                    placeholder="Frecuencia (ej. Cada 12 horas)"
                    value={item.frecuencia}
                    onChange={(e) => actualizarMed(index, 'frecuencia', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <input
                    type="number"
                    placeholder="Días (ej. 5)"
                    value={item.dias_tratamiento}
                    onChange={(e) => actualizarMed(index, 'dias_tratamiento', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <input
                    type="text"
                    placeholder="Indicación (con comida)"
                    value={item.indicacion}
                    onChange={(e) => actualizarMed(index, 'indicacion', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-1 text-center">
                  {medicamentos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => eliminarMedicamento(index)}
                      className="text-rose-500 hover:text-rose-700 text-xs font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Indicaciones Generales / Recomendaciones no farmacológicas
            </label>
            <input
              type="text"
              placeholder="Ej. Reposo por 48 horas, hidratación abundante y evitar alimentos irritantes."
              value={form.plan_tratamiento}
              onChange={(e) => setForm({ ...form, plan_tratamiento: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

      </form>
    </div>
  );
}