import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import * as Sentry from "@sentry/react";

import "./index.css";
import App from "./App";
import { ApiError } from "./api/httpClient";
import { sessionStore } from "./auth/sessionStore";

// Without a DSN (local development, tests) Sentry stays off and errors only reach the console.
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, environment: import.meta.env.MODE });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A 4xx (signed out, not found, invalid) will fail again; only retry network and server errors.
      retry: (failureCount, error) =>
        failureCount < 2 && !(error instanceof ApiError && error.isClientError),
    },
  },
});

// Signing in or out must never show the next user the previous user's cached data.
sessionStore.subscribe(() => queryClient.clear());

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={<p role="alert" className="m-auto p-6">Something went wrong. Please reload the page.</p>}
    >
      <QueryClientProvider client={queryClient}>
        <App />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>
);
