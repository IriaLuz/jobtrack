import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sessionStore } from "../auth/sessionStore";
import { apiRequest, ApiError } from "./httpClient";

const session = { token: "token-123", user: { id: "user-1", email: "ada@example.com" } };

function respondWith(status: number, body?: unknown) {
  const fetchMock = vi.fn(() =>
    Promise.resolve(new Response(body === undefined ? null : JSON.stringify(body), { status })),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("apiRequest", () => {
  beforeEach(() => sessionStore.signIn(session));
  afterEach(() => {
    sessionStore.signOut();
    vi.unstubAllGlobals();
  });

  it("sends JSON with the signed-in user's token", async () => {
    const fetchMock = respondWith(201, { id: "job-1" });

    const job = await apiRequest<{ id: string }>("/jobs", { method: "POST", body: { company: "Acme" } });

    expect(job).toEqual({ id: "job-1" });
    expect(fetchMock).toHaveBeenCalledWith("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer token-123" },
      body: JSON.stringify({ company: "Acme" }),
    });
  });

  it("turns the API's error body into an ApiError with its message", async () => {
    respondWith(409, { error: { message: "An account with this email already exists" } });

    await expect(apiRequest("/auth/register", { method: "POST", body: {} })).rejects.toEqual(
      new ApiError("An account with this email already exists", 409),
    );
  });

  it("signs the user out when the token is rejected", async () => {
    respondWith(401, { error: { message: "Please sign in to continue" } });

    await expect(apiRequest("/jobs")).rejects.toBeInstanceOf(ApiError);
    expect(sessionStore.get()).toBeNull();
  });

  it("explains a network failure in words a user understands", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))));

    await expect(apiRequest("/jobs")).rejects.toThrow("Can't reach the server");
  });

  it("returns nothing for 204 No Content", async () => {
    respondWith(204);

    await expect(apiRequest<void>("/jobs/job-1", { method: "DELETE" })).resolves.toBeUndefined();
  });
});
