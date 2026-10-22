import type { ErrorRequestHandler } from "express";
import { z, ZodError } from "zod";
import { AuthenticationError, ConflictError, NotFoundError } from "../domain/errors.js";
import { TooManyRequestsError } from "./rateLimiter.js";

export type ReportError = (error: unknown) => void;

interface ErrorResponse {
  status: number;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

/** The single place where errors become HTTP responses, always as `{ error: { message, fieldErrors? } }`. */
export function createErrorHandler(reportError: ReportError): ErrorRequestHandler {
  return (error: unknown, _request, response, _next) => {
    const { status, ...body } = toErrorResponse(error);
    // 4xx are the client's mistake and expected; 5xx are our bugs and must reach Sentry.
    if (status >= 500) reportError(error);
    if (error instanceof TooManyRequestsError) response.setHeader("Retry-After", String(error.retryAfterSeconds));
    response.status(status).json({ error: body });
  };
}

function toErrorResponse(error: unknown): ErrorResponse {
  if (error instanceof ZodError) {
    return {
      status: 400,
      message: error.issues[0]?.message ?? "Invalid request",
      fieldErrors: z.flattenError(error).fieldErrors,
    };
  }
  if (error instanceof AuthenticationError) return { status: 401, message: error.message };
  if (error instanceof NotFoundError) return { status: 404, message: error.message };
  if (error instanceof ConflictError) return { status: 409, message: error.message };
  if (error instanceof TooManyRequestsError) return { status: 429, message: error.message };
  if (isClientRequestError(error)) return { status: error.status, message: error.message };
  // Never leak internals (stack traces, SQL) to the client.
  return { status: 500, message: "Something went wrong. Please try again." };
}

/** Errors raised by Express's JSON parser, such as malformed JSON (400) or a body that is too large (413). */
function isClientRequestError(error: unknown): error is Error & { status: number } {
  return (
    error instanceof Error &&
    "status" in error &&
    typeof error.status === "number" &&
    error.status >= 400 &&
    error.status < 500
  );
}
