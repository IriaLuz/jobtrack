import type { RequestHandler, Response } from "express";
import { AuthenticationError } from "../domain/errors.js";

export type VerifyToken = (token: string) => string | null;

/** Lets the request through only with a valid `Authorization: Bearer <token>` header. */
export function requireAuth(verifyToken: VerifyToken): RequestHandler {
  return (request, response, next) => {
    const [scheme, token] = request.headers.authorization?.split(" ") ?? [];
    const userId = scheme === "Bearer" && token ? verifyToken(token) : null;
    if (!userId) throw new AuthenticationError("Please sign in to continue");

    response.locals.userId = userId;
    next();
  };
}

/** The signed-in user's id. Only valid on routes mounted after `requireAuth`. */
export function getAuthenticatedUserId(response: Response): string {
  const userId: unknown = response.locals.userId;
  if (typeof userId !== "string") {
    throw new Error("getAuthenticatedUserId() was called on a route that is not protected by requireAuth");
  }
  return userId;
}
