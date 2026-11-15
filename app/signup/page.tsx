"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AuthFormLayout } from "../_components/auth-form-layout";
import { InlineFeedback } from "@/components/shared/inline-feedback";
import { LoadingState } from "@/components/shared/lumen-page";
import { getAuthReturnPath } from "@/lib/features/auth/return-path";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [returnPath, setReturnPath] = useState("/");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      const path = getAuthReturnPath(window.location.search);
      if (data.session) {
        router.replace(path);
        return;
      }
      setReturnPath(path);
      setCheckingSession(false);
    }
    checkSession();
  }, [router, supabase]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });
      if (error) throw error;
      if (!data.session) {
        setNeedsConfirmation(true);
        return;
      }

      // Ensure profile row exists for the new user (needed for reviews display)
      if (data?.user && data.session) {
        const tag = email.split("@")[0] || null;
        const { error: profileError } = await supabase.from("profiles").upsert(
          {
            id: data.user.id,
            first_name: firstName || null,
            last_name: lastName || null,
            tag,
          },
          { onConflict: "id" }
        );
        if (profileError) throw profileError;
      }

      router.replace(returnPath);
      router.refresh();
    } catch (error) {
      setError(getErrorMessage(error, "Could not create your account"));
    } finally {
      setLoading(false);
    }
  };

  const signInHref = returnPath === "/" ? "/login" : `/login?redirect=${encodeURIComponent(returnPath)}`;
  return checkingSession ? <LoadingState label="Checking session…" /> : (
    <AuthFormLayout title={needsConfirmation ? "Check your email" : "Create an account"}
      switchLabel="Already have an account?" switchLink="Sign in" switchHref={signInHref}>
        {needsConfirmation ? <InlineFeedback>
          Follow the confirmation link in your email, then <Link href={signInHref} className="keyboard-focus underline">sign in</Link>.
        </InlineFeedback> : (
          <form onSubmit={handleSignup} className="grid gap-4" aria-busy={loading}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="first-name">First name</Label>
                <Input
                  id="first-name"
                  autoComplete="given-name"
                  className="h-11"
                  placeholder="Max"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last-name">Last name</Label>
                <Input
                  id="last-name"
                  autoComplete="family-name"
                  className="h-11"
                  placeholder="Robinson"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                className="h-11"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                className="h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>
            {error && <InlineFeedback error>{error}</InlineFeedback>}
            <Button type="submit" className="min-h-11 w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>
        )}
    </AuthFormLayout>
  );
}
