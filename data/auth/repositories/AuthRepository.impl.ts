import type { AuthRepository, AuthType, AuthTokens } from "@domain/auth/ports/Auth.repository";
import { http } from "@infra/http/httpClient";
import { mapTokens } from "../mappers/auth.mapper";

export class AuthRepositoryImpl implements AuthRepository {
  async login({ email, password }: AuthType): Promise<{ tokens: AuthTokens; userId?: string }> {
    const { data } = await http.post("/auth/login", { email, password });
    return { tokens: mapTokens(data), userId: data?.userId ?? data?.user_id };
  }
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const { data } = await http.post("/auth/refresh", { refreshToken });
    return mapTokens(data);
  }
  async me() {
    const { data } = await http.get("/auth/me");
    return { userId: data.id, email: data.email };
  }
}
