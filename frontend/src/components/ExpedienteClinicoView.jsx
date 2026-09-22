import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ExpedienteClinicoView({ pacienteId, onVolver, onAgendarCita }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seccionActiva, setSeccionActiva] = useState('inicio'); // 'inicio' | 'general' | 'recetas'
  const [modoCrear, setModoCrear] = useState(false);
  const [modoEditar, setModoEditar] = useState(false);
  const [consultaSeleccionada, setConsultaSeleccionada] = useState(null);

  // Formulario para registrar o editar consultas
  const [formConsulta, setFormConsulta] = useState({
    doctor_nombre: 'Dra. Consulta',
    motivo_consulta: '',
    enfermedad_actual: '',
    antecedentes_patologicos: '',
    diagnostico: '',
    plan_tratamiento: ''
  });

  // Lista dinámica de medicamentos para la receta
  const [medicamentos, setMedicamentos] = useState([
    { medicamento: '', frecuencia: 'Cada 8 horas', dias_tratamiento: 5, indicacion: '' }
  ]);

  // Lista dinámica de estudios clínicos al crear consulta nueva
  const [estudiosNuevos, setEstudiosNuevos] = useState([
    { tipo_estudio: '', laboratorio: '', observaciones: '' }
  ]);

  // Estados para modal de estudio rápido en consulta existente
  const [mostrarModalEstudio, setMostrarModalEstudio] = useState(false);
  const [formEstudioRapido, setFormEstudioRapido] = useState({ tipo_estudio: '', laboratorio: '', observaciones: '' });

  // Datos Generales del paciente (Ficha)
  const [formGeneral, setFormGeneral] = useState({
    nombre: '',
    telefono: '',
    fecha_nacimiento: '',
    sexo: 'Otro',
    alergias: '',
    antecedentes: '',
    contacto_emergencia: '',
    telefono_emergencia: ''
  });

  const [guardando, setGuardando] = useState(false);
  const [guardandoGeneral, setGuardandoGeneral] = useState(false);

  const cargarExpediente = async () => {
    if (!pacienteId) return;
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:3001/api/pacientes/${pacienteId}`);
      setData(res.data);

      const p = res.data?.paciente;
      if (p) {
        setFormGeneral({
          nombre: p.nombre || '',
          telefono: p.telefono || '',
          fecha_nacimiento: p.fecha_nacimiento ? p.fecha_nacimiento.slice(0, 10) : '',
          sexo: p.sexo || 'Otro',
          alergias: p.alergias || '',
          antecedentes: p.antecedentes || '',
          contacto_emergencia: p.contacto_emergencia || '',
          telefono_emergencia: p.telefono_emergencia || ''
        });
      }

      const consultas = res.data?.consultas || [];
      if (consultas.length > 0) {
        // Si ya había una seleccionada y sigue existiendo, la mantenemos
        const actual = consultaSeleccionada 
          ? consultas.find(c => c.id === consultaSeleccionada.id) || consultas[0]
          : consultas[0];
        
        setConsultaSeleccionada(actual);
        setModoCrear(false);
        setModoEditar(false);
      } else {
        setModoCrear(true);
      }
    } catch (err) {
      console.error('Error cargando expediente:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarExpediente();
  }, [pacienteId]);

  // Control de medicamentos en la receta
  const agregarMedicamento = () => {
    setMedicamentos([
      ...medicamentos,
      { medicamento: '', frecuencia: 'Cada 8 horas', dias_tratamiento: 5, indicacion: '' }
    ]);
  };

  const eliminarMedicamento = (idx) => {
    setMedicamentos(medicamentos.filter((_, i) => i !== idx));
  };

  const actualizarMedicamento = (idx, campo, valor) => {
    const copia = [...medicamentos];
    copia[idx][campo] = valor;
    setMedicamentos(copia);
  };

  // Control de estudios clínicos dinámicos
  const agregarEstudioNuevo = () => {
    setEstudiosNuevos([...estudiosNuevos, { tipo_estudio: '', laboratorio: '', observaciones: '' }]);
  };

  const eliminarEstudioNuevo = (idx) => {
    setEstudiosNuevos(estudiosNuevos.filter((_, i) => i !== idx));
  };

  const actualizarEstudioNuevo = (idx, campo, valor) => {
    const copia = [...estudiosNuevos];
    copia[idx][campo] = valor;
    setEstudiosNuevos(copia);
  };

  // Guardar nueva atención o edición
  const handleGuardarConsulta = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const listaMedicamentosValidos = medicamentos.filter(
        (m) => m.medicamento && m.medicamento.trim() !== ''
      );
      const listaEstudiosValidos = estudiosNuevos.filter(
        (e) => e.tipo_estudio && e.tipo_estudio.trim() !== ''
      );

      if (modoEditar && consultaSeleccionada) {
        // Actualizar consulta existente
        await axios.put(`http://localhost:3001/api/consultas-independientes/${consultaSeleccionada.id}`, {
          ...formConsulta,
          medicamentos: listaMedicamentosValidos
        });
        alert('✅ Consulta y receta actualizadas correctamente.');
      } else {
        // Crear nueva consulta
        const res = await axios.post('http://localhost:3001/api/consultas-independientes', {
          paciente_id: pacienteId,
          ...formConsulta,
          medicamentos: listaMedicamentosValidos
        });

        const nuevaConsultaId = res.data.id;
        if (listaEstudiosValidos.length > 0 && nuevaConsultaId) {
          for (const est of listaEstudiosValidos) {
            await axios.post('http://localhost:3001/api/estudios-clinicos', {
              consulta_id: nuevaConsultaId,
              paciente_id: pacienteId,
              ...est
            });
          }
        }

        alert('✅ Consulta médica, receta y estudios guardados con éxito.');
      }

      setModoCrear(false);
      setModoEditar(false);
      setEstudiosNuevos([{ tipo_estudio: '', laboratorio: '', observaciones: '' }]);
      await cargarExpediente();
    } catch (err) {
      console.error(err);
      alert('Error al guardar la consulta médica');
    } finally {
      setGuardando(false);
    }
  };

  // Agregar estudio rápido a consulta existente
  const handleAgregarEstudioRapido = async (e) => {
    e.preventDefault();
    if (!consultaSeleccionada) return;
    try {
      await axios.post('http://localhost:3001/api/estudios-clinicos', {
        consulta_id: consultaSeleccionada.id,
        paciente_id: pacienteId,
        ...formEstudioRapido
      });
      alert('✅ Estudio clínico agregado con éxito.');
      setFormEstudioRapido({ tipo_estudio: '', laboratorio: '', observaciones: '' });
      setMostrarModalEstudio(false);
      await cargarExpediente();
    } catch (err) {
      console.error(err);
      alert('Error al agregar estudio clínico');
    }
  };

  // Eliminar estudio clínico
  const handleEliminarEstudio = async (estudioId) => {
    if (!window.confirm('¿Desea eliminar este estudio clínico?')) return;
    try {
      await axios.delete(`http://localhost:3001/api/estudios-clinicos/${estudioId}`);
      await cargarExpediente();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar estudio');
    }
  };

  // Eliminar consulta seleccionada
  const handleEliminarConsulta = async () => {
    if (!consultaSeleccionada) return;
    if (!window.confirm('¿Estás seguro de eliminar esta consulta, sus recetas y estudios asociados? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await axios.delete(`http://localhost:3001/api/consultas-independientes/${consultaSeleccionada.id}`);
      alert('🗑️ Consulta eliminada con éxito.');
      setConsultaSeleccionada(null);
      await cargarExpediente();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar la consulta');
    }
  };

  // Preparar formulario para editar la consulta actual
  const activarModoEdicion = () => {
    if (!consultaSeleccionada) return;
    setFormConsulta({
      doctor_nombre: consultaSeleccionada.doctor_nombre || 'Dra. Consulta',
      motivo_consulta: consultaSeleccionada.motivo_consulta || '',
      enfermedad_actual: consultaSeleccionada.enfermedad_actual || '',
      antecedentes_patologicos: consultaSeleccionada.antecedentes_patologicos || '',
      diagnostico: consultaSeleccionada.diagnostico || '',
      plan_tratamiento: consultaSeleccionada.plan_tratamiento || ''
    });

    const recs = tratamientos.filter(t => t.consulta_id === consultaSeleccionada.id);
    if (recs.length > 0) {
      setMedicamentos(recs.map(r => ({
        medicamento: r.medicamento || '',
        frecuencia: r.dosis_indicacion || 'Cada 8 horas',
        dias_tratamiento: r.dias_tratamiento || 5,
        indicacion: ''
      })));
    } else {
      setMedicamentos([{ medicamento: '', frecuencia: 'Cada 8 horas', dias_tratamiento: 5, indicacion: '' }]);
    }

    setModoEditar(true);
    setModoCrear(false);
  };

  // Guardar cambios en datos generales
  const handleGuardarGeneral = async (e) => {
    e.preventDefault();
    setGuardandoGeneral(true);
    try {
      await axios.post('http://localhost:3001/api/pacientes', {
        id: pacienteId,
        ...formGeneral
      });
      alert('✅ Ficha médica actualizada con éxito.');
      await cargarExpediente();
    } catch (err) {
      console.error(err);
      alert('Error al guardar datos generales');
    } finally {
      setGuardandoGeneral(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100 text-slate-500 text-sm font-medium">
        Cargando expediente clínico...
      </div>
    );
  }

  const paciente = data?.paciente || {};
  const consultas = data?.consultas || [];
  const tratamientos = data?.tratamientos || [];
  const estudios = data?.estudios || [];

  const recetasDeConsulta = consultaSeleccionada
    ? tratamientos.filter((t) => t.consulta_id === consultaSeleccionada.id)
    : [];

  const estudiosDeConsulta = consultaSeleccionada
    ? estudios.filter((e) => e.consulta_id === consultaSeleccionada.id)
    : [];

  return (
    <div className="h-screen flex flex-col bg-[#eef2f6] font-sans overflow-hidden">
      
      {/* 1. BARRA SUPERIOR INSTITUCIONAL */}
      <header className="bg-[#1b4e7b] text-white px-6 py-2.5 flex justify-between items-center shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="font-black tracking-wider text-base">CLINIC 365</span>
          <span className="text-[10px] bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded font-mono">
            EXPEDIENTE CLÍNICO
          </span>
        </div>

        <button
          onClick={onVolver}
          className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
        >
          ← Volver a la Agenda / Catálogo
        </button>
      </header>

      {/* 2. ÁREA DE 3 COLUMNAS */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ================= COLUMNA IZQUIERDA: PERFIL DEL PACIENTE ================= */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-4 flex flex-col items-center text-center border-b border-slate-100">
            <div className="w-16 h-16 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center text-2xl font-black text-blue-700 shadow-inner mb-2">
              {paciente.nombre?.charAt(0) || 'P'}
            </div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">
              {paciente.nombre}
            </h2>
            <span className="text-xs text-blue-600 font-mono font-bold mt-0.5">
              Folio: #{String(paciente.id).padStart(4, '0')}
            </span>
            <span className="text-xs text-slate-500 font-mono mt-0.5">
              📞 {paciente.telefono}
            </span>

            {/* Banner de Alergias */}
            {paciente.alergias && paciente.alergias.toLowerCase() !== 'ninguna' && (
              <div className="mt-3 w-full bg-rose-600 text-white text-[11px] font-bold py-1 px-2 rounded-lg shadow-xs uppercase tracking-wider">
                ⚠️ Alergia: {paciente.alergias}
              </div>
            )}
          </div>

          <nav className="p-2 space-y-1 text-xs font-semibold">
            <button
              onClick={() => {
                setSeccionActiva('inicio');
                setModoCrear(false);
                setModoEditar(false);
                if (consultas.length > 0 && !consultaSeleccionada) {
                  setConsultaSeleccionada(consultas[0]);
                }
              }}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition flex items-center gap-2.5 cursor-pointer ${
                seccionActiva === 'inicio' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              🩺 Consulta en Pantalla
            </button>
            <button
              onClick={() => setSeccionActiva('general')}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition flex items-center gap-2.5 cursor-pointer ${
                seccionActiva === 'general' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              📋 Datos Generales / Ficha
            </button>
            <button
              onClick={() => setSeccionActiva('recetas')}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition flex items-center gap-2.5 cursor-pointer ${
                seccionActiva === 'recetas' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              💊 Todas las Recetas ({tratamientos.length})
            </button>
          </nav>

          <div className="p-4 border-t border-slate-100 text-xs text-slate-500 space-y-1.5 mt-auto">
            <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block">
              Antecedentes Base
            </span>
            <p className="text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-slate-600">
              {paciente.antecedentes || 'Sin antecedentes patológicos registrados.'}
            </p>
          </div>
        </aside>

        {/* ================= COLUMNA CENTRAL: ÁREA DE ATENCIÓN Y RECETAS ================= */}
        <main className="flex-1 bg-white flex flex-col overflow-y-auto border-r border-slate-200">
          
          <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
              {seccionActiva === 'general'
                ? 'Ficha y Antecedentes del Paciente'
                : seccionActiva === 'recetas'
                ? 'Historial Farmacológico Completo'
                : modoCrear
                ? '📝 Registrar Nueva Consulta Médica'
                : modoEditar
                ? '✏️ Editando Consulta Médica'
                : '🔍 Historial Clínico de la Consulta'}
            </h3>

            {seccionActiva === 'inicio' && (modoCrear || modoEditar) && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setModoCrear(false);
                    setModoEditar(false);
                  }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarConsulta}
                  disabled={guardando}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-1.5 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {guardando ? 'Guardando...' : '💾 Guardar Cambios'}
                </button>
              </div>
            )}
          </div>

          <div className="p-6 flex-1">
            
            {/* VISTA 1: ATENCIÓN CLÍNICA (CREAR, EDITAR O VER) */}
            {seccionActiva === 'inicio' && (
              modoCrear || modoEditar ? (
                /* FORMULARIO DE CREACIÓN O EDICIÓN */
                <form onSubmit={handleGuardarConsulta} className="space-y-4 max-w-3xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Motivo de Consulta / Síntomas</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Cefalea intensa de 48 horas..."
                        value={formConsulta.motivo_consulta}
                        onChange={(e) => setFormConsulta({ ...formConsulta, motivo_consulta: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Médico que Atiende</label>
                      <input
                        type="text"
                        value={formConsulta.doctor_nombre}
                        onChange={(e) => setFormConsulta({ ...formConsulta, doctor_nombre: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Historia de la Enfermedad / Evolución</label>
                    <textarea
                      rows="3"
                      placeholder="Describa el cuadro actual, exploración física y evolución del paciente..."
                      value={formConsulta.enfermedad_actual}
                      onChange={(e) => setFormConsulta({ ...formConsulta, enfermedad_actual: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Diagnóstico Clínico</label>
                    <input
                      type="text"
                      placeholder="Ej. Migraña clásica con aura..."
                      value={formConsulta.diagnostico}
                      onChange={(e) => setFormConsulta({ ...formConsulta, diagnostico: e.target.value })}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-600"
                    />
                  </div>

                  {/* SECCIÓN DE RECETA MÉDICA DINÁMICA */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                          💊 Receta Médica & Recordatorios WhatsApp
                        </h4>
                        <p className="text-[11px] text-slate-500">Agregue los fármacos indicados para este tratamiento</p>
                      </div>
                      <button
                        type="button"
                        onClick={agregarMedicamento}
                        className="text-xs font-bold text-blue-600 bg-white border border-blue-200 px-3 py-1 rounded-lg hover:bg-blue-50 transition cursor-pointer"
                      >
                        + Agregar Fármaco
                      </button>
                    </div>

                    <div className="space-y-2">
                      {medicamentos.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 bg-white p-2.5 rounded-xl border border-slate-200 items-center">
                          <input
                            type="text"
                            placeholder="Medicamento (ej. Ibuprofeno 400mg)"
                            value={item.medicamento}
                            onChange={(e) => actualizarMedicamento(idx, 'medicamento', e.target.value)}
                            className="md:col-span-4 border rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            placeholder="Frecuencia (Cada 8 hrs)"
                            value={item.frecuencia}
                            onChange={(e) => actualizarMedicamento(idx, 'frecuencia', e.target.value)}
                            className="md:col-span-3 border rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <input
                            type="number"
                            placeholder="Días (5)"
                            value={item.dias_tratamiento}
                            onChange={(e) => actualizarMedicamento(idx, 'dias_tratamiento', e.target.value)}
                            className="md:col-span-2 border rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            placeholder="Indicación (con comida)"
                            value={item.indicacion}
                            onChange={(e) => actualizarMedicamento(idx, 'indicacion', e.target.value)}
                            className="md:col-span-2 border rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <div className="md:col-span-1 text-center">
                            {medicamentos.length > 1 && (
                              <button
                                type="button"
                                onClick={() => eliminarMedicamento(idx)}
                                className="text-rose-500 hover:text-rose-700 text-xs font-bold cursor-pointer"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ESTUDIOS CLÍNICOS / LABORATORIOS NUEVOS (SOLO AL CREAR) */}
                  {modoCrear && (
                    <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-blue-900 uppercase">🧪 Estudios Clínicos / Laboratorios Solicitados</h4>
                        <button type="button" onClick={agregarEstudioNuevo} className="text-xs font-bold text-blue-600 bg-white border border-blue-200 px-3 py-1 rounded-lg hover:bg-blue-50 cursor-pointer">+ Agregar Examen</button>
                      </div>
                      <div className="space-y-2">
                        {estudiosNuevos.map((est, idx) => (
                          <div key={idx} className="grid grid-cols-1 md:grid-cols-11 gap-2 bg-white p-2.5 rounded-xl border border-blue-100 items-center">
                            <input type="text" placeholder="Tipo de Estudio (Ej. Hemograma)" value={est.tipo_estudio} onChange={(e) => actualizarEstudioNuevo(idx, 'tipo_estudio', e.target.value)} className="md:col-span-4 border rounded-lg p-1.5 text-xs outline-none" />
                            <input type="text" placeholder="Laboratorio" value={est.laboratorio} onChange={(e) => actualizarEstudioNuevo(idx, 'laboratorio', e.target.value)} className="md:col-span-3 border rounded-lg p-1.5 text-xs outline-none" />
                            <input type="text" placeholder="Observaciones / Resultados" value={est.observaciones} onChange={(e) => actualizarEstudioNuevo(idx, 'observaciones', e.target.value)} className="md:col-span-3 border rounded-lg p-1.5 text-xs outline-none" />
                            <div className="md:col-span-1 text-center">
                              {estudiosNuevos.length > 1 && <button type="button" onClick={() => eliminarEstudioNuevo(idx)} className="text-rose-500 font-bold">✕</button>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Indicaciones Generales / Recomendaciones de cuidado
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Reposo por 48 horas, hidratación y evitar lácteos..."
                      value={formConsulta.plan_tratamiento}
                      onChange={(e) => setFormConsulta({ ...formConsulta, plan_tratamiento: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </form>
              ) : (
                /* VISTA DE SOLO LECTURA + BOTONES DE EDITAR Y ELIMINAR */
                consultaSeleccionada ? (
                  <div className="space-y-4 max-w-3xl">
                    
                    {/* Botones de Editar y Eliminar Consulta */}
                    <div className="flex justify-end gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <button
                        onClick={activarModoEdicion}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer"
                      >
                        ✏️ Editar Consulta
                      </button>
                      <button
                        onClick={handleEliminarConsulta}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer"
                      >
                        🗑️ Eliminar Consulta
                      </button>
                    </div>

                    <div className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-white shadow-2xs">
                      <div className="border-b pb-3 flex justify-between items-center">
                        <div>
                          <span className="text-[11px] text-blue-600 font-bold block uppercase">Atención Registrada</span>
                          <h4 className="text-base font-bold text-slate-800">
                            {consultaSeleccionada.fecha_formateada || String(consultaSeleccionada.fecha || '').slice(0, 16)}
                          </h4>
                          <span className="text-xs text-slate-500 font-medium">
                            Médico: {consultaSeleccionada.doctor_nombre}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Motivo de Consulta</span>
                        <p className="text-xs text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          {consultaSeleccionada.motivo_consulta || 'Sin registrar.'}
                        </p>
                      </div>

                      {consultaSeleccionada.enfermedad_actual && (
                        <div>
                          <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Evolución / Cuadro Clínico</span>
                          <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            {consultaSeleccionada.enfermedad_actual}
                          </p>
                        </div>
                      )}

                      <div>
                        <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Diagnóstico</span>
                        <p className="text-xs font-bold text-blue-900 bg-blue-50/70 p-2.5 rounded-xl border border-blue-100">
                          {consultaSeleccionada.diagnostico || 'Sin diagnóstico registrado.'}
                        </p>
                      </div>

                      {consultaSeleccionada.plan_tratamiento && (
                        <div>
                          <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Plan de Tratamiento / Indicaciones</span>
                          <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            {consultaSeleccionada.plan_tratamiento}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* MEDICAMENTOS DE ESTA CONSULTA */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">
                        Medicamentos Recetados en esta Atención ({recetasDeConsulta.length})
                      </h4>
                      {recetasDeConsulta.length === 0 ? (
                        <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border">
                          No se emitieron medicamentos en esta atención.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {recetasDeConsulta.map((t) => (
                            <div key={t.id} className="p-3 bg-white border border-slate-200 rounded-xl flex justify-between items-center text-xs shadow-2xs">
                              <div>
                                <span className="font-bold text-slate-800">{t.medicamento}</span>
                                <span className="text-slate-500 block text-[11px]">{t.dosis_indicacion}</span>
                              </div>
                              <span className="font-mono text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                {t.dias_tratamiento} días
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ESTUDIOS CLÍNICOS DE ESTA CONSULTA */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xs font-bold text-blue-900 uppercase">
                          🧪 Estudios Clínicos / Laboratorios ({estudiosDeConsulta.length})
                        </h4>
                        <button
                          onClick={() => setMostrarModalEstudio(true)}
                          className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg hover:bg-blue-100 cursor-pointer"
                        >
                          + Agregar Examen
                        </button>
                      </div>
                      {estudiosDeConsulta.length === 0 ? (
                        <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border">
                          No hay estudios clínicos registrados para esta fecha.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {estudiosDeConsulta.map((est) => (
                            <div key={est.id} className="p-3 bg-blue-50/40 border border-blue-200 rounded-xl flex justify-between items-center text-xs">
                              <div>
                                <span className="font-bold text-blue-900">{est.tipo_estudio}</span>
                                <span className="text-slate-600 block text-[11px]">Lab: {est.laboratorio || 'No especificado'} | Obs: {est.observaciones || 'Ninguna'}</span>
                              </div>
                              <button
                                onClick={() => handleEliminarEstudio(est.id)}
                                className="text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                              >
                                🗑️
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-400 text-xs">
                    Selecciona una atención del historial o crea una nueva.
                  </div>
                )
              )
            )}

            {/* VISTA 2: DATOS GENERALES */}
            {seccionActiva === 'general' && (
              <form onSubmit={handleGuardarGeneral} className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Completo</label>
                    <input
                      type="text"
                      value={formGeneral.nombre}
                      onChange={(e) => setFormGeneral({ ...formGeneral, nombre: e.target.value })}
                      className="w-full border border-slate-300 rounded-xl p-2 text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Teléfono WhatsApp</label>
                    <input
                      type="text"
                      value={formGeneral.telefono}
                      onChange={(e) => setFormGeneral({ ...formGeneral, telefono: e.target.value })}
                      className="w-full border border-slate-300 rounded-xl p-2 text-xs outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Fecha de Nacimiento</label>
                    <input
                      type="date"
                      value={formGeneral.fecha_nacimiento}
                      onChange={(e) => setFormGeneral({ ...formGeneral, fecha_nacimiento: e.target.value })}
                      className="w-full border border-slate-300 rounded-xl p-2 text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Género</label>
                    <select
                      value={formGeneral.sexo}
                      onChange={(e) => setFormGeneral({ ...formGeneral, sexo: e.target.value })}
                      className="w-full border border-slate-300 rounded-xl p-2 text-xs bg-white outline-none focus:border-blue-500"
                    >
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Alergias Conocidas</label>
                  <input
                    type="text"
                    value={formGeneral.alergias}
                    onChange={(e) => setFormGeneral({ ...formGeneral, alergias: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2 text-xs outline-none focus:border-blue-500"
                    placeholder="Ej. Penicilina, AINES, Ninguna"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Antecedentes Generales</label>
                  <textarea
                    rows="3"
                    value={formGeneral.antecedentes}
                    onChange={(e) => setFormGeneral({ ...formGeneral, antecedentes: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2 text-xs outline-none focus:border-blue-500"
                    placeholder="Ej. Diabetes tipo 2 controlada, hipertensión..."
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={guardandoGeneral}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2 rounded-xl shadow transition disabled:opacity-50 cursor-pointer"
                  >
                    {guardandoGeneral ? 'Guardando...' : '💾 Guardar Ficha'}
                  </button>
                </div>
              </form>
            )}

            {/* VISTA 3: TODAS LAS RECETAS */}
            {seccionActiva === 'recetas' && (
              <div className="space-y-3">
                {tratamientos.length === 0 ? (
                  <p className="text-xs text-slate-400">No hay recetas registradas en este expediente.</p>
                ) : (
                  tratamientos.map((t) => (
                    <div key={t.id} className="p-4 border border-slate-200 rounded-2xl space-y-2 bg-white shadow-2xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800 text-sm">{t.medicamento}</span>
                        <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg">
                          {t.porcentaje_cumplimiento || 0}% Apego WhatsApp
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{t.dosis_indicacion}</p>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full" style={{ width: `${t.porcentaje_cumplimiento || 0}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        </main>

        {/* ================= COLUMNA DERECHA: ACCIONES Y ATENCIONES ANTERIORES ================= */}
        <aside className="w-72 bg-slate-50 flex flex-col shrink-0 overflow-y-auto p-4 space-y-4 border-l border-slate-200">
          
          <div className="space-y-2">
            <button
              onClick={() => {
                setModoCrear(true);
                setModoEditar(false);
                setSeccionActiva('inicio');
                setFormConsulta({
                  doctor_nombre: 'Dra. Consulta',
                  motivo_consulta: '',
                  enfermedad_actual: '',
                  antecedentes_patologicos: '',
                  diagnostico: '',
                  plan_tratamiento: ''
                });
                setMedicamentos([{ medicamento: '', frecuencia: 'Cada 8 horas', dias_tratamiento: 5, indicacion: '' }]);
              }}
              className="w-full bg-[#10a37f] hover:bg-emerald-700 text-white font-bold text-xs p-2.5 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              ➕ Nueva Atención / Consulta
            </button>

            <button
              onClick={() => onAgendarCita(paciente)}
              className="w-full bg-white border border-slate-300 hover:bg-blue-50 text-slate-700 font-bold text-xs p-2.5 rounded-xl shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              📅 Agendar Cita Futura
            </button>
          </div>

          <div className="flex-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Historial de Atenciones ({consultas.length})
            </span>

            {consultas.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No hay atenciones pasadas.</p>
            ) : (
              <div className="space-y-2">
                {consultas.map((c) => {
                  const activa = !modoCrear && !modoEditar && consultaSeleccionada?.id === c.id;
                  const fechaStr = c.fecha_formateada ? c.fecha_formateada.slice(0, 10) : (c.fecha ? String(c.fecha).slice(0, 10) : 'Fecha');
                  const horaStr = c.fecha_formateada ? c.fecha_formateada.slice(11, 16) : (c.fecha ? String(c.fecha).slice(11, 16) : '');

                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setConsultaSeleccionada(c);
                        setModoCrear(false);
                        setModoEditar(false);
                        setSeccionActiva('inicio');
                      }}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition cursor-pointer flex flex-col gap-1 ${
                        activa
                          ? 'bg-[#1b4e7b] border-[#1b4e7b] text-white font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className={`text-xs font-bold ${activa ? 'text-white' : 'text-slate-800'}`}>
                          📅 {fechaStr}
                        </span>
                        <span className={`text-[10px] font-mono ${activa ? 'text-blue-200' : 'text-slate-400'}`}>
                          {horaStr} hrs
                        </span>
                      </div>

                      <span className={`block text-[11px] truncate mt-0.5 ${activa ? 'text-blue-100' : 'text-slate-500'}`}>
                        {c.doctor_nombre}
                      </span>

                      {c.diagnostico && (
                        <span className={`block text-[10px] truncate italic ${activa ? 'text-blue-100' : 'text-blue-600'}`}>
                          Dx: {c.diagnostico}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

      </div>

      {/* MODAL PARA AGREGAR ESTUDIO RÁPIDO A CONSULTA EXISTENTE */}
      {mostrarModalEstudio && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-800">Agregar Estudio Clínico / Laboratorio</h3>
            <form onSubmit={handleAgregarEstudioRapido} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tipo de Estudio</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Perfil Lipídico, Hemograma..."
                  value={formEstudioRapido.tipo_estudio}
                  onChange={(e) => setFormEstudioRapido({ ...formEstudioRapido, tipo_estudio: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Laboratorio</label>
                <input
                  type="text"
                  placeholder="Ej. Lab. Clínico La Paz"
                  value={formEstudioRapido.laboratorio}
                  onChange={(e) => setFormEstudioRapido({ ...formEstudioRapido, laboratorio: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Observaciones / Resultados</label>
                <textarea
                  rows="2"
                  placeholder="Detalles del estudio..."
                  value={formEstudioRapido.observaciones}
                  onChange={(e) => setFormEstudioRapido({ ...formEstudioRapido, observaciones: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalEstudio(false)}
                  className="px-3 py-1.5 border rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 cursor-pointer"
                >
                  Guardar Estudio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}