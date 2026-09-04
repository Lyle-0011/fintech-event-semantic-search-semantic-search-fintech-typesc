export type RiskAction = "allow" | "notify" | "review";

export type SearchMatch = {
  event_id: string;
  risk_score: number;
};

export function chooseRiskAction(matches: SearchMatch[]): RiskAction {
  const highestRisk = Math.max(0, ...matches.map((match) => match.risk_score));
  if (highestRisk >= 80) return "review";
  if (highestRisk >= 45) return "notify";
  return "allow";
}
