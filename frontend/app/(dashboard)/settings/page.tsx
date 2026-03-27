"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { PageHeader, Panel } from "@/components/dashboard/ui";
import {
  ensureAuthenticatedUser,
  InventoryScoutApiError,
  updateCurrentUser,
  User,
} from "@/lib/inventoryscout-api";

type SettingsFormState = {
  username: string;
  email: string;
  company: string;
};

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState<SettingsFormState>({
    username: "",
    email: "",
    company: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const currentUser = await ensureAuthenticatedUser();
        setUser(currentUser);
        setForm({
          username: currentUser.username,
          email: currentUser.email,
          company: currentUser.company ?? "",
        });
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load settings right now.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadUser();
  }, []);

  const handleChange =
    (field: keyof SettingsFormState) => (event: ChangeEvent<HTMLInputElement>) => {
      setSuccessMessage(null);
      setForm((currentForm) => ({
        ...currentForm,
        [field]: event.target.value,
      }));
    };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const updatedUser = await updateCurrentUser(user.id, {
        username: form.username.trim(),
        email: form.email.trim(),
        company: form.company.trim() || null,
      });

      setUser(updatedUser);
      setForm({
        username: updatedUser.username,
        email: updatedUser.email,
        company: updatedUser.company ?? "",
      });
      setSuccessMessage("Profile updated successfully.");
    } catch (saveError) {
      setError(
        saveError instanceof InventoryScoutApiError || saveError instanceof Error
          ? saveError.message
          : "Unable to save your settings.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleReset() {
    if (!user) {
      return;
    }

    setForm({
      username: user.username,
      email: user.email,
      company: user.company ?? "",
    });
    setError(null);
    setSuccessMessage(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Settings"
        title="Profile Settings"
        description="Keep your basic account details up to date here."
      />

      <Panel title="Personal Information">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading your profile...</p>
        ) : (
          <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Username</span>
              <input
                value={form.username}
                onChange={handleChange("username")}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
              />
              <span className="mt-2 block text-sm text-slate-500">
                This is the name tied to your account.
              </span>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                value={form.email}
                onChange={handleChange("email")}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
              />
              <span className="mt-2 block text-sm text-slate-500">
                We use this email for your account record.
              </span>
            </label>

            <label className="block lg:col-span-2">
              <span className="text-sm font-medium text-slate-700">Company</span>
              <input
                value={form.company}
                onChange={handleChange("company")}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
              />
              <span className="mt-2 block text-sm text-slate-500">
                Optional, but useful if this workspace is tied to a team or business.
              </span>
            </label>

            {error ? (
              <p className="text-sm text-rose-600 lg:col-span-2">{error}</p>
            ) : null}

            {successMessage ? (
              <p className="text-sm text-emerald-600 lg:col-span-2">
                {successMessage}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3 lg:col-span-2">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={isSaving || !user}
                className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reset Form
              </button>
            </div>
          </form>
        )}
      </Panel>
    </div>
  );
}
