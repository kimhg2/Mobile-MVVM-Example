
import { Result } from '@/shared/result';
import { User } from '../entities/User.entity';
import { AuthError } from '../errors/AuthError';

export type AuthType = {
  email: string;
  password: string;
};

export type AuthTokens = {
  tokenType: string;
  accessToken: string;
  refreshToken: string;
  // epoch millis when access token expires (apply skew when computing)
  expiresAt: number;
};

export type AuthRequestOptions = {
  idempotencyKey?: string;
  signal?: AbortSignal;
};

export interface AuthRepository {
  login(params: AuthType, options?: AuthRequestOptions): Promise<Result<User, AuthError>>;
  signup(params: AuthType, options?: AuthRequestOptions): Promise<Result<User, AuthError>>;
  refresh(refreshToken: string): Promise<AuthTokens>;
  me(): Promise<User>;
}
