import { beforeEach, describe, expect, it } from "vitest";
import { AuthenticationError, ConflictError } from "../errors.js";
import { createAuthService, type AuthService } from "./authService.js";
import type { PasswordHasher, TokenIssuer, User, UserRepository } from "./user.js";

function createInMemoryUserRepository(): UserRepository & { users: User[] } {
  const users: User[] = [];
  return {
    users,
    findByEmail: (email) => Promise.resolve(users.find((user) => user.email === email) ?? null),
    create({ email, passwordHash }) {
      if (users.some((user) => user.email === email)) {
        return Promise.reject(new ConflictError("An account with this email already exists"));
      }
      const user = { id: `user-${users.length + 1}`, email, passwordHash };
      users.push(user);
      return Promise.resolve(user);
    },
  };
}

const fakePasswordHasher: PasswordHasher = {
  hash: (password) => Promise.resolve(`hashed:${password}`),
  matches: (password, passwordHash) => Promise.resolve(passwordHash === `hashed:${password}`),
};

const fakeTokenIssuer: TokenIssuer = {
  issueToken: (userId) => `token-for-${userId}`,
};

const credentials = { email: "ada@example.com", password: "correct-horse-battery" };

describe("authService", () => {
  let userRepository: ReturnType<typeof createInMemoryUserRepository>;
  let authService: AuthService;

  beforeEach(() => {
    userRepository = createInMemoryUserRepository();
    authService = createAuthService({
      userRepository,
      passwordHasher: fakePasswordHasher,
      tokenIssuer: fakeTokenIssuer,
    });
  });

  it("registers a user, stores only the password hash and starts a session", async () => {
    const session = await authService.register(credentials);

    expect(session).toEqual({
      token: "token-for-user-1",
      user: { id: "user-1", email: "ada@example.com" },
    });
    expect(userRepository.users[0]?.passwordHash).toBe("hashed:correct-horse-battery");
  });

  it("rejects a second registration with the same email", async () => {
    await authService.register(credentials);

    await expect(authService.register(credentials)).rejects.toThrow(ConflictError);
  });

  it("signs in with the right password", async () => {
    await authService.register(credentials);

    const session = await authService.login(credentials);

    expect(session.user.email).toBe("ada@example.com");
  });

  it("gives the same error for a wrong password and for an unknown email", async () => {
    await authService.register(credentials);

    const wrongPassword = authService.login({ ...credentials, password: "wrong-password" });
    const unknownEmail = authService.login({ ...credentials, email: "nobody@example.com" });

    await expect(wrongPassword).rejects.toThrow(new AuthenticationError("Invalid email or password"));
    await expect(unknownEmail).rejects.toThrow(new AuthenticationError("Invalid email or password"));
  });
});
