import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://clinicas-iph9.onrender.com'
});

// Interceptor para inyectar el usuario logueado en cada petición
api.interceptors.request.use((config) => {
  const usuarioId = localStorage.getItem('clinic_user_id');
  if (usuarioId) {
    config.headers['x-usuario-id'] = usuarioId;
  }
  return config;
});

export default api;