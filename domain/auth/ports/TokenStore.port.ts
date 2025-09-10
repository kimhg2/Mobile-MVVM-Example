import type { AuthTokens } from "@domain/auth/ports/Auth.repository";

export interface TokenStore {
  getRefreshToken(): Promise<string | null>;
  setTokens(tokens: AuthTokens): Promise<void>;
  clear(): Promise<void>;
}

