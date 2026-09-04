import { describe, expect, it } from "vitest";
import { chooseRiskAction } from "../src/risk_action.js";

describe("payment-event risk action", () => {
  it("holds a search result for review when any matching event is high risk", () => {
    const action = chooseRiskAction([
      { event_id: "evt_routine", risk_score: 14 },
      { event_id: "evt_wire", risk_score: 87 },
    ]);
    expect(action).toBe("review");
  });
});
