"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { MetricCards, PageHeader, Panel } from "@/components/dashboard/ui";
import {
  Competitor,
  deleteCompetitor,
  ensureAuthenticatedUser,
  InventoryScoutApiError,
  listCompetitors,
  updateCompetitor,
  User,
} from "@/lib/inventoryscout-api";

type CompetitorFormState = {
  name: string;
  url: string;
};

function toCompetitorForm(competitor: Competitor): CompetitorFormState {
  return {
    name: competitor.name,
    url: competitor.url,
  };
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CompetitorsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingCompetitor, setEditingCompetitor] = useState<Competitor | null>(null);
  const [editForm, setEditForm] = useState<CompetitorFormState>({
    name: "",
    url: "",
  });

  useEffect(() => {
    async function loadCompetitors() {
      try {
        const currentUser = await ensureAuthenticatedUser();
        const currentCompetitors = await listCompetitors(currentUser.id);
        setUser(currentUser);
        setCompetitors(currentCompetitors);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load competitors right now.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadCompetitors();
  }, []);

  const handleEditChange =
    (field: keyof CompetitorFormState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setEditForm((currentForm) => ({
        ...currentForm,
        [field]: event.target.value,
      }));
    };

  function openEditModal(competitor: Competitor) {
    setEditingCompetitor(competitor);
    setEditForm(toCompetitorForm(competitor));
    setError(null);
    setFeedback(null);
  }

  function closeEditModal() {
    setEditingCompetitor(null);
    setEditForm({
      name: "",
      url: "",
    });
  }

  async function handleDelete(competitor: Competitor) {
    if (!user) {
      return;
    }

    const shouldDelete = window.confirm(
      `Delete "${competitor.name}" from your competitor directory?`,
    );

    if (!shouldDelete) {
      return;
    }

    setError(null);
    setFeedback(null);

    try {
      await deleteCompetitor(user.id, competitor.id);
      setCompetitors((currentCompetitors) =>
        currentCompetitors.filter(
          (currentCompetitor) => currentCompetitor.id !== competitor.id,
        ),
      );
      setFeedback(`Deleted ${competitor.name}.`);
    } catch (deleteError) {
      setError(
        deleteError instanceof InventoryScoutApiError || deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete this competitor.",
      );
    }
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || !editingCompetitor) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setFeedback(null);

    try {
      const updatedCompetitor = await updateCompetitor(user.id, editingCompetitor.id, {
        name: editForm.name.trim(),
        url: editForm.url.trim(),
      });

      setCompetitors((currentCompetitors) =>
        currentCompetitors.map((competitor) =>
          competitor.id === updatedCompetitor.id ? updatedCompetitor : competitor,
        ),
      );
      setFeedback(`Updated ${updatedCompetitor.name}.`);
      closeEditModal();
    } catch (saveError) {
      setError(
        saveError instanceof InventoryScoutApiError || saveError instanceof Error
          ? saveError.message
          : "Unable to update this competitor.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const updatedThisWeekCount = competitors.filter((competitor) => {
    const updatedAt = new Date(competitor.updated_at).getTime();
    return Date.now() - updatedAt <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          badge="Competitors"
          title="All Competitors"
          description="Save the competitor pages you care about so you can track changes without checking each site by hand."
          action={{ label: "Add Competitor", href: "/competitors/new" }}
        />

        <MetricCards
          items={[
            {
              label: "Tracked",
              value: String(competitors.length),
              note: "",
            },
            {
              label: "Monitoring Ready",
              value: String(competitors.length),
              note: "",
            },
            {
              label: "Updated This Week",
              value: String(updatedThisWeekCount),
              note: "",
            },
          ]}
        />

        <Panel title="Competitor Directory">
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading competitors...</p>
          ) : (
            <>
              {error ? <p className="mb-4 text-sm text-rose-600">{error}</p> : null}
              {feedback ? (
                <p className="mb-4 text-sm text-emerald-600">{feedback}</p>
              ) : null}

              <div className="overflow-hidden rounded-[1.1rem] border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {["Name", "URL", "Updated", "Actions"].map((column) => (
                        <th
                          key={column}
                          className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {competitors.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-6 text-center text-slate-500"
                        >
                          No competitors yet. Save the brands or stores you want
                          to watch, then return here to edit them or run a
                          check.{" "}
                          <Link
                            href="/competitors/new"
                            className="text-sky-700 underline"
                          >
                            Add your first competitor
                          </Link>
                          .
                        </td>
                      </tr>
                    ) : (
                      competitors.map((competitor) => (
                        <tr key={competitor.id}>
                          <td className="px-4 py-3 text-slate-800">
                            {competitor.name}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            <a
                              href={competitor.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sky-700 underline"
                            >
                              {competitor.url}
                            </a>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {formatTimestamp(competitor.updated_at)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                aria-label={`Edit ${competitor.name}`}
                                onClick={() => openEditModal(competitor)}
                                className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                              >
                                <svg
                                  aria-hidden="true"
                                  viewBox="0 0 24 24"
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                aria-label={`Delete ${competitor.name}`}
                                onClick={() => void handleDelete(competitor)}
                                className="rounded-lg border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
                              >
                                <svg
                                  aria-hidden="true"
                                  viewBox="0 0 24 24"
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M3 6h18" />
                                  <path d="M8 6V4h8v2" />
                                  <path d="M19 6l-1 14H6L5 6" />
                                  <path d="M10 11v6" />
                                  <path d="M14 11v6" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Panel>
      </div>

      {editingCompetitor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-2xl rounded-[1.5rem] bg-white p-5 shadow-[0_28px_70px_rgba(15,23,42,0.2)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Edit Competitor
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                  {editingCompetitor.name}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close edit modal"
                onClick={closeEditModal}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <form className="mt-5 grid gap-4" onSubmit={handleEditSubmit}>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Name</span>
                <input
                  value={editForm.name}
                  onChange={handleEditChange("name")}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Competitor URL
                </span>
                <input
                  value={editForm.url}
                  onChange={handleEditChange("url")}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save Competitor"}
                </button>
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={isSaving}
                  className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
