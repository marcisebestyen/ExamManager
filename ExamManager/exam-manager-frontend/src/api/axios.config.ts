import axios, { InternalAxiosRequestConfig } from 'axios';

import { tokenKeyName } from '../constants/constants';

const rootApiUrl = import.meta.env.VITE_REST_API_URL;
const cleanRootApiUrl = rootApiUrl ? rootApiUrl.replace(/\/$/, '') : '';

const baseURL = 'https://localhost:7195/api';

const axiosInstance = axios.create({
  baseURL: `${cleanRootApiUrl}/api`,
  // baseURL,
  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(tokenKeyName);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;