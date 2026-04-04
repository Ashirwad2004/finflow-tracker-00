import axios from 'axios';

// Abstracting global environments 
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000, // Safe default
    headers: {
        'Content-Type': 'application/json',
    },
});

// Implement token intercepts safely
api.interceptors.request.use(
    (config) => {
        // Boilerplate for retrieving local token assuming SaaS model
        const token = sessionStorage.getItem('access_token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // Setup boilerplate intercept logic for refreshing generic JWT tokens smoothly 
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = sessionStorage.getItem('refresh_token');
                if (!refreshToken) throw new Error('No refresh token available');

                // Execute refresh
                const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                    token: refreshToken,
                });

                sessionStorage.setItem('access_token', data.access_token);
                api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;

                return api(originalRequest);
            } catch (refreshError) {
                // Fallback context: logout user sequence globally
                sessionStorage.removeItem('access_token');
                sessionStorage.removeItem('refresh_token');
                window.location.href = '/login'; // Or use Zustand bound state
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);