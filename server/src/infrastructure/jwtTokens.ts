import jwt from "jsonwebtoken";
import type { TokenIssuer } from "../domain/auth/user.js";

// Pinning the algorithm on verify stops "alg confusion" attacks (e.g. a token signed with "none").
const ALGORITHM = "HS256";
const TOKEN_LIFETIME = "7d";

export interface JwtTokens extends TokenIssuer {
  /** Returns the user id, or null when the token is invalid, tampered with or expired. */
  verifyToken: (token: string) => string | null;
}

export function createJwtTokens(secret: string): JwtTokens {
  return {
    issueToken(userId) {
      return jwt.sign({}, secret, { subject: userId, expiresIn: TOKEN_LIFETIME, algorithm: ALGORITHM });
    },

    verifyToken(token) {
      try {
        const payload = jwt.verify(token, secret, { algorithms: [ALGORITHM] });
        return typeof payload === "object" && typeof payload.sub === "string" ? payload.sub : null;
      } catch (error) {
        // Expired and malformed tokens are expected; anything else is a bug worth surfacing.
        if (error instanceof jwt.JsonWebTokenError) return null;
        throw error;
      }
    },
  };
}
