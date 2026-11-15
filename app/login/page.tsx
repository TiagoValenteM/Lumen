"use client";

import { useState, useEffect, useMemo } from "react";
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

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [returnPath, setReturnPath] = useState("/");
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.replace(returnPath);
      router.refresh();
    } catch (error) {
      setError(getErrorMessage(error, "Could not sign in"));
    } finally {
      setLoading(false);
    }
  };

  return (
    checkingSession ? <LoadingState label="Checking session…" /> : (
    <AuthFormLayout title="Sign in" switchLabel="New here?" switchLink="Create an account"
      switchHref={returnPath === "/" ? "/signup" : `/signup?redirect=${encodeURIComponent(returnPath)}`}>
          <form onSubmit={handleLogin} className="grid gap-4" aria-busy={loading}>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
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
                autoComplete="current-password"
                className="h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {error && <InlineFeedback error>{error}</InlineFeedback>}
            <Button type="submit" className="min-h-11 w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
    </AuthFormLayout>
    )
  );
}
