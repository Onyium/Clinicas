import React from 'react';
import api from '../api';
import { toast } from 'sonner';
export default function MainLayout({ 
  vistaActual, 
  setVistaActual, 
  nombreClinica, 
  onNuevaCita, 
  onLogout,
  children 
}) {
  return (
    <div className="flex h-screen bg-[#f1f5f9] font-sans overflow-hidden">
      
      {/* SIDEBAR LATERAL GLOBAL FIJO */}
      <aside className="w-64 bg-[#113a5d] text-white flex flex-col justify-between shrink-0 shadow-xl z-20">
        <div>
          {/* Logo / Cabecera */}
          <div className="p-5 flex items-center justify-between border-b border-blue-900/40">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-wider text-white">CLINIC</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                PRO
              </span>
            </div>
          </div>

          {/* Perfil Doctor */}
          <div className="p-4 flex flex-col items-center text-center border-b border-blue-900/30">
            <div className="w-14 h-14 rounded-full bg-slate-200 border-2 border-white/80 shadow-md flex items-center justify-center text-xl mb-1.5">
              👩‍⚕️
            </div>
            <span className="text-xs font-bold text-white leading-tight">
              {nombreClinica || 'CONSULTORIO MAYE'}
            </span>
            <span className="text-[11px] text-blue-200">Panel Principal</span>
          </div>

          {/* Menú de Navegación */}
          <nav className="p-3 space-y-1.5 text-xs font-semibold">
            <button 
              type="button"
              onClick={() => setVistaActual('catalogo')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition cursor-pointer ${
                vistaActual === 'catalogo' 
                  ? 'bg-white/15 text-white font-bold shadow-inner' 
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              👥 Pacientes & Expedientes
            </button>

            <button 
              type="button"
              onClick={() => setVistaActual('agenda')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition cursor-pointer ${
                vistaActual === 'agenda' 
                  ? 'bg-white/15 text-white font-bold shadow-inner' 
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              📅 Agenda & Calendario
            </button>
          </nav>
        </div>

        {/* Footer Sidebar con Cerrar Sesión */}
        <div className="p-4 border-t border-blue-900/40 space-y-3">
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 bg-rose-500/20 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-400/30 text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer shadow-xs"
          >
            🚪 Cerrar Sesión
          </button>

          <p className="text-[11px] text-slate-400 text-center font-mono">
            SaaS Clínico v2.4
          </p>
        </div>
      </aside>

      {/* CONTENIDO DINÁMICO */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>

    </div>
  );
}