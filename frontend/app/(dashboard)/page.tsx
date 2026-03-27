"use client";

import { useEffect, useState } from "react";

import { MetricCards, PageHeader, Panel } from "@/components/dashboard/ui";
import {
  Competitor,
  CompetitorMonitoringRun,
  ensureAuthenticatedUser,
  listCompetitorMonitoringRuns,
  listCompetitors,
  listProductAnalyses,
  listProducts,
  Product,
  ProductAnalysis,
} from "@/lib/inventoryscout-api";

type DashboardSnapshot = {
  products: Product[];
  competitors: Competitor[];
  latestProductAnalyses: ProductAnalysis[];
  latestMonitoringRuns: CompetitorMonitoringRun[];
};

type ProductRankRow = {
  id: number;
  name: string;
  category: string;
  overallScore: number;
  opportunityScore: number;
  confidenceScore: number;
};

type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  time: string;
  tone: "product" | "alert" | "neutral";
};

function scoreLabel(score: number) {
  if (score >= 75) {
    return "Strong";
  }

  if (score >= 50) {
    return "Moderate";
  }

  return "Early";
}

function formatRelativeDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toneClasses(tone: ActivityItem["tone"]) {
  if (tone === "product") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (tone === "alert") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function alertBarColor(label: string) {
  if (label === "High") {
    return "bg-rose-500";
  }

  if (label === "Medium") {
    return "bg-amber-500";
  }

  return "bg-emerald-500";
}

function MiniTrend({
  value,
  max = 100,
}: {
  value: number;
  max?: number;
}) {
  const width = `${Math.max(8, Math.round((value / max) * 100))}%`;

  return (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-[linear-gradient(90deg,#0f172a_0%,#0ea5e9_100%)]"
        style={{ width }}
      />
    </div>
  );
}

export default function DashboardHomePage() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const user = await ensureAuthenticatedUser();
        const [products, competitors] = await Promise.all([
          listProducts(user.id),
          listCompetitors(user.id),
        ]);

        const [latestProductAnalyses, latestMonitoringRuns] = await Promise.all([
          Promise.all(
            products.map(async (product) => {
              const analyses = await listProductAnalyses(user.id, product.id);
              return analyses[0] ?? null;
            }),
          ),
          Promise.all(
            competitors.map(async (competitor) => {
              const runs = await listCompetitorMonitoringRuns(user.id, competitor.id);
              return runs[0] ?? null;
            }),
          ),
        ]);

        setSnapshot({
          products,
          competitors,
          latestProductAnalyses: latestProductAnalyses.filter(
            (analysis): analysis is ProductAnalysis => analysis !== null,
          ),
          latestMonitoringRuns: latestMonitoringRuns.filter(
            (run): run is CompetitorMonitoringRun => run !== null,
          ),
        });
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load your dashboard right now.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboard();
  }, []);

  const products = snapshot?.products ?? [];
  const competitors = snapshot?.competitors ?? [];
  const latestProductAnalyses = snapshot?.latestProductAnalyses ?? [];
  const latestMonitoringRuns = snapshot?.latestMonitoringRuns ?? [];
  const productNameById = new Map(products.map((product) => [product.id, product.name]));

  const openAlerts = latestMonitoringRuns.filter(
    (run) => run.alert_level.toLowerCase() !== "low",
  ).length;

  const averageOpportunityScore =
    latestProductAnalyses.length > 0
      ? Math.round(
          latestProductAnalyses.reduce(
            (total, analysis) => total + analysis.opportunity_score,
            0,
          ) / latestProductAnalyses.length,
        )
      : 0;

  const analysisCoverage =
    products.length > 0
      ? Math.round((latestProductAnalyses.length / products.length) * 100)
      : 0;

  const highAlerts = latestMonitoringRuns.filter(
    (run) => run.alert_level.toLowerCase() === "high",
  ).length;
  const mediumAlerts = latestMonitoringRuns.filter(
    (run) => run.alert_level.toLowerCase() === "medium",
  ).length;
  const lowAlerts = latestMonitoringRuns.filter(
    (run) => run.alert_level.toLowerCase() === "low",
  ).length;

  const alertDistribution = [
    { label: "High", value: highAlerts },
    { label: "Medium", value: mediumAlerts },
    { label: "Low", value: lowAlerts },
  ];

  const maxAlertValue = Math.max(1, ...alertDistribution.map((item) => item.value));

  const rankedProducts: ProductRankRow[] = latestProductAnalyses
    .map((analysis) => ({
      id: analysis.product_id,
      name: productNameById.get(analysis.product_id) ?? `Product #${analysis.product_id}`,
      category:
        products.find((product) => product.id === analysis.product_id)?.category ??
        "No category",
      overallScore: analysis.overall_score,
      opportunityScore: analysis.opportunity_score,
      confidenceScore: analysis.confidence_score,
    }))
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 5);

  const recentActivity: ActivityItem[] = [
    ...latestProductAnalyses.slice(0, 4).map((analysis) => ({
      id: `product-${analysis.id}`,
      title: productNameById.get(analysis.product_id) ?? `Product #${analysis.product_id}`,
      detail: `${analysis.overall_score}/100 overall score · ${analysis.recommendation}`,
      time: formatRelativeDate(analysis.updated_at),
      tone: "product" as const,
    })),
    ...latestMonitoringRuns.slice(0, 4).map((run) => ({
      id: `monitoring-${run.id}`,
      title: `Competitor alert: ${run.alert_level}`,
      detail: `${run.overall_score}/100 overall signal · ${run.summary}`,
      time: formatRelativeDate(run.updated_at),
      tone:
        run.alert_level.toLowerCase() === "low" ? ("neutral" as const) : ("alert" as const),
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 6);

  const needsAttention = [
    highAlerts > 0 ? `${highAlerts} high-priority competitor alert${highAlerts === 1 ? "" : "s"} need review.` : null,
    rankedProducts[0]
      ? `${rankedProducts[0].name} is your strongest current product candidate at ${rankedProducts[0].overallScore}/100.`
      : null,
    products.length > latestProductAnalyses.length
      ? `${products.length - latestProductAnalyses.length} saved product${products.length - latestProductAnalyses.length === 1 ? "" : "s"} still need an AI check.`
      : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <div className="space-y-6">
      <PageHeader
        badge="InventoryScout"
        title="Know Which Product To Back Next"
        description="InventoryScout helps you save a product idea, check competing brands, run AI reviews, and decide what looks promising before you commit time or money."
      />

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <MetricCards
        items={[
          {
            label: "Active Products",
            value: isLoading ? "..." : String(products.length),
          },
          {
            label: "Monitored Competitors",
            value: isLoading ? "..." : String(competitors.length),
          },
          {
            label: "Open Alerts",
            value: isLoading ? "..." : String(openAlerts),
          },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Decision Signals">
          <div className="grid gap-4 md:grid-cols-2">
            <article className="rounded-[1.2rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#eef6ff_100%)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Average Opportunity
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                    {isLoading ? "..." : `${averageOpportunityScore}/100`}
                  </p>
                </div>
                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-sky-700">
                  {scoreLabel(averageOpportunityScore)}
                </span>
              </div>
              <MiniTrend value={averageOpportunityScore} />
              <p className="mt-3 text-sm leading-6 text-slate-600">
                A quick read on how attractive your latest product checks look overall.
              </p>
            </article>

            <article className="rounded-[1.2rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f7f7ef_100%)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Analysis Coverage
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                    {isLoading ? "..." : `${analysisCoverage}%`}
                  </p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
                  {latestProductAnalyses.length}/{products.length || 0}
                </span>
              </div>
              <MiniTrend value={analysisCoverage} />
              <p className="mt-3 text-sm leading-6 text-slate-600">
                How much of your saved product list has already been reviewed by the AI.
              </p>
            </article>
          </div>

          {products.length === 0 && competitors.length === 0 ? (
            <div className="mt-5 rounded-[1.1rem] border border-dashed border-slate-300 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Start Here</p>
              <ol className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
                <li>1. Add one product you are considering.</li>
                <li>2. Add two or three competitors you want to watch.</li>
                <li>3. Run product and competitor checks to get a decision-ready view.</li>
              </ol>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-slate-950">Alert Breakdown</h3>
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                    Latest Runs
                  </span>
                </div>

                <div className="mt-4 space-y-4">
                  {alertDistribution.map((item) => {
                    const width = `${Math.max(
                      item.value > 0 ? 14 : 8,
                      Math.round((item.value / maxAlertValue) * 100),
                    )}%`;

                    return (
                      <div key={item.label}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">{item.label}</span>
                          <span className="text-slate-500">{item.value}</span>
                        </div>
                        <div className="mt-2 h-3 overflow-hidden rounded-full bg-white">
                          <div
                            className={`h-full rounded-full ${alertBarColor(item.label)}`}
                            style={{ width }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-slate-950">Needs Attention</h3>
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                    Right Now
                  </span>
                </div>

                {needsAttention.length > 0 ? (
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                    {needsAttention.map((item) => (
                      <li key={item} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    Add products and competitors, then run checks to start filling this section with live priorities.
                  </p>
                )}
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Recent Activity" tone="dark">
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <article
                  key={item.id}
                  className={`rounded-[1.05rem] border px-4 py-3 ${toneClasses(item.tone)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                    <span className="text-xs font-medium uppercase tracking-[0.12em] opacity-75">
                      {item.time}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 opacity-90">{item.detail}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-slate-300">
              Your latest product checks and competitor alerts will appear here once the first runs are complete.
            </p>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel title="Top Product Opportunities">
          {rankedProducts.length > 0 ? (
            <div className="space-y-3">
              {rankedProducts.map((product, index) => (
                <article
                  key={product.id}
                  className="grid gap-3 rounded-[1.15rem] border border-slate-200 bg-white p-4 md:grid-cols-[auto_1fr_auto]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                    {index + 1}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-950">{product.name}</h3>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        {product.category}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        Overall: {product.overallScore}/100
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        Opportunity: {product.opportunityScore}/100
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        Confidence: {product.confidenceScore}/100
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                      {scoreLabel(product.overallScore)}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-slate-600">
              Run product checks to rank your saved product ideas here.
            </p>
          )}
        </Panel>

        <Panel title="Snapshot">
          <div className="space-y-4">
            <article className="rounded-[1.1rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Products Analyzed
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {latestProductAnalyses.length}
              </p>
            </article>

            <article className="rounded-[1.1rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Monitoring Runs
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {latestMonitoringRuns.length}
              </p>
            </article>

            <article className="rounded-[1.1rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Strongest Signal
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {rankedProducts[0]
                  ? `${rankedProducts[0].name} at ${rankedProducts[0].overallScore}/100`
                  : "No product signal yet"}
              </p>
            </article>
          </div>
        </Panel>
      </div>
    </div>
  );
}
