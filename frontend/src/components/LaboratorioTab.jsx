import React, { useState, useEffect } from 'react';
import api from '../api';

export default function LaboratorioTab({
  modoCrear,
  modoEditar,
  paciente = {},
  consultaSeleccionada = {},
  estudiosNuevos = [],
  agregarEstudioNuevo,
  actualizarEstudioNuevo,
  eliminarEstudioNuevo,
  estudiosDeConsulta = [],
  setMostrarModalEstudio,
  handleEliminarEstudio
}) {
  const [configClinica, setConfigClinica] = useState({});

  useEffect(() => {
    const cargarConfig = async () => {
      try {
        const res = await api.get('/api/configuracion');
        if (res.data) setConfigClinica(res.data);
      } catch (e) {
        console.error('Error cargando configuración:', e);
      }
    };
    cargarConfig();
  }, []);

  const imprimirLaboratorio = () => {
    if (!consultaSeleccionada || estudiosDeConsulta.length === 0) {
      alert('No hay estudios clínicos registrados para imprimir.');
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

    const ventanaImpresion = window.open('', '_blank');
    ventanaImpresion.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Orden de Laboratorio - ${paciente.nombre || 'Paciente'}</title>
          <style>
            @page { size: auto; margin: 15mm; }
            body { 
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
              padding: 10px; 
              color: #1e293b; 
              font-size: 13px;
              line-height: 1.5;
            }
            .header { 
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #008f85; 
              padding-bottom: 12px; 
              margin-bottom: 16px; 
            }
            .logo-box { max-width: 110px; max-height: 80px; }
            .logo-img { max-width: 100px; max-height: 70px; object-fit: contain; }
            .clinica-info { text-align: right; }
            .clinica-title { 
              font-size: 20px; 
              font-weight: 800; 
              color: #008f85; 
              margin: 0; 
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .slogan { font-size: 11px; font-style: italic; color: #64748b; margin: 2px 0 0 0; }
            .meta-clinica { font-size: 10px; color: #475569; margin: 2px 0 0 0; }
            .doc-title {
              text-align: center;
              font-size: 13px;
              font-weight: 700;
              letter-spacing: 2px;
              color: #334155;
              background-color: #f0fdfa;
              border: 1px solid #ccfbf1;
              padding: 4px;
              border-radius: 6px;
              margin-bottom: 15px;
              text-transform: uppercase;
            }
            .info-box { 
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
            .info-box strong { color: #008f85; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { 
              background-color: #f0fdfa; 
              color: #008f85; 
              text-align: left;
              padding: 8px 10px;
              font-size: 11px;
              text-transform: uppercase;
              border-bottom: 1px solid #99f6e4;
            }
            td { 
              padding: 10px; 
              border-bottom: 1px solid #f1f5f9; 
              vertical-align: top;
              font-size: 12px;
            }
            .footer-sign { 
              margin-top: 60px; 
              text-align: center; 
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .sign-line { width: 220px; border-top: 1px solid #475569; margin-bottom: 6px; }
            .sign-doctor { font-weight: 700; font-size: 12px; color: #1e293b; }
            .sign-sub { font-size: 11px; color: #64748b; }
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

          <div class="doc-title">Orden de Laboratorio & Exámenes Clínicos</div>

          <div class="info-box">
            <div><strong>Paciente:</strong> ${paciente.nombre || 'Particular'}</div>
            <div><strong>Fecha:</strong> ${c.fecha_formateada || (c.fecha ? String(c.fecha).slice(0, 10) : new Date().toISOString().slice(0, 10))}</div>
            <div><strong>Folio:</strong> #${String(paciente.id || 0).padStart(4, '0')}</div>
            <div><strong>Médico Solicitante:</strong> ${c.doctor_nombre || 'Médico Tratante'}</div>
            ${c.diagnostico ? `<div style="grid-column: span 2;"><strong>Diagnóstico Presuntivo:</strong> ${c.diagnostico}</div>` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 45%;">Examen o Estudio Solicitado</th>
                <th style="width: 25%;">Laboratorio Sugerido</th>
                <th style="width: 30%;">Indicaciones / Observaciones</th>
              </tr>
            </thead>
            <tbody>
              ${estudiosDeConsulta.map(e => `
                <tr>
                  <td><strong>${e.tipo_estudio}</strong></td>
                  <td>${e.laboratorio || 'A elección del paciente'}</td>
                  <td>${e.observaciones || 'Ninguna indicación especial'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer-sign">
            <div class="sign-line"></div>
            <div class="sign-doctor">${c.doctor_nombre || 'Firma y Sello Médico'}</div>
            <div class="sign-sub">Médico Solicitante</div>
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
          <button 
            type="button" 
            onClick={agregarEstudioNuevo} 
            className="text-xs font-bold text-blue-600 bg-white border border-blue-200 px-3 py-1 rounded-lg hover:bg-blue-50 cursor-pointer"
          >
            + Agregar Examen
          </button>
        </div>
        <div className="space-y-2">
          {estudiosNuevos.map((est, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-11 gap-2 bg-white p-2.5 rounded-xl border border-blue-100 items-center">
              <input type="text" placeholder="Tipo de Estudio (ej. Hemograma)" value={est.tipo_estudio} onChange={(e) => actualizarEstudioNuevo(idx, 'tipo_estudio', e.target.value)} className="md:col-span-4 border rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500" />
              <input type="text" placeholder="Laboratorio (opcional)" value={est.laboratorio} onChange={(e) => actualizarEstudioNuevo(idx, 'laboratorio', e.target.value)} className="md:col-span-3 border rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500" />
              <input type="text" placeholder="Observaciones / Ayuno" value={est.observaciones} onChange={(e) => actualizarEstudioNuevo(idx, 'observaciones', e.target.value)} className="md:col-span-3 border rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500" />
              <div className="md:col-span-1 text-center">
                {estudiosNuevos.length > 1 && (
                  <button type="button" onClick={() => eliminarEstudioNuevo(idx)} className="text-rose-500 font-bold hover:text-rose-700 cursor-pointer">✕</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (modoEditar) {
    return (
      <p className="text-xs text-slate-500 p-4 border rounded-xl bg-white">
        Los estudios se gestionan directamente desde la vista detallada de la consulta una vez guardada.
      </p>
    );
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
            className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 cursor-pointer"
          >
            + Agregar Examen
          </button>
          <button
            onClick={imprimirLaboratorio}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer"
          >
            🖨️ Imprimir Orden
          </button>
        </div>
      </div>

      {estudiosDeConsulta.length === 0 ? (
        <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border">No hay estudios registrados en esta fecha.</p>
      ) : (
        <div className="space-y-2">
          {estudiosDeConsulta.map((est) => (
            <div key={est.id} className="p-3 bg-blue-50/40 border border-blue-200 rounded-xl flex justify-between items-center text-xs">
              <div>
                <span className="font-bold text-blue-900">{est.tipo_estudio}</span>
                <span className="text-slate-600 block text-[11px] mt-0.5">Lab: {est.laboratorio || 'A elección'} | Obs: {est.observaciones || 'Ninguna'}</span>
              </div>
              <button 
                onClick={() => handleEliminarEstudio(est.id)} 
                className="text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                title="Eliminar estudio"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}