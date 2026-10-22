import { AuthenticationError } from "../errors.js";
import type { AuthSession, Credentials, PasswordHasher, TokenIssuer, User, UserRepository } from "./user.js";

interface AuthServiceDependencies {
  userRepository: UserRepository;
  passwordHasher: PasswordHasher;
  tokenIssuer: TokenIssuer;
}

export function createAuthService({ userRepository, passwordHasher, tokenIssuer }: AuthServiceDependencies) {
  function startSession(user: User): AuthSession {
    return {
      token: tokenIssuer.issueToken(user.id),
      user: { id: user.id, email: user.email },
    };
  }

  return {
    async register({ email, password }: Credentials): Promise<AuthSession> {
      const passwordHash = await passwordHasher.hash(password);
      const user = await userRepository.create({ email, passwordHash });
      return startSession(user);
    },

    async login({ email, password }: Credentials): Promise<AuthSession> {
      const user = await userRepository.findByEmail(email);
      const isPasswordCorrect = user !== null && (await passwordHasher.matches(password, user.passwordHash));
      // Same message for "unknown email" and "wrong password", so sign-in does not reveal who has an account.
      if (!user || !isPasswordCorrect) throw new AuthenticationError("Invalid email or password");
      return startSession(user);
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
