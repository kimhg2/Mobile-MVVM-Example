import { useEffect, useState } from "react";

import type { User } from "@domain/auth/entities/User.entity";
import { AuthError } from "@domain/auth/errors/AuthError";
import { SignupWithPassword } from "@domain/auth/usecases/SignupWithPassword.usecase";
import { useRetryController } from "@shared/retry/useRetryController";

type Status = "idle" | "loading" | "waiting" | "success" | "error";

type State = {
  email: string;
  password: string;
  status: Status;
  waiting: boolean;
  error?: string;
  user?: User;
  info?: string;
};

type VM = State & {
  setEmail(v: string): void;
  setPassword(v: string): void;
  submit(): void;
  reset(): void;
  syncNow(): void;
};

export const useSignupViewModel = (deps: {
  signupUC: SignupWithPassword;
  onSuccess?(user: User): void;
  onFailure?(error: AuthError): void;
}): VM => {
  const [state, set] = useState<State>({ email: "", password: "", status: "idle", waiting: false });

  const retry = useRetryController<{ email: string; password: string }, User>({
    createIdempotencyKey: () => generateIdempotencyKey(),
    action: async (payload, ctx) => {
      const res = await deps.signupUC.execute(payload, {
        idempotencyKey: ctx.idempotencyKey,
        signal: ctx.signal,
      });
      if (!res.ok) {
        throw res.error;
      }
      return res.value;
    },
    onResolved: (user) => {
      set((s) => ({
        ...s,
        status: "success",
        waiting: false,
        info: undefined,
        error: undefined,
        user,
      }));
      deps.onSuccess?.(user);
    },
    onRejected: (error) => {
      const message = formatSignupError(error);
      set((s) => ({ ...s, status: "error", waiting: false, info: undefined, error: message }));
      if (error instanceof AuthError) {
        deps.onFailure?.(error);
      }
    },
  });

  useEffect(() => {
    const status = retry.state.status;
    if (status === "running" || status === "retrying") {
      set((s) => ({
        ...s,
        status: "loading",
        waiting: false,
        info: status === "retrying" ? "Retrying signup…" : undefined,
        error: undefined,
        user: undefined,
      }));
      return;
    }
    if (status === "waiting") {
      const nextInMs = retry.state.nextAttemptAt ? Math.max(0, retry.state.nextAttemptAt - Date.now()) : undefined;
      const nextInSec = nextInMs ? Math.ceil(nextInMs / 1000) : undefined;
      const info = nextInSec ? `Waiting for connection. Retrying in ${nextInSec}s…` : "Waiting for connection…";
      set((s) => ({ ...s, status: "waiting", waiting: true, info }));
      return;
    }
    if (status === "idle") {
      set((s) => ({ ...s, status: "idle", waiting: false, info: undefined }));
    }
  }, [retry.state.status, retry.state.nextAttemptAt]);

  const submit = () => {
    const payload = { email: state.email, password: state.password };
    set((s) => ({ ...s, error: undefined, user: undefined }));
    retry.start(payload);
  };

  const reset = () => {
    retry.reset();
    set((s) => ({ ...s, status: "idle", waiting: false, info: undefined, error: undefined, user: undefined }));
  };

  const syncNow = () => {
    retry.retryNow();
  };

  return {
    ...state,
    setEmail: (v) => set((s) => ({ ...s, email: v })),
    setPassword: (v) => set((s) => ({ ...s, password: v })),
    submit,
    reset,
    syncNow,
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

function generateIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `signup-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatSignupError(error: unknown): string {
  if (error instanceof AuthError) {
    return toErrorMessage(error);
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Signup failed";
}
