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
    const cargarConfig = async () => {
      try {
        const res = await api.get('/api/configuracion');
        if (res.data) setConfigClinica(res.data);
      } catch (e) {
        console.error('Error cargando datos de clínica:', e);
      }
    };
    cargarConfig();
  }, []);

  const imprimirReceta = () => {
    if (!consultaSeleccionada || recetasDeConsulta.length === 0) {
      alert('No hay medicamentos en esta receta para imprimir.');
      return;
    }

    const c = consultaSeleccionada || {};
    const clinicaNombre = configClinica.nombre_clinica || 'CLINIC 365';
    const eslogan = configClinica.eslogan ? `<p class="slogan">${configClinica.eslogan}</p>` : '';
    const direccion = configClinica.direccion ? `<p class="meta-clinica">📍 ${configClinica.direccion}</p>` : '';
    const telefonoClinica = configClinica.telefono_clinica ? `<p class="meta-clinica">📞 ${configClinica.telefono_clinica}</p>` : '';
    const logoHtml = configClinica.logo_url 
      ? `<img src="${configClinica.logo_url}" alt="Logo" class="logo-img" />` 
      : '';

    // Renderizado condicional de signos vitales (omite vacíos)
    const signosItems = [];
    if (c.peso) signosItems.push(`<span><strong>Peso:</strong> ${c.peso}</span>`);
    if (c.talla) signosItems.push(`<span><strong>Talla:</strong> ${c.talla}</span>`);
    if (c.temperatura) signosItems.push(`<span><strong>Temp:</strong> ${c.temperatura}</span>`);
    if (c.presion_arterial) signosItems.push(`<span><strong>P.A.:</strong> ${c.presion_arterial}</span>`);

    const signosHtml = signosItems.length > 0 
      ? `<div class="signos-box">${signosItems.join(' &nbsp;|&nbsp; ')}</div>` 
      : '';

    const fechaStr = c.fecha_formateada || (c.fecha ? String(c.fecha).slice(0, 10) : new Date().toISOString().slice(0, 10));

    const ventana = window.open('', '_blank');
    ventana.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Receta Médica - ${paciente.nombre || 'Paciente'}</title>
          <style>
            @page { size: auto; margin: 15mm; }
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 10px;
              font-size: 13px;
              line-height: 1.5;
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #0f766e;
              padding-bottom: 12px;
              margin-bottom: 16px;
            }
            .logo-box {
              max-width: 110px;
              max-height: 80px;
            }
            .logo-img {
              max-width: 100px;
              max-height: 70px;
              object-fit: contain;
            }
            .clinica-info {
              text-align: right;
            }
            .clinica-title {
              font-size: 20px;
              font-weight: 800;
              color: #0f766e;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .slogan {
              font-size: 11px;
              font-style: italic;
              color: #64748b;
              margin: 2px 0 0 0;
            }
            .meta-clinica {
              font-size: 10px;
              color: #475569;
              margin: 2px 0 0 0;
            }
            .doc-title {
              text-align: center;
              font-size: 13px;
              font-weight: 700;
              letter-spacing: 2px;
              color: #334155;
              background-color: #f1f5f9;
              padding: 4px;
              border-radius: 6px;
              margin-bottom: 15px;
              text-transform: uppercase;
            }
            .paciente-box {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 10px 14px;
              margin-bottom: 15px;
              display: grid;
              grid-template-columns: 2fr 1fr;
              gap: 6px 16px;
              font-size: 12px;
            }
            .paciente-box div strong {
              color: #0f766e;
            }
            .signos-box {
              grid-column: span 2;
              background: #ffffff;
              border: 1px dashed #cbd5e1;
              border-radius: 6px;
              padding: 4px 10px;
              margin-top: 4px;
              font-size: 11px;
              color: #334155;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th {
              background-color: #f1f5f9;
              color: #0f766e;
              text-align: left;
              padding: 8px 10px;
              font-size: 11px;
              text-transform: uppercase;
              border-bottom: 1px solid #cbd5e1;
            }
            td {
              padding: 10px;
              border-bottom: 1px solid #f1f5f9;
              vertical-align: top;
              font-size: 12px;
            }
            .med-name {
              font-weight: 700;
              color: #0f172a;
              font-size: 13px;
            }
            .med-indicacion {
              color: #64748b;
              font-size: 11px;
              margin-top: 2px;
            }
            .footer-sign {
              margin-top: 60px;
              text-align: center;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .sign-line {
              width: 220px;
              border-top: 1px solid #475569;
              margin-bottom: 6px;
            }
            .sign-doctor {
              font-weight: 700;
              font-size: 12px;
              color: #1e293b;
            }
            .sign-sub {
              font-size: 11px;
              color: #64748b;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-box">
              ${logoHtml}
            </div>
            <div class="clinica-info">
              <h1 class="clinica-title">${clinicaNombre}</h1>
              ${eslogan}
              ${direccion}
              ${telefonoClinica}
            </div>
          </div>

          <div class="doc-title">Receta Médica / Prescripción</div>

          <div class="paciente-box">
            <div><strong>Paciente:</strong> ${paciente.nombre || 'Particular'}</div>
            <div><strong>Fecha:</strong> ${fechaStr}</div>
            <div><strong>Folio:</strong> #${String(paciente.id || 0).padStart(4, '0')}</div>
            <div><strong>Médico:</strong> ${c.doctor_nombre || 'Médico Tratante'}</div>
            ${c.diagnostico ? `<div style="grid-column: span 2;"><strong>Diagnóstico:</strong> ${c.diagnostico}</div>` : ''}
            ${signosHtml}
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 45%;">Medicamento & Indicación</th>
                <th style="width: 35%;">Frecuencia / Dosis</th>
                <th style="width: 20%; text-align: center;">Tratamiento</th>
              </tr>
            </thead>
            <tbody>
              ${recetasDeConsulta.map(r => `
                <tr>
                  <td>
                    <div class="med-name">${r.medicamento}</div>${r.indicacion ? `<div class="med-indicacion">${r.indicacion}</div>` : ''}
                  </td>
                  <td>${r.dosis_indicacion || 'Según indicación médica'}</td>
                  <td style="text-align: center;">${r.dias_tratamiento ? `${r.dias_tratamiento} días` : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer-sign">
            <div class="sign-line"></div>
            <div class="sign-doctor">${c.doctor_nombre || 'Firma y Sello Médico'}</div>
            <div class="sign-sub">Médico Responsable</div>
          </div>
        </body>
      </html>
    `);
    ventana.document.close();
    ventana.focus();
    setTimeout(() => ventana.print(), 500);
  };

  if (modoCrear || modoEditar) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
              💊 Receta Médica & Prescripción
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
              <input 
                type="text" 
                placeholder="Medicamento (ej. Amoxicilina 500mg)" 
                value={item.medicamento} 
                onChange={(e) => actualizarMedicamento(idx, 'medicamento', e.target.value)} 
                className="md:col-span-4 border rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500" 
              />
              <input 
                type="text" 
                placeholder="Frecuencia (Cada 8 hrs)" 
                value={item.frecuencia} 
                onChange={(e) => actualizarMedicamento(idx, 'frecuencia', e.target.value)} 
                className="md:col-span-3 border rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500" 
              />
              <input 
                type="number" 
                placeholder="Días (5)" 
                value={item.dias_tratamiento} 
                onChange={(e) => actualizarMedicamento(idx, 'dias_tratamiento', e.target.value)} 
                className="md:col-span-2 border rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500" 
              />
              <input 
                type="text" 
                placeholder="Indicaciones especiales" 
                value={item.indicacion} 
                onChange={(e) => actualizarMedicamento(idx, 'indicacion', e.target.value)} 
                className="md:col-span-2 border rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500" 
              />
              <div className="md:col-span-1 text-center">
                {medicamentos.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => eliminarMedicamento(idx)} 
                    className="text-rose-500 hover:text-rose-700 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
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
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          🖨️ Imprimir Receta con Membrete
        </button>
      </div>

      {recetasDeConsulta.length === 0 ? (
        <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border">
          No se emitieron medicamentos en esta atención.
        </p>
      ) : (
        <div className="space-y-2">
          {recetasDeConsulta.map((t) => (
            <div key={t.id} className="p-3 bg-white border border-slate-200 rounded-xl flex justify-between items-center text-xs shadow-2xs">
              <div>
                <span className="font-bold text-slate-800 text-sm">{t.medicamento}</span>
                <span className="text-slate-500 block text-[11px] mt-0.5">{t.dosis_indicacion}</span>
              </div>
              <span className="font-mono text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs">
                {t.dias_tratamiento} días
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}