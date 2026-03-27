"use client";

import { ChangeEvent, useEffect, useState } from "react";

import { AiRunTracker } from "@/components/dashboard/ai-run-tracker";
import { PageHeader, Panel } from "@/components/dashboard/ui";
import { useAiRunProgress } from "@/lib/ai-run-progress";
import { buildGoalText, monitoringGoalOptions } from "@/lib/analysis-goals";
import {
  Competitor,
  CompetitorMonitoringRun,
  createCompetitorMonitoringRun,
  ensureAuthenticatedUser,
  InventoryScoutApiError,
  listCompetitorMonitoringRuns,
  listCompetitors,
  User,
} from "@/lib/inventoryscout-api";

type CompetitorWithMonitoring = {
  competitor: Competitor;
  latestMonitoring: CompetitorMonitoringRun | null;
};

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CompetitorActivitiesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [competitorMonitoring, setCompetitorMonitoring] = useState<
    CompetitorWithMonitoring[]
  >([]);
  const [selectedGoal, setSelectedGoal] = useState(monitoringGoalOptions[0].value);
  const [customGoal, setCustomGoal] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningId, setIsRunningId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { run, startRun, completeRun, failRun, resetRun } = useAiRunProgress();

  useEffect(() => {
    async function loadActivities() {
      try {
        const currentUser = await ensureAuthenticatedUser();
        const competitors = await listCompetitors(currentUser.id);
        const monitoring = await Promise.all(
          competitors.map(async (competitor) => {
            const history = await listCompetitorMonitoringRuns(
              currentUser.id,
              competitor.id,
            );

            return {
              competitor,
              latestMonitoring: history[0] ?? null,
            };
          }),
        );

        setUser(currentUser);
        setCompetitorMonitoring(monitoring);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load competitor activities right now.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadActivities();
  }, []);

  async function handleRunMonitoring(competitor: Competitor) {
    if (!user) {
      return;
    }

    setIsRunningId(competitor.id);
    setError(null);
    setFeedback(null);
    startRun({
      title: `Monitoring ${competitor.name}`,
      subtitle: "This timeline mirrors the backend monitoring phases while the run is executing.",
      currentMessage: "Preparing the saved competitor record for a fresh monitoring snapshot.",
      stages: [
        {
          id: "validate",
          title: "Validate Competitor",
          description: "Confirm the competitor record and its source URL before live extraction begins.",
        },
        {
          id: "extract",
          title: "Extract Signals",
          description: "Run the TinyFish-backed page extraction to capture pricing and market activity signals.",
        },
        {
          id: "normalize",
          title: "Normalize Evidence",
          description: "Convert raw source output into structured market, trend, and risk signals.",
        },
        {
          id: "score",
          title: "Score Alert",
          description: "Compute pricing change, activity, risk, confidence, and alert level outputs.",
        },
        {
          id: "save",
          title: "Save Snapshot",
          description: "Store the monitoring run so it appears in competitor activity history.",
        },
      ],
    });

    try {
      const monitoringRun = await createCompetitorMonitoringRun(
        user.id,
        competitor.id,
        buildGoalText(monitoringGoalOptions, selectedGoal, customGoal),
      );

      setCompetitorMonitoring((currentMonitoring) =>
        currentMonitoring.map((entry) =>
          entry.competitor.id === competitor.id
            ? { ...entry, latestMonitoring: monitoringRun }
            : entry,
        ),
      );
      setFeedback(`Monitoring run completed for ${competitor.name}.`);
      setSelectedGoal(monitoringGoalOptions[0].value);
      setCustomGoal("");
      completeRun({
        currentMessage: "The backend returned a monitoring snapshot for this competitor.",
        resultLabel: "Latest Alert",
        resultMetric: `${monitoringRun.alert_level} · ${monitoringRun.overall_score}/100`,
        resultSummary: monitoringRun.summary,
      });
    } catch (runError) {
      const message =
        runError instanceof InventoryScoutApiError || runError instanceof Error
          ? runError.message
          : "Unable to run competitor monitoring.";
      failRun(message);
      setError(
        message,
      );
    } finally {
      setIsRunningId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Competitors"
        title="Activities"
        description="Run a fresh check on a saved competitor and quickly see whether anything needs your attention."
      />

        <Panel title="Recent Monitoring History">
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading competitor activities...</p>
          ) : (
            <>
              {error ? <p className="mb-4 text-sm text-rose-600">{error}</p> : null}
              {feedback ? (
                <p className="mb-4 text-sm text-emerald-600">{feedback}</p>
              ) : null}
              <div className="mb-4 rounded-[1.1rem] border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Goal</span>
                    <select
                      value={selectedGoal}
                      onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                        setSelectedGoal(event.target.value)
                      }
                      disabled={isRunningId !== null}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {monitoringGoalOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-sm text-slate-500">
                      {
                        monitoringGoalOptions.find(
                          (option) => option.value === selectedGoal,
                        )?.description
                      }
                    </p>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">
                      Custom Goal
                    </span>
                    <input
                      value={customGoal}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setCustomGoal(event.target.value)
                      }
                      disabled={isRunningId !== null}
                      placeholder="Optional: focus the next monitoring run."
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </label>
                </div>
              </div>
              {run ? (
                <div className="mb-4 space-y-3">
                  <AiRunTracker run={run} />
                  {run.status === "complete" || run.status === "error" ? (
                    <div>
                      <button
                        type="button"
                        onClick={resetRun}
                        className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Dismiss Timeline
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="overflow-hidden rounded-[1.1rem] border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {["Competitor", "Status", "Alert", "Confidence", "Updated", "Run"].map(
                      (column) => (
                        <th
                          key={column}
                          className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500"
                        >
                          {column}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {competitorMonitoring.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-6 text-center text-slate-500"
                      >
                        Add a competitor first, then return here to check for
                        changes, warnings, and fresh activity.
                      </td>
                    </tr>
                  ) : (
                    competitorMonitoring.map(({ competitor, latestMonitoring }) => (
                      <tr key={competitor.id}>
                        <td className="px-4 py-3 text-slate-800">
                          {competitor.name}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {latestMonitoring?.status ?? "not run"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {latestMonitoring?.alert_level ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {latestMonitoring?.confidence_score ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {latestMonitoring
                            ? formatTimestamp(latestMonitoring.updated_at)
                            : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            aria-label={`Run monitoring for ${competitor.name}`}
                            onClick={() => void handleRunMonitoring(competitor)}
                            disabled={isRunningId === competitor.id}
                            className="rounded-lg border border-sky-200 p-2 text-sky-700 transition hover:bg-sky-50 hover:text-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
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
                              <path
                                d="M5 4v16l14-8Z"
                                fill="currentColor"
                                stroke="none"
                              />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {competitorMonitoring.some((entry) => entry.latestMonitoring) ? (
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {competitorMonitoring
                  .filter(
                    (
                      entry,
                    ): entry is CompetitorWithMonitoring & {
                      latestMonitoring: CompetitorMonitoringRun;
                    } => entry.latestMonitoring !== null,
                  )
                  .map(({ competitor, latestMonitoring }) => (
                    <article
                      key={`monitoring-${competitor.id}`}
                      className="rounded-[1.1rem] border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-base font-semibold text-slate-950">
                            {competitor.name}
                          </h2>
                          <p className="mt-1 text-sm text-slate-500">
                            {latestMonitoring.alert_level} alert,{" "}
                            {latestMonitoring.data_freshness.toLowerCase()} data
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                          {latestMonitoring.overall_score}/100
                        </span>
                      </div>

                      <p className="mt-4 text-sm leading-6 text-slate-600">
                        {latestMonitoring.summary}
                      </p>

                      <div className="mt-4 space-y-2 text-sm text-slate-600">
                        <p>
                          Pricing signal:{" "}
                          <span className="font-medium text-slate-900">
                            {latestMonitoring.pricing_signal ?? "No explicit pricing signal"}
                          </span>
                        </p>
                        <p>
                          Recommendations:{" "}
                          <span className="font-medium text-slate-900">
                            {latestMonitoring.recommendations[0] ?? "Re-run later for more evidence."}
                          </span>
                        </p>
                        <p>
                          Updated:{" "}
                          <span className="font-medium text-slate-900">
                            {formatTimestamp(latestMonitoring.updated_at)}
                          </span>
                        </p>
                      </div>
                    </article>
                  ))}
              </div>
            ) : null}
          </>
        )}
      </Panel>
    </div>
  );
}
