"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getSafeRedirectUrl } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlanoraLogo, GithubIcon } from "@/components/ui/planora-logo";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  MailCheck,
} from "lucide-react";

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectToParam = searchParams.get("redirectTo");
  const safeRedirect = getSafeRedirectUrl(redirectToParam, "/dashboard");

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const [isLoading, setIsLoading] = React.useState(false);
  const [isGithubLoading, setIsGithubLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [requiresConfirmationEmail, setRequiresConfirmationEmail] =
    React.useState<string | null>(null);

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side validations
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const callbackUrl = new URL("/auth/callback", origin);
      callbackUrl.searchParams.set("next", safeRedirect);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: callbackUrl.toString(),
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      // Check whether email confirmation is required
      if (data.user && !data.session) {
        // Email confirmation is required
        setRequiresConfirmationEmail(email.trim());
        setIsLoading(false);
        return;
      }

      // If a session exists immediately (e.g. email confirmation disabled in Supabase project)
      if (data.session) {
        router.push(safeRedirect);
        router.refresh();
      }
    } catch {
      setErrorMessage("An unexpected registration error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const handleGithubSignUp = async () => {
    setIsGithubLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const callbackUrl = new URL("/auth/callback", origin);
      callbackUrl.searchParams.set("next", safeRedirect);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setIsGithubLoading(false);
      }
    } catch {
      setErrorMessage("Unable to initiate GitHub sign-up. Please try again.");
      setIsGithubLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col justify-center bg-slate-50/50 px-4 py-12 sm:px-6 lg:px-8 dark:bg-slate-950">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Planora AI</span>
        </Link>

        <div className="mt-4 flex items-center justify-center gap-2">
          <Link
            href="/"
            className="group flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-lg py-1 px-2"
          >
            <PlanoraLogo size={36} iconClassName="size-9 drop-shadow-2xs" />
            <span>Planora</span>
            <span className="rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-1.5 py-0.5 text-xs font-black tracking-wider text-white shadow-2xs">
              AI
            </span>
          </Link>
        </div>

        <h1 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          Create your account
        </h1>
        <p className="mt-1.5 text-center text-sm text-slate-600 dark:text-slate-400">
          Start planning intelligent events with AI precision
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          {requiresConfirmationEmail ? (
            /* Confirmation Email Required View */
            <div className="text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <MailCheck className="size-6" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                Verify your email address
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                We sent a verification link to{" "}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {requiresConfirmationEmail}
                </span>
                . Please click the link in your email to verify your account.
              </p>
              <div className="mt-6 space-y-3">
                <Button
                  onClick={() => router.push("/sign-in")}
                  className="w-full justify-center bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Proceed to Sign in
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setRequiresConfirmationEmail(null);
                    setEmail("");
                    setPassword("");
                    setConfirmPassword("");
                  }}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Register with a different email
                </button>
              </div>
            </div>
          ) : (
            /* Sign Up Form View */
            <>
              {errorMessage && (
                <div
                  id="auth-error-banner"
                  className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                  role="alert"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {/* GitHub Sign-in */}
              <Button
                type="button"
                variant="outline"
                disabled={isLoading || isGithubLoading}
                onClick={handleGithubSignUp}
                className="w-full justify-center gap-2.5 border-slate-300 bg-white py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80"
              >
                {isGithubLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <GithubIcon />
                )}
                <span>Continue with GitHub</span>
              </Button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                    Or register with email
                  </span>
                </div>
              </div>

              {/* Registration Form */}
              <form onSubmit={handleEmailSignUp} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Work email address
                  </label>
                  <div className="mt-1.5">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      aria-invalid={Boolean(errorMessage)}
                      aria-describedby={errorMessage ? "auth-error-banner" : undefined}
                      disabled={isLoading || isGithubLoading}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="planner@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Password (minimum 8 characters)
                  </label>
                  <div className="relative mt-1.5">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      aria-invalid={Boolean(errorMessage)}
                      aria-describedby={errorMessage ? "auth-error-banner" : undefined}
                      disabled={isLoading || isGithubLoading}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 transition hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-r-md dark:text-slate-400 dark:hover:text-slate-200"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirm-password"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Confirm password
                  </label>
                  <div className="relative mt-1.5">
                    <Input
                      id="confirm-password"
                      name="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      aria-invalid={Boolean(errorMessage)}
                      aria-describedby={errorMessage ? "auth-error-banner" : undefined}
                      disabled={isLoading || isGithubLoading}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 transition hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-r-md dark:text-slate-400 dark:hover:text-slate-200"
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || isGithubLoading}
                  className="mt-2 w-full justify-center bg-indigo-600 font-medium text-white shadow-sm hover:bg-indigo-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <span>Create account</span>
                  )}
                </Button>
              </form>

              {/* Link to Sign In */}
              <div className="mt-6 text-center text-xs text-slate-600 dark:text-slate-400">
                <span>Already have an account? </span>
                <Link
                  href={
                    redirectToParam
                      ? `/sign-in?redirectTo=${encodeURIComponent(
                          redirectToParam
                        )}`
                      : "/sign-in"
                  }
                  className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline dark:text-indigo-400"
                >
                  Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function SignUpPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
          <Loader2 className="size-6 animate-spin text-indigo-600" />
        </div>
      }
    >
      <SignUpContent />
    </React.Suspense>
  );
}
