import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("axios", () => {
  const post = vi.fn();
  const interceptors = {
    response: { use: vi.fn() },
  };
  const create = vi.fn(() => ({ post, interceptors }));
  return { default: { create } };
});

import axios from "axios";

const mockPost = (axios.create as ReturnType<typeof vi.fn>)()
  .post as ReturnType<typeof vi.fn>;

describe("refreshOnce", () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it("collapses concurrent calls into a single network request", async () => {
    let calls = 0;
    mockPost.mockImplementation(() => {
      calls++;
      return new Promise((resolve) => setTimeout(() => resolve({}), 30));
    });

    const { refreshOnce } = await import("./api");

    await Promise.all([refreshOnce(), refreshOnce(), refreshOnce()]);

    expect(calls).toBe(1);
  });

  it("allows a new refresh after the previous one resolves", async () => {
    let calls = 0;
    mockPost.mockImplementation(() => {
      calls++;
      return Promise.resolve({});
    });

    const { refreshOnce } = await import("./api");

    await refreshOnce();
    await refreshOnce();
    await refreshOnce();

    expect(calls).toBe(3);
  });

  it("clears the in-flight promise even when the refresh rejects", async () => {
    let calls = 0;
    mockPost.mockImplementation(() => {
      calls++;
      return Promise.reject(new Error("network"));
    });

    const { refreshOnce } = await import("./api");

    await expect(refreshOnce()).rejects.toThrow("network");

    await expect(refreshOnce()).rejects.toThrow("network");
    expect(calls).toBe(2);
  });
});
