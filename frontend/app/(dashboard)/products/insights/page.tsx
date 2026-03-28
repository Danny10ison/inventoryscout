"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AiRunTracker } from "@/components/dashboard/ai-run-tracker";
import { PageHeader, Panel } from "@/components/dashboard/ui";
import { useAiRunProgress } from "@/lib/ai-run-progress";
import {
  buildGoalText,
  productAnalysisGoalOptions,
} from "@/lib/analysis-goals";
import {
  ensureAuthenticatedUser,
  InventoryScoutApiError,
  listCompetitors,
  listProductAnalyses,
  listProducts,
  Product,
  ProductAnalysis,
  runProductAnalysis,
  User,
} from "@/lib/inventoryscout-api";

type ProductWithAnalysis = {
  product: Product;
  latestAnalysis: ProductAnalysis | null;
};

export default function ProductInsightsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [productAnalyses, setProductAnalyses] = useState<ProductWithAnalysis[]>([]);
  const [competitorCount, setCompetitorCount] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedGoal, setSelectedGoal] = useState(productAnalysisGoalOptions[0].value);
  const [customGoal, setCustomGoal] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { run, startRun, completeRun, failRun, resetRun } = useAiRunProgress();

  useEffect(() => {
    async function loadInsights() {
      try {
        const currentUser = await ensureAuthenticatedUser();
        const [products, competitors] = await Promise.all([
          listProducts(currentUser.id),
          listCompetitors(currentUser.id),
        ]);
        const analyses = await Promise.all(
          products.map(async (product) => {
            const analysisHistory = await listProductAnalyses(currentUser.id, product.id);
            return {
              product,
              latestAnalysis: analysisHistory[0] ?? null,
            };
          }),
        );

        setUser(currentUser);
        setCompetitorCount(competitors.length);
        setProductAnalyses(analyses);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load product insights right now.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadInsights();
  }, []);

  function closeModal() {
    if (!isRunning) {
      resetRun();
    }
    setSelectedProduct(null);
    setSelectedGoal(productAnalysisGoalOptions[0].value);
    setCustomGoal("");
  }

  function openRunModal(product: Product) {
    resetRun();
    setSelectedGoal(productAnalysisGoalOptions[0].value);
    setCustomGoal("");
    setSelectedProduct(product);
  }

  function handleGoalChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setCustomGoal(event.target.value);
  }

  async function handleRunAnalysis() {
    if (!user || !selectedProduct) {
      return;
    }

    if (competitorCount === 0) {
      setError("Add a competitor before running this check.");
      setSelectedProduct(null);
      router.push("/competitors/new");
      return;
    }

    setIsRunning(true);
    setError(null);
    setFeedback(null);
    startRun({
      title: `Analyzing ${selectedProduct.name}`,
      subtitle: "Tracking the market check while the backend completes the run.",
      currentMessage: "Preparing the saved product record for analysis.",
      stages: [
        {
          id: "validate",
          title: "Validate Product",
          description: "Check the saved product record, category, and description context.",
        },
        {
          id: "extract",
          title: "Extract Signals",
          description: "Run TinyFish against competitor pages and collect market signals.",
        },
        {
          id: "evidence",
          title: "Build Evidence",
          description: "Normalize source evidence, freshness, and source health into a structured analysis payload.",
        },
        {
          id: "score",
          title: "Score Opportunity",
          description: "Compute demand, trend, competition, confidence, and recommendation outputs.",
        },
        {
          id: "save",
          title: "Save Analysis",
          description: "Persist the analysis so it is available in the product insights workspace.",
        },
      ],
    });

    try {
      const analysis = await runProductAnalysis(
        user.id,
        selectedProduct.id,
        buildGoalText(productAnalysisGoalOptions, selectedGoal, customGoal),
      );

      setProductAnalyses((currentAnalyses) =>
        currentAnalyses.map((entry) =>
          entry.product.id === selectedProduct.id
            ? { ...entry, latestAnalysis: analysis }
            : entry,
        ),
      );
      setFeedback(`Ran a fresh analysis for ${selectedProduct.name}.`);
      completeRun({
        currentMessage: "The backend returned a completed product analysis.",
        resultLabel: "Latest Overall Score",
        resultMetric: `${analysis.overall_score}/100`,
        resultSummary: analysis.summary,
      });
    } catch (runError) {
      const message =
        runError instanceof InventoryScoutApiError || runError instanceof Error
          ? runError.message
          : "Unable to run product analysis.";
      failRun(message);
      setError(
        message,
      );
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          badge="Products"
          title="Insights"
          description="Run a product check."
        />

        <Panel title="Recent Analysis Runs">
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading product insights...</p>
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
                      {["Product", "Status", "Demand", "Confidence", "Overall", "Run"].map(
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
                    {productAnalyses.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-6 text-center text-slate-500"
                        >
                          Add a product first, then return here to ask the AI
                          whether it looks worth exploring further.
                        </td>
                      </tr>
                    ) : (
                      productAnalyses.map(({ product, latestAnalysis }) => (
                        <tr key={product.id}>
                          <td className="px-4 py-3 text-slate-800">{product.name}</td>
                          <td className="px-4 py-3 text-slate-700">
                            {latestAnalysis?.status ?? "not run"}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {latestAnalysis?.demand_score ?? "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {latestAnalysis?.confidence_score ?? "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {latestAnalysis?.overall_score ?? "-"}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              aria-label={`Run insight for ${product.name}`}
                              onClick={() => openRunModal(product)}
                              className="rounded-lg border border-sky-200 p-2 text-sky-700 transition hover:bg-sky-50 hover:text-sky-800"
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

              {productAnalyses.some((entry) => entry.latestAnalysis) ? (
                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  {productAnalyses
                    .filter(
                      (
                        entry,
                      ): entry is ProductWithAnalysis & {
                        latestAnalysis: ProductAnalysis;
                      } => entry.latestAnalysis !== null,
                    )
                    .map(({ product, latestAnalysis }) => (
                      <article
                        key={`detail-${product.id}`}
                        className="rounded-[1.1rem] border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h2 className="text-base font-semibold text-slate-950">
                              {product.name}
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                              {latestAnalysis.market_readiness} readiness,{" "}
                              {latestAnalysis.demand_outlook} outlook
                            </p>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                            {latestAnalysis.overall_score}/100
                          </span>
                        </div>

                        <p className="mt-4 text-sm leading-6 text-slate-600">
                          {latestAnalysis.summary}
                        </p>

                        <div className="mt-4 space-y-2 text-sm text-slate-600">
                          {latestAnalysis.value_proposition ? (
                            <p>
                              Value:{" "}
                              <span className="font-medium text-slate-900">
                                {latestAnalysis.value_proposition}
                              </span>
                            </p>
                          ) : null}
                          <p>
                            Recommendation:{" "}
                            <span className="font-medium text-slate-900">
                              {latestAnalysis.recommendation}
                            </span>
                          </p>
                          <p>
                            Freshness:{" "}
                            <span className="font-medium text-slate-900">
                              {latestAnalysis.data_freshness}
                            </span>
                          </p>
                          <p>
                            Sources used:{" "}
                            <span className="font-medium text-slate-900">
                              {latestAnalysis.sources_used.length}
                            </span>
                          </p>
                        </div>

                        {latestAnalysis.key_features.length > 0 ? (
                          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                              Key Features
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-700">
                              {latestAnalysis.key_features.join(" • ")}
                            </p>
                          </div>
                        ) : null}

                        {latestAnalysis.demand_signals.length > 0 ? (
                          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                              Demand Signals
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-700">
                              {latestAnalysis.demand_signals.join(" • ")}
                            </p>
                          </div>
                        ) : null}
                      </article>
                    ))}
                </div>
              ) : null}
            </>
          )}
        </Panel>
      </div>

      {selectedProduct ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-lg rounded-[1.5rem] bg-white p-5 shadow-[0_28px_70px_rgba(15,23,42,0.2)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Run Insight
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                  {selectedProduct.name}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close analysis modal"
                onClick={closeModal}
                disabled={isRunning}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            {run ? (
              <div className="mt-5 space-y-4">
                <AiRunTracker run={run} />
                <div className="flex flex-wrap gap-3">
                  {run.status === "complete" || run.status === "error" ? (
                    <button
                      type="button"
                      onClick={() => {
                        resetRun();
                        closeModal();
                      }}
                      className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Close
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <>
                {competitorCount === 0 ? (
                  <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-700">
                      Add a competitor
                    </p>
                    <p className="mt-2 text-sm leading-6 text-rose-900">
                      Product checks work best when you already have a competitor saved.
                    </p>
                    <button
                      type="button"
                      onClick={() => router.push("/competitors/new")}
                      className="mt-3 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Add Competitor
                    </button>
                  </div>
                ) : null}

                <label className="mt-5 block">
                  <span className="text-sm font-medium text-slate-700">Goal</span>
                  <select
                    value={selectedGoal}
                    onChange={(event) => setSelectedGoal(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
                  >
                    {productAnalysisGoalOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-sm text-slate-500">
                    {
                      productAnalysisGoalOptions.find(
                        (option) => option.value === selectedGoal,
                      )?.description
                    }
                  </p>
                </label>

                <label className="mt-4 block">
                  <span className="text-sm font-medium text-slate-700">
                    Custom Goal
                  </span>
                  <textarea
                    value={customGoal}
                    onChange={handleGoalChange}
                    className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
                    placeholder="Optional: add a more specific angle for this run."
                  />
                </label>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleRunAnalysis()}
                    disabled={isRunning || competitorCount === 0}
                    className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isRunning ? "Running..." : "Run"}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isRunning}
                    className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
