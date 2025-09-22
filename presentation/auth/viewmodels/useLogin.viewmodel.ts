import { useState } from "react";

import type { User } from "@domain/auth/entities/User.entity";
import { AuthError } from "@domain/auth/errors/AuthError";
import { LoginWithPassword } from "@domain/auth/usecases/LoginWithPassword.usecase";

type State = { email: string; password: string; loading: boolean; error?: string };
type VM = State & { setEmail(v: string): void; setPassword(v: string): void; submit(): Promise<void> };

export const useLoginViewModel = (deps: {
  loginUC: LoginWithPassword;
  onSuccess?(user: User): void;
}): VM => {
  const [state, set] = useState<State>({ email: "", password: "", loading: false });

  const submit = async () => {
    set((s) => ({ ...s, loading: true, error: undefined }));
    try {
      const res = await deps.loginUC.execute({ email: state.email, password: state.password });
      if (!res.ok) {
        set((s) => ({ ...s, error: toErrorMessage(res.error) }));
        return;
      }
      deps.onSuccess?.(res.value);
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

function toErrorMessage(error: AuthError): string {
  switch (error.kind) {
    case "InvalidCredentials":
      return "Invalid email or password";
    case "Network":
      return "Network error. Please try again.";
    case "Unknown":
    default:
      return error.message ?? "Login failed";
  }
}
