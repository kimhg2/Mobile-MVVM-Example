import { useEffect, useState } from "react";

import type { User } from "@domain/auth/entities/User.entity";
import { AuthError } from "@domain/auth/errors/AuthError";
import { LoginWithPassword } from "@domain/auth/usecases/LoginWithPassword.usecase";
import { useRetryController } from "@shared/retry/useRetryController";

type State = {
  email: string;
  password: string;
  loading: boolean;
  waiting: boolean;
  error?: string;
  info?: string;
};

type VM = State & {
  setEmail(v: string): void;
  setPassword(v: string): void;
  submit(): void;
  syncNow(): void;
  reset(): void;
};

export const useLoginViewModel = (deps: {
  loginUC: LoginWithPassword;
  onSuccess?(user: User): void;
}): VM => {
  const [state, set] = useState<State>({
    email: "",
    password: "",
    loading: false,
    waiting: false,
  });

  const retry = useRetryController<{ email: string; password: string }, User>({
    action: async (credentials, ctx) => {
      const res = await deps.loginUC.execute(credentials, {
        idempotencyKey: ctx.idempotencyKey,
        signal: ctx.signal,
      });
      if (!res.ok) {
        throw res.error;
      }
      return res.value;
    },
    onResolved: (user) => {
      set((s) => ({ ...s, loading: false, waiting: false, info: undefined, error: undefined }));
      deps.onSuccess?.(user);
    },
    onRejected: (error) => {
      const message = formatError(error);
      set((s) => ({ ...s, loading: false, waiting: false, info: undefined, error: message }));
    },
  });

  useEffect(() => {
    const status = retry.state.status;
    if (status === "running" || status === "retrying") {
      set((s) => ({ ...s, loading: true, waiting: false, info: status === "retrying" ? "Retrying…" : undefined }));
      return;
    }
    if (status === "waiting") {
      const nextInMs = retry.state.nextAttemptAt ? Math.max(0, retry.state.nextAttemptAt - Date.now()) : undefined;
      const nextInSec = nextInMs ? Math.ceil(nextInMs / 1000) : undefined;
      const info = nextInSec ? `Waiting for connection. Retrying in ${nextInSec}s…` : "Waiting for connection…";
      set((s) => ({ ...s, loading: false, waiting: true, info, error: s.error }));
      return;
    }
    if (status === "success") {
      set((s) => ({ ...s, loading: false, waiting: false, info: undefined }));
      return;
    }
    if (status === "failed") {
      set((s) => ({ ...s, loading: false, waiting: false, info: undefined }));
      return;
    }
    if (status === "idle") {
      set((s) => ({ ...s, loading: false, waiting: false, info: undefined }));
    }
  }, [retry.state.status, retry.state.nextAttemptAt]);

  const submit = () => {
    const credentials = { email: state.email, password: state.password };
    set((s) => ({ ...s, error: undefined }));
    retry.start(credentials);
  };

  const syncNow = () => {
    retry.retryNow();
  };

  const reset = () => {
    retry.reset();
    set((s) => ({ ...s, loading: false, waiting: false, info: undefined }));
  };

  return {
    ...state,
    setEmail: (v) => set((s) => ({ ...s, email: v })),
    setPassword: (v) => set((s) => ({ ...s, password: v })),
    submit,
    syncNow,
    reset,
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
      return error.message ?? "Login failed";
  }
}

function friendlyAlreadyExists(message?: string): string {
  if (!message) return "Account already exists";
  if (message === "email_already_registered") return "Account already exists";
  return message;
}

function formatError(error: unknown): string {
  if (error instanceof AuthError) {
    return toErrorMessage(error);
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Login failed";
}
