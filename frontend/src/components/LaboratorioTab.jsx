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
  handleEliminarEstudio,
  onActualizarExpediente,
  onRecargar
}) {
  const [configClinica, setConfigClinica] = useState({});
  const [estudioParaResultado, setEstudioParaResultado] = useState(null);
  const [formResultado, setFormResultado] = useState({ resultados_texto: '', documento_url: '' });
  const [guardandoResultado, setGuardandoResultado] = useState(false);
  const [cargandoRefresco, setCargandoRefresco] = useState(false);

  const funcionRecarga = onActualizarExpediente || onRecargar;

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

  const resolverNombreDoctor = (nombreGuardado) => {
    const nombresGenericos = [
      'dr consulta', 
      'dra. consulta', 
      'dr. consulta', 
      'médico tratante', 
      'dra. liseyda',
      'medico solicitante'
    ];
    const limpio = (nombreGuardado || '').trim().toLowerCase();

    if (!limpio || nombresGenericos.includes(limpio)) {
      return (
        localStorage.getItem('clinic_user_nombre') || 
        configClinica.nombre_doctor || 
        'Dra. Liseyda Maye'
      );
    }
    return nombreGuardado;
  };

  const ejecutarRecarga = async () => {
    if (!funcionRecarga) return;
    setCargandoRefresco(true);
    try {
      await funcionRecarga();
    } catch (e) {
      console.error('Error al refrescar estudios:', e);
    } finally {
      setTimeout(() => setCargandoRefresco(false), 500);
    }
  };

  const abrirCargarResultado = (est) => {
    setEstudioParaResultado(est);
    setFormResultado({
      resultados_texto: est.resultados_texto || '',
      documento_url: est.documento_url || est.archivo_url || ''
    });
  };

  const handleGuardarResultado = async (e) => {
    e.preventDefault();
    if (!estudioParaResultado) return;
    setGuardandoResultado(true);
    try {
      await api.put(`/api/estudios-clinicos/${estudioParaResultado.id}/resultado`, {
        resultados_texto: formResultado.resultados_texto,
        documento_url: formResultado.documento_url,
        estado: 'Completado'
      });
      alert('✅ Resultados guardados con éxito.');
      setEstudioParaResultado(null);
      if (funcionRecarga) await funcionRecarga();
    } catch (err) {
      console.error(err);
      alert('Error guardando los resultados del estudio.');
    } finally {
      setGuardandoResultado(false);
    }
  };

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

    const doctorTitular = resolverNombreDoctor(c.doctor_nombre);
    const fechaStr = c.fecha_formateada || (c.fecha ? String(c.fecha).slice(0, 10) : new Date().toISOString().slice(0, 10));

    const ventanaImpresion = window.open('', '_blank');
    ventanaImpresion.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Orden de Laboratorio - ${paciente.nombre || 'Paciente'}</title>
          <style>
            @page { 
              size: auto; 
              margin: 10mm 15mm; 
            }
            body { 
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
              padding: 0; 
              margin: 0;
              color: #1e293b; 
              font-size: 13px; 
              line-height: 1.5; 
            }
            .header { 
              display: flex; 
              align-items: center; 
              justify-content: space-between; 
              border-bottom: 2px solid #008f85; 
              padding-bottom: 10px; 
              margin-bottom: 14px; 
            }
            .logo-box { max-width: 110px; max-height: 80px; }
            .logo-img { max-width: 100px; max-height: 70px; object-fit: contain; }
            .clinica-info { text-align: right; }
            .clinica-title { font-size: 19px; font-weight: 800; color: #008f85; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
            .slogan { font-size: 11px; font-style: italic; color: #64748b; margin: 2px 0 0 0; }
            .meta-clinica { font-size: 10px; color: #475569; margin: 2px 0 0 0; }
            .doc-title { text-align: center; font-size: 12px; font-weight: 700; letter-spacing: 2px; color: #334155; background-color: #f0fdfa; border: 1px solid #ccfbf1; padding: 5px; border-radius: 6px; margin-bottom: 12px; text-transform: uppercase; }
            .info-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; display: grid; grid-template-columns: 2fr 1fr; gap: 6px 16px; font-size: 12px; }
            .info-box strong { color: #008f85; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background-color: #f0fdfa; color: #008f85; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #99f6e4; }
            td { padding: 9px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; font-size: 12px; }
            .footer-sign { margin-top: 50px; text-align: center; display: flex; flex-direction: column; align-items: center; }
            .sign-line { width: 220px; border-top: 1px solid #475569; margin-bottom: 6px; }
            .sign-doctor { font-weight: 700; font-size: 12px; color: #1e293b; }
            .sign-sub { font-size: 11px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-box">${logoHtml}</div>
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
            <div><strong>Fecha:</strong> ${fechaStr}</div>
            <div><strong>Folio:</strong> #${String(paciente.id || 0).padStart(4, '0')}</div>
            <div><strong>Médico Solicitante:</strong> ${doctorTitular}</div>
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
            <div class="sign-doctor">${doctorTitular}</div>
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
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-bold text-blue-900 uppercase">
            🧪 Estudios / Laboratorios ({estudiosDeConsulta.length})
          </h4>
          
          {funcionRecarga && (
            <button
              type="button"
              onClick={ejecutarRecarga}
              title="Actualizar lista de estudios"
              className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 transition cursor-pointer border border-slate-200 shadow-2xs"
            >
              <span className={`inline-block text-xs font-bold ${cargandoRefresco ? 'animate-spin' : ''}`}>
                🔄
              </span>
            </button>
          )}
        </div>

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
        <div className="space-y-3">
          {estudiosDeConsulta.map((est) => {
            const completado = est.estado === 'Completado' || Boolean(est.resultados_texto) || Boolean(est.documento_url);
            return (
              <div key={est.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm">{est.tipo_estudio}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${completado ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'}`}>
                        {completado ? '✅ Resultados Registrados' : '⏳ Pendiente de Resultados'}
                      </span>
                    </div>
                    <span className="text-slate-500 block text-[11px] mt-0.5">
                      Lab: {est.laboratorio || 'A elección'} | Indicaciones: {est.observaciones || 'Ninguna'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => abrirCargarResultado(est)}
                      className={`font-bold px-2.5 py-1 rounded-lg transition cursor-pointer text-[11px] ${completado ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100' : 'bg-amber-500 text-white hover:bg-amber-600 shadow-2xs'}`}
                    >
                      {completado ? '✏️ Modificar Resultado' : '📥 Cargar Resultado'}
                    </button>
                    <button 
                      onClick={() => handleEliminarEstudio(est.id)} 
                      className="text-rose-500 hover:text-rose-700 font-bold p-1 cursor-pointer"
                      title="Eliminar estudio"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {completado && (
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-slate-700 space-y-1 mt-2">
                    {est.resultados_texto && (
                      <p className="text-xs">
                        <strong>Hallazgos / Interpretación:</strong> {est.resultados_texto}
                      </p>
                    )}
                    {(est.documento_url || est.archivo_url) && (
                      <div className="pt-1">
                        <a
                          href={est.documento_url || est.archivo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 font-bold hover:underline text-[11px]"
                        >
                          📄 Ver Documento Adjunto / PDF
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL PARA CARGAR RESULTADOS Y PDF */}
      {estudioParaResultado && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-slate-800">
                📥 Registrar Resultado: {estudioParaResultado.tipo_estudio}
              </h3>
              <button onClick={() => setEstudioParaResultado(null)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleGuardarResultado} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Resultados / Interpretación Médica</label>
                <textarea
                  rows="3"
                  placeholder="Ej. Glucosa en 95 mg/dL. Hemograma con parámetros dentro de límites normales."
                  value={formResultado.resultados_texto}
                  onChange={(e) => setFormResultado({ ...formResultado, resultados_texto: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-2 outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Enlace del Resultado (PDF o Foto en Drive/Imgur)</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/..."
                  value={formResultado.documento_url}
                  onChange={(e) => setFormResultado({ ...formResultado, documento_url: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-2 outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Pegue un enlace público al archivo del examen.</span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setEstudioParaResultado(null)}
                  className="px-3 py-1.5 border rounded-lg text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoResultado}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold cursor-pointer transition disabled:opacity-50"
                >
                  {guardandoResultado ? 'Guardando...' : 'Guardar Resultado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}