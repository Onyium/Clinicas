import React from 'react';

export default function LaboratorioTab({
  modoCrear,
  modoEditar,
  paciente,
  consultaSeleccionada,
  estudiosNuevos,
  agregarEstudioNuevo,
  actualizarEstudioNuevo,
  eliminarEstudioNuevo,
  estudiosDeConsulta,
  setMostrarModalEstudio,
  handleEliminarEstudio
}) {
  const imprimirLaboratorio = () => {
    if (!consultaSeleccionada || estudiosDeConsulta.length === 0) {
      alert('No hay estudios clínicos registrados para imprimir.');
      return;
    }

    const ventanaImpresion = window.open('', '_blank');
    ventanaImpresion.document.write(`
      <html>
        <head>
          <title>Orden de Laboratorio - Clinic 365</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #008f85; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { color: #008f85; margin: 0; font-size: 22px; }
            .header p { margin: 2px 0; font-size: 12px; color: #666; }
            .info { margin-bottom: 20px; font-size: 13px; }
            .info p { margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f8fafc; color: #008f85; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; border-top: 1px dashed #ccc; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>CLINIC 365 - ORDEN DE LABORATORIO</h1>
            <p>Solicitud de Estudios Clínicos</p>
          </div>
          <div class="info">
            <p><strong>Paciente:</strong> ${paciente.nombre}</p>
            <p><strong>Folio:</strong> P${String(paciente.id).padStart(3, '0')} | <strong>Fecha:</strong> ${consultaSeleccionada.fecha_formateada || 'Hoy'}</p>
            <p><strong>Médico Solicitante:</strong> ${consultaSeleccionada.doctor_nombre}</p>
          </div>
          <h3>Estudios Solicitados:</h3>
          <table>
            <thead>
              <tr>
                <th>Tipo de Estudio / Examen</th>
                <th>Laboratorio Referencia</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              ${estudiosDeConsulta.map(e => `
                <tr>
                  <td><strong>${e.tipo_estudio}</strong></td>
                  <td>${e.laboratorio || 'Cualquiera'}</td>
                  <td>${e.observaciones || 'Ninguna'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            <p>_____________________________________</p>
            <p>Firma y Sello del Médico</p>
          </div>
        </body>
      </html>
    `);
    ventanaImpresion.document.close();
    ventanaImpresion.focus();
    setTimeout(() => ventanaImpresion.print(), 500);
  };

  if (modoCrear) {
    return (
      <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-2xl space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-bold text-blue-900 uppercase">🧪 Solicitud de Exámenes</h4>
          <button type="button" onClick={agregarEstudioNuevo} className="text-xs font-bold text-blue-600 bg-white border border-blue-200 px-3 py-1 rounded-lg hover:bg-blue-50 cursor-pointer">+ Agregar Examen</button>
        </div>
        <div className="space-y-2">
          {estudiosNuevos.map((est, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-11 gap-2 bg-white p-2.5 rounded-xl border border-blue-100 items-center">
              <input type="text" placeholder="Tipo de Estudio" value={est.tipo_estudio} onChange={(e) => actualizarEstudioNuevo(idx, 'tipo_estudio', e.target.value)} className="md:col-span-4 border rounded-lg p-1.5 text-xs outline-none" />
              <input type="text" placeholder="Laboratorio" value={est.laboratorio} onChange={(e) => actualizarEstudioNuevo(idx, 'laboratorio', e.target.value)} className="md:col-span-3 border rounded-lg p-1.5 text-xs outline-none" />
              <input type="text" placeholder="Resultados" value={est.observaciones} onChange={(e) => actualizarEstudioNuevo(idx, 'observaciones', e.target.value)} className="md:col-span-3 border rounded-lg p-1.5 text-xs outline-none" />
              <div className="md:col-span-1 text-center">
                {estudiosNuevos.length > 1 && <button type="button" onClick={() => eliminarEstudioNuevo(idx)} className="text-rose-500 font-bold">✕</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (modoEditar) {
    return <p className="text-xs text-slate-500 p-4 border rounded-xl bg-white">Los estudios no se editan directamente. Guarde la consulta y elimine o agregue nuevos estudios desde la vista detallada.</p>;
  }

  return (
    <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-2xs space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-xs font-bold text-blue-900 uppercase">
          🧪 Estudios / Laboratorios ({estudiosDeConsulta.length})
        </h4>
        <div className="flex gap-2">
          <button
            onClick={() => setMostrarModalEstudio(true)}
            className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg hover:bg-blue-100 cursor-pointer"
          >
            + Agregar
          </button>
          <button
            onClick={imprimirLaboratorio}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer"
          >
            🖨️ Imprimir
          </button>
        </div>
      </div>

      {estudiosDeConsulta.length === 0 ? (
        <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border">No hay estudios registrados.</p>
      ) : (
        <div className="space-y-2">
          {estudiosDeConsulta.map((est) => (
            <div key={est.id} className="p-3 bg-blue-50/40 border border-blue-200 rounded-xl flex justify-between items-center text-xs">
              <div>
                <span className="font-bold text-blue-900">{est.tipo_estudio}</span>
                <span className="text-slate-600 block text-[11px]">Lab: {est.laboratorio || 'N/E'} | Obs: {est.observaciones || 'Ninguna'}</span>
              </div>
              <button onClick={() => handleEliminarEstudio(est.id)} className="text-rose-500 hover:text-rose-700 font-bold cursor-pointer">🗑️</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}