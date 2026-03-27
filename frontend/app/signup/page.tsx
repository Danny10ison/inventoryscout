"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ensureAuthenticatedUser,
  InventoryScoutApiError,
  signupUser,
} from "@/lib/inventoryscout-api";

type SignupFormState = {
  username: string;
  email: string;
  company: string;
  password: string;
};

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState<SignupFormState>({
    username: "",
    email: "",
    company: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkSession() {
      try {
        await ensureAuthenticatedUser();
        router.replace("/");
      } catch {
        // Stay on signup when no session exists.
      }
    }

    void checkSession();
  }, [router]);

  const handleChange =
    (field: keyof SignupFormState) => (event: ChangeEvent<HTMLInputElement>) => {
      setError(null);
      setForm((currentForm) => ({
        ...currentForm,
        [field]: event.target.value,
      }));
    };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await signupUser({
        username: form.username.trim(),
        email: form.email.trim(),
        company: form.company.trim() || null,
        password: form.password,
      });
      router.replace("/");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof InventoryScoutApiError || submitError instanceof Error
          ? submitError.message
          : "Unable to create your account right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(247,212,125,0.45),_transparent_24%),linear-gradient(180deg,_#f6f1e4_0%,_#edf2fa_100%)] px-4 py-8">
      <section className="w-full max-w-xl rounded-[1.75rem] border border-white/70 bg-white/88 p-6 shadow-[0_28px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
        <div className="inline-flex rounded-full bg-amber-100 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700">
          InventoryScout
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">
          Create your account
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Create an account to save product ideas, watch competitors, and run AI checks.
        </p>

        <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Username</span>
            <input
              value={form.username}
              onChange={handleChange("username")}
              placeholder="Choose a username"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 text-sm outline-none focus:border-sky-400 focus:bg-white"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={handleChange("email")}
              placeholder="name@company.com"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 text-sm outline-none focus:border-sky-400 focus:bg-white"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Company</span>
            <input
              value={form.company}
              onChange={handleChange("company")}
              placeholder="Optional"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 text-sm outline-none focus:border-sky-400 focus:bg-white"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              value={form.password}
              onChange={handleChange("password")}
              placeholder="Create a password"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 text-sm outline-none focus:border-sky-400 focus:bg-white"
            />
          </label>

          {error ? <p className="text-sm text-rose-600 sm:col-span-2">{error}</p> : null}

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creating account..." : "Sign Up"}
            </button>
          </div>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-sky-700">
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}
