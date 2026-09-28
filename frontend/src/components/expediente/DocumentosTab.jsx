import React, { useState, useEffect } from 'react';
import api from '../../api';

export default function DocumentosTab({ paciente, consultaSeleccionada }) {
  const [configClinica, setConfigClinica] = useState({});
  const [tipoDoc, setTipoDoc] = useState('incapacidad');
  
  // Estados para rellenar los documentos
  const [duiPaciente, setDuiPaciente] = useState('');
  const [diasIncapacidad, setDiasIncapacidad] = useState('3');
  const [examenesConstancia, setExamenesConstancia] = useState('EGO: Leucocitos 1-2 POR CAMPO, EGH: NO Leucocitos No protozoos no helmitos, VDRL No reactivo, BACILOSCOPIA: Negativo a Bacilo Alcohol Resistente.');
  const [duiMedico, setDuiMedico] = useState('03405711-0'); // DUI de la doctora por defecto

  useEffect(() => {
    const cargarConfig = async () => {
      try {
        const res = await api.get('/api/configuracion');
        if (res.data) setConfigClinica(res.data);
      } catch (e) { console.error('Error cargando configuración:', e); }
    };
    cargarConfig();
  }, []);

  const obtenerFechaTexto = (fechaASumarDias = 0) => {
    const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
    const d = new Date();
    d.setDate(d.getDate() + parseInt(fechaASumarDias));
    return {
      dia: d.getDate(),
      mes: meses[d.getMonth()],
      anio: d.getFullYear()
    };
  };

  const imprimirDocumento = () => {
    const clinicaNombre = configClinica.nombre_clinica || 'CONSULTORIO MAYE';
    const doctorTitular = consultaSeleccionada?.doctor_nombre || configClinica.nombre_doctor || 'Dra. Liseyda Driscla Maye Menjivar';
    const jvpm = configClinica.jvpm || '15381';
    const logoUrl = configClinica.logo_url || '';

    // Datos Paciente
    let nombreImpresion = paciente.nombre || '____________________';
    const edad = paciente.edad || '___';
    
    // Si es menor de edad, agregamos al tutor
    const esMenor = Number(paciente.edad) < 18;
    if (esMenor && paciente.responsable_nombre) {
      nombreImpresion += ` (Menor de edad, representado por su ${paciente.responsable_parentesco}: ${paciente.responsable_nombre})`;
    }

    const diagnostico = consultaSeleccionada?.diagnostico || '____________________';
    const hoy = obtenerFechaTexto(0);

    let htmlContenido = '';

    if (tipoDoc === 'incapacidad') {
      const fechaFin = obtenerFechaTexto(diasIncapacidad);
      htmlContenido = `
        <h2 style="text-align: center; text-decoration: underline; margin-bottom: 40px; font-size: 16px;">CONSTANCIA DE INCAPACIDAD MÉDICA</h2>
        <p style="text-align: justify; line-height: 2; font-size: 14px;">
          El infrascrito médico: <strong>${doctorTitular.toUpperCase()}</strong> con Nº de JVPM: <strong>${jvpm.replace(/\D/g,'')}</strong> hace constar que el (la) paciente: <strong>${nombreImpresion.toUpperCase()}</strong> de <strong>${edad}</strong> años de edad, con Numero Unico de Identidad Personal No. <strong>${duiPaciente || '________________'}</strong> atención médica en este centro de salud, el dia <strong>${hoy.dia}</strong> del mes <strong>${hoy.mes}</strong> del año <strong>${hoy.anio}</strong>.
        </p>
        <p style="text-align: justify; line-height: 2; font-size: 14px; margin-top: 20px;">
          Donde por historia clínica y Examen Fisico, se Diagnostica: <strong>${diagnostico.toUpperCase()}</strong>.
        </p>
        <p style="text-align: justify; line-height: 2; font-size: 14px; margin-top: 20px;">
          Por lo cual se indica tratamiento farmacológico y se prescriben <strong>${diasIncapacidad}</strong> dias de incapacidad médica, hasta dia <strong>${fechaFin.dia}</strong> mes: <strong>${fechaFin.mes}</strong> año <strong>${fechaFin.anio}</strong> para su recuperacion.
        </p>
        <p style="text-align: justify; line-height: 2; font-size: 14px; margin-top: 20px;">
          Y para los usos que el (la) interesado (a) estime conveniente se extiende la presente en el Municipio de Nahuizalco, Sonsonate, el dia : <strong>${hoy.dia}</strong> mes <strong>${hoy.mes}</strong> año: <strong>${hoy.anio}</strong>.
        </p>
      `;
    } else if (tipoDoc === 'constancia') {
      htmlContenido = `
        <h2 style="text-align: center; margin-bottom: 40px; font-size: 16px;">CONSTANCIA BUENA SALUD</h2>
        <p style="text-align: justify; line-height: 2; font-size: 14px;">A quien interese:</p>
        <p style="text-align: justify; line-height: 2; font-size: 14px; margin-top: 20px;">
          Yo, <strong>${doctorTitular.toUpperCase()}</strong> con Documento Unico de Identidad Personal Nº de : <strong>${duiMedico}</strong>, por medio de la presente hago constar que el (la) paciente <strong>${nombreImpresion.toUpperCase()}</strong> de <strong>${edad}</strong> años de edad, con Nº de Documento Unico de Identidad: No. <strong>${duiPaciente || '________________'}</strong>, Quien presenta examenes medico: <strong>${examenesConstancia}</strong>. Por lo que se le extiende constancia de buena Salud.
        </p>
        <p style="text-align: justify; line-height: 2; font-size: 14px; margin-top: 20px;">
          Y para los usos que el (la) interesado (a) estime conveniente se extiende la presente en el Municipio de Nahuizalco, Sonsonate, a los <strong>${hoy.dia}</strong> dias del mes <strong>${hoy.mes}</strong> del año <strong>${hoy.anio}</strong>.
        </p>
      `;
    }

    const ventana = window.open('', '_blank');
    ventana.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${tipoDoc.toUpperCase()} - ${paciente.nombre}</title>
          <style>
            @page { size: letter; margin: 25mm 20mm; }
            body { font-family: 'Arial', sans-serif; color: #111; margin: 0; padding: 0; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
            .logo-container { text-align: center; margin-bottom: 40px; }
            .logo-img { max-width: 150px; max-height: 150px; object-fit: contain; }
            .footer-sign { margin-top: 80px; text-align: left; }
            .sign-line { width: 300px; border-top: 1px solid #111; margin-bottom: 8px; }
            .sign-title { font-size: 12px; font-weight: bold; }
            .sign-sub { font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${logoUrl ? `<div class="logo-container"><img src="${logoUrl}" class="logo-img" /></div>` : ''}
            
            ${htmlContenido}

            <div class="footer-sign">
              <p style="font-size: 14px; margin-bottom: 40px;">ATTE.</p>
              <div class="sign-line"></div>
              <div class="sign-title">Dr. ${doctorTitular}</div>
              <div class="sign-sub">Doctora en Medicina</div>
              <div class="sign-sub">J.V.P.M N° ${jvpm.replace(/\D/g,'')}</div>
            </div>
          </div>
          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 400); };
            window.onafterprint = function() { window.close(); };
          </script>
        </body>
      </html>
    `);
    ventana.document.close();
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <h4 className="text-sm font-black text-slate-800 uppercase">📄 Generador de Documentos Médicos</h4>
      </div>

      <div className="flex gap-3">
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
      </div>

      <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">DUI del Paciente (Opcional)</label>
            <input type="text" placeholder="00000000-0" value={duiPaciente} onChange={(e) => setDuiPaciente(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-xs outline-none focus:border-blue-500" />
          </div>

          {tipoDoc === 'incapacidad' && (
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Días de Incapacidad</label>
              <input type="number" min="1" value={diasIncapacidad} onChange={(e) => setDiasIncapacidad(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-xs outline-none focus:border-blue-500" />
            </div>
          )}

          {tipoDoc === 'constancia' && (
            <>
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">DUI del Médico</label>
                <input type="text" value={duiMedico} onChange={(e) => setDuiMedico(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-xs outline-none focus:border-blue-500" />
              </div>
              <div className="md:col-span-2">
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Resultados de Exámenes Presentados</label>
                <textarea rows="3" value={examenesConstancia} onChange={(e) => setExamenesConstancia(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-xs outline-none focus:border-blue-500"></textarea>
              </div>
            </>
          )}
        </div>

        <div className="pt-4 flex justify-end">
          <button type="button" onClick={imprimirDocumento} className="bg-[#10a37f] hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow transition flex items-center gap-2 cursor-pointer">
            🖨️ Imprimir {tipoDoc === 'incapacidad' ? 'Incapacidad' : 'Constancia'}
          </button>
        </div>
      </div>
    </div>
  );
}