"use client";

import { useEffect, useState } from "react";

import { MetricCards, PageHeader, Panel } from "@/components/dashboard/ui";
import {
  ensureAuthenticatedUser,
  listProductAnalyses,
  listProducts,
  Product,
  ProductAnalysis,
} from "@/lib/inventoryscout-api";

type ProductInsight = {
  product: Product;
  analysis: ProductAnalysis | null;
};

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DemandTrendsPage() {
  const [insights, setInsights] = useState<ProductInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDemandSignals() {
      try {
        const user = await ensureAuthenticatedUser();
        const products = await listProducts(user.id);
        const nextInsights = await Promise.all(
          products.map(async (product) => {
            const analyses = await listProductAnalyses(user.id, product.id);
            return {
              product,
              analysis: analyses[0] ?? null,
            };
          }),
        );

        setInsights(nextInsights);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load demand signals right now.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadDemandSignals();
  }, []);

  const completedAnalyses = insights
    .map((entry) => entry.analysis)
    .filter((analysis): analysis is ProductAnalysis => analysis !== null);

  const promisingCount = completedAnalyses.filter(
    (analysis) => analysis.demand_outlook.toLowerCase() === "promising",
  ).length;
  const averageDemandScore =
    completedAnalyses.length > 0
      ? Math.round(
          completedAnalyses.reduce(
            (total, analysis) => total + analysis.demand_score,
            0,
          ) / completedAnalyses.length,
        )
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Intelligence"
        title="Demand Signals"
        description="Latest demand read."
      />

      <MetricCards
        items={[
          {
            label: "Analyzed Products",
            value: isLoading ? "..." : `${completedAnalyses.length}/${insights.length}`,
            note: "Products with at least one saved product analysis.",
          },
          {
            label: "Promising Outlook",
            value: isLoading ? "..." : String(promisingCount),
            note: "Latest product analyses whose demand outlook is marked promising.",
          },
          {
            label: "Average Demand",
            value: isLoading ? "..." : `${averageDemandScore}/100`,
            note: "Average demand score from the latest analysis per product.",
          },
        ]}
      />

      <Panel title="Latest Product Analysis Signals">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading demand signals...</p>
        ) : error ? (
          <p className="text-sm text-rose-600">{error}</p>
        ) : insights.length === 0 ? (
          <p className="text-sm text-slate-500">
            Save a product and run an AI check to start filling this page with useful signals.
          </p>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {insights.map(({ product, analysis }) => (
              <article
                key={product.id}
                className="rounded-[1.2rem] border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                      {product.name}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {product.category ?? "No category saved"}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                    {analysis?.status ?? "not run"}
                  </span>
                </div>

                {analysis ? (
                  <>
                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      {analysis.summary}
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Demand / Trend
                        </p>
                        <p className="mt-2 text-sm text-slate-700">
                          {analysis.demand_score}/100 demand, {analysis.trend_score}/100 trend
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Confidence
                        </p>
                        <p className="mt-2 text-sm text-slate-700">
                          {analysis.confidence_level} ({analysis.confidence_score}/100)
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      {analysis.value_proposition ? (
                        <p>
                          Value proposition: <span className="font-medium text-slate-900">{analysis.value_proposition}</span>
                        </p>
                      ) : null}
                      <p>
                        Demand outlook: <span className="font-medium text-slate-900">{analysis.demand_outlook}</span>
                      </p>
                      <p>
                        Market readiness: <span className="font-medium text-slate-900">{analysis.market_readiness}</span>
                      </p>
                      <p>
                        Freshness: <span className="font-medium text-slate-900">{analysis.data_freshness}</span>
                      </p>
                      <p>
                        Updated: <span className="font-medium text-slate-900">{formatTimestamp(analysis.updated_at)}</span>
                      </p>
                    </div>

                    {analysis.demand_signals.length > 0 ? (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Demand Signals
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {analysis.demand_signals.join(" • ")}
                        </p>
                      </div>
                    ) : null}

                    {analysis.trend_signals.length > 0 ? (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Trend Signals
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {analysis.trend_signals.join(" • ")}
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                        Next
                      </p>
                      <p className="mt-2 text-sm leading-6 text-emerald-900">
                        {analysis.recommendation}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-slate-500">
                    No product analysis has been run for this record yet.
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
