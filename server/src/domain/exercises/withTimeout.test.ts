import { describe, expect, it } from "vitest";
import { TimeoutError, withTimeout } from "./withTimeout.js";

describe("withTimeout", () => {
  it("returns the task's result when it finishes in time", async () => {
    await expect(withTimeout(() => Promise.resolve("done"), 50)).resolves.toBe("done");
  });

  it("passes through the task's own error", async () => {
    await expect(withTimeout(() => Promise.reject(new Error("boom")), 50)).rejects.toThrow("boom");
  });

  it("rejects after the timeout even if the task ignores the abort signal", async () => {
    const ignoresSignal = () => new Promise<never>(() => {});

    await expect(withTimeout(ignoresSignal, 10)).rejects.toThrow(TimeoutError);
  });

  it("aborts the signal it gave the task", async () => {
    let signal: AbortSignal | undefined;

    await withTimeout((taskSignal) => {
      signal = taskSignal;
      return new Promise<never>(() => {});
    }, 10).catch(() => {});

    expect(signal?.aborted).toBe(true);
  });
});
