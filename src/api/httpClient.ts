import { sessionStore } from "../auth/sessionStore";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }

  /** 4xx: retrying the same request cannot succeed. */
  get isClientError() {
    return this.status >= 400 && this.status < 500;
  }
}

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

/** Calls our API with the signed-in user's token and turns error responses into ApiError. */
export async function apiRequest<T>(
  path: string,
  { method = "GET", body }: { method?: HttpMethod; body?: unknown } = {},
): Promise<T> {
  const session = sessionStore.get();
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (session) headers.Authorization = `Bearer ${session.token}`;

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }

  // The token expired or is no longer valid: send the user back to the sign-in screen.
  if (response.status === 401 && session) sessionStore.signOut();
  if (!response.ok) throw new ApiError(await readErrorMessage(response), response.status);

  // The server's response types are our contract with it; 204 has no body.
  return (response.status === 204 ? undefined : await response.json()) as T;
}

async function readErrorMessage(response: Response): Promise<string> {
  const fallback = `Request failed (${response.status})`;
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}
