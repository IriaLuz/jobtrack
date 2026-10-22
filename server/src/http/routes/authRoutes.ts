import { Router } from "express";
import type { AuthService } from "../../domain/auth/authService.js";
import type { RateLimiter } from "../rateLimiter.js";
import { loginSchema, registerSchema } from "../schemas.js";

export function createAuthRouter(authService: AuthService, loginRateLimiter: RateLimiter): Router {
  const router = Router();

  router.post("/register", async (request, response) => {
    const credentials = registerSchema.parse(request.body);
    response.status(201).json(await authService.register(credentials));
  });

  router.post("/login", async (request, response) => {
    const credentials = loginSchema.parse(request.body);
    await loginRateLimiter.check(credentials.email);
    response.json(await authService.login(credentials));
  });

  return router;
}
