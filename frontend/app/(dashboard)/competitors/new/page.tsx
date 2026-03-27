"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { PageHeader, Panel } from "@/components/dashboard/ui";
import {
  createCompetitor,
  ensureAuthenticatedUser,
  InventoryScoutApiError,
  User,
} from "@/lib/inventoryscout-api";

type NewCompetitorFormState = {
  name: string;
  url: string;
};

export default function AddCompetitorPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState<NewCompetitorFormState>({
    name: "",
    url: "",
  });
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const currentUser = await ensureAuthenticatedUser();
        setUser(currentUser);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to prepare competitor creation.",
        );
      } finally {
        setIsLoadingUser(false);
      }
    }

    void loadUser();
  }, []);

  const handleChange =
    (field: keyof NewCompetitorFormState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
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

    setIsSubmitting(true);
    setError(null);

    try {
      await createCompetitor(user.id, {
        name: form.name.trim(),
        url: form.url.trim(),
      });
      router.push("/competitors");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof InventoryScoutApiError || submitError instanceof Error
          ? submitError.message
          : "Unable to create this competitor.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Competitors"
        title="Add Competitor"
        description="Save a competitor here so InventoryScout can compare it against your product and check it again later."
      />

      <Panel title="New Competitor Form">
        {isLoadingUser ? (
          <p className="text-sm text-slate-500">
            Preparing your competitor workspace...
          </p>
        ) : (
          <form className="grid gap-4 lg:max-w-2xl" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Name</span>
              <input
                value={form.name}
                onChange={handleChange("name")}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Competitor URL
              </span>
              <input
                value={form.url}
                onChange={handleChange("url")}
                placeholder="Paste the competitor page you want to watch"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
              />
            </label>

            {error ? <p className="text-sm text-rose-600">{error}</p> : null}

            <p className="text-sm leading-6 text-slate-500">
              Pick the page that best represents this competitor. The checks and
              alerts will use this saved page later.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSubmitting || !user}
                className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Creating..." : "Create Competitor"}
              </button>
            </div>
          </form>
        )}
      </Panel>
    </div>
  );
}
