import type { AuthTokens } from "@domain/auth/ports/Auth.repository";

const DEFAULT_SKEW_SEC = 30; // subtract to refresh proactively

export const mapTokens = (dto: any, skewSec: number = DEFAULT_SKEW_SEC): AuthTokens => {
  const expiresInSec = Number(dto.expiresIn ?? dto.expires_in ?? 0);
  const now = Date.now();
  const expiresAt = now + Math.max(0, expiresInSec - skewSec) * 1000;
  return {
    tokenType: String(dto.tokenType ?? dto.token_type ?? "Bearer"),
    accessToken: String(dto.accessToken ?? dto.access_token ?? ""),
    refreshToken: String(dto.refreshToken ?? dto.refresh_token ?? ""),
    expiresAt,
  };
};
