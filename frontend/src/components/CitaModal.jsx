import React, { useState } from 'react';
import api from '../api';
import { toast } from 'sonner';

export default function CitaModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  onDelete, 
  form, 
  setForm, 
  doctores, 
  selectedId,
  onAbrirReceta 
}) {
  const [incluirReceta, setIncluirReceta] = useState(false);

  if (!isOpen) return null;

  const esPacienteVinculado = Boolean(form.paciente_id);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {selectedId ? 'Editar Cita' : 'Nueva Cita'}
            </h2>
            {esPacienteVinculado && (
              <span className="text-[11px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-md border border-blue-200">
                📁 Vinculada al expediente #{String(form.paciente_id).padStart(4, '0')}
              </span>
            )}
          </div>

          {selectedId && (
            <button 
              type="button" 
              onClick={onDelete} 
              className="text-xs text-rose-600 hover:underline font-medium"
            >
              Eliminar Cita
            </button>
          )}
        </div>

        <form onSubmit={(e) => onSubmit(e, incluirReceta)} className="space-y-3">
          {/* Nombre del Paciente */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Nombre del Paciente
            </label>
            <input
              type="text"
              required
              readOnly={esPacienteVinculado}
              placeholder="Ej. Juan Pérez"
              value={form.paciente_nombre}
              onChange={(e) => setForm({ ...form, paciente_nombre: e.target.value })}
              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none transition ${
                esPacienteVinculado
                  ? 'bg-slate-100 text-slate-600 font-semibold border-slate-200 cursor-not-allowed'
                  : 'bg-white border-slate-300 focus:ring-2 focus:ring-blue-500'
              }`}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* WhatsApp */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                WhatsApp (8 dígitos)
              </label>
              <input
                type="tel"
                required
                readOnly={esPacienteVinculado}
                placeholder="71234567"
                value={form.paciente_telefono}
                onChange={(e) => setForm({ ...form, paciente_telefono: e.target.value })}
                className={`w-full border rounded-lg px-3 py-2 text-sm outline-none font-mono transition ${
                  esPacienteVinculado
                    ? 'bg-slate-100 text-slate-600 font-semibold border-slate-200 cursor-not-allowed'
                    : 'bg-white border-slate-300 focus:ring-2 focus:ring-blue-500'
                }`}
              />
            </div>

            {/* Especialista / Doctor */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Especialista / Servicio
              </label>
              <select
                required
                value={form.doctor_id}
                onChange={(e) => {
                  const doc = doctores.find(d => String(d.id) === e.target.value);
                  setForm({ 
                    ...form, 
                    doctor_id: e.target.value,
                    doctor_nombre: doc ? doc.nombre : ''
                  });
                }}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-700"
              >
                <option value="">Seleccionar...</option>
                {doctores.map(doc => (
                  <option key={doc.id} value={doc.id}>
                    {doc.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fecha, Hora y Duración */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha</label>
              <input
                type="date"
                required
                value={form.fecha_cita}
                onChange={(e) => setForm({ ...form, fecha_cita: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-2 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Hora Inicio</label>
              <input
                type="time"
                required
                value={form.hora_cita}
                onChange={(e) => setForm({ ...form, hora_cita: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-2 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Duración</label>
              <select
                value={form.duracion_minutos}
                onChange={(e) => setForm({ ...form, duracion_minutos: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded-lg px-2 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value={15}>15 min</option>
                <option value={20}>20 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1 hora</option>
              </select>
            </div>
          </div>

          {/* Estado de la Cita */}
          {selectedId && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Estado</label>
              <select
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="RESERVADA">RESERVADA (Ámbar)</option>
                <option value="CONFIRMADA">CONFIRMADA (Verde)</option>
                <option value="REAGENDAR">REAGENDAR (Rojo)</option>
                <option value="CANCELADA">CANCELADA (Gris)</option>
              </select>
            </div>
          )}

          {/* Indicaciones Médicas */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Indicaciones Médicas</label>
            <textarea
              rows="2"
              placeholder="Ej. Ayunas, traer exámenes..."
              value={form.indicaciones}
              onChange={(e) => setForm({ ...form, indicaciones: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Opción de emitir receta digital inmediata */}
          {!selectedId && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="checkReceta"
                checked={incluirReceta}
                onChange={(e) => setIncluirReceta(e.target.checked)}
                className="rounded text-emerald-600 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="checkReceta" className="text-xs text-slate-700 font-medium cursor-pointer">
                💊 Emitir receta digital inmediatamente después de crear la cita
              </label>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {selectedId ? (
              <button
                type="button"
                onClick={() => onAbrirReceta(form)}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
              >
                💊 Emitir Receta
              </button>
            ) : <div />}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                Cerrar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-sm transition"
              >
                {selectedId ? 'Guardar Cambios' : 'Crear Cita'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}