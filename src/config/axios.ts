import axios, { type AxiosInstance } from 'axios';

import { env } from '@/src/config/env';

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 10000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Central place to hook in error logging or user-facing error handling.
    return Promise.reject(error);
  }
);

