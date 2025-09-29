import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { useNetwork } from "@/hooks/useNetwork";

const DEFAULT_DELAYS = [500, 1_000, 2_000, 4_000, 8_000];

export type RetryStatus =
  | "idle"
  | "running"
  | "retrying"
  | "waiting"
  | "success"
  | "failed";

export type RetryState = {
  status: RetryStatus;
  attempt: number;
  error?: unknown;
  nextAttemptAt?: number;
  idempotencyKey?: string;
};

export type RetryContext = {
  attempt: number;
  idempotencyKey?: string;
  signal: AbortSignal;
};

export type RetryControllerOptions<TArgs, TResult> = {
  action(args: TArgs, context: RetryContext): Promise<TResult>;
  shouldRetry?(error: unknown): boolean;
  delays?: number[];
  maxAttempts?: number;
  createIdempotencyKey?(args: TArgs): string | undefined;
  onResolved?(result: TResult, meta: { attempt: number; idempotencyKey?: string }): void;
  onRejected?(error: unknown, meta: { attempt: number; idempotencyKey?: string }): void;
};

export type RetryController<TArgs> = {
  start(args: TArgs): void;
  cancel(): void;
  retryNow(): void;
  reset(): void;
  state: RetryState;
};

type InternalTask<TArgs> = {
  args: TArgs;
  attempt: number;
  idempotencyKey?: string;
  controller: AbortController;
};

function isAppStateActive(state: string): boolean {
  return state === "active";
}

function defaultShouldRetry(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === "object") {
    const code = (error as any)?.code;
    if (code === "ERR_NETWORK_OFFLINE") return true;
    const status = (error as any)?.status ?? (error as any)?.response?.status;
    if (typeof status === "number") {
      // Do not retry on client errors like 4xx except 408.
      if ([400, 403, 404, 409, 422].includes(status)) {
        return false;
      }
      if (status >= 500 || status === 408) {
        return true;
      }
    }
    const kind = (error as any)?.kind;
    if (kind === "Network") return true;
  }
  if (error instanceof Error) {
    return error.message === "Offline";
  }
  return false;
}

export function useRetryController<TArgs, TResult>(
  options: RetryControllerOptions<TArgs, TResult>
): RetryController<TArgs> {
  const network = useNetwork();
  const [state, setState] = useState<RetryState>({ status: "idle", attempt: 0 });
  const delays = options.delays ?? DEFAULT_DELAYS;
  const maxAttempts = options.maxAttempts ?? delays.length + 1; // initial + retries
  const shouldRetry = options.shouldRetry ?? defaultShouldRetry;

  const taskRef = useRef<InternalTask<TArgs> | null>(null);
  const pendingTaskRef = useRef<InternalTask<TArgs> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const cleanupTask = useCallback(() => {
    if (taskRef.current) {
      taskRef.current.controller.abort();
      taskRef.current = null;
    }
    pendingTaskRef.current = null;
    clearTimeoutRef();
  }, [clearTimeoutRef]);

  const reset = useCallback(() => {
    cleanupTask();
    setState({ status: "idle", attempt: 0 });
  }, [cleanupTask]);

  const scheduleRetry = useCallback(
    (
      task: InternalTask<TArgs>,
      error: unknown,
      runner: (task: InternalTask<TArgs>) => void
    ) => {
      clearTimeoutRef();
      const delayIndex = Math.max(0, task.attempt - 2);
      const delay = delays[delayIndex] ?? delays[delays.length - 1];
      const nextAttemptAt = Date.now() + delay;
      pendingTaskRef.current = task;
      setState({
        status: "waiting",
        attempt: task.attempt - 1,
        error,
        nextAttemptAt,
        idempotencyKey: task.idempotencyKey,
      });
      timeoutRef.current = setTimeout(() => {
        runner(task);
      }, delay);
    },
    [clearTimeoutRef, delays]
  );

  const runAttempt = useCallback(
    async (task: InternalTask<TArgs>) => {
      pendingTaskRef.current = null;
      task.controller = new AbortController();
      taskRef.current = task;
      const attemptStatus = task.attempt === 1 ? "running" : "retrying";
      setState((prev) => ({
        ...prev,
        status: attemptStatus,
        attempt: task.attempt,
        error: undefined,
        nextAttemptAt: undefined,
        idempotencyKey: task.idempotencyKey,
      }));

      try {
        const result = await options.action(task.args, {
          attempt: task.attempt,
          idempotencyKey: task.idempotencyKey,
          signal: task.controller.signal,
        });
        options.onResolved?.(result, {
          attempt: task.attempt,
          idempotencyKey: task.idempotencyKey,
        });
        setState({
          status: "success",
          attempt: task.attempt,
          idempotencyKey: task.idempotencyKey,
        });
        cleanupTask();
      } catch (error) {
        // If the task was manually cancelled, propagate idle state.
        if (task.controller.signal.aborted) {
          setState({ status: "idle", attempt: 0 });
          return;
        }
        const nextAttempt = task.attempt + 1;
        const retryable = shouldRetry(error) && nextAttempt <= maxAttempts;
        if (!retryable) {
          options.onRejected?.(error, {
            attempt: task.attempt,
            idempotencyKey: task.idempotencyKey,
          });
          setState({
            status: "failed",
            attempt: task.attempt,
            error,
            idempotencyKey: task.idempotencyKey,
          });
          cleanupTask();
          return;
        }
        scheduleRetry(
          {
            args: task.args,
            attempt: nextAttempt,
            idempotencyKey: task.idempotencyKey,
            controller: new AbortController(),
          },
          error,
          (nextTask) => {
            runAttempt(nextTask).catch(() => {
              // handled within runAttempt
            });
          }
        );
        taskRef.current = null;
      }
    },
    [cleanupTask, maxAttempts, options, scheduleRetry, shouldRetry]
  );

  const start = useCallback(
    (args: TArgs) => {
      cleanupTask();
      const idempotencyKey = options.createIdempotencyKey?.(args);
      const task: InternalTask<TArgs> = {
        args,
        attempt: 1,
        idempotencyKey,
        controller: new AbortController(),
      };
      runAttempt(task).catch(() => {
        // errors handled in runAttempt
      });
    },
    [cleanupTask, options, runAttempt]
  );

  const retryNow = useCallback(() => {
    const task = pendingTaskRef.current;
    if (!task) return;
    pendingTaskRef.current = null;
    clearTimeoutRef();
    runAttempt(task).catch(() => {
      // handled in runAttempt
    });
  }, [clearTimeoutRef, runAttempt]);

  const cancel = useCallback(() => {
    cleanupTask();
    setState({ status: "idle", attempt: 0 });
  }, [cleanupTask]);

  useEffect(() => {
    if (state.status === "waiting" && network.isOnline) {
      retryNow();
    }
  }, [network.isOnline, retryNow, state.status]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (isAppStateActive(nextState) && state.status === "waiting") {
        retryNow();
      }
    });
    return () => sub.remove();
  }, [retryNow, state.status]);

  useEffect(() => () => cleanupTask(), [cleanupTask]);

  return {
    start,
    cancel,
    retryNow,
    reset,
    state,
  };
}
