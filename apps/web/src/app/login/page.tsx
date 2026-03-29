"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Zap, LogIn, UserPlus, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) {
          setError(error.message);
        } else {
          setMessage(
            "Account created! Check your email for a confirmation link."
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setError(error.message);
        } else {
          // Successful login — redirect to home
          window.location.href = "/";
        }
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-aegis-bg px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-aegis-accent to-aegis-accentDim flex items-center justify-center mb-4">
            <Zap className="w-6 h-6 text-aegis-bg" />
          </div>
          <h1 className="text-xl font-semibold text-aegis-text">Aegis OS</h1>
          <p className="text-sm text-aegis-textDim mt-1">
            {isSignUp ? "Create your account" : "Sign in to continue"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-aegis-textDim mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-3 py-2 rounded-lg bg-aegis-surface border border-aegis-border text-aegis-text placeholder-aegis-textDim/50 text-sm focus:outline-none focus:ring-2 focus:ring-aegis-accent/40 focus:border-aegis-accent/60 transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-aegis-textDim mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-lg bg-aegis-surface border border-aegis-border text-aegis-text placeholder-aegis-textDim/50 text-sm focus:outline-none focus:ring-2 focus:ring-aegis-accent/40 focus:border-aegis-accent/60 transition-colors"
            />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-aegis-error/10 border border-aegis-error/30 text-aegis-error text-xs">
              {error}
            </div>
          )}

          {message && (
            <div className="px-3 py-2 rounded-lg bg-aegis-accent/10 border border-aegis-accent/30 text-aegis-accent text-xs">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-aegis-accent hover:bg-aegis-accent/90 text-aegis-bg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSignUp ? (
              <UserPlus className="w-4 h-4" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            {loading
              ? "Please wait..."
              : isSignUp
              ? "Create Account"
              : "Sign In"}
          </button>
        </form>

        {/* Toggle */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setMessage(null);
            }}
            className="text-xs text-aegis-textDim hover:text-aegis-accent transition-colors"
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
