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
  const imprimirReceta = () => {
    window.print();
  };

  // Cálculo de edad para la receta
  const calcularEdad = (fechaNac) => {
    if (!fechaNac) return paciente?.edad ? `${paciente.edad} años` : '---';
    const hoy = new Date();
    const nac = new Date(fechaNac);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad >= 0 ? `${edad} años` : '---';
  };

  const lista = (modoCrear || modoEditar) ? medicamentos : recetasDeConsulta;

  return (
    <div className="space-y-6">
      {/* Botón de impresión */}
      <div className="flex justify-between items-center no-print">
        <span className="text-xs text-slate-500 font-semibold">
          Vista previa y emisión de receta médica
        </span>
        <button
          type="button"
          onClick={imprimirReceta}
          className="bg-[#1b4e7b] hover:bg-blue-800 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
        >
          🖨️ Imprimir Receta
        </button>
      </div>

      {/* Editor interactivo cuando está en modo crear/editar */}
      {(modoCrear || modoEditar) && (
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 no-print">
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

      {/* PLANTILLA DE LA RECETA TAL CUAL LA IMAGEN */}
      <div className="receta-medica-print bg-white p-8 rounded-2xl border border-slate-300 shadow-sm max-w-2xl mx-auto font-sans text-slate-800">
        
        {/* ENCABEZADO MÉDICO */}
        <div className="text-center border-b-2 border-slate-700 pb-3 mb-4">
          <h2 className="text-xl font-black text-[#1b4e7b] tracking-wide uppercase">
            {consultaSeleccionada.doctor_nombre || 'DRA. LISEYDA MAYE'}
          </h2>
          <p className="text-xs font-bold text-slate-600 tracking-wider uppercase">
            Médico Internista
          </p>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
            Exeq: 504-20 • Centro Médico Especializado
          </p>
        </div>

        {/* CINTILLO DEL PACIENTE CON EDAD Y TEMPERATURA */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs mb-5">
          <div className="flex justify-between items-center mb-1.5">
            <div>
              <span className="font-bold text-slate-500">PACIENTE: </span>
              <span className="font-bold text-slate-900 uppercase">{paciente?.nombre || 'Nombre no registrado'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500">FECHA: </span>
              <span className="font-mono font-bold text-slate-900">
                {consultaSeleccionada?.fecha_formateada?.slice(0, 10) || new Date().toISOString().slice(0, 10)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] border-t border-slate-200 pt-1.5 mt-1.5">
            <div>
              <span className="font-bold text-slate-500">EDAD: </span>
              <span className="font-bold text-slate-800">{calcularEdad(paciente?.fecha_nacimiento)}</span>
            </div>
            {paciente?.responsable_nombre && (
              <div>
                <span className="font-bold text-slate-500">TUTOR/RESPONSABLE: </span>
                <span className="font-semibold text-slate-800">{paciente.responsable_nombre} ({paciente.responsable_parentesco || 'Tutor'})</span>
              </div>
            )}
            <div>
              <span className="font-bold text-slate-500">TEMP: </span>
              <span className="font-bold text-rose-600">{consultaSeleccionada?.temperatura || '---'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500">P.A: </span>
              <span className="font-semibold text-slate-800">{consultaSeleccionada?.presion_arterial || '---'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500">PESO: </span>
              <span className="font-semibold text-slate-800">{consultaSeleccionada?.peso || '---'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500">TALLA: </span>
              <span className="font-semibold text-slate-800">{consultaSeleccionada?.talla || '---'}</span>
            </div>
          </div>
        </div>

        {/* SIMBOLO RP / RX */}
        <div className="mb-4">
          <span className="text-2xl font-serif font-black italic text-blue-900">Rp.</span>
        </div>

        {/* LISTADO DE MEDICAMENTOS */}
        <div className="space-y-4 min-h-[220px] px-2">
          {lista.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No se han registrado medicamentos en esta consulta.</p>
          ) : (
            lista.map((med, i) => (
              <div key={i} className="border-b border-dashed border-slate-200 pb-2.5">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-xs text-slate-900">
                    {i + 1}. {med.medicamento || med.nombre}
                  </span>
                  {med.dias_tratamiento && (
                    <span className="text-[11px] text-slate-500 font-medium">
                      Por: {med.dias_tratamiento} días
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-600 italic pl-4 mt-0.5">
                  Tomar / Aplicar: {med.frecuencia || med.dosis_indicacion || 'Según indicación médica'}
                </div>
              </div>
            ))
          )}
        </div>

        {/* PIE DE RECETA: FIRMA Y SELLO */}
        <div className="mt-14 pt-6 border-t border-slate-200 flex justify-between items-end">
          <div className="text-[10px] text-slate-400">
            * Conserve esta receta durante su tratamiento.<br/>
            * En caso de reacción adversa suspenda y consulte a su médico.
          </div>
          <div className="text-center w-48">
            <div className="border-b border-slate-800 mb-1 w-full"></div>
            <p className="text-[11px] font-bold text-slate-800">Firma / Sello Médico</p>
            <p className="text-[9px] text-slate-500 uppercase">{consultaSeleccionada.doctor_nombre || 'Dra. Liseyda Maye'}</p>
          </div>
        </div>

      </div>
    </div>
  );
}