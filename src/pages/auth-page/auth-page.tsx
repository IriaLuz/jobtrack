import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { authApi, type Credentials } from "../../api/authApi";
import { sessionStore } from "../../auth/sessionStore";
import { Button } from "../../components/button/button";

type AuthMode = "signIn" | "signUp";

const COPY: Record<AuthMode, { title: string; submitLabel: string; switchPrompt: string; switchLabel: string }> = {
  signIn: {
    title: "Sign in",
    submitLabel: "Sign in",
    switchPrompt: "New to jobtrack?",
    switchLabel: "Create an account",
  },
  signUp: {
    title: "Create your account",
    submitLabel: "Create account",
    switchPrompt: "Already have an account?",
    switchLabel: "Sign in instead",
  },
};

export const AuthPage = () => {
  const [mode, setMode] = useState<AuthMode>("signIn");
  const authenticate = useMutation({
    mutationFn: (credentials: Credentials) =>
      mode === "signIn" ? authApi.signIn(credentials) : authApi.signUp(credentials),
    onSuccess: sessionStore.signIn,
  });
  const copy = COPY[mode];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    authenticate.mutate({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
  };

  const switchMode = () => {
    setMode(mode === "signIn" ? "signUp" : "signIn");
    authenticate.reset();
  };

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div>
        <p className="text-sm font-semibold tracking-wide text-(--accent) uppercase">jobtrack</p>
        <h1 className="text-3xl">{copy.title}</h1>
        <p className="mt-2 text-sm">Track every application in one board and practise for the interviews.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required maxLength={254} />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete={mode === "signIn" ? "current-password" : "new-password"}
            required
            minLength={mode === "signUp" ? 8 : undefined}
            maxLength={72}
            aria-describedby={mode === "signUp" ? "password-hint" : undefined}
          />
        </label>
        {mode === "signUp" && (
          <p id="password-hint" className="-mt-2 text-xs">
            At least 8 characters.
          </p>
        )}
        {authenticate.isError && (
          <p role="alert" className="text-sm text-(--danger)">
            {authenticate.error.message}
          </p>
        )}
        <Button type="submit" disabled={authenticate.isPending}>
          {authenticate.isPending ? "Please wait…" : copy.submitLabel}
        </Button>
      </form>

      <p className="text-sm">
        {copy.switchPrompt}{" "}
        <button type="button" onClick={switchMode} className="font-medium text-(--accent) hover:underline">
          {copy.switchLabel}
        </button>
      </p>
    </main>
  );
};
