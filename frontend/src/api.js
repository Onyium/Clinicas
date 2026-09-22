import axios from 'axios';

// Esto toma automáticamente la variable de Vercel en la nube, o localhost si estás programando en tu compu
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001'
});

export default api;