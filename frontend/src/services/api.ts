import axios from "axios";
import { useAuthStore } from "../store/authStore";

const base = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export const api = axios.create({
  baseURL: `${base}/api`,
});

// Проставляем JWT на каждый запрос, если он есть в store.
api.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

