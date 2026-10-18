// The domain throws errors that describe *what* went wrong.
// The HTTP layer (http/errorHandler.ts) decides which status code each one becomes.

/** The resource does not exist, or it belongs to another user (we never reveal which). */
export class NotFoundError extends Error {
  constructor(resourceName: string) {
    super(`${resourceName} not found`);
    this.name = "NotFoundError";
  }
}

/** The request conflicts with existing data, for example an email that is already registered. */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

/** We could not identify the caller: wrong credentials, or a missing, invalid or expired token. */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}
