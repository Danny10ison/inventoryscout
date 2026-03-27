"use client";

import { useEffect, useState } from "react";

import { MetricCards, PageHeader, Panel } from "@/components/dashboard/ui";
import {
  CompetitorAnalysis,
  ensureAuthenticatedUser,
  listCompetitorAnalyses,
  listProductAnalyses,
  listProducts,
  Product,
  ProductAnalysis,
} from "@/lib/inventoryscout-api";

type RecommendationRecord = {
  product: Product;
  productAnalysis: ProductAnalysis | null;
  competitorAnalysis: CompetitorAnalysis | null;
};

type ActionItem = {
  id: string;
  productName: string;
  title: string;
  detail: string;
  tone: "strong" | "watch" | "risk";
  updatedAt: string;
};

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatToneClasses(tone: ActionItem["tone"]) {
  if (tone === "strong") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }

  if (tone === "watch") {
    return "border-sky-200 bg-sky-50 text-sky-900";
  }

  return "border-rose-200 bg-rose-50 text-rose-900";
}

function ScoreBar({ value }: { value: number }) {
  return (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-[linear-gradient(90deg,#0f172a_0%,#0ea5e9_100%)]"
        style={{ width: `${Math.max(8, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export default function SentimentPage() {
  const [records, setRecords] = useState<RecommendationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRecommendations() {
      try {
        const user = await ensureAuthenticatedUser();
        const products = await listProducts(user.id);

        const latestRecords = await Promise.all(
          products.map(async (product) => {
            const [productAnalyses, competitorAnalyses] = await Promise.all([
              listProductAnalyses(user.id, product.id),
              listCompetitorAnalyses(user.id, product.id),
            ]);

            return {
              product,
              productAnalysis: productAnalyses[0] ?? null,
              competitorAnalysis: competitorAnalyses[0] ?? null,
            };
          }),
        );

        setRecords(latestRecords);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load recommendations right now.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadRecommendations();
  }, []);

  const completedProductAnalyses = records
    .map((record) => record.productAnalysis)
    .filter((analysis): analysis is ProductAnalysis => analysis !== null);

  const completedCompetitorAnalyses = records
    .map((record) => record.competitorAnalysis)
    .filter((analysis): analysis is CompetitorAnalysis => analysis !== null);

  const priorityActions: ActionItem[] = records
    .flatMap((record) => {
      const actions: ActionItem[] = [];

      if (record.productAnalysis) {
        const topStep = record.productAnalysis.next_steps[0];
        const topRisk = record.productAnalysis.risks[0];

        if (topStep) {
          actions.push({
            id: `step-${record.product.id}`,
            productName: record.product.name,
            title: topStep,
            detail: `${record.productAnalysis.recommendation} • ${record.productAnalysis.overall_score}/100 overall score`,
            tone:
              record.productAnalysis.overall_score >= 70
                ? "strong"
                : "watch",
            updatedAt: record.productAnalysis.updated_at,
          });
        }

        if (topRisk) {
          actions.push({
            id: `risk-${record.product.id}`,
            productName: record.product.name,
            title: "Risk to watch",
            detail: topRisk,
            tone: "risk",
            updatedAt: record.productAnalysis.updated_at,
          });
        }
      }

      if (record.competitorAnalysis) {
        const topOpportunity = record.competitorAnalysis.opportunities[0];

        if (topOpportunity) {
          actions.push({
            id: `opportunity-${record.product.id}`,
            productName: record.product.name,
            title: topOpportunity,
            detail: `Compared against ${record.competitorAnalysis.competitor_snapshots
              .map((competitor) => competitor.name)
              .join(", ")} • ${record.competitorAnalysis.pricing_pressure_score}/100 pricing pressure`,
            tone:
              record.competitorAnalysis.pricing_pressure_score >= 70
                ? "risk"
                : "watch",
            updatedAt: record.competitorAnalysis.updated_at,
          });
        }
      }

      return actions;
    })
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    )
    .slice(0, 6);

  const strongestProduct =
    [...completedProductAnalyses].sort(
      (left, right) => right.overall_score - left.overall_score,
    )[0] ?? null;

  const highestPressureAnalysis =
    [...completedCompetitorAnalyses].sort(
      (left, right) => right.pricing_pressure_score - left.pricing_pressure_score,
    )[0] ?? null;

  const averageReadiness =
    completedProductAnalyses.length > 0
      ? Math.round(
          completedProductAnalyses.reduce(
            (total, analysis) => total + analysis.overall_score,
            0,
          ) / completedProductAnalyses.length,
        )
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Intelligence"
        title="Recommendations"
        description="This view turns your latest product and competitor analysis runs into a live action board so the next move is easier to spot."
      />

      <MetricCards
        items={[
          {
            label: "Priority Actions",
            value: isLoading ? "..." : String(priorityActions.length),
            note: "Fresh actions and warnings generated from the latest saved analysis runs.",
          },
          {
            label: "Strongest Product",
            value: isLoading
              ? "..."
              : strongestProduct
                ? `${strongestProduct.overall_score}/100`
                : "No run",
            note: strongestProduct
              ? strongestProduct.summary
              : "Run a product analysis to start ranking products here.",
          },
          {
            label: "Average Readiness",
            value: isLoading ? "..." : `${averageReadiness}/100`,
            note: highestPressureAnalysis
              ? `Highest pricing pressure is ${highestPressureAnalysis.pricing_pressure_score}/100 on the latest competitor pass.`
              : "Run a competitor analysis to surface pricing pressure and market heat.",
          },
        ]}
      />

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Priority Queue">
          {isLoading ? (
            <p className="text-sm text-slate-500">Building your action queue...</p>
          ) : priorityActions.length === 0 ? (
            <p className="text-sm text-slate-500">
              Run a product analysis or competitor analysis to generate live recommendations.
            </p>
          ) : (
            <div className="space-y-3">
              {priorityActions.map((action) => (
                <article
                  key={action.id}
                  className={`rounded-[1.1rem] border p-4 ${formatToneClasses(action.tone)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-80">
                        {action.productName}
                      </p>
                      <h3 className="mt-2 text-sm font-semibold leading-6">
                        {action.title}
                      </h3>
                    </div>
                    <span className="text-xs opacity-75">
                      {formatTimestamp(action.updatedAt)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 opacity-90">{action.detail}</p>
                </article>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Market Pressure">
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading competitor context...</p>
          ) : completedCompetitorAnalyses.length === 0 ? (
            <p className="text-sm text-slate-500">
              Competitor analysis will surface pricing pressure, strengths, and opportunities here.
            </p>
          ) : (
            <div className="space-y-4">
              {records
                .filter(
                  (record): record is RecommendationRecord & {
                    competitorAnalysis: CompetitorAnalysis;
                  } => record.competitorAnalysis !== null,
                )
                .sort(
                  (left, right) =>
                    right.competitorAnalysis.pricing_pressure_score -
                    left.competitorAnalysis.pricing_pressure_score,
                )
                .slice(0, 3)
                .map(({ product, competitorAnalysis }) => (
                  <article
                    key={competitorAnalysis.id}
                    className="rounded-[1.1rem] border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-950">
                          {product.name}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {competitorAnalysis.market_position}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                        {competitorAnalysis.pricing_pressure_score}/100
                      </span>
                    </div>
                    <ScoreBar value={competitorAnalysis.pricing_pressure_score} />
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {competitorAnalysis.recommendation}
                    </p>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      Compared against{" "}
                      {competitorAnalysis.competitor_snapshots
                        .map((competitor) => competitor.name)
                        .join(", ")}
                      . Updated {formatTimestamp(competitorAnalysis.updated_at)}.
                    </p>
                  </article>
                ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Product Spotlight">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading product recommendations...</p>
        ) : completedProductAnalyses.length === 0 ? (
          <p className="text-sm text-slate-500">
            Product analysis will populate this view with scores, gaps, and next steps.
          </p>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {records
              .filter(
                (record): record is RecommendationRecord & {
                  productAnalysis: ProductAnalysis;
                } => record.productAnalysis !== null,
              )
              .sort(
                (left, right) =>
                  right.productAnalysis.overall_score -
                  left.productAnalysis.overall_score,
              )
              .slice(0, 4)
              .map(({ product, productAnalysis }) => (
                <article
                  key={productAnalysis.id}
                  className="rounded-[1.2rem] border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-950">
                        {product.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {product.category ?? "No category saved"}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                      {productAnalysis.overall_score}/100
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    {productAnalysis.summary}
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                      Demand: {productAnalysis.demand_score}/100
                      <br />
                      Trend: {productAnalysis.trend_score}/100
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                      Confidence: {productAnalysis.confidence_score}/100
                      <br />
                      Readiness: {productAnalysis.market_readiness}
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                      Next move
                    </p>
                    <p className="mt-2 text-sm leading-6 text-emerald-900">
                      {productAnalysis.next_steps[0] ?? productAnalysis.recommendation}
                    </p>
                  </div>

                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Updated {formatTimestamp(productAnalysis.updated_at)}.
                  </p>
                </article>
              ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
