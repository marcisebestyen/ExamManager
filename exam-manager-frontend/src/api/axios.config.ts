import axios, { InternalAxiosRequestConfig } from 'axios';
import { tokenKeyName } from '../constants/constants';
import i18n from 'i18next';

const rootApiUrl = import.meta.env.VITE_REST_API_URL;
const cleanRootApiUrl = rootApiUrl ? rootApiUrl.replace(/\/$/, '') : '';


const axiosInstance = axios.create({
  baseURL: `${cleanRootApiUrl}/api`,
  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(tokenKeyName);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const currentLang = i18n.language || 'en';
    config.headers['Accept-Language'] = currentLang;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;