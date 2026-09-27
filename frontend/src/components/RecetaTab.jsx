import React, { useState, useEffect } from 'react';
import api from '../api';

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
  const [configClinica, setConfigClinica] = useState({});

  useEffect(() => {
    const cargarConfiguracion = async () => {
      try {
        const res = await api.get('/api/configuracion');
        if (res.data) setConfigClinica(res.data);
      } catch (err) {
        console.error('Error cargando configuración para receta:', err);
      }
    };
    cargarConfiguracion();
  }, []);

  const lista = (modoCrear || modoEditar) ? medicamentos : recetasDeConsulta;

  const calcularEdad = (fechaNac) => {
    if (!fechaNac) return paciente?.edad ? `${paciente.edad} Años` : '---';
    const hoy = new Date();
    const nac = new Date(fechaNac);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad >= 0 ? `${edad} Años` : '---';
  };

  const imprimirReceta = () => {
    if (lista.length === 0) {
      alert('No hay medicamentos registrados para imprimir.');
      return;
    }

    // Datos dinámicos del doctor y clínica
    const clinicaNombre = configClinica.nombre_clinica || 'CLÍNICA MÉDICA FAMILIAR';
    const doctorTitular = consultaSeleccionada.doctor_nombre || configClinica.nombre_doctor || 'Dra. Liseyda Driscla Maye Menjivar';
    const jvpm = configClinica.jvpm || 'JVPM No. 15381';
    const direccion = configClinica.direccion || 'Avenida San Juan número 9, Nahuizalco, Sonsonate';
    const telefono = configClinica.telefono_clinica || '6142-8924';
    const horario = configClinica.horario_atencion || 'Lunes a Viernes 8:00 AM - 12:00 MD';
    const logoUrl = configClinica.logo_url || '';

    // Datos del paciente
    const pacienteNombre = paciente?.nombre || 'Nombre no registrado';
    const fecha = consultaSeleccionada?.fecha_formateada?.slice(0, 10) || (consultaSeleccionada?.fecha ? String(consultaSeleccionada.fecha).slice(0, 10) : new Date().toISOString().slice(0, 10));
    const edadStr = calcularEdad(paciente?.fecha_nacimiento);
    const temp = consultaSeleccionada?.temperatura ? ` | Temp: ${consultaSeleccionada.temperatura}` : '';
    const pa = consultaSeleccionada?.presion_arterial ? ` | P.A: ${consultaSeleccionada.presion_arterial}` : '';

    // Generar medicamentos numerados
    const medicamentosHtml = lista.map((med, i) => `
      <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
        <div style="background-color: #0b4f6c; color: white; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; shrink-0;">
          ${i + 1}
        </div>
        <div style="flex: 1;">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <span style="font-weight: 800; font-size: 13px; color: #0f172a; text-transform: uppercase;">
              ${med.medicamento || med.nombre}
            </span>
            ${med.dias_tratamiento ? `<span style="font-size: 11px; color: #64748b; font-weight: 600;">Por: ${med.dias_tratamiento} días</span>` : ''}
          </div>
          <div style="font-size: 11.5px; color: #334155; font-style: italic; margin-top: 2px;">
            ${med.frecuencia || med.dosis_indicacion || 'Tomar según indicación médica'}
          </div>
        </div>
      </div>
    `).join('');

    const ventana = window.open('', '_blank');
    ventana.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Receta Médica - ${pacienteNombre}</title>
          <style>
            @page { size: auto; margin: 12mm 15mm; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 0; line-height: 1.4; }
            .receta-container { max-width: 720px; margin: 0 auto; }
            
            /* HEADER IDENTICO A LA PLANTILLA */
            .header-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 20px; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 15px; }
            
            .header-left { display: flex; align-items: center; gap: 12px; }
            .logo-img { max-width: 80px; max-height: 80px; object-fit: contain; }
            .clinica-tag { font-size: 11px; font-weight: 800; color: #0284c7; letter-spacing: 2px; text-transform: uppercase; margin: 0; }
            .clinica-title { font-size: 22px; font-weight: 900; color: #0f2d4a; margin: 0; line-height: 1.1; text-transform: uppercase; }
            .doc-name { font-size: 12px; font-weight: 700; color: #1e293b; margin-top: 4px; }
            .doc-badge { display: inline-block; background-color: #0b4f6c; color: white; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 20px; margin-top: 3px; }
            
            .header-right { border-left: 1px solid #cbd5e1; padding-left: 16px; font-size: 10.5px; color: #334155; }
            .meta-item { margin-bottom: 6px; }
            .meta-item strong { display: block; color: #0b4f6c; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
            
            /* CINTILLO DEL PACIENTE */
            .patient-box { border: 1.5px solid #0284c7; border-radius: 12px; padding: 10px 16px; margin-bottom: 15px; display: grid; grid-template-columns: 2fr 1fr; gap: 10px; font-size: 12px; }
            .patient-field { display: flex; gap: 6px; align-items: baseline; }
            .field-label { font-weight: 800; color: #0b4f6c; font-size: 11px; text-transform: uppercase; }
            .field-value { font-weight: 700; color: #0f172a; border-bottom: 1px solid #94a3b8; flex: 1; padding-bottom: 1px; }

            /* CUERPO DE PRESCRIPCION */
            .rx-box { border: 1.5px solid #0284c7; border-radius: 14px; padding: 16px 20px; min-height: 380px; position: relative; }
            .rx-header { text-align: center; margin-bottom: 15px; }
            .rx-symbol { font-size: 28px; font-family: serif; font-weight: 900; font-style: italic; color: #0b4f6c; line-height: 1; margin: 0; }
            .rx-title { font-size: 11px; font-weight: 800; color: #0284c7; letter-spacing: 3px; text-transform: uppercase; margin: 0; }
            
            .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.04; font-size: 160px; pointer-events: none; }
            
            /* PIE DE FIRMA */
            .footer-sign { margin-top: 30px; text-align: center; display: flex; flex-direction: column; align-items: center; }
            .sign-line { width: 240px; border-top: 1.5px solid #0b4f6c; margin-bottom: 4px; }
            .sign-title { font-size: 10px; font-weight: 800; color: #0b4f6c; letter-spacing: 1.5px; text-transform: uppercase; }
            .sign-sub { font-size: 9.5px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="receta-container">
            
            <!-- ENCABEZADO -->
            <div class="header-grid">
              <div class="header-left">
                ${logoUrl 
                  ? `<img src="${logoUrl}" class="logo-img" alt="Logo" />` 
                  : `<div style="font-size: 40px; color: #0b4f6c;">⚕️</div>`
                }
                <div>
                  <p class="clinica-tag">Clínica Médica</p>
                  <h1 class="clinica-title">${clinicaNombre}</h1>
                  <div class="doc-name">${doctorTitular}</div>
                  <div class="doc-badge">${jvpm}</div>
                </div>
              </div>

              <div class="header-right">
                <div class="meta-item">
                  <strong>📍 Dirección</strong>
                  ${direccion}
                </div>
                <div class="meta-item">
                  <strong>📞 Teléfono / WhatsApp</strong>
                  ${telefono}
                </div>
                <div class="meta-item">
                  <strong>🕒 Horario de Atención</strong>
                  ${horario}
                </div>
              </div>
            </div>

            <!-- CINTILLO PACIENTE -->
            <div class="patient-box">
              <div class="patient-field">
                <span class="field-label">Nombre:</span>
                <span class="field-value">${pacienteNombre}</span>
              </div>
              <div class="patient-field">
                <span class="field-label">Edad:</span>
                <span class="field-value">${edadStr}</span>
              </div>
              <div class="patient-field">
                <span class="field-label">Fecha:</span>
                <span class="field-value">${fecha}${temp}${pa}</span>
              </div>
              <div class="patient-field">
                <span class="field-label">Folio:</span>
                <span class="field-value">#${String(paciente.id || 0).padStart(4, '0')}</span>
              </div>
            </div>

            <!-- CUERPO RECETA RX -->
            <div class="rx-box">
              <div class="watermark">⚕️</div>
              <div class="rx-header">
                <div class="rx-symbol">Rx</div>
                <div class="rx-title">Receta Médica</div>
              </div>

              <div>
                ${medicamentosHtml}
              </div>
            </div>

            <!-- FIRMA Y SELLO -->
            <div class="footer-sign">
              <div class="sign-line"></div>
              <div class="sign-title">Firma y Sello del Médico</div>
              <div class="sign-sub">${doctorTitular} • ${jvpm}</div>
            </div>

          </div>

          <!-- SCRIPT INYECTADO PARA NO CONGELAR REACT -->
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 400);
            };
          </script>
        </body>
      </html>
    `);
    ventana.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center no-print">
        <span className="text-xs text-slate-500 font-semibold">
          Prescripción médica y tratamiento
        </span>
        <button
          type="button"
          onClick={imprimirReceta}
          className="bg-[#1b4e7b] hover:bg-blue-800 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
        >
          🖨️ Imprimir Receta
        </button>
      </div>

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
                    placeholder="Ej. Amoxicilina 500mg cápsulas"
                    value={m.medicamento}
                    onChange={(e) => actualizarMedicamento(idx, 'medicamento', e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-1.5 font-medium outline-none focus:border-blue-500"
                  />
                </div>
                <div className="col-span-4">
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Frecuencia / Vía / Indicaciones</label>
                  <input
                    type="text"
                    placeholder="Ej. 1 cada 8 horas después de comer"
                    value={m.frecuencia}
                    onChange={(e) => actualizarMedicamento(idx, 'frecuencia', e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-1.5 outline-none focus:border-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Días</label>
                  <input
                    type="number"
                    placeholder="5"
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

      {!modoCrear && !modoEditar && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <h4 className="text-xs font-black text-slate-800 uppercase border-b border-slate-200 pb-2 mb-4">
            Receta Emitida
          </h4>
          {lista.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No hay medicamentos registrados en esta consulta.</p>
          ) : (
            <div className="space-y-3">
              {lista.map((med, i) => (
                <div key={i} className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{i + 1}. {med.medicamento || med.nombre}</p>
                    <p className="text-xs text-slate-500 italic">Indicación: {med.frecuencia || med.dosis_indicacion}</p>
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