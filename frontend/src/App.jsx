import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import axios from 'axios';

import CitaModal from './components/CitaModal';
import EmergenciaModal from './components/EmergenciaModal';
import ConfigModal from './components/ConfigModal';
import RecetaModal from './components/RecetaModal';
import DiaDetalleModal from './components/DiaDetalleModal';
import MainLayout from './components/MainLayout';
import SelectorFechaModal from './components/SelectorFechaModal';
import ExpedienteModal from './components/ExpedienteModal';
import PacientesDirectorioModal from './components/PacientesDirectorioModal';
import ExpedienteClinicoView from './components/ExpedienteClinicoView';
// IMPORTACIONES FALTANTES:
import CatalogoPacientesView from './components/CatalogoPacientesView';
import ConsultaMedicaView from './components/ConsultaMedicaView';

import api from 'C:/Users/admin/CLINICA-BOT/frontend/src/api.js';


const STATUS_COLORS = {
  RESERVADA: { bg: '#F59E0B', border: '#D97706' },
  CONFIRMADA: { bg: '#10B981', border: '#059669' },
  REAGENDAR: { bg: '#EF4444', border: '#DC2626' },
  CANCELADA: { bg: '#6B7280', border: '#4B5563' }
};

export default function App() {
  const [citas, setCitas] = useState([]);
  const [doctores, setDoctores] = useState([]);
  const [config, setConfig] = useState({
    hora_apertura: '08:00:00',
    hora_cierre: '13:00:00',
    duracion_defecto_minutos: 30
  });

  const [filtroDoctor, setFiltroDoctor] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');

  // Estados de Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEmergenciaOpen, setIsEmergenciaOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isRecetaOpen, setIsRecetaOpen] = useState(false);
  const [isDiaModalOpen, setIsDiaModalOpen] = useState(false);
  const [isSelectorFechaOpen, setIsSelectorFechaOpen] = useState(false);
  const [directorioAbierto, setDirectorioAbierto] = useState(false);
  const [expedienteSeleccionadoId, setExpedienteSeleccionadoId] = useState(null);
  const [diaSeleccionado, setDiaSeleccionado] = useState('');
  const [citaParaReceta, setCitaParaReceta] = useState(null);
  const [vistaActual, setVistaActual] = useState('catalogo'); // 'agenda' | 'catalogo' | 'consulta'
  const [pacienteActivoId, setPacienteActivoId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [citaActivaParaConsulta, setCitaActivaParaConsulta] = useState(null);

  const [form, setForm] = useState({
    paciente_nombre: '',
    paciente_telefono: '',
    doctor_id: '',
    doctor_nombre: '',
    fecha_cita: '',
    hora_cita: '08:00',
    duracion_minutos: 30,
    indicaciones: '',
    estado: 'RESERVADA'
  });

  const [emergenciaForm, setEmergenciaForm] = useState({
    doctor_id: '',
    fecha: new Date().toISOString().split('T')[0],
    motivo: 'Ausencia programada'
  });

  const fetchData = async () => {
    try {
      const [resCitas, resDocs, resConfig] = await Promise.all([
        axios.get(`/citas`),
        axios.get(`/doctores`),
        axios.get(`/configuracion`)
      ]);
      setCitas(resCitas.data || []);
      setDoctores(resDocs.data || []);
      if (resConfig.data) setConfig(resConfig.data);
    } catch (err) {
      console.error('Error cargando datos:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const citasFiltradas = citas.filter(c => {
    const coincideDoctor = filtroDoctor === 'TODOS' || String(c.doctor_id) === String(filtroDoctor);
    const q = busqueda.trim().toLowerCase();
    const coincideBusqueda = !q || 
      c.paciente_nombre?.toLowerCase().includes(q) || 
      c.paciente_telefono?.includes(q);
    return coincideDoctor && coincideBusqueda;
  });

  // Mapear eventos garantizando formato ISO seguro
  const events = citasFiltradas.map((c) => {
    const fechaStr = c.fecha_cita.toString().split('T')[0];
    const colores = STATUS_COLORS[c.estado] || { bg: '#3B82F6', border: '#2563EB' };

    return {
      id: String(c.id),
      title: `${c.hora_cita.slice(0, 5)} ${c.paciente_nombre}`,
      start: `${fechaStr}T${c.hora_cita}`,
      end: `${fechaStr}T${c.hora_fin || c.hora_cita}`,
      backgroundColor: colores.bg,
      borderColor: colores.border,
      textColor: '#ffffff',
      extendedProps: { ...c }
    };
  });

  // Abrir formulario con fecha elegida desde el minicalendario o desde el día
  const abrirFormularioConFecha = (fecha) => {
    setSelectedId(null);
    const primerDoc = doctores[0] || {};
    setForm({
      paciente_nombre: '',
      paciente_telefono: '',
      doctor_id: primerDoc.id || '',
      doctor_nombre: primerDoc.nombre || '',
      fecha_cita: fecha,
      hora_cita: config.hora_apertura ? config.hora_apertura.slice(0, 5) : '08:00',
      duracion_minutos: config.duracion_defecto_minutos || 30,
      indicaciones: '',
      estado: 'RESERVADA'
    });
    setIsModalOpen(true);
  };

  // Clic en celda del calendario principal: muestra las citas de ese día
  const handleDateClick = (info) => {
    const fecha = info.dateStr.split('T')[0];
    setDiaSeleccionado(fecha);
    setIsDiaModalOpen(true);
  };

  const handleEventClick = (clickInfo) => {
    clickInfo.jsEvent.stopPropagation();
    const c = clickInfo.event.extendedProps;
    abrirEdicionCita(c);
  };

  const abrirEdicionCita = (c) => {
    setSelectedId(c.id);
    setForm({
      paciente_nombre: c.paciente_nombre,
      paciente_telefono: c.paciente_telefono,
      doctor_id: c.doctor_id || '',
      doctor_nombre: c.doctor_nombre || '',
      fecha_cita: c.fecha_cita.toString().split('T')[0],
      hora_cita: c.hora_cita.slice(0, 5),
      duracion_minutos: c.duracion_minutos || config.duracion_defecto_minutos || 30,
      indicaciones: c.indicaciones || '',
      estado: c.estado
    });
    setIsModalOpen(true);
  };

  // Abrir modal de cita con los datos precargados de un paciente existente
const abrirCitaParaPaciente = (paciente) => {
  setSelectedId(null);
  const primerDoc = doctores[0] || {};
  const hoyStr = new Date().toISOString().split('T')[0];

  setForm({
    paciente_id: paciente.id,
    paciente_nombre: paciente.nombre || '',
    paciente_telefono: paciente.telefono || '',
    doctor_id: primerDoc.id || '',
    doctor_nombre: primerDoc.nombre || '',
    fecha_cita: hoyStr,
    hora_cita: config.hora_apertura ? config.hora_apertura.slice(0, 5) : '08:00',
    duracion_minutos: config.duracion_defecto_minutos || 30,
    indicaciones: '',
    estado: 'RESERVADA'
  });

  setIsModalOpen(true);
};

  const handleCitaSubmit = async (e, abrirRecetaInmediata) => {
    e.preventDefault();
    try {
      if (selectedId) {
        await axios.put(`/citas/${selectedId}`, form);
        setIsModalOpen(false);
      } else {
        const res = await axios.post(`/citas`, form);
        setIsModalOpen(false);
        if (abrirRecetaInmediata) {
          setCitaParaReceta({ ...form, id: res.data.id });
          setIsRecetaOpen(true);
        }
      }
      fetchData();
    } catch (err) {
      alert('Error al guardar la cita');
    }
  };

  const handleCitaDelete = async () => {
    if (!window.confirm('¿Seguro que deseas eliminar esta cita?')) return;
    try {
      await axios.delete(`/citas/${selectedId}`);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert('Error al eliminar la cita');
    }
  };

  const handleEmergenciaSubmit = async (e) => {
    e.preventDefault();
    const doc = doctores.find(d => String(d.id) === String(emergenciaForm.doctor_id));
    if (!window.confirm(`¿Bloquear jornada del ${emergenciaForm.fecha} para ${doc?.nombre} y notificar a sus pacientes?`)) return;

    try {
      await axios.post(`/doctores/bloquear-fecha`, emergenciaForm);
      alert('Jornada bloqueada y pacientes notificados.');
      setIsEmergenciaOpen(false);
      fetchData();
    } catch (err) {
      alert('Error al bloquear jornada');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      
      {/* VISTA 1: EXPEDIENTE CLÍNICO COMPLETO (3 COLUMNAS MEDIS365) */}
      {vistaActual === 'expediente' ? (
      <ExpedienteClinicoView
        pacienteId={pacienteActivoId}
        onVolver={() => setVistaActual('agenda')}
        onAgendarCita={(paciente) => abrirCitaParaPaciente(paciente)}
      />
      ) : (
        /* VISTA 2: LAYOUT GLOBAL CON SIDEBAR PARA AGENDA Y CATÁLOGO */
        <MainLayout
          vistaActual={vistaActual}
          setVistaActual={setVistaActual}
          nombreClinica={config.nombre_clinica}
          onNuevaCita={() => setIsSelectorFechaOpen(true)}
        >
          {vistaActual === 'catalogo' ? (
            <CatalogoPacientesView 
              onVerExpediente={(id) => {
                setPacienteActivoId(id);
                setVistaActual('expediente');
              }}
              onNuevaNota={(paciente) => {
                setPacienteActivoId(paciente.id);
                setVistaActual('expediente');
              }}
              onIrAgenda={() => setVistaActual('agenda')}
              onNuevoPaciente={() => setIsModalOpen(true)}
            />
          ) : (
            /* VISTA DE AGENDA / CALENDARIO EMBEBIDA EN EL ÁREA CENTRAL */
            <div className="flex-1 flex flex-col h-full overflow-y-auto p-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                
                {/* Cabecera Superior de la Agenda */}
                <header className="mb-5 flex flex-wrap justify-between items-center gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">
                      Agenda de Consultas
                    </h2>
                    <p className="text-xs text-slate-500">
                      Horario: {config.hora_apertura?.slice(0, 5)} - {config.hora_cierre?.slice(0, 5)} | Turnos: {config.duracion_defecto_minutos} min
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Buscador */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="🔍 Buscar paciente..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="border rounded-xl px-3 py-1.5 text-xs w-44 outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
                      />
                      {busqueda && (
                        <button
                          onClick={() => setBusqueda('')}
                          className="absolute right-2.5 top-1.5 text-xs text-slate-400 hover:text-slate-600"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Filtro por Doctor */}
                    <select
                      value={filtroDoctor}
                      onChange={(e) => setFiltroDoctor(e.target.value)}
                      className="border rounded-xl px-2.5 py-1.5 text-xs bg-white text-slate-700 outline-none font-medium"
                    >
                      <option value="TODOS">Todos los servicios</option>
                      {doctores.map(d => (
                        <option key={d.id} value={d.id}>{d.nombre}</option>
                      ))}
                    </select>

                    <button
                      onClick={() => setIsEmergenciaOpen(true)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition"
                    >
                      🚨 Bloquear Día
                    </button>

                    <button
                      onClick={() => setIsConfigOpen(true)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                    >
                      ⚙️
                    </button>
                  </div>
                </header>

                {/* Calendario */}
                <FullCalendar
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek'
                  }}
                  locale="es"
                  events={events}
                  dateClick={handleDateClick}
                  eventClick={handleEventClick}
                  eventDisplay="block"
                  height="auto"
                />
              </div>
            </div>
          )}
        </MainLayout>
      )}

      {/* ========================================================= */}
      {/* MODALES FLOTANTES GLOBALES                                */}
      {/* ========================================================= */}
      <SelectorFechaModal
        isOpen={isSelectorFechaOpen}
        onClose={() => setIsSelectorFechaOpen(false)}
        onFechaSeleccionada={abrirFormularioConFecha}
      />

      <DiaDetalleModal
        isOpen={isDiaModalOpen}
        onClose={() => setIsDiaModalOpen(false)}
        fecha={diaSeleccionado}
        citasDelDia={citasFiltradas.filter(c => c.fecha_cita.toString().split('T')[0] === diaSeleccionado)}
        onNuevaCitaEnFecha={abrirFormularioConFecha}
        onSeleccionarCita={abrirEdicionCita}
        onAbrirReceta={(citaData) => {
          setCitaParaReceta(citaData);
          setIsRecetaOpen(true);
        }}
      />

      <CitaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCitaSubmit}
        onDelete={handleCitaDelete}
        form={form}
        setForm={setForm}
        doctores={doctores}
        selectedId={selectedId}
        onAbrirReceta={(citaData) => {
          setCitaParaReceta({ ...citaData, id: selectedId });
          setIsModalOpen(false);
          setIsRecetaOpen(true);
        }}
      />

      <EmergenciaModal
        isOpen={isEmergenciaOpen}
        onClose={() => setIsEmergenciaOpen(false)}
        onSubmit={handleEmergenciaSubmit}
        emergenciaForm={emergenciaForm}
        setEmergenciaForm={setEmergenciaForm}
        doctores={doctores}
      />

      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onSaved={(nuevaConfig) => setConfig(nuevaConfig)}
      />

      <RecetaModal
        isOpen={isRecetaOpen}
        onClose={() => setIsRecetaOpen(false)}
        cita={citaParaReceta}
      />

    </div>
  );
}