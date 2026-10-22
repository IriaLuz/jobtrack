import type { Session } from "../auth/sessionStore";
import { apiRequest } from "./httpClient";

export interface Credentials {
  email: string;
  password: string;
}

export const authApi = {
  signIn: (credentials: Credentials) =>
    apiRequest<Session>("/auth/login", { method: "POST", body: credentials }),

  signUp: (credentials: Credentials) =>
    apiRequest<Session>("/auth/register", { method: "POST", body: credentials }),
};
