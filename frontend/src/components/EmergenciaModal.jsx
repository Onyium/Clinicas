import React from 'react';
import api from '../api';

export default function EmergenciaModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  emergenciaForm, 
  setEmergenciaForm, 
  doctores 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6">
        <h2 className="text-base font-bold text-rose-700 mb-2">Bloqueo de Jornada por Ausencia</h2>
        <p className="text-xs text-slate-500 mb-4">
          Se notificará a todos los pacientes agendados con este especialista ofreciéndoles los próximos 4 horarios para reagendar.
        </p>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Especialista / Servicio Ausente</label>
            <select
              required
              value={emergenciaForm.doctor_id}
              onChange={(e) => setEmergenciaForm({ ...emergenciaForm, doctor_id: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-white"
            >
              <option value="">Seleccionar...</option>
              {doctores.map(doc => (
                <option key={doc.id} value={doc.id}>
                  {doc.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha Bloqueada</label>
            <input
              type="date"
              required
              value={emergenciaForm.fecha}
              onChange={(e) => setEmergenciaForm({ ...emergenciaForm, fecha: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Motivo (opcional)</label>
            <input
              type="text"
              placeholder="Permiso, salud, congreso..."
              value={emergenciaForm.motivo}
              onChange={(e) => setEmergenciaForm({ ...emergenciaForm, motivo: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border rounded-lg text-xs text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700"
            >
              Bloquear y Notificar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}