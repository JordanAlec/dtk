import axios from "axios";
import type { HttpOptions, RetryConfig } from "../types/http.js";

export type { HttpOptions };

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string,
    public readonly method: string,
    public readonly body: unknown
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class RateLimiter {
  private timestamps: number[] = [];

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number
  ) {
    if (maxRequests <= 0) throw new Error("RateLimiter: maxRequests must be greater than 0");
  }

  async throttle(): Promise<void> {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);
    if (this.timestamps.length >= this.maxRequests) {
      const wait = this.windowMs - (now - this.timestamps[0]);
      await new Promise((r) => setTimeout(r, wait));
      return this.throttle();
    }
    this.timestamps.push(Date.now());
  }
}

function normalizeError(err: unknown, url: string, method: string): Error {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status ?? 0;
    const body = err.response?.data;
    const detail = body?.Detail ?? body?.message ?? err.message;
    return new HttpError(`HTTP ${status}: ${detail}`, status, url, method, body);
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
  url: string,
  method: string,
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

  throw normalizeError(lastErr, url, method);
}

function axiosConfig(options?: HttpOptions): Record<string, unknown> {
  const config: Record<string, unknown> = { headers: options?.headers };
  if (options?.timeoutMs !== undefined) config.timeout = options.timeoutMs;
  return config;
}

export async function httpGet<T>(url: string, options?: HttpOptions): Promise<T> {
  return executeWithRetry(
    async () => {
      await options?.rateLimiter?.throttle();
      return axios.get<T>(url, axiosConfig(options)).then((r) => r.data);
    },
    url,
    "GET",
    options?.retry
  );
}

export async function httpPost<TBody, TResponse>(
  url: string,
  body: TBody,
  options?: HttpOptions
): Promise<TResponse> {
  return executeWithRetry(
    async () => {
      await options?.rateLimiter?.throttle();
      return axios.post<TResponse>(url, body, axiosConfig(options)).then((r) => r.data);
    },
    url,
    "POST",
    options?.retry
  );
}

export async function httpPut<TBody, TResponse>(
  url: string,
  body: TBody,
  options?: HttpOptions
): Promise<TResponse> {
  return executeWithRetry(
    async () => {
      await options?.rateLimiter?.throttle();
      return axios.put<TResponse>(url, body, axiosConfig(options)).then((r) => r.data);
    },
    url,
    "PUT",
    options?.retry
  );
}

export async function httpDelete(url: string, options?: HttpOptions): Promise<number> {
  return executeWithRetry(
    async () => {
      await options?.rateLimiter?.throttle();
      return axios.delete(url, axiosConfig(options)).then((r) => r.status);
    },
    url,
    "DELETE",
    options?.retry
  );
}
