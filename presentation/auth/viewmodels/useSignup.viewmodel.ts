import { useState } from "react";

import type { User } from "@domain/auth/entities/User.entity";
import { AuthError } from "@domain/auth/errors/AuthError";
import { SignupWithPassword } from "@domain/auth/usecases/SignupWithPassword.usecase";

type Status = "idle" | "loading" | "success" | "error";

type State = {
  email: string;
  password: string;
  status: Status;
  error?: string;
  user?: User;
};

type VM = State & {
  setEmail(v: string): void;
  setPassword(v: string): void;
  submit(): Promise<void>;
  reset(): void;
};

export const useSignupViewModel = (deps: {
  signupUC: SignupWithPassword;
  onSuccess?(user: User): void;
  onFailure?(error: AuthError): void;
}): VM => {
  const [state, set] = useState<State>({ email: "", password: "", status: "idle" });

  const submit = async () => {
    set((s) => ({ ...s, status: "loading", error: undefined, user: undefined }));
    try {
      const res = await deps.signupUC.execute({ email: state.email, password: state.password });
      if (!res.ok) {
        const message = toErrorMessage(res.error);
        set((s) => ({ ...s, status: "error", error: message }));
        deps.onFailure?.(res.error);
        return;
      }
      set((s) => ({ ...s, status: "success", user: res.value }));
      deps.onSuccess?.(res.value);
    } catch (e: any) {
      const message = e?.message ?? "Signup failed";
      set((s) => ({ ...s, status: "error", error: message }));
    }
  };

  return {
    ...state,
    setEmail: (v) => set((s) => ({ ...s, email: v })),
    setPassword: (v) => set((s) => ({ ...s, password: v })),
    submit,
    reset: () => set((s) => ({ ...s, status: "idle", error: undefined, user: undefined })),
  };
};

function toErrorMessage(error: AuthError): string {
  switch (error.kind) {
    case "InvalidCredentials":
      return "Invalid email or password";
    case "AlreadyExists":
      return friendlyAlreadyExists(error.message);
    case "Network":
      return "Network error. Please try again.";
    case "Unknown":
    default:
      if (error.message === "failed_to_create_user") {
        return "Signup failed. Please try again.";
      }
      return error.message ?? "Signup failed";
  }
}

function friendlyAlreadyExists(message?: string): string {
  if (!message) return "This email is already registered";
  if (message === "email_already_registered") return "This email is already registered";
  return message;
}
