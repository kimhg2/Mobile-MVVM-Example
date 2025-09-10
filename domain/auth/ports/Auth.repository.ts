
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

export interface AuthRepository {
  login(params: AuthType): Promise<{ tokens: AuthTokens; userId?: string }>;
  refresh(refreshToken: string): Promise<AuthTokens>;
  me(): Promise<{ userId: string; email: string }>;
}
