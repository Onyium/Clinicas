import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function CatalogoPacientesView({ 
  onVerExpediente, 
  onNuevaNota, 
  onNuevoPaciente,
  onIrAgenda 
}) {
  const [pacientes, setPacientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroGenero, setFiltroGenero] = useState('TODOS');
  const [loading, setLoading] = useState(false);

  const cargarPacientes = async (query = '') => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:3001/api/pacientes?q=${encodeURIComponent(query)}`);
      setPacientes(res.data || []);
    } catch (err) {
      console.error('Error al cargar catálogo de pacientes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPacientes(busqueda);
  }, [busqueda]);

  const pacientesFiltrados = pacientes.filter((p) => {
    if (filtroGenero === 'TODOS') return true;
    return (p.sexo || '').toUpperCase() === filtroGenero;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 font-sans">
      
      {/* 1. BARRA SUPERIOR / HEADER */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex flex-wrap justify-between items-center gap-4 shrink-0 shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">
            Catálogo de Pacientes
          </h2>
          <p className="text-xs text-blue-600 font-semibold">
            Directorio maestro y expedientes clínicos registrados
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onNuevoPaciente}
            className="bg-[#10a37f] hover:bg-[#0e8a6c] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs flex items-center gap-1.5 transition"
          >
            ➕ Nuevo Paciente
          </button>
        </div>
      </header>

      {/* 2. BARRA DE FILTROS Y BÚSQUEDA */}
      <div className="bg-white px-8 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex-1 min-w-[280px] max-w-md relative">
          <input
            type="text"
            placeholder="🔍 Buscar por nombre o número de teléfono..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-3 top-2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={filtroGenero}
            onChange={(e) => setFiltroGenero(e.target.value)}
            className="border border-slate-300 text-slate-600 rounded-xl px-3 py-1.5 text-xs font-semibold bg-white outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos los géneros</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </select>

          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            {pacientesFiltrados.length} expedientes
          </span>
        </div>
      </div>

      {/* 3. LISTA PRINCIPAL DE PACIENTES */}
      <div className="flex-1 overflow-y-auto p-8 space-y-3">
        {loading ? (
          <div className="text-center py-20 text-slate-400 text-xs font-medium">
            Cargando pacientes...
          </div>
        ) : pacientesFiltrados.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300 p-8 max-w-lg mx-auto">
            <p className="text-sm font-bold text-slate-700">No se encontraron pacientes</p>
            <p className="text-xs text-slate-400 mt-1">Intenta con otro término de búsqueda o registra uno nuevo.</p>
            <button
              onClick={onNuevoPaciente}
              className="mt-4 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-blue-700 transition"
            >
              + Registrar Paciente
            </button>
          </div>
        ) : (
          pacientesFiltrados.map((p) => {
            const folio = `P${String(p.id).padStart(3, '0')}`;
            const inicial = p.nombre ? p.nombre.charAt(0).toUpperCase() : 'P';
            const esMasculino = (p.sexo || '').toUpperCase() === 'M';

            return (
              <div 
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Info Izquierda */}
                <div className="flex items-center gap-4">
                  {/* Avatar con Inicial */}
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-black text-lg shrink-0">
                    {inicial}
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-slate-800 leading-tight">
                      {p.nombre}
                    </h3>

                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Folio: <span className="font-semibold text-blue-600 font-mono">{folio}</span>
                      {p.fecha_nacimiento && ` • Nacimiento: ${p.fecha_nacimiento.slice(0, 10)}`}
                    </p>

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-200 font-mono">
                        {p.creado_en ? p.creado_en.slice(0, 10) : 'Registro'}
                      </span>

                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                        esMasculino 
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : 'bg-pink-50 text-pink-700 border-pink-200'
                      }`}>
                        {esMasculino ? 'Masculino' : 'Femenino'}
                      </span>

                      {p.alergias && p.alergias.toLowerCase() !== 'ninguna' && (
                        <span className="text-[10px] font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md border border-rose-200">
                          ⚠️ Alergia: {p.alergias}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info Central: Teléfono / WhatsApp */}
                <div className="text-left md:text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Teléfono WhatsApp
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-700">
                    {p.telefono || 'Sin teléfono'}
                  </span>
                </div>

                {/* Botones de Acción Rápidos (Estilo Medis / DAR) */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Botón Verde: Nueva Nota */}
                  <button 
                    onClick={() => onNuevaNota(p)}
                    className="bg-[#20ba7e] hover:bg-[#199967] text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-2xs flex items-center gap-1.5"
                  >
                    📝 Nueva Nota
                  </button>

                  {/* Botón Teal: Ver Expediente Completo */}
                  <button 
                    onClick={() => onVerExpediente(p.id)}
                    className="bg-[#008f85] hover:bg-[#00746c] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-2xs flex items-center gap-1.5"
                  >
                    📂 Ver Expediente
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}