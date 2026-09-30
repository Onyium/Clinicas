import React, { useState } from 'react';
import api from '../api';
import { toast } from 'sonner';
export default function Login({ onLogin }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/api/login', { usuario, password });
        if (res.data.ok) {
        localStorage.setItem('clinic_auth', 'true');
        localStorage.setItem('clinic_user_id', res.data.usuario.id);
        localStorage.setItem('clinic_user_nombre', res.data.usuario.nombre);
        onLogin();
        }
    } catch (err) {
      setError('Credenciales incorrectas. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        
        <div className="bg-[#1b4e7b] p-8 text-center">
          <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-inner mb-4">
            <span className="text-3xl">🩺</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-wider">CLINIC PRO</h1>
          <p className="text-blue-200 text-sm mt-1">Acceso seguro al sistema</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-sm font-bold text-center border border-rose-100">
                {error}
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Usuario</label>
              <input
                type="text"
                required
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[#1b4e7b] transition"
                placeholder="Ingrese su usuario"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[#1b4e7b] transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#10a37f] hover:bg-[#0e8a6c] text-white font-bold py-3 rounded-xl shadow-md transition disabled:opacity-50 mt-4 cursor-pointer"
            >
              {loading ? 'Verificando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
        
      </div>
    </div>
  );
}