import { afterEach, describe, expect, it, vi } from "vitest";
import { sessionStore } from "./sessionStore";

const session = { token: "token-123", user: { id: "user-1", email: "ada@example.com" } };

/** What the browser does in this tab when another tab changes the stored session. */
function changeInAnotherTab(newValue: string | null) {
  if (newValue === null) localStorage.removeItem("jobtrack.session");
  else localStorage.setItem("jobtrack.session", newValue);
  window.dispatchEvent(new StorageEvent("storage", { key: "jobtrack.session", newValue }));
}

describe("sessionStore", () => {
  afterEach(() => sessionStore.signOut());

  it("signs this tab out when another tab signs out", () => {
    sessionStore.signIn(session);
    const listener = vi.fn();
    const unsubscribe = sessionStore.subscribe(listener);

    changeInAnotherTab(null);

    expect(sessionStore.get()).toBeNull();
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it("follows a sign-in from another tab", () => {
    changeInAnotherTab(JSON.stringify(session));

    expect(sessionStore.get()).toEqual(session);
  });

  it("ignores changes to other storage keys", () => {
    sessionStore.signIn(session);

    window.dispatchEvent(new StorageEvent("storage", { key: "something-else", newValue: null }));

    expect(sessionStore.get()).toEqual(session);
  });
});
