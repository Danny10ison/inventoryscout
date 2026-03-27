import { useEffect, useRef, useState } from "react";

export type AiRunStageStatus = "pending" | "running" | "complete" | "error";

export type AiRunStageTemplate = {
  id: string;
  title: string;
  description: string;
};

export type AiRunStage = AiRunStageTemplate & {
  status: AiRunStageStatus;
};

export type AiRunState = {
  title: string;
  subtitle: string;
  status: "running" | "complete" | "error";
  currentMessage: string;
  stages: AiRunStage[];
  startedAt: number;
  finishedAt: number | null;
  resultSummary: string | null;
  resultMetric: string | null;
  resultLabel: string | null;
  error: string | null;
};

type StartRunConfig = {
  title: string;
  subtitle: string;
  currentMessage: string;
  stages: AiRunStageTemplate[];
  tickMs?: number;
};

type CompleteRunConfig = {
  currentMessage: string;
  resultSummary?: string | null;
  resultMetric?: string | null;
  resultLabel?: string | null;
};

function buildStages(
  stages: AiRunStageTemplate[],
  activeIndex: number,
  errorIndex: number | null = null,
): AiRunStage[] {
  return stages.map((stage, index) => {
    let status: AiRunStageStatus = "pending";

    if (errorIndex !== null && index === errorIndex) {
      status = "error";
    } else if (index < activeIndex) {
      status = "complete";
    } else if (index === activeIndex && errorIndex === null) {
      status = "running";
    }

    return {
      ...stage,
      status,
    };
  });
}

export function useAiRunProgress() {
  const [run, setRun] = useState<AiRunState | null>(null);
  const intervalRef = useRef<number | null>(null);
  const stageTemplatesRef = useRef<AiRunStageTemplate[]>([]);

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, []);

  function clearTicker() {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function startRun(config: StartRunConfig) {
    clearTicker();
    stageTemplatesRef.current = config.stages;

    setRun({
      title: config.title,
      subtitle: config.subtitle,
      status: "running",
      currentMessage: config.currentMessage,
      stages: buildStages(config.stages, 0),
      startedAt: Date.now(),
      finishedAt: null,
      resultSummary: null,
      resultMetric: null,
      resultLabel: null,
      error: null,
    });

    const tickMs = config.tickMs ?? 1400;

    intervalRef.current = window.setInterval(() => {
      setRun((currentRun) => {
        if (!currentRun || currentRun.status !== "running") {
          return currentRun;
        }

        const currentIndex = currentRun.stages.findIndex(
          (stage) => stage.status === "running",
        );
        const nextIndex =
          currentIndex < config.stages.length - 1 ? currentIndex + 1 : currentIndex;

        if (nextIndex === currentIndex) {
          return currentRun;
        }

        return {
          ...currentRun,
          stages: buildStages(config.stages, nextIndex),
        };
      });
    }, tickMs);
  }

  function completeRun(config: CompleteRunConfig) {
    clearTicker();

    setRun((currentRun) => {
      if (!currentRun) {
        return currentRun;
      }

      return {
        ...currentRun,
        status: "complete",
        currentMessage: config.currentMessage,
        stages: stageTemplatesRef.current.map((stage) => ({
          ...stage,
          status: "complete",
        })),
        finishedAt: Date.now(),
        resultSummary: config.resultSummary ?? null,
        resultMetric: config.resultMetric ?? null,
        resultLabel: config.resultLabel ?? null,
        error: null,
      };
    });
  }

  function failRun(message: string) {
    clearTicker();

    setRun((currentRun) => {
      if (!currentRun) {
        return currentRun;
      }

      const runningIndex = currentRun.stages.findIndex(
        (stage) => stage.status === "running",
      );
      const errorIndex = runningIndex >= 0 ? runningIndex : 0;

      return {
        ...currentRun,
        status: "error",
        currentMessage: "The run stopped before the backend returned a usable result.",
        stages: buildStages(stageTemplatesRef.current, errorIndex, errorIndex),
        finishedAt: Date.now(),
        error: message,
      };
    });
  }

  function resetRun() {
    clearTicker();
    stageTemplatesRef.current = [];
    setRun(null);
  }

  return {
    run,
    startRun,
    completeRun,
    failRun,
    resetRun,
  };
}
