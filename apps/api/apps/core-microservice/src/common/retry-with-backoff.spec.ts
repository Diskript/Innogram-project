import { retryWithBackoff } from "./retry-with-backoff";

describe("retryWithBackoff", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns on first success without retry", async () => {
    const fn = jest.fn().mockResolvedValue("ok");
    await expect(retryWithBackoff(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries until success and calls onRetry with attempt and delay", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("fail-1"))
      .mockRejectedValueOnce(new Error("fail-2"))
      .mockResolvedValue("done");
    const onRetry = jest.fn();

    const promise = retryWithBackoff(fn, {
      initialDelayMs: 100,
      jitter: false,
      timeoutMs: 10_000,
      onRetry,
    });

    await jest.advanceTimersByTimeAsync(0);
    await jest.advanceTimersByTimeAsync(100);
    await jest.advanceTimersByTimeAsync(200);

    await expect(promise).resolves.toBe("done");
    expect(fn).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, 100, new Error("fail-1"));
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, 200, new Error("fail-2"));
  });

  it("caps delay at maxDelayMs", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("always"));
    const delays: number[] = [];
    const promise = retryWithBackoff(fn, {
      initialDelayMs: 1000,
      maxDelayMs: 2000,
      factor: 4,
      jitter: false,
      timeoutMs: 5_000,
      onRetry: (_attempt, delayMs) => delays.push(delayMs),
    });

    promise.catch(() => undefined);
    for (let i = 0; i < 5; i++) {
      await jest.advanceTimersByTimeAsync(10_000);
    }
    await expect(promise).rejects.toThrow("always");
    expect(delays).toEqual([1000, 2000]);
  });

  it("throws last error when timeout budget exhausted", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("db down"));
    const promise = retryWithBackoff(fn, {
      initialDelayMs: 500,
      jitter: false,
      timeoutMs: 1000,
    });

    promise.catch(() => undefined);
    await jest.advanceTimersByTimeAsync(5_000);

    await expect(promise).rejects.toThrow("db down");
  });
});
