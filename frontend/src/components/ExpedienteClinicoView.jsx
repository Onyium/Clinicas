import React, { useState, useEffect } from 'react';
import api from '../api';
import RecetaTab from './RecetaTab';
import LaboratorioTab from './LaboratorioTab';

function calcularEdadDesdeFecha(fechaNacimiento) {
  if (!fechaNacimiento) return '';
  const hoy = new Date();
  const fechaNac = new Date(fechaNacimiento);
  if (isNaN(fechaNac.getTime())) return '';

  let edad = hoy.getFullYear() - fechaNac.getFullYear();
  const mes = hoy.getMonth() - fechaNac.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
    edad--;
  }
  return edad >= 0 ? edad : '';
}

function estimarFechaDesdeEdad(edad) {
  if (edad === '' || isNaN(edad) || Number(edad) < 0) return '';
  const hoy = new Date();
  const añoEstimado = hoy.getFullYear() - Number(edad);
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${añoEstimado}-${mes}-${dia}`;
}

export default function ExpedienteClinicoView({ pacienteId, onVolver, onAgendarCita }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seccionActiva, setSeccionActiva] = useState('inicio'); 
  const [subTab, setSubTab] = useState('historia'); 
  
  const [modoCrear, setModoCrear] = useState(false);
  const [modoEditar, setModoEditar] = useState(false);
  const [consultaSeleccionada, setConsultaSeleccionada] = useState(null);

  const [formConsulta, setFormConsulta] = useState({
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

  const [medicamentos, setMedicamentos] = useState([{ medicamento: '', frecuencia: 'Cada 8 horas', dias_tratamiento: 5, indicacion: '' }]);
  const [estudiosNuevos, setEstudiosNuevos] = useState([{ tipo_estudio: '', laboratorio: '', observaciones: '' }]);
  const [mostrarModalEstudio, setMostrarModalEstudio] = useState(false);
  const [formEstudioRapido, setFormEstudioRapido] = useState({ tipo_estudio: '', laboratorio: '', observaciones: '' });

  const [formGeneral, setFormGeneral] = useState({
    nombre: '', telefono: '', fecha_nacimiento: '', edad: '', sexo: 'Otro', alergias: '',
    antecedentes: '', contacto_emergencia: '', telefono_emergencia: '', foto_url: '',
    responsable_nombre: '', responsable_parentesco: 'Madre', responsable_telefono: ''
  });

  const [guardando, setGuardando] = useState(false);
  const [guardandoGeneral, setGuardandoGeneral] = useState(false);

  const cargarExpediente = async () => {
    if (!pacienteId) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/pacientes/${pacienteId}`);
      setData(res.data);
      const p = res.data?.paciente;
      if (p) {
        const fechaNac = p.fecha_nacimiento ? p.fecha_nacimiento.slice(0, 10) : '';
        const edadCalc = p.edad !== undefined && p.edad !== null && p.edad !== '' ? p.edad : calcularEdadDesdeFecha(fechaNac);
        
        setFormGeneral({
          nombre: p.nombre || '', 
          telefono: p.telefono || '', 
          fecha_nacimiento: fechaNac,
          edad: edadCalc,
          sexo: p.sexo || 'Otro', 
          alergias: p.alergias || '', 
          antecedentes: p.antecedentes || '',
          contacto_emergencia: p.contacto_emergencia || '', 
          telefono_emergencia: p.telefono_emergencia || '', 
          foto_url: p.foto_url || '',
          responsable_nombre: p.responsable_nombre || '',
          responsable_parentesco: p.responsable_parentesco || 'Madre',
          responsable_telefono: p.responsable_telefono || ''
        });
      }
      const consultas = res.data?.consultas || [];
      if (consultas.length > 0) {
        const actual = consultaSeleccionada ? consultas.find(c => c.id === consultaSeleccionada.id) || consultas[0] : consultas[0];
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

  useEffect(() => { cargarExpediente(); }, [pacienteId]);

  const handleCambioFechaNac = (e) => {
    const nuevaFecha = e.target.value;
    const nuevaEdad = calcularEdadDesdeFecha(nuevaFecha);
    setFormGeneral(prev => ({
      ...prev,
      fecha_nacimiento: nuevaFecha,
      edad: nuevaEdad
    }));
  };

  const handleCambioEdad = (e) => {
    const nuevaEdad = e.target.value;
    const fechaAprox = estimarFechaDesdeEdad(nuevaEdad);
    setFormGeneral(prev => ({
      ...prev,
      edad: nuevaEdad,
      fecha_nacimiento: fechaAprox || prev.fecha_nacimiento
    }));
  };

  const agregarMedicamento = () => setMedicamentos([...medicamentos, { medicamento: '', frecuencia: 'Cada 8 horas', dias_tratamiento: 5, indicacion: '' }]);
  const eliminarMedicamento = (idx) => setMedicamentos(medicamentos.filter((_, i) => i !== idx));
  const actualizarMedicamento = (idx, campo, valor) => { const copia = [...medicamentos]; copia[idx][campo] = valor; setMedicamentos(copia); };

  const agregarEstudioNuevo = () => setEstudiosNuevos([...estudiosNuevos, { tipo_estudio: '', laboratorio: '', observaciones: '' }]);
  const eliminarEstudioNuevo = (idx) => setEstudiosNuevos(estudiosNuevos.filter((_, i) => i !== idx));
  const actualizarEstudioNuevo = (idx, campo, valor) => { const copia = [...estudiosNuevos]; copia[idx][campo] = valor; setEstudiosNuevos(copia); };

  const handleGuardarConsulta = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const listaMedicamentosValidos = medicamentos.filter(m => m.medicamento && m.medicamento.trim() !== '');
      const listaEstudiosValidos = estudiosNuevos.filter(e => e.tipo_estudio && e.tipo_estudio.trim() !== '');

      if (modoEditar && consultaSeleccionada) {
        await api.put(`/api/consultas-independientes/${consultaSeleccionada.id}`, { 
          ...formConsulta, 
          medicamentos: listaMedicamentosValidos 
        });

        if (listaEstudiosValidos.length > 0) {
          for (const est of listaEstudiosValidos) {
            await api.post('/api/estudios-clinicos', { 
              consulta_id: consultaSeleccionada.id, 
              paciente_id: pacienteId, 
              ...est 
            });
          }
        }
        alert('✅ Consulta, signos vitales, receta y estudios actualizados con éxito.');
      } else {
        const res = await api.post('/api/consultas-independientes', { 
          paciente_id: pacienteId, 
          ...formConsulta, 
          medicamentos: listaMedicamentosValidos 
        });
        const nuevaConsultaId = res.data.id;
        if (listaEstudiosValidos.length > 0 && nuevaConsultaId) {
          for (const est of listaEstudiosValidos) {
            await api.post('/api/estudios-clinicos', { 
              consulta_id: nuevaConsultaId, 
              paciente_id: pacienteId, 
              ...est 
            });
          }
        }
        alert('✅ Consulta guardada con éxito.');
      }

      setModoCrear(false);
      setModoEditar(false);
      setSubTab('historia'); 
      await cargarExpediente();
    } catch (err) {
      console.error(err);
      alert('Error al guardar la consulta');
    } finally {
      setGuardando(false);
    }
  };

  const handleAgregarEstudioRapido = async (e) => {
    e.preventDefault();
    if (!consultaSeleccionada) return;
    try {
      await api.post(`/api/estudios-clinicos`, { consulta_id: consultaSeleccionada.id, paciente_id: pacienteId, ...formEstudioRapido });
      alert('✅ Estudio clínico agregado con éxito.');
      setFormEstudioRapido({ tipo_estudio: '', laboratorio: '', observaciones: '' });
      setMostrarModalEstudio(false);
      await cargarExpediente();
    } catch (err) { alert('Error al agregar estudio clínico'); }
  };

  const handleEliminarEstudio = async (estudioId) => {
    if (!window.confirm('¿Desea eliminar este estudio clínico?')) return;
    try { await api.delete(`/api/estudios-clinicos/${estudioId}`); await cargarExpediente(); } catch (err) { alert('Error al eliminar estudio'); }
  };

  const handleEliminarConsulta = async () => {
    if (!consultaSeleccionada) return;
    if (!window.confirm('¿Estás seguro de eliminar esta consulta, sus recetas y estudios asociados? Esta acción no se puede deshacer.')) return;
    try {
      await api.delete(`/api/consultas-independientes/${consultaSeleccionada.id}`);
      alert('🗑️ Consulta eliminada con éxito.');
      setConsultaSeleccionada(null);
      await cargarExpediente();
    } catch (err) { alert('Error al eliminar la consulta'); }
  };

  const handleEliminarExpediente = async () => {
    if (!window.confirm('⚠️ ¿Estás COMPLETAMENTE SEGURO de eliminar este expediente? Se borrarán todas sus consultas, recetas, estudios y citas asociadas.')) return;
    try { await api.delete(`/api/pacientes/${pacienteId}`); alert('🗑️ Expediente eliminado.'); onVolver(); } catch (err) { alert('Error al eliminar el expediente.'); }
  };

  const activarModoEdicion = () => {
    if (!consultaSeleccionada) return;
    setFormConsulta({
      doctor_nombre: consultaSeleccionada.doctor_nombre || 'Dra. Liseyda Maye', 
      motivo_consulta: consultaSeleccionada.motivo_consulta || '',
      enfermedad_actual: consultaSeleccionada.enfermedad_actual || '', 
      antecedentes_patologicos: consultaSeleccionada.antecedentes_patologicos || '', 
      examen_fisico: consultaSeleccionada.examen_fisico || '',
      reporte_examenes: consultaSeleccionada.reporte_examenes || '',
      diagnostico: consultaSeleccionada.diagnostico || '', 
      plan_tratamiento: consultaSeleccionada.plan_tratamiento || '',
      peso: consultaSeleccionada.peso || '',
      talla: consultaSeleccionada.talla || '',
      temperatura: consultaSeleccionada.temperatura || '',
      presion_arterial: consultaSeleccionada.presion_arterial || ''
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

    const ests = estudios.filter(e => e.consulta_id === consultaSeleccionada.id);
    if (ests.length > 0) {
      setEstudiosNuevos(ests.map(e => ({
        tipo_estudio: e.tipo_estudio || '',
        laboratorio: e.laboratorio || '',
        observaciones: e.observaciones || ''
      })));
    } else {
      setEstudiosNuevos([{ tipo_estudio: '', laboratorio: '', observaciones: '' }]);
    }

    setModoEditar(true);
    setModoCrear(false);
  };

  const handleGuardarGeneral = async (e) => {
    e.preventDefault();
    setGuardandoGeneral(true);
    try { 
      await api.post('/api/pacientes', { id: pacienteId, ...formGeneral }); 
      alert('✅ Ficha médica actualizada con éxito.'); 
      await cargarExpediente(); 
    } catch (err) { 
      alert('Error al guardar datos generales'); 
    } finally { 
      setGuardandoGeneral(false); 
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-100 text-slate-500 text-sm">Cargando expediente...</div>;

  const paciente = data?.paciente || {};
  const consultas = data?.consultas || [];
  const tratamientos = data?.tratamientos || [];
  const estudios = data?.estudios || [];
  const recetasDeConsulta = consultaSeleccionada ? tratamientos.filter((t) => t.consulta_id === consultaSeleccionada.id) : [];
  const estudiosDeConsulta = consultaSeleccionada ? estudios.filter((e) => e.consulta_id === consultaSeleccionada.id) : [];

  const edadActual = formGeneral.edad !== '' ? formGeneral.edad : calcularEdadDesdeFecha(paciente.fecha_nacimiento);
  const esMenorDeEdad = Number(edadActual) < 18 && edadActual !== '';

  return (
    <div className="h-screen flex flex-col bg-[#eef2f6] font-sans overflow-hidden">
      
      {/* HEADER */}
      <header className="bg-[#1b4e7b] text-white px-6 py-2.5 flex justify-between items-center shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="font-black tracking-wider text-base">CLINIC 365</span>
          <span className="text-[10px] bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded font-mono">EXPEDIENTE CLÍNICO</span>
        </div>
        <button onClick={onVolver} className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer">
          ← Volver al Catálogo
        </button>
      </header>

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* COLUMNA IZQUIERDA */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-4 flex flex-col items-center text-center border-b border-slate-100">
            {paciente.foto_url ? (
              <img src={paciente.foto_url} alt={paciente.nombre} className="w-16 h-16 rounded-full object-cover border-2 border-blue-200 shadow-inner mb-2" />
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

            <span className="text-xs text-blue-600 font-mono font-bold mt-2">Folio: #{String(paciente.id).padStart(4, '0')}</span>
            <span className="text-xs text-slate-500 font-mono mt-0.5">📞 {paciente.telefono}</span>
            {paciente.alergias && paciente.alergias.toLowerCase() !== 'ninguna' && (
              <div className="mt-3 w-full bg-rose-600 text-white text-[11px] font-bold py-1 px-2 rounded-lg shadow-xs uppercase tracking-wider">
                ⚠️ Alergia: {paciente.alergias}
              </div>
            )}
          </div>

          <nav className="p-2 space-y-1 text-xs font-semibold">
            <button onClick={() => { setSeccionActiva('inicio'); setModoCrear(false); setModoEditar(false); }} className={`w-full text-left px-3 py-2.5 rounded-xl transition ${seccionActiva === 'inicio' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
              🩺 Historial de Consultas
            </button>
            <button onClick={() => setSeccionActiva('general')} className={`w-full text-left px-3 py-2.5 rounded-xl transition ${seccionActiva === 'general' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
              📋 Datos Generales / Ficha
            </button>
          </nav>
        </aside>

        {/* COLUMNA CENTRAL */}
        <main className="flex-1 bg-white flex flex-col overflow-y-auto border-r border-slate-200 relative">
          
          <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
              {seccionActiva === 'general' ? 'Ficha y Antecedentes' : modoCrear ? '📝 Nueva Consulta' : modoEditar ? '✏️ Editando Consulta' : '🔍 Detalle de Consulta'}
            </h3>
            {seccionActiva === 'inicio' && (modoCrear || modoEditar) && (
              <div className="flex gap-2">
                <button onClick={() => { setModoCrear(false); setModoEditar(false); }} className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer">Cancelar</button>
                <button onClick={handleGuardarConsulta} disabled={guardando} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-1.5 rounded-xl shadow-xs transition cursor-pointer">
                  {guardando ? 'Guardando...' : '💾 Guardar Todo'}
                </button>
              </div>
            )}
          </div>

          {/* SUB-PESTAÑAS */}
          {seccionActiva === 'inicio' && (modoCrear || modoEditar || consultaSeleccionada) && (
            <div className="bg-slate-100/50 border-b border-slate-200 px-6 py-2 flex gap-2 shrink-0">
              <button onClick={() => setSubTab('historia')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${subTab === 'historia' ? 'bg-white border border-slate-200 text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}`}>📝 Historia Clínica</button>
              <button onClick={() => setSubTab('receta')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${subTab === 'receta' ? 'bg-white border border-slate-200 text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}`}>💊 Prescripción / Receta</button>
              <button onClick={() => setSubTab('laboratorio')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${subTab === 'laboratorio' ? 'bg-white border border-slate-200 text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}`}>🧪 Exámenes / Laboratorio</button>
            </div>
          )}

          <div className="p-6 flex-1">
            {seccionActiva === 'inicio' && (
              modoCrear || modoEditar ? (
                <form id="form-consulta" onSubmit={handleGuardarConsulta} className="max-w-3xl">
                  {subTab === 'historia' && (
                    <div className="space-y-6">
                      
                      {/* SIGNOS VITALES */}
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-2">
                          🩺 Signos Vitales de la Consulta
                        </span>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Peso (kg / lb)</label>
                            <input 
                              type="text" 
                              placeholder="ej. 68 kg" 
                              value={formConsulta.peso} 
                              onChange={(e) => setFormConsulta({...formConsulta, peso: e.target.value})} 
                              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-500" 
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Talla / Estatura</label>
                            <input 
                              type="text" 
                              placeholder="ej. 1.65 m" 
                              value={formConsulta.talla} 
                              onChange={(e) => setFormConsulta({...formConsulta, talla: e.target.value})} 
                              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-500" 
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Temperatura (°C)</label>
                            <input 
                              type="text" 
                              placeholder="ej. 36.5 °C" 
                              value={formConsulta.temperatura} 
                              onChange={(e) => setFormConsulta({...formConsulta, temperatura: e.target.value})} 
                              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-rose-600" 
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Presión Arterial</label>
                            <input 
                              type="text" 
                              placeholder="ej. 120/80 mmHg" 
                              value={formConsulta.presion_arterial} 
                              onChange={(e) => setFormConsulta({...formConsulta, presion_arterial: e.target.value})} 
                              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-500" 
                            />
                          </div>
                        </div>
                      </div>

                      {/* BLOQUE 1: HISTORIA CLÍNICA */}
                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase border-b border-slate-200 pb-2 mb-3">Historia Clínica</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Motivo de consulta</label>
                            <textarea rows="2" placeholder="Describa el motivo de consulta..." value={formConsulta.motivo_consulta} onChange={(e) => setFormConsulta({ ...formConsulta, motivo_consulta: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Presente enfermedad</label>
                            <textarea rows="3" placeholder="Presente enfermedad..." value={formConsulta.enfermedad_actual} onChange={(e) => setFormConsulta({ ...formConsulta, enfermedad_actual: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Otros antecedentes</label>
                            <textarea rows="2" placeholder="Otros antecedentes..." value={formConsulta.antecedentes_patologicos} onChange={(e) => setFormConsulta({ ...formConsulta, antecedentes_patologicos: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                        </div>
                      </div>

                      {/* BLOQUE 2: EXAMEN Y DIAGNÓSTICO (CON REPORTE DE EXÁMENES) */}
                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase border-b border-slate-200 pb-2 mb-3">Examen y Diagnóstico</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Examen físico</label>
                            <textarea rows="3" placeholder="Examen físico..." value={formConsulta.examen_fisico} onChange={(e) => setFormConsulta({ ...formConsulta, examen_fisico: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Reporte de exámenes</label>
                            <textarea rows="2" placeholder="Reporte de exámenes previos o de laboratorio..." value={formConsulta.reporte_examenes} onChange={(e) => setFormConsulta({ ...formConsulta, reporte_examenes: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Impresión diagnóstica</label>
                            <input type="text" placeholder="Impresión diagnóstica..." value={formConsulta.diagnostico} onChange={(e) => setFormConsulta({ ...formConsulta, diagnostico: e.target.value })} className="w-full bg-white border-2 border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-600" />
                          </div>
                        </div>
                      </div>

                      {/* BLOQUE 3: PLAN */}
                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase border-b border-slate-200 pb-2 mb-3">Plan</h4>
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">Plan de manejo</label>
                          <textarea rows="3" placeholder="Plan de manejo..." value={formConsulta.plan_tratamiento} onChange={(e) => setFormConsulta({ ...formConsulta, plan_tratamiento: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>

                    </div>
                  )}

                  {subTab === 'receta' && (
                    <RecetaTab 
                      modoCrear={modoCrear} 
                      modoEditar={modoEditar} 
                      paciente={{ ...paciente, ...formGeneral }} 
                      consultaSeleccionada={consultaSeleccionada || { ...formConsulta, fecha: new Date().toISOString() }} 
                      medicamentos={medicamentos} 
                      agregarMedicamento={agregarMedicamento} 
                      actualizarMedicamento={actualizarMedicamento} 
                      eliminarMedicamento={eliminarMedicamento} 
                      recetasDeConsulta={recetasDeConsulta} 
                    />
                  )}

                  {subTab === 'laboratorio' && (
                    <LaboratorioTab 
                      modoCrear={modoCrear} 
                      modoEditar={modoEditar} 
                      paciente={paciente} 
                      consultaSeleccionada={consultaSeleccionada || { ...formConsulta, fecha: new Date().toISOString() }} 
                      estudiosNuevos={estudiosNuevos} 
                      agregarEstudioNuevo={agregarEstudioNuevo} 
                      actualizarEstudioNuevo={actualizarEstudioNuevo} 
                      eliminarEstudioNuevo={eliminarEstudioNuevo} 
                      estudiosDeConsulta={estudiosDeConsulta} 
                      setMostrarModalEstudio={setMostrarModalEstudio} 
                      handleEliminarEstudio={handleEliminarEstudio}
                      onRecargar={cargarExpediente}
                    />
                  )}
                </form>
              ) : (
                consultaSeleccionada ? (
                  <div className="space-y-4">
                    {/* BOTONES DE EDICIÓN Y ELIMINACIÓN */}
                    <div className="flex flex-wrap justify-end gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <button 
                        type="button"
                        onClick={activarModoEdicion} 
                        className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        ✏️ Editar Consulta
                      </button>
                      <button 
                        type="button"
                        onClick={handleEliminarConsulta} 
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        🗑️ Eliminar Consulta
                      </button>
                    </div>

                    {subTab === 'historia' && (
                      <div className="border border-slate-200 rounded-2xl p-5 space-y-6 bg-white shadow-2xs">
                        <div className="border-b pb-3 flex justify-between items-center">
                          <div>
                            <span className="text-[11px] text-blue-600 font-bold block uppercase">Atención Registrada</span>
                            <h4 className="text-base font-bold text-slate-800">{consultaSeleccionada.fecha_formateada || String(consultaSeleccionada.fecha || '').slice(0, 16)}</h4>
                            <span className="text-xs text-slate-500 font-medium">Médico: {consultaSeleccionada.doctor_nombre}</span>
                          </div>
                        </div>

                        {/* SIGNOS VITALES */}
                        <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex flex-wrap gap-4 text-xs text-slate-700">
                          <div><span className="font-bold text-blue-900">Peso:</span> {consultaSeleccionada.peso || '---'}</div>
                          <div><span className="font-bold text-blue-900">Talla:</span> {consultaSeleccionada.talla || '---'}</div>
                          <div><span className="font-bold text-rose-600">🌡️ Temp:</span> {consultaSeleccionada.temperatura || '---'}</div>
                          <div><span className="font-bold text-blue-900">P.A.:</span> {consultaSeleccionada.presion_arterial || '---'}</div>
                        </div>

                        {/* HISTORIA CLÍNICA */}
                        <div>
                          <h4 className="text-xs font-black text-slate-800 uppercase border-b border-slate-100 pb-1 mb-2">Historia Clínica</h4>
                          <div className="space-y-3">
                            <div>
                              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Motivo de consulta</span>
                              <p className="text-xs text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100">{consultaSeleccionada.motivo_consulta || 'N/D'}</p>
                            </div>
                            <div>
                              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Presente enfermedad</span>
                              <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">{consultaSeleccionada.enfermedad_actual || 'N/D'}</p>
                            </div>
                            <div>
                              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Otros antecedentes</span>
                              <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">{consultaSeleccionada.antecedentes_patologicos || 'N/D'}</p>
                            </div>
                          </div>
                        </div>

                        {/* EXAMEN Y DIAGNÓSTICO (INCLUYE REPORTE DE EXÁMENES) */}
                        <div>
                          <h4 className="text-xs font-black text-slate-800 uppercase border-b border-slate-100 pb-1 mb-2">Examen y Diagnóstico</h4>
                          <div className="space-y-3">
                            <div>
                              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Examen físico</span>
                              <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">{consultaSeleccionada.examen_fisico || 'N/D'}</p>
                            </div>
                            <div>
                              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Reporte de exámenes</span>
                              <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">{consultaSeleccionada.reporte_examenes || 'N/D'}</p>
                            </div>
                            <div>
                              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Impresión diagnóstica</span>
                              <p className="text-xs font-bold text-blue-900 bg-blue-50/70 p-2.5 rounded-xl border border-blue-100">{consultaSeleccionada.diagnostico || 'N/D'}</p>
                            </div>
                          </div>
                        </div>

                        {/* PLAN */}
                        <div>
                          <h4 className="text-xs font-black text-slate-800 uppercase border-b border-slate-100 pb-1 mb-2">Plan</h4>
                          <div>
                            <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Plan de manejo</span>
                            <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">{consultaSeleccionada.plan_tratamiento || 'N/D'}</p>
                          </div>
                        </div>

                      </div>
                    )}

                    {subTab === 'receta' && (
                      <RecetaTab 
                        modoCrear={false} 
                        modoEditar={false} 
                        paciente={{ ...paciente, ...formGeneral }} 
                        consultaSeleccionada={consultaSeleccionada} 
                        recetasDeConsulta={recetasDeConsulta} 
                      />
                    )}

                    {subTab === 'laboratorio' && (
                      <LaboratorioTab 
                        modoCrear={false} 
                        modoEditar={false} 
                        paciente={paciente} 
                        consultaSeleccionada={consultaSeleccionada} 
                        estudiosDeConsulta={estudiosDeConsulta} 
                        setMostrarModalEstudio={setMostrarModalEstudio} 
                        handleEliminarEstudio={handleEliminarEstudio} 
                        onRecargar={cargarExpediente}
                      />
                    )}
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-400 text-xs">Selecciona una atención del historial o crea una nueva.</div>
                )
              )
            )}

            {/* SECCIÓN GENERAL: FICHA, EDAD Y TUTOR */}
            {seccionActiva === 'general' && (
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
            )}

          </div>
        </main>

        {/* COLUMNA DERECHA: HISTORIAL */}
        <aside className="w-72 bg-slate-50 flex flex-col shrink-0 overflow-y-auto p-4 space-y-4 border-l border-slate-200">
          <button onClick={() => { setModoCrear(true); setModoEditar(false); setSeccionActiva('inicio'); setSubTab('historia'); setFormConsulta({ doctor_nombre: 'Dra. Liseyda Maye', motivo_consulta: '', enfermedad_actual: '', antecedentes_patologicos: '', examen_fisico: '', reporte_examenes: '', diagnostico: '', plan_tratamiento: '', peso: '', talla: '', temperatura: '', presion_arterial: '' }); setMedicamentos([{ medicamento: '', frecuencia: 'Cada 8 horas', dias_tratamiento: 5, indicacion: '' }]); setEstudiosNuevos([{ tipo_estudio: '', laboratorio: '', observaciones: '' }]); }} className="w-full bg-[#10a37f] hover:bg-emerald-700 text-white font-bold text-xs p-2.5 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer">
            ➕ Nueva Consulta
          </button>
          
          <div className="flex-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Historial ({consultas.length})</span>
            {consultas.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No hay atenciones pasadas.</p>
            ) : (
              <div className="space-y-2">
                {consultas.map((c) => {
                  const activa = !modoCrear && !modoEditar && consultaSeleccionada?.id === c.id;
                  const fechaStr = c.fecha_formateada ? c.fecha_formateada.slice(0, 10) : (c.fecha ? String(c.fecha).slice(0, 10) : 'Fecha');
                  return (
                    <button key={c.id} onClick={() => { setConsultaSeleccionada(c); setModoCrear(false); setModoEditar(false); setSeccionActiva('inicio'); setSubTab('historia'); }} className={`w-full text-left p-3 rounded-xl border text-xs transition cursor-pointer flex flex-col gap-1 ${activa ? 'bg-[#1b4e7b] border-[#1b4e7b] text-white font-bold shadow-xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
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

      </div>
    </div>
  );
}