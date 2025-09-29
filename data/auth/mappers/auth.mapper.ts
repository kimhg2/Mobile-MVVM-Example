import type { AuthTokens } from "@domain/auth/ports/Auth.repository";

import { User } from '@/domain/auth/entities/User.entity';
import { Email } from '@/domain/auth/value-objects/Email.vo';
import { UserDTO } from '../dto/User.dto';

export const toEntityUser = (dto: UserDTO): User =>
  new User(dto.id, Email.create(dto.email), { value: dto.name });

const DEFAULT_SKEW_SEC = 30; // subtract to refresh proactively

type RawTokenNode =
  | string
  | {
      token?: string;
      accessToken?: string;
      access_token?: string;
      value?: string;
      expiresIn?: number;
      expires_in?: number;
      ttl?: number;
    };

function extractToken(raw: RawTokenNode | undefined): string {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  const candidate = raw.token ?? raw.accessToken ?? raw.access_token ?? raw.value;
  return candidate ? String(candidate) : "";
}

function extractExpiresIn(raw: RawTokenNode | undefined, fallback?: number): number {
  if (raw && typeof raw !== "string") {
    const candidate = raw.expiresIn ?? raw.expires_in ?? raw.ttl;
    if (candidate !== undefined) return Number(candidate);
  }
  if (fallback !== undefined) return Number(fallback);
  return 0;
}

export const mapTokens = (dto: any, skewSec: number = DEFAULT_SKEW_SEC): AuthTokens => {
  const tokensContainer = dto.tokens ?? dto;
  const accessNode: RawTokenNode | undefined =
    tokensContainer.accessToken ?? tokensContainer.access_token ?? dto.accessToken ?? dto.access_token;
  const refreshNode: RawTokenNode | undefined =
    tokensContainer.refreshToken ?? tokensContainer.refresh_token ?? dto.refreshToken ?? dto.refresh_token;

  const tokenType = String(dto.tokenType ?? dto.token_type ?? "Bearer");
  const accessToken = extractToken(accessNode);
  const refreshToken = extractToken(refreshNode);

  const expiresInFallback = dto.expiresIn ?? dto.expires_in;
  const expiresInSec = extractExpiresIn(accessNode, expiresInFallback);
  const now = Date.now();
  const expiresAt = now + Math.max(0, Number(expiresInSec) - skewSec) * 1000;

  return {
    tokenType,
    accessToken,
    refreshToken,
    expiresAt,
  };
};
