export type AnalysisGoalOption = {
  label: string;
  value: string;
  description: string;
};

export const productAnalysisGoalOptions: AnalysisGoalOption[] = [
  {
    label: "Market demand check",
    value: "market-demand-check",
    description: "Focus on demand, trend strength, and whether this product looks worth exploring.",
  },
  {
    label: "Launch readiness",
    value: "launch-readiness",
    description: "Focus on whether this product looks ready for a launch decision.",
  },
  {
    label: "Sourcing risk review",
    value: "sourcing-risk-review",
    description: "Focus on gaps, risks, and what could make this a weak inventory bet.",
  },
  {
    label: "Positioning review",
    value: "positioning-review",
    description: "Focus on value, product story, and how clearly this product can be explained to buyers.",
  },
];

export const competitorAnalysisGoalOptions: AnalysisGoalOption[] = [
  {
    label: "Competitor pressure check",
    value: "competitor-pressure-check",
    description: "Focus on how crowded the market looks and how hard competitors may be to beat.",
  },
  {
    label: "Pricing risk check",
    value: "pricing-risk-check",
    description: "Focus on pricing pressure and where competitors may force the decision.",
  },
  {
    label: "Positioning gap review",
    value: "positioning-gap-review",
    description: "Focus on where the product stands apart or where it still looks weak.",
  },
  {
    label: "Go-to-market comparison",
    value: "go-to-market-comparison",
    description: "Focus on which competitor signals matter most before launch or sourcing.",
  },
];

export const monitoringGoalOptions: AnalysisGoalOption[] = [
  {
    label: "General watch check",
    value: "general-watch-check",
    description: "Focus on whether anything important changed on this competitor page.",
  },
  {
    label: "Pricing movement check",
    value: "pricing-movement-check",
    description: "Focus on pricing changes and discount pressure.",
  },
  {
    label: "Market activity check",
    value: "market-activity-check",
    description: "Focus on launches, new offers, or signs of stronger market movement.",
  },
  {
    label: "Risk watch",
    value: "risk-watch",
    description: "Focus on the main warning signs the team should review now.",
  },
];

export function buildGoalText(
  options: AnalysisGoalOption[],
  selectedValue: string,
  customGoal: string,
) {
  const selectedOption = options.find((option) => option.value === selectedValue);
  const customText = customGoal.trim();

  if (selectedOption && customText) {
    return `${selectedOption.label}. ${customText}`;
  }

  if (selectedOption) {
    return selectedOption.label;
  }

  return customText || null;
}
