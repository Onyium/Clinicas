import axios from 'axios';

const api = axios.create({
  baseURL: 'https://clinicas-iph9.onrender.com'
});

export default api;