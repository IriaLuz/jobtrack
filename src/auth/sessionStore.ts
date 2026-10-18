import { useSyncExternalStore } from "react";

export interface Session {
  token: string;
  user: { id: string; email: string };
}

const STORAGE_KEY = "jobtrack.session";

// A tiny external store: plain modules (like the HTTP client) can read and clear the session,
// and React components re-render through useSyncExternalStore. No Context provider needed.
const listeners = new Set<() => void>();
let currentSession: Session | null = readStoredSession();

function readStoredSession(): Session | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Session) : null;
  } catch {
    return null;
  }
}

function setSession(session: Session | null) {
  currentSession = session;
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable (e.g. some private modes): the session then lives in memory only.
  }
  listeners.forEach((listener) => listener());
}

// Another tab signed in or out: follow it, so signing out anywhere signs out everywhere.
// (The browser only fires this event in the *other* tabs, never in the one that made the change.)
window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY) return;
  currentSession = readStoredSession();
  listeners.forEach((listener) => listener());
});

export const sessionStore = {
  get: (): Session | null => currentSession,
  signIn: (session: Session) => setSession(session),
  signOut: () => setSession(null),
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export const useSession = () => useSyncExternalStore(sessionStore.subscribe, sessionStore.get);
