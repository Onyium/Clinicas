import React, { useState, useEffect } from 'react';
import api from '../api';
import RecetaTab from './RecetaTab';
import LaboratorioTab from './LaboratorioTab';

export default function ExpedienteClinicoView({ pacienteId, onVolver, onAgendarCita }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seccionActiva, setSeccionActiva] = useState('inicio'); 
  
  const [subTab, setSubTab] = useState('historia'); 
  
  const [modoCrear, setModoCrear] = useState(false);
  const [modoEditar, setModoEditar] = useState(false);
  const [consultaSeleccionada, setConsultaSeleccionada] = useState(null);

  // ESTADO ACTUALIZADO CON TODOS LOS CAMPOS DE LA IMAGEN
  const [formConsulta, setFormConsulta] = useState({
    doctor_nombre: 'Dra. Consulta', 
    motivo_consulta: '', 
    enfermedad_actual: '', 
    antecedentes_patologicos: '', 
    examen_fisico: '',
    reporte_examenes: '',
    diagnostico: '', 
    plan_tratamiento: ''
  });

  const [medicamentos, setMedicamentos] = useState([{ medicamento: '', frecuencia: 'Cada 8 horas', dias_tratamiento: 5, indicacion: '' }]);
  const [estudiosNuevos, setEstudiosNuevos] = useState([{ tipo_estudio: '', laboratorio: '', observaciones: '' }]);
  const [mostrarModalEstudio, setMostrarModalEstudio] = useState(false);
  const [formEstudioRapido, setFormEstudioRapido] = useState({ tipo_estudio: '', laboratorio: '', observaciones: '' });

  const [formGeneral, setFormGeneral] = useState({
    nombre: '', telefono: '', fecha_nacimiento: '', sexo: 'Otro', alergias: '',
    antecedentes: '', contacto_emergencia: '', telefono_emergencia: '', foto_url: ''
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
        setFormGeneral({
          nombre: p.nombre || '', telefono: p.telefono || '', 
          fecha_nacimiento: p.fecha_nacimiento ? p.fecha_nacimiento.slice(0, 10) : '',
          sexo: p.sexo || 'Otro', alergias: p.alergias || '', antecedentes: p.antecedentes || '',
          contacto_emergencia: p.contacto_emergencia || '', telefono_emergencia: p.telefono_emergencia || '', 
          foto_url: p.foto_url || ''
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
        await api.put(`/api/consultas-independientes/${consultaSeleccionada.id}`, { ...formConsulta, medicamentos: listaMedicamentosValidos });
        alert('✅ Consulta y receta actualizadas correctamente.');
      } else {
        const res = await api.post('/api/consultas-independientes', { paciente_id: pacienteId, ...formConsulta, medicamentos: listaMedicamentosValidos });
        const nuevaConsultaId = res.data.id;
        if (listaEstudiosValidos.length > 0 && nuevaConsultaId) {
          for (const est of listaEstudiosValidos) {
            await api.post(`/api/estudios-clinicos`, { consulta_id: nuevaConsultaId, paciente_id: pacienteId, ...est });
          }
        }
        alert('✅ Consulta médica, receta y estudios guardados con éxito.');
      }

      setModoCrear(false);
      setModoEditar(false);
      setSubTab('historia'); 
      setEstudiosNuevos([{ tipo_estudio: '', laboratorio: '', observaciones: '' }]);
      await cargarExpediente();
    } catch (err) {
      console.error(err);
      alert('Error al guardar la consulta médica');
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
      doctor_nombre: consultaSeleccionada.doctor_nombre || 'Dra. Consulta', 
      motivo_consulta: consultaSeleccionada.motivo_consulta || '',
      enfermedad_actual: consultaSeleccionada.enfermedad_actual || '', 
      antecedentes_patologicos: consultaSeleccionada.antecedentes_patologicos || '',
      examen_fisico: consultaSeleccionada.examen_fisico || '',
      reporte_examenes: consultaSeleccionada.reporte_examenes || '',
      diagnostico: consultaSeleccionada.diagnostico || '', 
      plan_tratamiento: consultaSeleccionada.plan_tratamiento || ''
    });
    const recs = tratamientos.filter(t => t.consulta_id === consultaSeleccionada.id);
    if (recs.length > 0) {
      setMedicamentos(recs.map(r => ({ medicamento: r.medicamento || '', frecuencia: r.dosis_indicacion || 'Cada 8 horas', dias_tratamiento: r.dias_tratamiento || 5, indicacion: '' })));
    } else { setMedicamentos([{ medicamento: '', frecuencia: 'Cada 8 horas', dias_tratamiento: 5, indicacion: '' }]); }
    setModoEditar(true);
    setModoCrear(false);
    setSubTab('historia');
  };

  const handleGuardarGeneral = async (e) => {
    e.preventDefault();
    setGuardandoGeneral(true);
    try { await api.post('/api/pacientes', { id: pacienteId, ...formGeneral }); alert('✅ Ficha médica actualizada con éxito.'); await cargarExpediente(); } catch (err) { alert('Error al guardar datos generales'); } finally { setGuardandoGeneral(false); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-100 text-slate-500 text-sm">Cargando expediente clínico...</div>;

  const paciente = data?.paciente || {};
  const consultas = data?.consultas || [];
  const tratamientos = data?.tratamientos || [];
  const estudios = data?.estudios || [];
  const recetasDeConsulta = consultaSeleccionada ? tratamientos.filter((t) => t.consulta_id === consultaSeleccionada.id) : [];
  const estudiosDeConsulta = consultaSeleccionada ? estudios.filter((e) => e.consulta_id === consultaSeleccionada.id) : [];

  return (
    <div className="h-screen flex flex-col bg-[#eef2f6] font-sans overflow-hidden">
      
      {/* 1. HEADER */}
      <header className="bg-[#1b4e7b] text-white px-6 py-2.5 flex justify-between items-center shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="font-black tracking-wider text-base">CLINIC 365</span>
          <span className="text-[10px] bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded font-mono">EXPEDIENTE CLÍNICO</span>
        </div>
        <button onClick={onVolver} className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer">← Volver al Catálogo</button>
      </header>

      {/* 2. ÁREA DE 3 COLUMNAS */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* COLUMNA IZQUIERDA */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-4 flex flex-col items-center text-center border-b border-slate-100">
            {paciente.foto_url ? (
              <img src={paciente.foto_url} alt={paciente.nombre} className="w-16 h-16 rounded-full object-cover border-2 border-blue-200 shadow-inner mb-2" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center text-2xl font-black text-blue-700 shadow-inner mb-2">{paciente.nombre?.charAt(0) || 'P'}</div>
            )}
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">{paciente.nombre}</h2>
            <span className="text-xs text-blue-600 font-mono font-bold mt-0.5">Folio: #{String(paciente.id).padStart(4, '0')}</span>
            <span className="text-xs text-slate-500 font-mono mt-0.5">📞 {paciente.telefono}</span>
            {paciente.alergias && paciente.alergias.toLowerCase() !== 'ninguna' && (
              <div className="mt-3 w-full bg-rose-600 text-white text-[11px] font-bold py-1 px-2 rounded-lg shadow-xs uppercase tracking-wider">⚠️ Alergia: {paciente.alergias}</div>
            )}
          </div>

          <nav className="p-2 space-y-1 text-xs font-semibold">
            <button onClick={() => { setSeccionActiva('inicio'); setModoCrear(false); setModoEditar(false); }} className={`w-full text-left px-3 py-2.5 rounded-xl transition ${seccionActiva === 'inicio' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>🩺 Historial de Consultas</button>
            <button onClick={() => setSeccionActiva('general')} className={`w-full text-left px-3 py-2.5 rounded-xl transition ${seccionActiva === 'general' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>📋 Datos Generales / Ficha</button>
          </nav>

          <div className="p-4 border-t border-slate-100 text-xs text-slate-500 space-y-1.5 mt-auto">
            <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block">Antecedentes Base</span>
            <p className="text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-slate-600">{paciente.antecedentes || 'Sin antecedentes.'}</p>
            <div className="pt-3"><button onClick={handleEliminarExpediente} className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold py-2 px-3 rounded-xl transition cursor-pointer">🗑️ Eliminar Expediente</button></div>
          </div>
        </aside>

        {/* COLUMNA CENTRAL */}
        <main className="flex-1 bg-white flex flex-col overflow-y-auto border-r border-slate-200 relative">
          
          <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
              {seccionActiva === 'general' ? 'Ficha y Antecedentes' : modoCrear ? '📝 Nueva Atención' : modoEditar ? '✏️ Editando Consulta' : '🔍 Detalle de Consulta'}
            </h3>
            {seccionActiva === 'inicio' && (modoCrear || modoEditar) && (
              <div className="flex gap-2">
                <button onClick={() => { setModoCrear(false); setModoEditar(false); }} className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer">Cancelar</button>
                <button onClick={handleGuardarConsulta} disabled={guardando} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-1.5 rounded-xl shadow-xs transition cursor-pointer">{guardando ? 'Guardando...' : '💾 Guardar Todo'}</button>
              </div>
            )}
          </div>

          {/* BARRA DE PESTAÑAS INTERNAS TIPO ERP */}
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
                      
                      {/* BLOQUE 1: HISTORIA CLÍNICA */}
                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase border-b border-slate-200 pb-2 mb-3">Historia Clínica</h4>
                        <div className="space-y-3">
                          {/* Campo de médico oculto para mantener lógica del backend */}
                          <div className="hidden"><input type="text" value={formConsulta.doctor_nombre} onChange={(e) => setFormConsulta({ ...formConsulta, doctor_nombre: e.target.value })} /></div>

                          <div><label className="text-xs font-bold text-slate-700 block mb-1">Motivo de consulta</label><textarea rows="2" placeholder="Describa el motivo de consulta..." value={formConsulta.motivo_consulta} onChange={(e) => setFormConsulta({ ...formConsulta, motivo_consulta: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500" /></div>
                          <div><label className="text-xs font-bold text-slate-700 block mb-1">Presente enfermedad</label><textarea rows="3" placeholder="Presente enfermedad..." value={formConsulta.enfermedad_actual} onChange={(e) => setFormConsulta({ ...formConsulta, enfermedad_actual: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500" /></div>
                          <div><label className="text-xs font-bold text-slate-700 block mb-1">Otros antecedentes</label><textarea rows="2" placeholder="Otros antecedentes..." value={formConsulta.antecedentes_patologicos} onChange={(e) => setFormConsulta({ ...formConsulta, antecedentes_patologicos: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500" /></div>
                        </div>
                      </div>

                      {/* BLOQUE 2: EXAMEN Y DIAGNÓSTICO */}
                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase border-b border-slate-200 pb-2 mb-3">Examen y Diagnóstico</h4>
                        <div className="space-y-3">
                          <div><label className="text-xs font-bold text-slate-700 block mb-1">Examen físico</label><textarea rows="3" placeholder="Examen físico..." value={formConsulta.examen_fisico} onChange={(e) => setFormConsulta({ ...formConsulta, examen_fisico: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500" /></div>
                          <div><label className="text-xs font-bold text-slate-700 block mb-1">Reporte de exámenes</label><textarea rows="2" placeholder="Reporte de exámenes..." value={formConsulta.reporte_examenes} onChange={(e) => setFormConsulta({ ...formConsulta, reporte_examenes: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500" /></div>
                          <div><label className="text-xs font-bold text-slate-700 block mb-1">Impresión diagnóstica</label><input type="text" placeholder="Impresión diagnóstica..." value={formConsulta.diagnostico} onChange={(e) => setFormConsulta({ ...formConsulta, diagnostico: e.target.value })} className="w-full bg-white border-2 border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-600" /></div>
                        </div>
                      </div>

                      {/* BLOQUE 3: PLAN */}
                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase border-b border-slate-200 pb-2 mb-3">Plan</h4>
                        <div><label className="text-xs font-bold text-slate-700 block mb-1">Plan de manejo</label><textarea rows="3" placeholder="Plan de manejo..." value={formConsulta.plan_tratamiento} onChange={(e) => setFormConsulta({ ...formConsulta, plan_tratamiento: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500" /></div>
                      </div>

                    </div>
                  )}
                  {subTab === 'receta' && (
                    <RecetaTab modoCrear={modoCrear} modoEditar={modoEditar} paciente={paciente} consultaSeleccionada={consultaSeleccionada} medicamentos={medicamentos} agregarMedicamento={agregarMedicamento} actualizarMedicamento={actualizarMedicamento} eliminarMedicamento={eliminarMedicamento} recetasDeConsulta={recetasDeConsulta} />
                  )}
                  {subTab === 'laboratorio' && (
                    <LaboratorioTab modoCrear={modoCrear} modoEditar={modoEditar} paciente={paciente} consultaSeleccionada={consultaSeleccionada} estudiosNuevos={estudiosNuevos} agregarEstudioNuevo={agregarEstudioNuevo} actualizarEstudioNuevo={actualizarEstudioNuevo} eliminarEstudioNuevo={eliminarEstudioNuevo} estudiosDeConsulta={estudiosDeConsulta} setMostrarModalEstudio={setMostrarModalEstudio} handleEliminarEstudio={handleEliminarEstudio} />
                  )}
                </form>
              ) : (
                consultaSeleccionada ? (
                  <div className="max-w-3xl space-y-4">
                    <div className="flex flex-wrap justify-end gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <button onClick={activarModoEdicion} className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition cursor-pointer">✏️ Editar Consulta</button>
                      <button onClick={handleEliminarConsulta} className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition cursor-pointer">🗑️ Eliminar Consulta</button>
                    </div>

                    {subTab === 'historia' && (
                      <div className="border border-slate-200 rounded-2xl p-5 space-y-6 bg-white shadow-2xs">
                        <div className="border-b pb-3 flex justify-between items-center">
                          <div><span className="text-[11px] text-blue-600 font-bold block uppercase">Atención Registrada</span><h4 className="text-base font-bold text-slate-800">{consultaSeleccionada.fecha_formateada || String(consultaSeleccionada.fecha || '').slice(0, 16)}</h4><span className="text-xs text-slate-500 font-medium">Médico: {consultaSeleccionada.doctor_nombre}</span></div>
                        </div>
                        
                        {/* LECTURA HISTORIA CLÍNICA */}
                        <div>
                          <h4 className="text-xs font-black text-slate-800 uppercase border-b border-slate-100 pb-1 mb-2">Historia Clínica</h4>
                          <div className="space-y-3">
                            <div><span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Motivo de consulta</span><p className="text-xs text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100">{consultaSeleccionada.motivo_consulta || 'N/D'}</p></div>
                            <div><span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Presente enfermedad</span><p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">{consultaSeleccionada.enfermedad_actual || 'N/D'}</p></div>
                            <div><span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Otros antecedentes</span><p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">{consultaSeleccionada.antecedentes_patologicos || 'N/D'}</p></div>
                          </div>
                        </div>

                        {/* LECTURA EXAMEN Y DIAGNÓSTICO */}
                        <div>
                          <h4 className="text-xs font-black text-slate-800 uppercase border-b border-slate-100 pb-1 mb-2">Examen y Diagnóstico</h4>
                          <div className="space-y-3">
                            <div><span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Examen físico</span><p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">{consultaSeleccionada.examen_fisico || 'N/D'}</p></div>
                            <div><span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Reporte de exámenes</span><p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">{consultaSeleccionada.reporte_examenes || 'N/D'}</p></div>
                            <div><span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Impresión diagnóstica</span><p className="text-xs font-bold text-blue-900 bg-blue-50/70 p-2.5 rounded-xl border border-blue-100">{consultaSeleccionada.diagnostico || 'N/D'}</p></div>
                          </div>
                        </div>

                        {/* LECTURA PLAN */}
                        <div>
                          <h4 className="text-xs font-black text-slate-800 uppercase border-b border-slate-100 pb-1 mb-2">Plan</h4>
                          <div><span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Plan de manejo</span><p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">{consultaSeleccionada.plan_tratamiento || 'N/D'}</p></div>
                        </div>

                      </div>
                    )}
                    {subTab === 'receta' && (
                      <RecetaTab modoCrear={false} modoEditar={false} paciente={paciente} consultaSeleccionada={consultaSeleccionada} recetasDeConsulta={recetasDeConsulta} />
                    )}
                    {subTab === 'laboratorio' && (
                      <LaboratorioTab modoCrear={false} modoEditar={false} paciente={paciente} consultaSeleccionada={consultaSeleccionada} estudiosDeConsulta={estudiosDeConsulta} setMostrarModalEstudio={setMostrarModalEstudio} handleEliminarEstudio={handleEliminarEstudio} />
                    )}
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-400 text-xs">Selecciona una atención del historial o crea una nueva.</div>
                )
              )
            )}

            {seccionActiva === 'general' && (
              <form onSubmit={handleGuardarGeneral} className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-slate-700 block mb-1">Nombre Completo</label><input type="text" value={formGeneral.nombre} onChange={(e) => setFormGeneral({ ...formGeneral, nombre: e.target.value })} className="w-full border border-slate-300 rounded-xl p-2 text-xs outline-none focus:border-blue-500" /></div>
                  <div><label className="text-xs font-bold text-slate-700 block mb-1">Teléfono WhatsApp</label><input type="text" value={formGeneral.telefono} onChange={(e) => setFormGeneral({ ...formGeneral, telefono: e.target.value })} className="w-full border border-slate-300 rounded-xl p-2 text-xs outline-none focus:border-blue-500 font-mono" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-slate-700 block mb-1">Fecha de Nacimiento</label><input type="date" value={formGeneral.fecha_nacimiento} onChange={(e) => setFormGeneral({ ...formGeneral, fecha_nacimiento: e.target.value })} className="w-full border border-slate-300 rounded-xl p-2 text-xs outline-none focus:border-blue-500" /></div>
                  <div><label className="text-xs font-bold text-slate-700 block mb-1">Género</label><select value={formGeneral.sexo} onChange={(e) => setFormGeneral({ ...formGeneral, sexo: e.target.value })} className="w-full border border-slate-300 rounded-xl p-2 text-xs bg-white outline-none focus:border-blue-500"><option value="M">Masculino</option><option value="F">Femenino</option><option value="Otro">Otro</option></select></div>
                </div>
                <div><label className="text-xs font-bold text-slate-700 block mb-1">URL Foto (Opcional)</label><input type="url" value={formGeneral.foto_url} onChange={(e) => setFormGeneral({ ...formGeneral, foto_url: e.target.value })} className="w-full border border-slate-300 rounded-xl p-2 text-xs outline-none focus:border-blue-500 font-mono" /></div>
                <div><label className="text-xs font-bold text-slate-700 block mb-1">Alergias</label><input type="text" value={formGeneral.alergias} onChange={(e) => setFormGeneral({ ...formGeneral, alergias: e.target.value })} className="w-full border border-slate-300 rounded-xl p-2 text-xs outline-none focus:border-blue-500" /></div>
                <div><label className="text-xs font-bold text-slate-700 block mb-1">Antecedentes Generales</label><textarea rows="3" value={formGeneral.antecedentes} onChange={(e) => setFormGeneral({ ...formGeneral, antecedentes: e.target.value })} className="w-full border border-slate-300 rounded-xl p-2 text-xs outline-none focus:border-blue-500" /></div>
                <div className="pt-2 flex justify-end"><button type="submit" disabled={guardandoGeneral} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2 rounded-xl shadow transition cursor-pointer">{guardandoGeneral ? 'Guardando...' : '💾 Guardar Ficha'}</button></div>
              </form>
            )}
          </div>
        </main>

        {/* COLUMNA DERECHA */}
        <aside className="w-72 bg-slate-50 flex flex-col shrink-0 overflow-y-auto p-4 space-y-4 border-l border-slate-200">
          <div className="space-y-2">
            <button onClick={() => { setModoCrear(true); setModoEditar(false); setSeccionActiva('inicio'); setSubTab('historia'); setFormConsulta({ doctor_nombre: 'Dra. Consulta', motivo_consulta: '', enfermedad_actual: '', antecedentes_patologicos: '', examen_fisico: '', reporte_examenes: '', diagnostico: '', plan_tratamiento: '' }); setMedicamentos([{ medicamento: '', frecuencia: 'Cada 8 horas', dias_tratamiento: 5, indicacion: '' }]); setEstudiosNuevos([{ tipo_estudio: '', laboratorio: '', observaciones: '' }]); }} className="w-full bg-[#10a37f] hover:bg-emerald-700 text-white font-bold text-xs p-2.5 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer">➕ Nueva Consulta</button>
            <button onClick={() => onAgendarCita(paciente)} className="w-full bg-white border border-slate-300 hover:bg-blue-50 text-slate-700 font-bold text-xs p-2.5 rounded-xl shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer">📅 Agendar Cita</button>
          </div>
          <div className="flex-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Historial ({consultas.length})</span>
            {consultas.length === 0 ? (<p className="text-xs text-slate-400 italic">No hay atenciones pasadas.</p>) : (
              <div className="space-y-2">
                {consultas.map((c) => {
                  const activa = !modoCrear && !modoEditar && consultaSeleccionada?.id === c.id;
                  const fechaStr = c.fecha_formateada ? c.fecha_formateada.slice(0, 10) : (c.fecha ? String(c.fecha).slice(0, 10) : 'Fecha');
                  const horaStr = c.fecha_formateada ? c.fecha_formateada.slice(11, 16) : (c.fecha ? String(c.fecha).slice(11, 16) : '');
                  return (
                    <button key={c.id} onClick={() => { setConsultaSeleccionada(c); setModoCrear(false); setModoEditar(false); setSeccionActiva('inicio'); setSubTab('historia'); }} className={`w-full text-left p-3 rounded-xl border text-xs transition cursor-pointer flex flex-col gap-1 ${activa ? 'bg-[#1b4e7b] border-[#1b4e7b] text-white font-bold shadow-xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                      <div className="flex justify-between items-center"><span className={`text-xs font-bold ${activa ? 'text-white' : 'text-slate-800'}`}>📅 {fechaStr}</span><span className={`text-[10px] font-mono ${activa ? 'text-blue-200' : 'text-slate-400'}`}>{horaStr} hrs</span></div>
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

      {/* MODAL PARA AGREGAR ESTUDIO RÁPIDO */}
      {mostrarModalEstudio && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-800">Agregar Estudio Clínico</h3>
            <form onSubmit={handleAgregarEstudioRapido} className="space-y-3">
              <div><label className="text-xs font-bold text-slate-700 block mb-1">Estudio</label><input required type="text" value={formEstudioRapido.tipo_estudio} onChange={(e) => setFormEstudioRapido({ ...formEstudioRapido, tipo_estudio: e.target.value })} className="w-full border border-slate-300 rounded-xl p-2 text-xs outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="text-xs font-bold text-slate-700 block mb-1">Laboratorio</label><input type="text" value={formEstudioRapido.laboratorio} onChange={(e) => setFormEstudioRapido({ ...formEstudioRapido, laboratorio: e.target.value })} className="w-full border border-slate-300 rounded-xl p-2 text-xs outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="text-xs font-bold text-slate-700 block mb-1">Observaciones</label><textarea rows="2" value={formEstudioRapido.observaciones} onChange={(e) => setFormEstudioRapido({ ...formEstudioRapido, observaciones: e.target.value })} className="w-full border border-slate-300 rounded-xl p-2 text-xs outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setMostrarModalEstudio(false)} className="px-3 py-1.5 border rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 cursor-pointer">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}