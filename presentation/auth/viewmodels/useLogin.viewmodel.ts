import { LoginWithPassword } from "@domain/auth/usecases/LoginWithPassword.usecase";
import type { AuthTokens } from "@domain/auth/ports/Auth.repository";
import type { TokenStore } from "@domain/auth/ports/TokenStore.port";
import { useState } from "react";

type State = { email: string; password: string; loading: boolean; error?: string };
type VM = State & { setEmail(v: string): void; setPassword(v: string): void; submit(): Promise<void> };

export const useLoginViewModel = (deps: {
  loginUC: LoginWithPassword;
  session: { setTokens(tokens: AuthTokens): void; clear(): void };
  tokenStore: TokenStore;
}): VM => {
  const [state, set] = useState<State>({ email: "", password: "", loading: false });

  const submit = async () => {
    set((s) => ({ ...s, loading: true, error: undefined }));
    try {
      const res = await deps.loginUC.execute(state.email, state.password);
      // Save tokens to session (memory) and persistent store (refresh token)
      if (res?.tokens) {
        deps.session.setTokens(res.tokens);
        await deps.tokenStore.setTokens(res.tokens);
      }
      // 네비게이션 or emit success
    } catch (e: any) {
      set((s) => ({ ...s, error: e.message ?? "Login failed" }));
    } finally {
      set((s) => ({ ...s, loading: false }));
    }
  };

  return {
    ...state,
    setEmail: (v) => set((s) => ({ ...s, email: v })),
    setPassword: (v) => set((s) => ({ ...s, password: v })),
    submit,
  };
};
