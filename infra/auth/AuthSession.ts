import type { AuthTokens } from "@domain/auth/ports/Auth.repository";

type Listener = (tokens: AuthTokens | null) => void;

class AuthSessionImpl {
  private tokens: AuthTokens | null = null;
  private listeners: Set<Listener> = new Set();

  getTokens(): AuthTokens | null {
    return this.tokens;
  }

  getAccessToken(): string | null {
    return this.tokens?.accessToken ?? null;
  }

  getTokenType(): string | null {
    return this.tokens?.tokenType ?? null;
  }

  getExpiresAt(): number | null {
    return this.tokens?.expiresAt ?? null;
  }

  isExpiredOrNear(thresholdMs: number = 0): boolean {
    const exp = this.tokens?.expiresAt;
    if (!exp) return true;
    return Date.now() + thresholdMs >= exp;
  }

  setTokens(tokens: AuthTokens) {
    this.tokens = tokens;
    this.emit();
  }

  clear() {
    this.tokens = null;
    this.emit();
  }

  subscribe(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private emit() {
    for (const l of this.listeners) l(this.tokens);
  }
}

export const AuthSession = new AuthSessionImpl();

