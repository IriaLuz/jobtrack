export interface User {
  id: string;
  email: string;
  passwordHash: string;
}

export interface Credentials {
  email: string;
  password: string;
}

/** What the client receives after signing in: a token to send back, and who is signed in. */
export interface AuthSession {
  token: string;
  user: { id: string; email: string };
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  /**
   * Throws ConflictError when the email is already registered. The database's unique index is
   * the only place that can enforce this without a race between two simultaneous sign-ups.
   */
  create(user: { email: string; passwordHash: string }): Promise<User>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  matches(password: string, passwordHash: string): Promise<boolean>;
}

export interface TokenIssuer {
  issueToken(userId: string): string;
}
