import axios, { type AxiosInstance } from 'axios';


export const apiClient: AxiosInstance = axios.create({
  baseURL: 'https://cdde-154-82-130-106.ngrok-free.app/',
  timeout: 10000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Central place to hook in error logging or user-facing error handling.
    return Promise.reject(error);
  }
);

