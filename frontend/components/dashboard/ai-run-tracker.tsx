"use client";

import { AiRunState } from "@/lib/ai-run-progress";

function formatElapsed(startedAt: number, finishedAt: number | null) {
  const elapsedMs = (finishedAt ?? Date.now()) - startedAt;
  return `${Math.max(1, Math.round(elapsedMs / 1000))}s`;
}

function statusTone(status: AiRunState["status"]) {
  if (status === "complete") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "error") {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-sky-100 text-sky-700";
}

function stageTone(status: AiRunState["stages"][number]["status"]) {
  if (status === "complete") {
    return "border-emerald-200 bg-emerald-50";
  }

  if (status === "running") {
    return "border-sky-200 bg-sky-50";
  }

  if (status === "error") {
    return "border-rose-200 bg-rose-50";
  }

  return "border-slate-200 bg-slate-50";
}

function stageDot(status: AiRunState["stages"][number]["status"]) {
  if (status === "complete") {
    return "bg-emerald-500";
  }

  if (status === "running") {
    return "bg-sky-500";
  }

  if (status === "error") {
    return "bg-rose-500";
  }

  return "bg-slate-300";
}

function stageLabel(status: AiRunState["stages"][number]["status"]) {
  if (status === "complete") {
    return "Done";
  }

  if (status === "running") {
    return "Running";
  }

  if (status === "error") {
    return "Blocked";
  }

  return "Queued";
}

export function AiRunTracker({ run }: { run: AiRunState }) {
  return (
    <div className="space-y-3 rounded-[1.2rem] border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            AI Run Progress
          </p>
          <h3 className="mt-1.5 text-sm font-semibold tracking-tight text-slate-950">
            {run.title}
          </h3>
          <p className="mt-0.5 text-xs text-slate-600">{run.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${statusTone(run.status)}`}
          >
            {run.status}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-600">
            {formatElapsed(run.startedAt, run.finishedAt)}
          </span>
        </div>
      </div>

      <div className="rounded-[1rem] bg-slate-950 px-3 py-2 text-xs text-slate-100">
        {run.currentMessage}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {run.stages.map((stage) => (
          <article
            key={stage.id}
            className={`rounded-[0.95rem] border p-3 ${stageTone(stage.status)}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${stageDot(stage.status)}`} />
                <p className="text-xs font-semibold text-slate-900">{stage.title}</p>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                {stageLabel(stage.status)}
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-4 text-slate-600">
              {stage.description}
            </p>
          </article>
        ))}
      </div>

      {run.resultLabel && run.resultMetric ? (
        <div className="rounded-[1rem] border border-amber-200 bg-amber-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-700">
            {run.resultLabel}
          </p>
          <p className="mt-1.5 text-sm font-semibold text-amber-950">{run.resultMetric}</p>
          {run.resultSummary ? (
            <p className="mt-1.5 text-xs leading-4 text-amber-900">{run.resultSummary}</p>
          ) : null}
        </div>
      ) : null}

      {run.error ? (
        <div className="rounded-[1rem] border border-rose-200 bg-rose-50 p-3 text-xs leading-4 text-rose-700">
          {run.error}
        </div>
      ) : null}
    </div>
  );
}
