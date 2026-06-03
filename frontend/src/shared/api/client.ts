import axios from "axios";
import { useAuthStore } from "@/shared/store/authStore";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export const apiClient = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // required for httpOnly refresh cookie
});

// Attach access token to every request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Singleton prevents concurrent 401s from triggering multiple simultaneous refresh calls
let refreshInFlight: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = axios
      .post(`${API_BASE}/api/v1/auth/refresh/`, {}, { withCredentials: true })
      .then(({ data }) => {
        useAuthStore.getState().setAccessToken(data.access);
        return data.access as string;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

// Refresh access token on 401, then retry once
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const newToken = await doRefresh();
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
