import { Result } from "@/shared/result";
import { tokenStore as secureTokenStore } from "@data/auth/stores/TokenStore.secure";
import type { User } from "@domain/auth/entities/User.entity";
import { AuthError } from "@domain/auth/errors/AuthError";
import type { AuthRepository, AuthTokens, AuthType } from "@domain/auth/ports/Auth.repository";
import type { TokenStore } from "@domain/auth/ports/TokenStore.port";
import { AuthSession } from "@infra/auth/AuthSession";
import { http } from "@infra/http/httpClient";
import { logger } from "@shared/logger";
import axios, { AxiosError } from "axios";
import { mapTokens } from "../mappers/auth.mapper";
import { mapUser } from "../mappers/user.mapper";
type Deps = {
  session: { setTokens(tokens: AuthTokens): void; clear(): void };
  tokenStore: TokenStore;
};
const defaultDeps: Deps = {
  session: AuthSession,
  tokenStore: secureTokenStore,
};
export class AuthRepositoryImpl implements AuthRepository {
  constructor(private readonly deps: Deps = defaultDeps) {}
  async login({ email, password }: AuthType): Promise<Result<User, AuthError>> {
    try {
      const { data } = await http.post("/auth/login", { email, password });
      const user = mapUser(data.user ?? data);
      const tokens = mapTokens(data);
      await this.persistTokens(tokens);
      return Result.ok(user);
    } catch (error) {
      const authError = this.toAuthError(error);
      if (authError.kind === "Unknown") {
        logger.error("AuthRepositoryImpl.login", error);
      }
      return Result.err(authError);
    }
  }
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const { data } = await http.post("/auth/refresh", { refreshToken });
    const tokens = mapTokens(data);
    await this.persistTokens(tokens);
    return tokens;
  }
  async me(): Promise<{ userId: string; email: string }> {
    const { data } = await http.get("/auth/me");
    return { userId: data.id, email: data.email };
  }
  private async persistTokens(tokens: AuthTokens): Promise<void> {
    this.deps.session.setTokens(tokens);
    try {
      await this.deps.tokenStore.setTokens(tokens);
    } catch (error) {
      logger.warn("AuthRepositoryImpl.persistTokens", error);
    }
  }
  private toAuthError(error: unknown): AuthError {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        return AuthError.network();
      }
      const status = error.response.status;
      if (status === 400 || status === 401) {
        return AuthError.invalid();
      }
      const message = this.extractMessage(error);
      return AuthError.unknown(message);
    }
    if (error instanceof Error) {
      return AuthError.unknown(error.message);
    }
    return AuthError.unknown();
  }
  private extractMessage(err: AxiosError): string | undefined {
    const data = err.response?.data as any;
    if (data && typeof data === "object") {
      if (typeof data.message === "string") return data.message;
      if (typeof data.error === "string") return data.error;
    }
    return err.message;
  }
}