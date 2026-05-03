import axios from "axios";
import type { HttpOptions, RetryConfig } from "../types/http.js";

export type { HttpOptions };

function normalizeError(err: unknown): Error {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const data = err.response?.data;
    const detail = data?.Detail ?? data?.message ?? err.message;
    return new Error(`HTTP ${status}: ${detail}`);
  }
  return err instanceof Error ? err : new Error(String(err));
}

function resolveDelay(attempt: number, config: RetryConfig): number {
  const base = config.delayMs ?? 1000;
  const delay =
    config.backoff === "exponential" ? base * Math.pow(2, attempt) : base;
  return config.maxDelayMs !== undefined
    ? Math.min(delay, config.maxDelayMs)
    : delay;
}

async function executeWithRetry<T>(
  fn: () => Promise<T>,
  retry?: RetryConfig
): Promise<T> {
  const maxAttempts = retry && retry.attempts > 0 ? retry.attempts : 0;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isLast = attempt === maxAttempts;
      const shouldRetry = !isLast && !!retry?.retryOn?.(err);
      if (!shouldRetry) break;
      await new Promise((r) => setTimeout(r, resolveDelay(attempt, retry!)));
    }
  }

  throw normalizeError(lastErr);
}

export async function httpGet<T>(url: string, options?: HttpOptions): Promise<T> {
  return executeWithRetry(
    () => axios.get<T>(url, { headers: options?.headers }).then((r) => r.data),
    options?.retry
  );
}

export async function httpPost<TBody, TResponse>(
  url: string,
  body: TBody,
  options?: HttpOptions
): Promise<TResponse> {
  return executeWithRetry(
    () => axios.post<TResponse>(url, body, { headers: options?.headers }).then((r) => r.data),
    options?.retry
  );
}

export async function httpPut<TBody, TResponse>(
  url: string,
  body: TBody,
  options?: HttpOptions
): Promise<TResponse> {
  return executeWithRetry(
    () => axios.put<TResponse>(url, body, { headers: options?.headers }).then((r) => r.data),
    options?.retry
  );
}

export async function httpDelete(url: string, options?: HttpOptions): Promise<number> {
  return executeWithRetry(
    () => axios.delete(url, { headers: options?.headers }).then((r) => r.status),
    options?.retry
  );
}
