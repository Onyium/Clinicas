import React from 'react';

export default function RecetaTab({
  modoCrear,
  modoEditar,
  paciente,
  consultaSeleccionada,
  medicamentos,
  agregarMedicamento,
  actualizarMedicamento,
  eliminarMedicamento,
  recetasDeConsulta
}) {
  const imprimirReceta = () => {
    if (!consultaSeleccionada || recetasDeConsulta.length === 0) {
      alert('No hay medicamentos en esta receta para imprimir.');
      return;
    }

    const ventanaImpresion = window.open('', '_blank');
    ventanaImpresion.document.write(`
      <html>
        <head>
          <title>Receta Médica - Clinic 365</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #1b4e7b; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { color: #1b4e7b; margin: 0; font-size: 22px; }
            .header p { margin: 2px 0; font-size: 12px; color: #666; }
            .info { margin-bottom: 20px; font-size: 13px; }
            .info p { margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f8fafc; color: #1b4e7b; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; border-top: 1px dashed #ccc; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>CLINIC 365 - RÉCIPE MÉDICO</h1>
            <p>Consultorio Médico Especializado</p>
          </div>
          <div class="info">
            <p><strong>Paciente:</strong> ${paciente.nombre}</p>
            <p><strong>Folio:</strong> P${String(paciente.id).padStart(3, '0')} | <strong>Fecha:</strong> ${consultaSeleccionada.fecha_formateada || 'Hoy'}</p>
            <p><strong>Médico Tratante:</strong> ${consultaSeleccionada.doctor_nombre}</p>
            <p><strong>Diagnóstico:</strong> ${consultaSeleccionada.diagnostico || 'N/D'}</p>
          </div>
          <h3>Prescripción Farmacológica:</h3>
          <table>
            <thead>
              <tr>
                <th>Medicamento</th>
                <th>Frecuencia / Dosis</th>
                <th>Duración</th>
                <th>Indicaciones</th>
              </tr>
            </thead>
            <tbody>
              ${recetasDeConsulta.map(r => `
                <tr>
                  <td><strong>${r.medicamento}</strong></td>
                  <td>${r.dosis_indicacion || 'Cada 8 horas'}</td>
                  <td>${r.dias_tratamiento} días</td>
                  <td>${r.indicacion || 'Sig. Med.'}</td>
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

  if (modoCrear || modoEditar) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
              💊 Receta Médica & Recordatorios
            </h4>
            <p className="text-[11px] text-slate-500">Agregue los fármacos indicados</p>
          </div>
          <button
            type="button"
            onClick={agregarMedicamento}
            className="text-xs font-bold text-blue-600 bg-white border border-blue-200 px-3 py-1 rounded-lg hover:bg-blue-50 transition cursor-pointer"
          >
            + Agregar Fármaco
          </button>
        </div>

        <div className="space-y-2">
          {medicamentos.map((item, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 bg-white p-2.5 rounded-xl border border-slate-200 items-center">
              <input type="text" placeholder="Medicamento" value={item.medicamento} onChange={(e) => actualizarMedicamento(idx, 'medicamento', e.target.value)} className="md:col-span-4 border rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500" />
              <input type="text" placeholder="Frecuencia" value={item.frecuencia} onChange={(e) => actualizarMedicamento(idx, 'frecuencia', e.target.value)} className="md:col-span-3 border rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500" />
              <input type="number" placeholder="Días" value={item.dias_tratamiento} onChange={(e) => actualizarMedicamento(idx, 'dias_tratamiento', e.target.value)} className="md:col-span-2 border rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500" />
              <input type="text" placeholder="Indicación" value={item.indicacion} onChange={(e) => actualizarMedicamento(idx, 'indicacion', e.target.value)} className="md:col-span-2 border rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500" />
              <div className="md:col-span-1 text-center">
                {medicamentos.length > 1 && (
                  <button type="button" onClick={() => eliminarMedicamento(idx)} className="text-rose-500 hover:text-rose-700 text-xs font-bold cursor-pointer">✕</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-2xs space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-xs font-bold text-slate-700 uppercase">
          Medicamentos Recetados ({recetasDeConsulta.length})
        </h4>
        <button
          onClick={imprimirReceta}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer"
        >
          🖨️ Imprimir Receta
        </button>
      </div>

      {recetasDeConsulta.length === 0 ? (
        <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border">No se emitieron medicamentos en esta atención.</p>
      ) : (
        <div className="space-y-2">
          {recetasDeConsulta.map((t) => (
            <div key={t.id} className="p-3 bg-white border border-slate-200 rounded-xl flex justify-between items-center text-xs shadow-2xs">
              <div>
                <span className="font-bold text-slate-800">{t.medicamento}</span>
                <span className="text-slate-500 block text-[11px]">{t.dosis_indicacion}</span>
              </div>
              <span className="font-mono text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                {t.dias_tratamiento} días
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}