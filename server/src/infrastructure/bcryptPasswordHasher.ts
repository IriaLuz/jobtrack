import bcrypt from "bcryptjs";
import type { PasswordHasher } from "../domain/auth/user.js";

/** 12 rounds is the usual production default: slow enough to resist brute force, ~250ms per hash. */
const DEFAULT_COST_FACTOR = 12;

/** bcryptjs is pure JavaScript, so there is no native module to build on CI or Vercel. */
export function createBcryptPasswordHasher(costFactor = DEFAULT_COST_FACTOR): PasswordHasher {
  return {
    hash: (password) => bcrypt.hash(password, costFactor),
    matches: (password, passwordHash) => bcrypt.compare(password, passwordHash),
  };
}
