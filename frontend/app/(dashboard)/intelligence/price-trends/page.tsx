"use client";

import { ChangeEvent, useEffect, useState } from "react";

import { MetricCards, PageHeader, Panel } from "@/components/dashboard/ui";
import {
  buildGoalText,
  competitorAnalysisGoalOptions,
} from "@/lib/analysis-goals";
import {
  Competitor,
  CompetitorAnalysis,
  ensureAuthenticatedUser,
  InventoryScoutApiError,
  listCompetitorAnalyses,
  listCompetitors,
  listProducts,
  Product,
  runCompetitorAnalysis,
  User,
} from "@/lib/inventoryscout-api";

type ProductCompetitorAnalysis = {
  product: Product;
  latestAnalysis: CompetitorAnalysis | null;
};

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PriceTrendsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [analysisRecords, setAnalysisRecords] = useState<ProductCompetitorAnalysis[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedCompetitorIds, setSelectedCompetitorIds] = useState<number[]>([]);
  const [selectedGoal, setSelectedGoal] = useState(
    competitorAnalysisGoalOptions[0].value,
  );
  const [customGoal, setCustomGoal] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function loadCompetitorAnalyses() {
      try {
        const currentUser = await ensureAuthenticatedUser();
        const [savedProducts, savedCompetitors] = await Promise.all([
          listProducts(currentUser.id),
          listCompetitors(currentUser.id),
        ]);

        const latestAnalyses = await Promise.all(
          savedProducts.map(async (product) => {
            const analyses = await listCompetitorAnalyses(currentUser.id, product.id);
            return {
              product,
              latestAnalysis: analyses[0] ?? null,
            };
          }),
        );

        setUser(currentUser);
        setProducts(savedProducts);
        setCompetitors(savedCompetitors);
        setAnalysisRecords(latestAnalyses);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load competitor analysis records.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadCompetitorAnalyses();
  }, []);

  function handleCompetitorToggle(competitorId: number) {
    setSelectedCompetitorIds((currentIds) =>
      currentIds.includes(competitorId)
        ? currentIds.filter((currentId) => currentId !== competitorId)
        : [...currentIds, competitorId],
    );
  }

  async function handleRunAnalysis() {
    if (!user || !selectedProductId || selectedCompetitorIds.length === 0) {
      return;
    }

    setIsRunning(true);
    setError(null);
    setFeedback(null);

    try {
      const analysis = await runCompetitorAnalysis(
        user.id,
        Number(selectedProductId),
        selectedCompetitorIds,
        buildGoalText(competitorAnalysisGoalOptions, selectedGoal, customGoal),
      );

      setAnalysisRecords((currentRecords) =>
        currentRecords.map((record) =>
          record.product.id === analysis.product_id
            ? { ...record, latestAnalysis: analysis }
            : record,
        ),
      );
      setFeedback("Competitor analysis completed.");
      setSelectedGoal(competitorAnalysisGoalOptions[0].value);
      setCustomGoal("");
      setSelectedCompetitorIds([]);
    } catch (runError) {
      setError(
        runError instanceof InventoryScoutApiError || runError instanceof Error
          ? runError.message
          : "Unable to run competitor analysis.",
      );
    } finally {
      setIsRunning(false);
    }
  }

  const completedAnalyses = analysisRecords
    .map((record) => record.latestAnalysis)
    .filter((analysis): analysis is CompetitorAnalysis => analysis !== null);

  const averagePricingPressure =
    completedAnalyses.length > 0
      ? Math.round(
          completedAnalyses.reduce(
            (total, analysis) => total + analysis.pricing_pressure_score,
            0,
          ) / completedAnalyses.length,
        )
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Intelligence"
        title="Competitor Analysis"
        description="Choose one saved product and a few saved competitors to see where the market looks crowded, risky, or worth deeper review."
      />

      <MetricCards
        items={[
          {
            label: "Products Ready",
            value: isLoading ? "..." : String(products.length),
            note: "Saved products you can compare right now.",
          },
          {
            label: "Saved Competitors",
            value: isLoading ? "..." : String(competitors.length),
            note: "Competitors available for side-by-side checks.",
          },
          {
            label: "Pricing Pressure",
            value: isLoading ? "..." : `${averagePricingPressure}/100`,
            note: "Average read on how hard competitor pricing may be pushing the market.",
          },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Run New Competitor Analysis">
          <div className="space-y-4">
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            {feedback ? <p className="text-sm text-emerald-600">{feedback}</p> : null}

            <p className="text-sm leading-6 text-slate-600">
              This is the fastest way to answer a simple question: how tough
              does this product look once real competitors are in view?
            </p>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Product</span>
              <select
                value={selectedProductId}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  setSelectedProductId(event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
              >
                <option value="">Select a product</option>
                {products.map((product) => (
                  <option key={product.id} value={String(product.id)}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <p className="text-sm font-medium text-slate-700">Competitors</p>
              <div className="mt-2 grid gap-2">
                {competitors.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                    Add competitors first so this product can be compared against real market options.
                  </p>
                ) : (
                  competitors.map((competitor) => (
                    <label
                      key={competitor.id}
                      className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCompetitorIds.includes(competitor.id)}
                        onChange={() => handleCompetitorToggle(competitor.id)}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-medium text-slate-900">
                          {competitor.name}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {competitor.url}
                        </span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Goal</span>
              <select
                value={selectedGoal}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  setSelectedGoal(event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
              >
                {competitorAnalysisGoalOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-slate-500">
                {
                  competitorAnalysisGoalOptions.find(
                    (option) => option.value === selectedGoal,
                  )?.description
                }
              </p>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Custom Goal
              </span>
              <textarea
                value={customGoal}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  setCustomGoal(event.target.value)
                }
                className="mt-2 min-h-32 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
                placeholder="Optional: add a more specific angle for this comparison."
              />
            </label>

            <button
              type="button"
              onClick={() => void handleRunAnalysis()}
              disabled={
                isRunning ||
                !selectedProductId ||
                selectedCompetitorIds.length === 0 ||
                !user
              }
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRunning ? "Running..." : "Run Competitor Analysis"}
            </button>
          </div>
        </Panel>

        <Panel title="Latest Comparison Runs">
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading competitor analysis history...</p>
          ) : analysisRecords.length === 0 ? (
            <p className="text-sm text-slate-500">
              Save a product first, then come back here to compare it against competitors.
            </p>
          ) : (
            <div className="space-y-4">
              {analysisRecords.map(({ product, latestAnalysis }) => (
                <article
                  key={product.id}
                  className="rounded-[1.1rem] border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-slate-950">
                        {product.name}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {product.category ?? "No category saved"}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                      {latestAnalysis?.status ?? "not run"}
                    </span>
                  </div>

                  {latestAnalysis ? (
                    <>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                          Pricing pressure: {latestAnalysis.pricing_pressure_score}/100
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                          Positioning: {latestAnalysis.positioning_score}/100
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                          Confidence: {latestAnalysis.confidence_score}/100
                        </div>
                      </div>

                      <p className="mt-4 text-sm leading-6 text-slate-600">
                        {latestAnalysis.summary}
                      </p>

                      <p className="mt-3 text-sm text-slate-600">
                        Compared against{" "}
                        <span className="font-medium text-slate-900">
                          {latestAnalysis.competitor_snapshots
                            .map((competitor) => competitor.name)
                            .join(", ")}
                        </span>
                        . Updated {formatTimestamp(latestAnalysis.updated_at)}.
                      </p>

                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                          Recommendation
                        </p>
                        <p className="mt-2 text-sm leading-6 text-amber-900">
                          {latestAnalysis.recommendation}
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">
                      No competitor analysis has been run for this product yet.
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
