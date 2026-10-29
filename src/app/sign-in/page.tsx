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
  CheckCircle2,
} from "lucide-react";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectToParam = searchParams.get("redirectTo");
  const urlError = searchParams.get("error");
  const verifiedNotice = searchParams.get("verified");

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGithubLoading, setIsGithubLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(
    urlError || null
  );
  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    verifiedNotice
      ? "Your email has been verified! You may now sign in."
      : null
  );

  const safeRedirect = getSafeRedirectUrl(redirectToParam, "/dashboard");

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (
          error.message.toLowerCase().includes("invalid login credentials")
        ) {
          setErrorMessage(
            "Invalid email or password. Please verify your credentials and try again."
          );
        } else if (
          error.message.toLowerCase().includes("email not confirmed")
        ) {
          setErrorMessage(
            "Please confirm your email address before signing in. Check your inbox for the verification link."
          );
        } else {
          setErrorMessage(error.message);
        }
        setIsLoading(false);
        return;
      }

      if (data.user) {
        router.push(safeRedirect);
        router.refresh();
      }
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    setIsGithubLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

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
      setErrorMessage("Unable to initiate GitHub sign-in. Please try again.");
      setIsGithubLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-50/50 px-4 py-12 sm:px-6 lg:px-8 dark:bg-slate-950">
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
          Welcome back
        </h1>
        <p className="mt-1.5 text-center text-sm text-slate-600 dark:text-slate-400">
          Sign in to access your event workspaces and AI copilot
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          {/* Status Banners */}
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

          {successMessage && (
            <div
              className="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
              role="status"
            >
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="leading-relaxed">{successMessage}</span>
            </div>
          )}

          {/* GitHub Sign-in */}
          <Button
            type="button"
            variant="outline"
            disabled={isLoading || isGithubLoading}
            onClick={handleGithubSignIn}
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
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Email address
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
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Password
                </label>
              </div>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
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
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
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
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </Button>
          </form>

          {/* Footnote link to Sign Up */}
          <div className="mt-6 text-center text-xs text-slate-600 dark:text-slate-400">
            <span>Don&apos;t have an account? </span>
            <Link
              href={
                redirectToParam
                  ? `/sign-up?redirectTo=${encodeURIComponent(redirectToParam)}`
                  : "/sign-up"
              }
              className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline dark:text-indigo-400"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
          <Loader2 className="size-6 animate-spin text-indigo-600" />
        </div>
      }
    >
      <SignInContent />
    </React.Suspense>
  );
}
