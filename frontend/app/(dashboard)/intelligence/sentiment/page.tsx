"use client";

import { useEffect, useState } from "react";

import { MetricCards, PageHeader, Panel } from "@/components/dashboard/ui";
import {
  CompetitorMonitoringRun,
  ensureAuthenticatedUser,
  listCompetitorMonitoringRuns,
  listCompetitors,
  listProductAnalyses,
  listProducts,
  ProductAnalysis,
} from "@/lib/inventoryscout-api";

export default function SentimentPage() {
  const [productAnalyses, setProductAnalyses] = useState<ProductAnalysis[]>([]);
  const [monitoringRuns, setMonitoringRuns] = useState<CompetitorMonitoringRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRecommendations() {
      try {
        const user = await ensureAuthenticatedUser();
        const [products, competitors] = await Promise.all([
          listProducts(user.id),
          listCompetitors(user.id),
        ]);

        const [analyses, runs] = await Promise.all([
          Promise.all(
            products.map(async (product) => {
              const history = await listProductAnalyses(user.id, product.id);
              return history[0] ?? null;
            }),
          ),
          Promise.all(
            competitors.map(async (competitor) => {
              const history = await listCompetitorMonitoringRuns(user.id, competitor.id);
              return history[0] ?? null;
            }),
          ),
        ]);

        setProductAnalyses(
          analyses.filter((analysis): analysis is ProductAnalysis => analysis !== null),
        );
        setMonitoringRuns(
          runs.filter((run): run is CompetitorMonitoringRun => run !== null),
        );
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

  const productNextSteps = productAnalyses.flatMap((analysis) => analysis.next_steps).slice(0, 6);
  const productRisks = productAnalyses.flatMap((analysis) => analysis.risks).slice(0, 6);
  const monitoringRecommendations = monitoringRuns
    .flatMap((run) => run.recommendations)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Intelligence"
        title="Recommendations"
        description="This page pulls the most useful next steps and warnings into one place so a team can act faster."
      />

      <MetricCards
        items={[
          {
            label: "Product Next Steps",
            value: isLoading ? "..." : String(productNextSteps.length),
            note: "Useful follow-up steps pulled from recent product checks.",
          },
          {
            label: "Monitoring Actions",
            value: isLoading ? "..." : String(monitoringRecommendations.length),
            note: "Suggested follow-ups from recent competitor checks.",
          },
          {
            label: "Tracked Risks",
            value: isLoading ? "..." : String(productRisks.length),
            note: "Current risks that may affect the decision.",
          },
        ]}
      />

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Product Next Steps">
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading recommendations...</p>
          ) : productNextSteps.length === 0 ? (
            <p className="text-sm text-slate-500">
              Run a product check first to generate clear next steps.
            </p>
          ) : (
            <ul className="space-y-3 text-sm leading-6 text-slate-600">
              {productNextSteps.map((step, index) => (
                <li key={`${step}-${index}`} className="rounded-xl bg-slate-50 p-4">
                  {step}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Monitoring Actions">
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading monitoring actions...</p>
          ) : monitoringRecommendations.length === 0 ? (
            <p className="text-sm text-slate-500">
              Run a competitor check first to collect follow-up actions.
            </p>
          ) : (
            <ul className="space-y-3 text-sm leading-6 text-slate-600">
              {monitoringRecommendations.map((step, index) => (
                <li key={`${step}-${index}`} className="rounded-xl bg-slate-50 p-4">
                  {step}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Top Risks" tone="dark">
          {isLoading ? (
            <p className="text-sm text-slate-300">Loading current risks...</p>
          ) : productRisks.length === 0 ? (
            <p className="text-sm text-slate-300">
              Risks will appear here after your first product check.
            </p>
          ) : (
            <ul className="space-y-3 text-sm leading-6 text-slate-200">
              {productRisks.map((risk, index) => (
                <li key={`${risk}-${index}`} className="rounded-xl bg-white/8 p-4">
                  {risk}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
