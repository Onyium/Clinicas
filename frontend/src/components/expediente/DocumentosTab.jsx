import React, { useState, useEffect } from 'react';
import api from '../../api';

export default function DocumentosTab({ paciente, consultaSeleccionada }) {
  const [configClinica, setConfigClinica] = useState({});
  const [tipoDoc, setTipoDoc] = useState('incapacidad');
  
  // Estados para rellenar los documentos
  const [duiPaciente, setDuiPaciente] = useState('');
  const [diasIncapacidad, setDiasIncapacidad] = useState('3');
  const [examenesConstancia, setExamenesConstancia] = useState('EGO: Leucocitos 1-2 POR CAMPO, EGH: NO Leucocitos No protozoos no helmintos, VDRL No reactivo, BACILOSCOPIA: Negativo a Bacilo Alcohol Resistente.');
  const [duiMedico, setDuiMedico] = useState('03405711-0');
  const [destinoReferencia, setDestinoReferencia] = useState('');

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

  const obtenerFechaTexto = (fechaASumarDias = 0) => {
    const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
    const d = new Date();
    d.setDate(d.getDate() + parseInt(fechaASumarDias, 10));
    return {
      dia: d.getDate(),
      mes: meses[d.getMonth()],
      anio: d.getFullYear()
    };
  };

  const imprimirDocumento = () => {
    const doctorTitular = consultaSeleccionada?.doctor_nombre || configClinica.nombre_doctor || 'DRA. LISEYDA DRISCILA MAYE MENJÍVAR';
    const jvpm = configClinica.jvpm || '15381';
    const c = consultaSeleccionada || {};

    // Prioridad a la imagen subida en ConfigModal
    const encabezadoImagenUrl = configClinica.encabezado_url || configClinica.logo_url || '';

    // Datos del Paciente
    let nombreImpresion = paciente.nombre || '____________________';
    const edad = paciente.edad || '___';
    
    // Inclusión condicional de tutor legal si es menor de 18 años
    const esMenor = Number(paciente.edad) < 18;
    if (esMenor && paciente.responsable_nombre) {
      nombreImpresion += ` (Menor de edad, representado por su ${paciente.responsable_parentesco || 'Tutor'}: ${paciente.responsable_nombre})`;
    }

    const diagnostico = c.diagnostico || '____________________';
    const hoy = obtenerFechaTexto(0);

    let htmlContenido = '';

    if (tipoDoc === 'incapacidad') {
      const fechaFin = obtenerFechaTexto(diasIncapacidad);
      htmlContenido = `
        <h2 style="text-align: center; text-decoration: underline; margin: 25px 0 20px 0; font-size: 15px; letter-spacing: 0.5px;">CONSTANCIA DE INCAPACIDAD MÉDICA</h2>
        <p style="text-align: justify; line-height: 2; font-size: 13.5px;">
          El infrascrito médico: <strong>${doctorTitular.toUpperCase()}</strong> con Nº de JVPM: <strong>${jvpm.replace(/\D/g,'')}</strong> hace constar que el (la) paciente: <strong>${nombreImpresion.toUpperCase()}</strong> de <strong>${edad}</strong> años de edad, con Numero Unico de Identidad Personal No. <strong>${duiPaciente || '________________'}</strong> atención médica en este centro de salud, el dia <strong>${hoy.dia}</strong> del mes <strong>${hoy.mes}</strong> del año <strong>${hoy.anio}</strong>.
        </p>
        <p style="text-align: justify; line-height: 2; font-size: 13.5px; margin-top: 18px;">
          Donde por historia clínica y Examen Fisico, se Diagnostica: <strong>${diagnostico.toUpperCase()}</strong>.
        </p>
        <p style="text-align: justify; line-height: 2; font-size: 13.5px; margin-top: 18px;">
          Por lo cual se indica tratamiento farmacológico y se prescriben <strong>${diasIncapacidad}</strong> dias de incapacidad médica, hasta dia <strong>${fechaFin.dia}</strong> mes: <strong>${fechaFin.mes}</strong> año <strong>${fechaFin.anio}</strong> para su recuperacion.
        </p>
        <p style="text-align: justify; line-height: 2; font-size: 13.5px; margin-top: 18px;">
          Y para los usos que el (la) interesado (a) estime conveniente se extiende la presente en el Municipio de Nahuizalco, Sonsonate, el dia : <strong>${hoy.dia}</strong> mes <strong>${hoy.mes}</strong> año: <strong>${hoy.anio}</strong>.
        </p>
      `;
    } else if (tipoDoc === 'constancia') {
      htmlContenido = `
        <h2 style="text-align: center; margin: 25px 0 20px 0; font-size: 15px; letter-spacing: 0.5px;">CONSTANCIA BUENA SALUD</h2>
        <p style="text-align: justify; line-height: 2; font-size: 13.5px;">A quien interese:</p>
        <p style="text-align: justify; line-height: 2; font-size: 13.5px; margin-top: 15px;">
          Yo, <strong>${doctorTitular.toUpperCase()}</strong> con Documento Unico de Identidad Personal Nº de : <strong>${duiMedico}</strong>, por medio de la presente hago constar que el (la) paciente <strong>${nombreImpresion.toUpperCase()}</strong> de <strong>${edad}</strong> años de edad, con Nº de Documento Unico de Identidad: No. <strong>${duiPaciente || '________________'}</strong>, Quien presenta examenes medico: <strong>${examenesConstancia}</strong>. Por lo que se le extiende constancia de buena Salud.
        </p>
        <p style="text-align: justify; line-height: 2; font-size: 13.5px; margin-top: 18px;">
          Y para los usos que el (la) interesado (a) estime conveniente se extiende la presente en el Municipio de Nahuizalco, Sonsonate, a los <strong>${hoy.dia}</strong> dias del mes <strong>${hoy.mes}</strong> del año <strong>${hoy.anio}</strong>.
        </p>
      `;
    } else if (tipoDoc === 'referencia') {
      const histClinica = [
        c.motivo_consulta ? `MOTIVO: ${c.motivo_consulta}` : '',
        c.enfermedad_actual ? `PRESENTE ENFERMEDAD: ${c.enfermedad_actual}` : '',
        c.examen_fisico ? `EXAMEN FÍSICO: ${c.examen_fisico}` : ''
      ].filter(Boolean).join(' | ') || 'SIN HISTORIA CLÍNICA REGISTRADA';

      const resExamenes = c.reporte_examenes || 'SIN EXÁMENES';
      const tratRecibido = [
        c.diagnostico ? `DX: ${c.diagnostico}` : '',
        c.plan_tratamiento ? `TRATAMIENTO: ${c.plan_tratamiento}` : ''
      ].filter(Boolean).join(' | ') || 'NO ESPECIFICADO';

      htmlContenido = `
        <h2 style="text-align: center; margin: 25px 0 20px 0; font-size: 15px; text-decoration: underline;">HOJA DE REFERENCIA MÉDICA</h2>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 10px 8px; border-bottom: 1px solid #ddd; width: 25%; font-weight: bold; color: #333;">Para</td>
            <td style="padding: 10px 8px; border-bottom: 1px solid #ddd; width: 75%;">${destinoReferencia.toUpperCase() || '_____________________________________________'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 8px; border-bottom: 1px solid #ddd; font-weight: bold; color: #333;">Fecha</td>
            <td style="padding: 10px 8px; border-bottom: 1px solid #ddd;">${hoy.dia} de ${hoy.mes} de ${hoy.anio}</td>
          </tr>
          <tr>
            <td style="padding: 10px 8px; border-bottom: 1px solid #ddd; font-weight: bold; color: #333;">Paciente</td>
            <td style="padding: 10px 8px; border-bottom: 1px solid #ddd;">${nombreImpresion.toUpperCase()} (Edad: ${edad} años)</td>
          </tr>
          <tr>
            <td style="padding: 10px 8px; border-bottom: 1px solid #ddd; font-weight: bold; color: #333; vertical-align: top;">Historia Clínica</td>
            <td style="padding: 10px 8px; border-bottom: 1px solid #ddd; text-align: justify; line-height: 1.5;">${histClinica.toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding: 10px 8px; border-bottom: 1px solid #ddd; font-weight: bold; color: #333; vertical-align: top;">Resultado de Exámenes</td>
            <td style="padding: 10px 8px; border-bottom: 1px solid #ddd; text-align: justify; line-height: 1.5;">${resExamenes.toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding: 10px 8px; border-bottom: 1px solid #ddd; font-weight: bold; color: #333; vertical-align: top;">Tratamiento recibido</td>
            <td style="padding: 10px 8px; border-bottom: 1px solid #ddd; text-align: justify; line-height: 1.5;">${tratRecibido.toUpperCase()}</td>
          </tr>
        </table>
      `;
    }

    // Cabecera: Si existe imagen configurada, usa la imagen; si no, usa el membrete vectorial estructurado
    const renderCabecera = encabezadoImagenUrl ? `
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${encabezadoImagenUrl}" style="width: 100%; max-height: 160px; object-fit: contain;" alt="Encabezado Clínico" />
      </div>
    ` : `
      <div class="header-box">
        <div class="top-banner">
          <svg class="side-icon-left" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="none" stroke="#000" stroke-width="2.5" />
            <line x1="50" y1="12" x2="50" y2="88" stroke="#000" stroke-width="3" stroke-linecap="round"/>
            <circle cx="50" cy="14" r="5" fill="#000"/>
            <path d="M 28 28 Q 50 38 72 28 Q 50 18 28 28 Z" fill="none" stroke="#000" stroke-width="2" />
            <path d="M 35 45 Q 50 55 65 45 Q 50 35 35 45 Z" fill="none" stroke="#000" stroke-width="2" />
            <path d="M 40 65 Q 50 72 60 65 Q 50 58 40 65 Z" fill="none" stroke="#000" stroke-width="2" />
          </svg>

          <div class="clinic-titles">
            <div class="clinic-main-title">Clínica Médica Familiar</div>
            <div class="clinic-name-large">Maye</div>
          </div>

          <svg class="side-icon-right" viewBox="0 0 100 100">
            <path d="M 30 20 L 45 20 Q 55 20 55 35 L 55 60 Q 55 75 40 75 Q 25 75 25 60 L 25 45" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
            <circle cx="25" cy="42" r="6" fill="#000"/>
            <line x1="30" y1="17" x2="30" y2="23" stroke="#000" stroke-width="3" stroke-linecap="round"/>
            <line x1="45" y1="17" x2="45" y2="23" stroke="#000" stroke-width="3" stroke-linecap="round"/>
          </svg>
        </div>

        <div class="doctor-subtext">
          <div class="doctor-name-jvpm">DRA. LISEYDA DRISCILA MAYE MENJÍVAR, JVPM No. 15381</div>
          <div>Doctora en Medicina UNSSA, El Salvador</div>
          <div>Post-Grado en Universidad "San Luis Gonzaga" de ICA, Perú</div>
          <div class="doctor-specs">Diplomado en Ultrasonido Diagnóstico</div>
          <div class="doctor-specs" style="font-weight: bold; letter-spacing: 0.5px;">ELECTROCARDIOGRAMA</div>
        </div>
      </div>
    `;

    const htmlImpresion = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${tipoDoc.toUpperCase()} - ${paciente.nombre}</title>
          <style>
            @page { size: letter; margin: 18mm 18mm 20mm 18mm; }
            body { font-family: 'Times New Roman', Times, serif; color: #111; margin: 0; padding: 0; }
            .container { max-width: 780px; margin: 0 auto; }
            
            .header-box { text-align: center; position: relative; margin-bottom: 15px; }
            .top-banner { border-top: 3.5px solid #000; border-bottom: 3.5px solid #000; padding: 6px 15px; position: relative; min-height: 70px; display: flex; align-items: center; justify-content: center; }
            .side-icon-left { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 62px; height: 62px; }
            .side-icon-right { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); width: 55px; height: 55px; }
            .clinic-titles { text-align: center; }
            .clinic-main-title { font-family: 'Brush Script MT', cursive, serif; font-size: 26px; margin: 0; font-weight: normal; font-style: italic; }
            .clinic-name-large { font-size: 34px; font-weight: bold; letter-spacing: 1px; margin: -2px 0 0 0; line-height: 1; }
            
            .doctor-subtext { padding: 6px 0; font-size: 11px; line-height: 1.4; border-bottom: 2.5px solid #000; }
            .doctor-name-jvpm { font-size: 12px; font-weight: bold; }
            .doctor-specs { text-transform: uppercase; font-size: 10px; }
            
            .footer-sign { margin-top: 60px; text-align: left; }
            .sign-line { width: 280px; border-top: 1px solid #111; margin-bottom: 6px; }
            .sign-title { font-size: 12px; font-weight: bold; }
            .sign-sub { font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${renderCabecera}
            ${htmlContenido}

            <div class="footer-sign">
              <p style="font-size: 13px; margin-bottom: 45px;">ATTE.</p>
              <div class="sign-line"></div>
              <div class="sign-title">Dra. Liseyda Driscila Maye Menjivar</div>
              <div class="sign-sub">Doctora en Medicina</div>
              <div class="sign-sub">J.V.P.M N° 15381</div>
            </div>
          </div>
          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 400); };
            window.onafterprint = function() { window.close(); };
          </script>
        </body>
      </html>
    `;

    const blob = new Blob([htmlImpresion], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 8000);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <h4 className="text-sm font-black text-slate-800 uppercase">📄 Generador de Documentos Médicos</h4>
      </div>

      <div className="flex flex-wrap gap-3">
        <button 
          type="button" 
          onClick={() => setTipoDoc('incapacidad')} 
          className={`px-4 py-2 text-xs font-bold rounded-lg transition ${tipoDoc === 'incapacidad' ? 'bg-[#1b4e7b] text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Incapacidad Médica
        </button>
        <button 
          type="button" 
          onClick={() => setTipoDoc('constancia')} 
          className={`px-4 py-2 text-xs font-bold rounded-lg transition ${tipoDoc === 'constancia' ? 'bg-[#1b4e7b] text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Constancia de Buena Salud
        </button>
        <button 
          type="button" 
          onClick={() => setTipoDoc('referencia')} 
          className={`px-4 py-2 text-xs font-bold rounded-lg transition ${tipoDoc === 'referencia' ? 'bg-[#1b4e7b] text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Referencia Médica
        </button>
      </div>

      <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {(tipoDoc === 'incapacidad' || tipoDoc === 'constancia') && (
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">DUI del Paciente (Opcional)</label>
              <input 
                type="text" 
                placeholder="00000000-0" 
                value={duiPaciente} 
                onChange={(e) => setDuiPaciente(e.target.value)} 
                className="w-full border border-slate-300 rounded-lg p-2 text-xs outline-none focus:border-blue-500" 
              />
            </div>
          )}

          {tipoDoc === 'incapacidad' && (
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Días de Incapacidad</label>
              <input 
                type="number" 
                min="1" 
                value={diasIncapacidad} 
                onChange={(e) => setDiasIncapacidad(e.target.value)} 
                className="w-full border border-slate-300 rounded-lg p-2 text-xs outline-none focus:border-blue-500" 
              />
            </div>
          )}

          {tipoDoc === 'constancia' && (
            <>
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">DUI del Médico</label>
                <input 
                  type="text" 
                  value={duiMedico} 
                  onChange={(e) => setDuiMedico(e.target.value)} 
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs outline-none focus:border-blue-500" 
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Resultados de Exámenes Presentados</label>
                <textarea 
                  rows="3" 
                  value={examenesConstancia} 
                  onChange={(e) => setExamenesConstancia(e.target.value)} 
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs outline-none focus:border-blue-500" 
                />
              </div>
            </>
          )}

          {tipoDoc === 'referencia' && (
            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">¿A dónde / a quién se refiere el paciente? (Para)</label>
              <input 
                type="text" 
                placeholder="Ej. Hospital Nacional Jorge Mazzini / Especialista en Cirugía" 
                value={destinoReferencia} 
                onChange={(e) => setDestinoReferencia(e.target.value)} 
                className="w-full border border-slate-300 rounded-lg p-2 text-xs outline-none focus:border-blue-500 font-bold" 
              />
              <span className="text-[10px] text-slate-400 block mt-1">La Historia Clínica, Exámenes y Tratamiento se cargarán automáticamente de la consulta actual.</span>
            </div>
          )}
        </div>

        <div className="pt-4 flex justify-end">
          <button 
            type="button" 
            onClick={imprimirDocumento} 
            className="bg-[#10a37f] hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow transition flex items-center gap-2 cursor-pointer"
          >
            🖨️ Imprimir {tipoDoc.charAt(0).toUpperCase() + tipoDoc.slice(1)}
          </button>
        </div>
      </div>
    </div>
  );
}