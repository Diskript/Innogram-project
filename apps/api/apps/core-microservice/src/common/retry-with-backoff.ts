export interface RetryOptions {
  initialDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  jitter?: boolean;
  timeoutMs?: number;
  onRetry?: (attempt: number, delayMs: number, error: Error) => void;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const initialDelayMs = options.initialDelayMs ?? 500;
  const maxDelayMs = options.maxDelayMs ?? 8000;
  const factor = options.factor ?? 2;
  const jitter = options.jitter ?? true;
  const timeoutMs = options.timeoutMs ?? 60_000;

  const deadline = Date.now() + timeoutMs;
  let delay = initialDelayMs;
  let attempt = 0;
  let lastError: Error = new Error("retryWithBackoff: no attempts made");

  while (true) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      attempt++;
      if (Date.now() + delay >= deadline) {
        throw lastError;
      }
      const waitMs = jitter ? delay + Math.random() * delay * 0.25 : delay;
      options.onRetry?.(attempt, waitMs, lastError);
      await sleep(waitMs);
      delay = Math.min(delay * factor, maxDelayMs);
    }
  }
}
