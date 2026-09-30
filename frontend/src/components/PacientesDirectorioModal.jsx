import React, { useState, useEffect } from 'react';
import api from '../api';
import { toast } from 'sonner';
export default function PacientesDirectorioModal({ isOpen, onClose, onSelectPaciente }) {
  const [pacientes, setPacientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchPacientes = async (query = '') => {
    setLoading(true);
    try {
      const res = await api.get(`/api/pacientes?q=${encodeURIComponent(query)}`);
      setPacientes(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPacientes(busqueda);
    }
  }, [isOpen, busqueda]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-5 max-h-[85vh] flex flex-col">
        
        {/* Encabezado */}
        <div className="flex justify-between items-center pb-3 border-b">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              📂 Directorio de Expedientes Clínicos
            </h2>
            <p className="text-xs text-slate-500">Busca y gestiona la ficha médica de los pacientes</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>

        {/* Buscador */}
        <div className="py-3">
          <input
            type="text"
            placeholder="🔍 Buscar por nombre o número de teléfono..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Lista de Pacientes */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loading ? (
            <p className="text-center py-8 text-xs text-slate-400">Buscando...</p>
          ) : pacientes.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-400">No se encontraron expedientes con ese criterio.</p>
          ) : (
            pacientes.map((p) => (
              <div 
                key={p.id} 
                onClick={() => onSelectPaciente(p.id)}
                className="py-2.5 px-2 flex justify-between items-center hover:bg-blue-50/60 rounded-xl cursor-pointer transition group"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition">
                    {p.nombre}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-mono">
                    📞 {p.telefono} {p.alergias && p.alergias !== 'Ninguna' && (
                      <span className="text-rose-600 font-sans font-semibold ml-1">· ⚠️ Alergias</span>
                    )}
                  </p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
                    {p.total_citas} citas
                  </span>
                  <span className="text-xs text-blue-600 font-bold group-hover:translate-x-0.5 transition">
                    Ver ficha →
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t flex justify-end">
          <button onClick={onClose} className="px-4 py-1.5 text-xs text-slate-600 border rounded-lg hover:bg-slate-50">
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}