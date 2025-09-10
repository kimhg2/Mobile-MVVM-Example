
import { tokenStore } from "@data/auth/stores/TokenStore.secure";
import { AuthSession } from "@infra/auth/AuthSession";
import axios, { AxiosError, AxiosRequestConfig } from "axios";

export const http = axios.create({ baseURL: "http://localhost:3001" });

// Separate client without interceptors for refresh to avoid recursion
const refreshClient = axios.create({ baseURL: http.defaults.baseURL });

let refreshingPromise: Promise<void> | null = null;

async function doRefresh(): Promise<void> {
  const refreshToken = await tokenStore.getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token");
  const { data } = await refreshClient.post("/auth/refresh", { refreshToken });
  AuthSession.setTokens({
    tokenType: String(data.tokenType ?? data.token_type ?? "Bearer"),
    accessToken: String(data.accessToken ?? data.access_token ?? ""),
    refreshToken: String(data.refreshToken ?? data.refresh_token ?? refreshToken),
    // Use same skew as mapper
    expiresAt: Date.now() + Math.max(0, Number(data.expiresIn ?? data.expires_in ?? 0) - 30) * 1000,
  });
  // Persist potentially rotated refresh token
  await tokenStore.setTokens(AuthSession.getTokens()!);
}

function ensureRefreshing(): Promise<void> {
  if (!refreshingPromise) {
    refreshingPromise = doRefresh()
      .catch((e) => {
        // On failure, clear session + storage
        AuthSession.clear();
        tokenStore.clear();
        throw e;
      })
      .finally(() => {
        refreshingPromise = null;
      });
  }
  return refreshingPromise;
}

http.interceptors.request.use(async (config: AxiosRequestConfig & { _retry?: boolean }) => {
  // If token expiring soon, try to refresh before request
  if (AuthSession.isExpiredOrNear(5_000)) {
    try {
      await ensureRefreshing();
    } catch {
      // proceed without auth if refresh failed
    }
  }
  const token = AuthSession.getAccessToken();
  const type = AuthSession.getTokenType();
  if (token && type) {
    config.headers = config.headers ?? {};
    (config.headers as any)["Authorization"] = `${type} ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const response = error.response;
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    if (response?.status === 401 && !original?._retry) {
      try {
        original._retry = true;
        await ensureRefreshing();
        // Re-attach new token and retry
        const token = AuthSession.getAccessToken();
        const type = AuthSession.getTokenType();
        if (token && type) {
          original.headers = original.headers ?? {};
          (original.headers as any)["Authorization"] = `${type} ${token}`;
        }
        return http.request(original);
      } catch (e) {
        // bubble up after cleanup in ensureRefreshing
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);
