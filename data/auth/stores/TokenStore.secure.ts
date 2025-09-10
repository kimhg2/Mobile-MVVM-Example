import type { AuthTokens } from "@domain/auth/ports/Auth.repository";
import type { TokenStore } from "@domain/auth/ports/TokenStore.port";
import * as SecureStore from 'expo-secure-store';

const KEY_REFRESH = 'refreshToken';
const IOS_OPTS = { keychainService: KEY_REFRESH } as const;

let MEM_REFRESH: string | null = null; // Fallback when SecureStore unavailable

async function available() {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

class SecureTokenStore implements TokenStore {
  async getRefreshToken(): Promise<string | null> {
    if (await available()) {
      try {
        return (await SecureStore.getItemAsync(KEY_REFRESH, IOS_OPTS as any)) ?? null;
      } catch {
        return null;
      }
    }
    return MEM_REFRESH;
  }

  async setTokens(tokens: AuthTokens): Promise<void> {
    const value = tokens.refreshToken ?? '';
    
    if (await available()) {
      try {
        if (value) {
          await SecureStore.setItemAsync(KEY_REFRESH, value, IOS_OPTS as any);
        } else {
          await SecureStore.deleteItemAsync(KEY_REFRESH, IOS_OPTS as any);
        }
      } catch {
        // Fallback to memory if secure write fails
        MEM_REFRESH = value || null;
      }
    } else {
      MEM_REFRESH = value || null;
    }
  }

  async clear(): Promise<void> {
    if (await available()) {
      try {
        await SecureStore.deleteItemAsync(KEY_REFRESH, IOS_OPTS as any);
      } catch {}
    }
    MEM_REFRESH = null;
  }
}

export const tokenStore: TokenStore = new SecureTokenStore();
