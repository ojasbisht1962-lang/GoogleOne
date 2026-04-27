import axios from 'axios';
import config from '../config';

const api = axios.create({
  baseURL: config.API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    
    const token = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');
    const userData = user ? JSON.parse(user) : null;
    
    // Skip API calls for guest users on certain endpoints
    if (userData?.isGuest && token?.startsWith('guest_token_')) {
      // For guest users, only allow GET requests to public endpoints
      if (config.method !== 'get') {
        return Promise.reject(new Error('Guest users cannot perform this action'));
      }
    }
    
    if (token && !token.startsWith('guest_token_')) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const user = localStorage.getItem('user');
    const userData = user ? JSON.parse(user) : null;
    const token = localStorage.getItem('access_token');
    
    console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
    console.error(`   Status: ${error.response?.status}`);
    console.error(`   Message: ${error.message}`);
    console.error(`   Token exists: ${!!token}`);
    console.error(`   Token preview: ${token?.substring(0, 50)}...`);
    console.error(`   Response data:`, error.response?.data);
    
    // Don't redirect guest users on 401
    if (error.response?.status === 401 && !userData?.isGuest) {
      console.warn('⚠️ Authentication expired. Please log in again.');
      // Commenting out auto-redirect for debugging
      // localStorage.removeItem('access_token');
      // localStorage.removeItem('user');
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
