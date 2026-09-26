import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_PUBLIC_API_URL,
  withCredentials: true,
});

//only one refresh call is in the air at a time
let refreshInFlight: Promise<void> | null = null;

function refreshOnce(): Promise<void> {
  if (!refreshInFlight) {
    refreshInFlight = api
      .post("/auth/refresh")
      .then(() => undefined)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler = () => {};
export function setUnauthorizedHandler(h: UnauthorizedHandler) {
  onUnauthorized = h;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    const isAuthEndpoint =
      original?.url?.includes("/auth/login") ||
      original?.url?.includes("/auth/refresh");

    if (status !== 401 || original?._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      await refreshOnce();
      return api(original);
    } catch {
      onUnauthorized();
      return Promise.reject(error);
    }
  },
);

export default api;
