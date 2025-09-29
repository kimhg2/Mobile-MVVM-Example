import { Result } from "@/shared/result";
import { tokenStore as secureTokenStore } from "@data/auth/stores/TokenStore.secure";
import { User } from "@domain/auth/entities/User.entity";
import { AuthError } from "@domain/auth/errors/AuthError";
import type { AuthRepository, AuthRequestOptions, AuthTokens, AuthType } from "@domain/auth/ports/Auth.repository";
import type { TokenStore } from "@domain/auth/ports/TokenStore.port";
import { Email } from "@domain/auth/value-objects/Email.vo";
import { AuthSession } from "@infra/auth/AuthSession";
import { http } from "@infra/http/httpClient";
import { logger } from "@shared/logger";
import axios, { AxiosError, AxiosRequestConfig } from "axios";
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
  async login({ email, password }: AuthType, options?: AuthRequestOptions): Promise<Result<User, AuthError>> {
    try {
      const config: AxiosRequestConfig = buildRequestConfig(options);
      const { data } = await http.post("/auth/login", { email, password }, config);
      const tokens = mapTokens({ ...data });
      await this.persistTokens(tokens);
      const user = await this.resolveUserAfterLogin(data, tokens, { email, password });
      return Result.ok(user);
    } catch (error) {
      const authError = this.toAuthError(error);
      if (authError.kind === "Unknown") {
        logger.error("AuthRepositoryImpl.login", error);
      }
      return Result.err(authError);
    }
  }
  async signup({ email, password }: AuthType, options?: AuthRequestOptions): Promise<Result<User, AuthError>> {
    try {
      const config: AxiosRequestConfig = buildRequestConfig(options);
      const { data } = await http.post("/auth/signup", { email, password }, config);
      const user = mapUser(data.user ?? data);
      return Result.ok(user);
    } catch (error) {
      const authError = this.toAuthError(error);
      if (authError.kind === "Unknown") {
        logger.error("AuthRepositoryImpl.signup", error);
      }
      return Result.err(authError);
    }
  }
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const { data } = await http.post("/auth/refresh", { refreshToken });
    const tokens = mapTokens({ refreshToken, ...data });
    await this.persistTokens(tokens);
    return tokens;
  }
  async me(): Promise<User> {
    const { data } = await http.get("/auth/me");
    return mapUser(data.user ?? data);
  }
  private async persistTokens(tokens: AuthTokens): Promise<void> {
    this.deps.session.setTokens(tokens);
    try {
      await this.deps.tokenStore.setTokens(tokens);
    } catch (error) {
      logger.warn("AuthRepositoryImpl.persistTokens", error);
    }
  }
  private async resolveUserAfterLogin(response: any, tokens: AuthTokens, credentials: AuthType): Promise<User> {
    const inlinePayload = response?.user ?? response?.profile;
    if (inlinePayload) {
      try {
        return mapUser(inlinePayload);
      } catch (error) {
        logger.warn("AuthRepositoryImpl.login.inlineUser", error);
      }
    }
    try {
      return await this.me();
    } catch (error) {
      logger.warn("AuthRepositoryImpl.login.me", error);
    }
    return deriveUserFromTokens(tokens, credentials);
  }
  private toAuthError(error: unknown): AuthError {
    if ((error as any)?.code === "ERR_NETWORK_OFFLINE") {
      return AuthError.network();
    }
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        return AuthError.network();
      }
      const status = error.response.status;
      if (status === 400 || status === 401) {
        return AuthError.invalid();
      }
      if (status === 409) {
        const message = this.extractMessage(error);
        return AuthError.alreadyExists(message);
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

function deriveUserFromTokens(tokens: AuthTokens, credentials: AuthType): User {
  const payload = decodeJwtPayload(tokens.accessToken);
  const fallbackEmail = credentials.email;
  const id = typeof payload?.sub === "string" && payload.sub ? payload.sub : fallbackEmail;
  const rawEmail = typeof payload?.email === "string" && payload.email ? payload.email : fallbackEmail;
  const nameValue = typeof payload?.name === "string" ? payload.name : "";

  let emailVO: Email;
  try {
    emailVO = Email.create(rawEmail);
  } catch {
    emailVO = Email.create(fallbackEmail);
  }

  return new User(String(id), emailVO, { value: String(nameValue) });
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  if (!token) return null;
  const segments = token.split(".");
  if (segments.length < 2) return null;
  const base64 = segments[1];
  try {
    const json = base64UrlDecode(base64);
    if (!json) return null;
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const base64 = normalized + padding;
  if (typeof globalThis.atob === "function") {
    return globalThis.atob(base64);
  }
  const bufferFactory = (globalThis as any)?.Buffer;
  if (bufferFactory) {
    return bufferFactory.from(base64, "base64").toString("utf8");
  }
  return "";
}

function buildRequestConfig(options?: AuthRequestOptions): AxiosRequestConfig {
  const headers: Record<string, string> = {};
  if (options?.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }
  return {
    signal: options?.signal,
    ...(Object.keys(headers).length ? { headers } : {}),
  };
}
