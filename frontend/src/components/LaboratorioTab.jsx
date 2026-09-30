import React, { useState, useEffect } from 'react';
import api from '../api';
import { toast } from 'sonner';
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
  const [subiendoResultado, setSubiendoResultado] = useState(false);

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
      'medico solicitante'
    ];
    const limpio = (nombreGuardado || '').trim().toLowerCase();

    if (!limpio || nombresGenericos.includes(limpio)) {
      return (
        localStorage.getItem('clinic_user_nombre') || 
        configClinica.nombre_doctor || 
        'Dra. Liseyda Driscla Maye Menjivar'
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
      toast.success('✅ Resultados guardados con éxito.');
      setEstudioParaResultado(null);
      if (funcionRecarga) await funcionRecarga();
    } catch (err) {
      console.error(err);
      toast.error('Error guardando los resultados del estudio.');
    } finally {
      setGuardandoResultado(false);
    }
  };

  const handleSubirResultado = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  // Ojo: revisa si tu backend espera el campo 'logo' o 'file' en multer
  formData.append('logo', file); 

  setSubiendoResultado(true);
  const toastId = toast.loading('Subiendo documento...');

  try {
    const res = await api.post('/api/upload-logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    // Guardamos la URL de Cloudinary en el formulario del resultado
    setFormResultado(prev => ({ ...prev, documento_url: res.data.url }));
    toast.success('Documento subido correctamente', { id: toastId });
  } catch (err) {
    console.error(err);
    toast.error('Error al subir el archivo al servidor.', { id: toastId });
  } finally {
    setSubiendoResultado(false);
    e.target.value = '';
  }
};

  const imprimirLaboratorio = () => {
    if (!consultaSeleccionada || estudiosDeConsulta.length === 0) {
      toast.error('No hay estudios clínicos registrados para imprimir.');
      return;
    }

    const c = consultaSeleccionada || {};
    
    // Variables dinámicas
    const clinicaNombre = configClinica.nombre_clinica || 'CLÍNICA MÉDICA FAMILIAR';
    const doctorTitular = resolverNombreDoctor(c.doctor_nombre);
    const jvpm = configClinica.jvpm || 'JVPM No. 15381';
    const direccion = configClinica.direccion || 'Avenida San Juan número 9, Nahuizalco, Sonsonate';
    const telefono = configClinica.telefono_clinica || '6142-8924';
    const horario = configClinica.horario_atencion || 'Lunes a Viernes 8:00 AM - 12:00 MD';
    const logoUrl = configClinica.logo_url || '';

    const fechaStr = c.fecha_formateada || (c.fecha ? String(c.fecha).slice(0, 10) : new Date().toISOString().slice(0, 10));
    const pacienteNombre = paciente.nombre || 'Particular';

    // 🔥 SOLUCIÓN DEFINITIVA (BLOB HTML)
    const htmlCompleto = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Orden de Laboratorio - ${pacienteNombre}</title>
          <style>
            @page { size: auto; margin: 12mm 15mm; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 0; line-height: 1.4; font-size: 13px; }
            .orden-container { max-width: 720px; margin: 0 auto; }
            
            .header-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 20px; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 14px; margin-bottom: 15px; }
            .header-left { display: flex; align-items: center; gap: 12px; }
            .logo-img { max-width: 80px; max-height: 80px; object-fit: contain; }
            .clinica-tag { font-size: 11px; font-weight: 800; color: #0284c7; letter-spacing: 2px; text-transform: uppercase; margin: 0; }
            .clinica-title { font-size: 21px; font-weight: 900; color: #0f2d4a; margin: 0; line-height: 1.1; text-transform: uppercase; }
            .doc-name { font-size: 12px; font-weight: 700; color: #1e293b; margin-top: 4px; }
            .doc-badge { display: inline-block; background-color: #0b4f6c; color: white; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 20px; margin-top: 3px; }
            
            .header-right { border-left: 1px solid #cbd5e1; padding-left: 16px; font-size: 10.5px; color: #334155; }
            .meta-item { margin-bottom: 6px; }
            .meta-item strong { display: block; color: #0b4f6c; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }

            .doc-title { text-align: center; font-size: 12px; font-weight: 800; letter-spacing: 2px; color: #0b4f6c; background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 6px; border-radius: 8px; margin-bottom: 14px; text-transform: uppercase; }

            .patient-box { border: 1.5px solid #0284c7; border-radius: 12px; padding: 10px 16px; margin-bottom: 16px; display: grid; grid-template-columns: 2fr 1fr; gap: 8px 16px; font-size: 12px; }
            .patient-box strong { color: #0b4f6c; }

            table { width: 100%; border-collapse: collapse; margin-top: 5px; }
            th { background-color: #f0f9ff; color: #0b4f6c; text-align: left; padding: 9px 12px; font-size: 11px; text-transform: uppercase; border-bottom: 1.5px solid #bae6fd; letter-spacing: 0.5px; }
            td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; font-size: 12px; }
            
            .footer-sign { margin-top: 55px; text-align: center; display: flex; flex-direction: column; align-items: center; }
            .sign-line { width: 240px; border-top: 1.5px solid #0b4f6c; margin-bottom: 4px; }
            .sign-doctor { font-weight: 800; font-size: 12px; color: #0b4f6c; text-transform: uppercase; }
            .sign-sub { font-size: 10px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="orden-container">
            
            <div class="header-grid">
              <div class="header-left">
                ${logoUrl 
                  ? `<img src="${logoUrl}" class="logo-img" alt="Logo" />` 
                  : `<div style="font-size: 40px; color: #0b4f6c;">🧪</div>`
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

            <div class="doc-title">Orden de Laboratorio & Exámenes Clínicos</div>

            <div class="patient-box">
              <div><strong>Paciente:</strong> ${pacienteNombre}</div>
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
                    <td><strong style="color: #0f172a;">${e.tipo_estudio}</strong></td>
                    <td style="color: #334155;">${e.laboratorio || 'A elección del paciente'}</td>
                    <td style="color: #475569; font-style: italic;">${e.observaciones || 'Ninguna indicación especial'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="footer-sign">
              <div class="sign-line"></div>
              <div class="sign-doctor">${doctorTitular}</div>
              <div class="sign-sub">Médico Solicitante • ${jvpm}</div>
            </div>

          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
            window.onafterprint = function() {
              window.close();
            };
          </script>
        </body>
      </html>
    `;

    // 1. Crear archivo temporal en memoria
    const blob = new Blob([htmlCompleto], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // 2. Abrir rompiendo la dependencia con la app principal
    window.open(url, '_blank', 'noopener,noreferrer');
    
    // 3. Limpiar memoria después de unos segundos
    setTimeout(() => URL.revokeObjectURL(url), 8000);
  };

  if (modoCrear || modoEditar) {
    return (
      <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-2xl space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-xs font-bold text-blue-900 uppercase">🧪 Solicitud de Exámenes Clínicos</h4>
            <p className="text-[11px] text-slate-500">Agregue los análisis o estudios requeridos para el paciente</p>
          </div>
          <button 
            type="button" 
            onClick={agregarEstudioNuevo} 
            className="text-xs font-bold text-blue-600 bg-white border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition cursor-pointer"
          >
            + Agregar Examen
          </button>
          <button onClick={imprimirLaboratorio} className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer" > 🖨️ Imprimir Orden </button>
        </div>
        <div className="space-y-2">
          {estudiosNuevos.map((est, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-11 gap-2 bg-white p-2.5 rounded-xl border border-blue-100 items-center">
              <input 
                type="text" 
                placeholder="Tipo de Estudio (ej. Hemograma completo)" 
                value={est.tipo_estudio} 
                onChange={(e) => actualizarEstudioNuevo(idx, 'tipo_estudio', e.target.value)} 
                className="md:col-span-4 border border-slate-300 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-500" 
              />
              <input 
                type="text" 
                placeholder="Laboratorio sugerido (opcional)" 
                value={est.laboratorio} 
                onChange={(e) => actualizarEstudioNuevo(idx, 'laboratorio', e.target.value)} 
                className="md:col-span-3 border border-slate-300 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-500" 
              />
              <input 
                type="text" 
                placeholder="Indicaciones / Preparación" 
                value={est.observaciones} 
                onChange={(e) => actualizarEstudioNuevo(idx, 'observaciones', e.target.value)} 
                className="md:col-span-3 border border-slate-300 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-500" 
              />
              <div className="md:col-span-1 text-center">
                {estudiosNuevos.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => eliminarEstudioNuevo(idx)} 
                    className="text-rose-500 hover:text-rose-700 font-bold p-1 text-xs cursor-pointer"
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
              
              <div className="bg-white p-3 border border-slate-200 rounded-xl">
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-2">
                  Archivo o Estudio Clínico
                </label>
                
                <div className="flex items-center gap-4">
                  {/* Icono de vista previa según el estado */}
                  <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-2xl shrink-0">
                    {formResultado.documento_url ? (
                      formResultado.documento_url.endsWith('.pdf') ? '📄' : '🖼️'
                    ) : (
                      '🧪'
                    )}
                  </div>

                  <div className="flex-1">
                    <input 
                      type="file" 
                      accept="image/*,application/pdf"
                      onChange={handleSubirResultado} 
                      disabled={subiendoResultado}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 outline-none cursor-pointer disabled:opacity-50" 
                    />
                    
                    {subiendoResultado ? (
                      <span className="text-xs text-blue-600 font-bold block mt-1.5 animate-pulse">
                        ⏳ Subiendo documento...
                      </span>
                    ) : formResultado.documento_url ? (
                      <a 
                        href={formResultado.documento_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs text-blue-600 hover:underline font-semibold block mt-1.5"
                      >
                        ✅ Archivo cargado — Ver documento
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400 block mt-1.5">
                        Formatos permitidos: PDF, JPG, PNG, WEBP (hasta 10MB).
                      </span>
                    )}
                  </div>
                </div>
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