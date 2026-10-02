import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://clinicas-iph9.onrender.com'
});

api.interceptors.request.use((config) => {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  if (usuario && usuario.id) {
    config.headers['x-usuario-id'] = usuario.id;
  }
  return config;
});

export default api;