import {
  isRetryableUploadError,
  nextUploadRetryDelayMs,
  withUploadRetry,
  UPLOAD_RETRY_BASE_DELAY_MS,
  UPLOAD_RETRY_MAX_DELAY_MS,
} from "../uploadRetry";

describe("uploadRetry", () => {
  it("nextUploadRetryDelayMs doubles then caps", () => {
    expect(nextUploadRetryDelayMs(0, 400, 4000)).toBe(400);
    expect(nextUploadRetryDelayMs(1, 400, 4000)).toBe(800);
    expect(nextUploadRetryDelayMs(2, 400, 4000)).toBe(1600);
    expect(nextUploadRetryDelayMs(10, 400, 4000)).toBe(UPLOAD_RETRY_MAX_DELAY_MS);
    expect(nextUploadRetryDelayMs(0)).toBe(UPLOAD_RETRY_BASE_DELAY_MS);
  });

  it("does not retry auth / permission failures", () => {
    expect(isRetryableUploadError("Not authenticated")).toBe(false);
    expect(isRetryableUploadError("permission denied")).toBe(false);
    expect(isRetryableUploadError("Network request failed")).toBe(true);
    expect(isRetryableUploadError("Upload failed: timeout")).toBe(true);
  });

  it("retries retryable failures then succeeds", async () => {
    const sleep = jest.fn().mockResolvedValue(undefined);
    const run = jest
      .fn()
      .mockResolvedValueOnce({ success: false, error: "Network request failed" })
      .mockResolvedValueOnce({ success: true, file: { id: "f1" } as any });

    const result = await withUploadRetry(run, {
      maxAttempts: 3,
      baseDelayMs: 10,
      maxDelayMs: 100,
      sleep,
    });

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(2);
    expect(run).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(10);
  });

  it("stops early on non-retryable errors", async () => {
    const sleep = jest.fn().mockResolvedValue(undefined);
    const run = jest
      .fn()
      .mockResolvedValue({ success: false, error: "Not authenticated" });

    const result = await withUploadRetry(run, {
      maxAttempts: 3,
      sleep,
    });

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(1);
    expect(run).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("exhausts the budget on persistent Storage failures", async () => {
    const sleep = jest.fn().mockResolvedValue(undefined);
    const run = jest
      .fn()
      .mockResolvedValue({ success: false, error: "Upload failed: 503" });

    const result = await withUploadRetry(run, {
      maxAttempts: 3,
      baseDelayMs: 5,
      maxDelayMs: 20,
      sleep,
    });

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(3);
    expect(run).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });
});
