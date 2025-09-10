import type { TokenStore } from "@domain/auth/ports/TokenStore.port";
import type { AuthTokens } from "@domain/auth/ports/Auth.repository";

let REFRESH_TOKEN: string | null = null;

class MemoryTokenStore implements TokenStore {
  async getRefreshToken(): Promise<string | null> {
    return REFRESH_TOKEN;
  }
  async setTokens(tokens: AuthTokens): Promise<void> {
    REFRESH_TOKEN = tokens.refreshToken ?? null;
  }
  async clear(): Promise<void> {
    REFRESH_TOKEN = null;
  }
}

export const tokenStore: TokenStore = new MemoryTokenStore();

