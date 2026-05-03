export interface RetryConfig {
  attempts: number;
  backoff?: "fixed" | "exponential";
  delayMs?: number;
  maxDelayMs?: number;
  retryOn?: (err: unknown) => boolean;
}

export interface HttpOptions {
  headers?: Record<string, string>;
  retry?: RetryConfig;
}
