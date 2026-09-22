import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import api from '../api';
export default function SelectorFechaModal({ isOpen, onClose, onFechaSeleccionada }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
        <div className="flex justify-between items-center pb-3 border-b mb-3">
          <div>
            <h2 className="text-base font-bold text-slate-800">📅 Selecciona el día para la cita</h2>
            <p className="text-xs text-slate-500">Haz clic sobre el día en el que deseas agendar al paciente.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>

        <div className="calendario-mini">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: ''
            }}
            locale="es"
            height="340px"
            dateClick={(info) => {
              onFechaSeleccionada(info.dateStr);
              onClose();
            }}
          />
        </div>

        <div className="flex justify-end pt-3 border-t mt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 border rounded-lg text-xs text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}