import React from 'react';

export default function RecetaTab({
  modoCrear,
  modoEditar,
  paciente = {},
  consultaSeleccionada = {},
  medicamentos = [],
  agregarMedicamento,
  actualizarMedicamento,
  eliminarMedicamento,
  recetasDeConsulta = []
}) {
  const lista = (modoCrear || modoEditar) ? medicamentos : recetasDeConsulta;

  // Cálculo de edad para el membrete
  const calcularEdad = (fechaNac) => {
    if (!fechaNac) return paciente?.edad ? `${paciente.edad} años` : '---';
    const hoy = new Date();
    const nac = new Date(fechaNac);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad >= 0 ? `${edad} años` : '---';
  };

  const imprimirReceta = () => {
    if (lista.length === 0) {
      alert('No hay medicamentos registrados para imprimir.');
      return;
    }

    // Recopilar datos de la consulta para el membrete
    const doctorTitular = consultaSeleccionada.doctor_nombre || 'DRA. LISEYDA MAYE';
    const pacienteNombre = paciente?.nombre || 'Nombre no registrado';
    const fecha = consultaSeleccionada?.fecha_formateada?.slice(0, 10) || new Date().toISOString().slice(0, 10);
    const edadStr = calcularEdad(paciente?.fecha_nacimiento);
    const temp = consultaSeleccionada?.temperatura || '---';
    const pa = consultaSeleccionada?.presion_arterial || '---';
    const peso = consultaSeleccionada?.peso || '---';
    const talla = consultaSeleccionada?.talla || '---';
    const tutor = paciente?.responsable_nombre ? `${paciente.responsable_nombre} (${paciente.responsable_parentesco || 'Tutor'})` : '';

    // Generar la lista de fármacos en HTML
    const medicamentosHtml = lista.map((med, i) => `
      <div style="border-bottom: 1px dashed #cbd5e1; padding-bottom: 12px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span style="font-weight: 800; font-size: 15px; color: #0f172a;">${i + 1}. ${med.medicamento || med.nombre}</span>
          ${med.dias_tratamiento ? `<span style="font-size: 12px; color: #64748b; font-weight: 600;">Por: ${med.dias_tratamiento} días</span>` : ''}
        </div>
        <div style="font-size: 13px; color: #475569; font-style: italic; margin-top: 4px; padding-left: 15px;">
          Tomar / Aplicar: ${med.frecuencia || med.dosis_indicacion || 'Según indicación médica'}
        </div>
      </div>
    `).join('');

    // Abrir ventana aislada solo con el diseño de la receta
    const ventana = window.open('', '_blank');
    ventana.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Receta Médica - ${pacienteNombre}</title>
          <style>
            @page { size: auto; margin: 15mm; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5; margin: 0; padding: 0; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
            
            /* ENCABEZADO MÉDICO */
            .header { text-align: center; border-bottom: 2px solid #334155; padding-bottom: 15px; margin-bottom: 20px; }
            .doc-name { font-size: 24px; font-weight: 900; color: #1b4e7b; text-transform: uppercase; margin: 0; letter-spacing: 1px; }
            .doc-esp { font-size: 14px; font-weight: 700; color: #475569; text-transform: uppercase; margin: 5px 0; }
            .doc-meta { font-size: 12px; color: #64748b; font-family: monospace; margin: 0; }
            
            /* CINTILLO DEL PACIENTE Y SIGNOS */
            .patient-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; margin-bottom: 25px; }
            .patient-row-1 { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
            .patient-row-2 { display: flex; flex-wrap: wrap; gap: 15px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 12px; }
            .label { font-weight: 700; color: #64748b; }
            .val { font-weight: 700; color: #0f172a; }
            .val-red { font-weight: 700; color: #e11d48; }
            
            /* SÍMBOLO RP Y CUERPO */
            .rp { font-size: 32px; font-family: serif; font-weight: 900; font-style: italic; color: #1e3a8a; margin-bottom: 20px; }
            .meds-container { min-height: 300px; }
            
            /* PIE DE FIRMA */
            .footer { margin-top: 60px; border-top: 1px solid #e2e8f0; padding-top: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
            .warnings { font-size: 11px; color: #94a3b8; line-height: 1.6; }
            .signature { text-align: center; width: 250px; }
            .sign-line { border-bottom: 1px solid #0f172a; margin-bottom: 5px; height: 40px; }
            .sign-text { font-size: 12px; font-weight: 800; color: #0f172a; margin: 0; }
            .sign-sub { font-size: 10px; color: #64748b; text-transform: uppercase; margin: 2px 0 0 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 class="doc-name">${doctorTitular}</h2>
              <p class="doc-esp">Médico Internista</p>
              <p class="doc-meta">Exeq: 504-20 • Centro Médico Especializado</p>
            </div>

            <div class="patient-box">
              <div class="patient-row-1">
                <div><span class="label">PACIENTE:</span> <span class="val" style="text-transform: uppercase;">${pacienteNombre}</span></div>
                <div><span class="label">FECHA:</span> <span class="val font-mono">${fecha}</span></div>
              </div>
              <div class="patient-row-2">
                <div><span class="label">EDAD:</span> <span class="val">${edadStr}</span></div>
                ${tutor ? `<div><span class="label">TUTOR:</span> <span class="val">${tutor}</span></div>` : ''}
                <div><span class="label">TEMP:</span> <span class="val-red">${temp}</span></div>
                <div><span class="label">P.A:</span> <span class="val">${pa}</span></div>
                <div><span class="label">PESO:</span> <span class="val">${peso}</span></div>
                <div><span class="label">TALLA:</span> <span class="val">${talla}</span></div>
              </div>
            </div>

            <div class="rp">Rp.</div>

            <div class="meds-container">
              ${medicamentosHtml}
            </div>

            <div class="footer">
              <div class="warnings">
                * Conserve esta receta durante su tratamiento.<br/>
                * En caso de reacción adversa suspenda y consulte a su médico.
              </div>
              <div class="signature">
                <div class="sign-line"></div>
                <p class="sign-text">Firma / Sello Médico</p>
                <p class="sign-sub">${doctorTitular}</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    ventana.document.close();
    ventana.focus();
    setTimeout(() => ventana.print(), 500);
  };

  return (
    <div className="space-y-6">
      {/* BOTÓN DE IMPRESIÓN */}
      <div className="flex justify-between items-center no-print">
        <span className="text-xs text-slate-500 font-semibold">
          Gestión de prescripción médica
        </span>
        <button
          type="button"
          onClick={imprimirReceta}
          className="bg-[#1b4e7b] hover:bg-blue-800 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
        >
          🖨️ Imprimir Receta
        </button>
      </div>

      {/* MODO EDICIÓN / CREACIÓN */}
      {(modoCrear || modoEditar) && (
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
              Medicamentos a prescribir
            </h4>
            <button
              type="button"
              onClick={agregarMedicamento}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              ➕ Añadir Fármaco
            </button>
          </div>

          <div className="space-y-2">
            {medicamentos.map((m, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 bg-white p-2.5 rounded-xl border border-slate-200 items-center">
                <div className="col-span-5">
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Medicamento / Presentación</label>
                  <input
                    type="text"
                    placeholder="Ej. Paracetamol 500mg tab"
                    value={m.medicamento}
                    onChange={(e) => actualizarMedicamento(idx, 'medicamento', e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-1.5 font-medium outline-none focus:border-blue-500"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Frecuencia / Posología</label>
                  <input
                    type="text"
                    placeholder="Ej. Cada 8 horas"
                    value={m.frecuencia}
                    onChange={(e) => actualizarMedicamento(idx, 'frecuencia', e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-1.5 outline-none focus:border-blue-500"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Duración (Días)</label>
                  <input
                    type="number"
                    placeholder="Ej. 5"
                    value={m.dias_tratamiento}
                    onChange={(e) => actualizarMedicamento(idx, 'dias_tratamiento', e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-1.5 outline-none focus:border-blue-500"
                  />
                </div>
                <div className="col-span-1 flex justify-center pt-3">
                  <button
                    type="button"
                    onClick={() => eliminarMedicamento(idx)}
                    className="text-rose-500 hover:text-rose-700 text-base font-bold cursor-pointer"
                    title="Eliminar medicamento"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VISTA PREVIA EN PANTALLA (SOLO LECTURA) */}
      {!modoCrear && !modoEditar && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <h4 className="text-xs font-black text-slate-800 uppercase border-b border-slate-200 pb-2 mb-4">
            Receta Emitida
          </h4>
          {lista.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No hay medicamentos registrados.</p>
          ) : (
            <div className="space-y-3">
              {lista.map((med, i) => (
                <div key={i} className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{i + 1}. {med.medicamento || med.nombre}</p>
                    <p className="text-xs text-slate-500 italic">Tomar: {med.frecuencia || med.dosis_indicacion}</p>
                  </div>
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-md">
                    {med.dias_tratamiento} días
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}