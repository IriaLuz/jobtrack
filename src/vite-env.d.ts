/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional. Set in Vercel to send frontend errors to Sentry. */
  readonly VITE_SENTRY_DSN?: string;
}
