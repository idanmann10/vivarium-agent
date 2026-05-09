import { describe, expect, test } from "bun:test";

import {
  shouldArchiveWorldSkill,
  shouldHabituate,
  shouldPromoteCandidate,
  shouldPublishRun,
  shouldPublishTrace,
  shouldPushToWorld,
} from "./decision-thresholds.js";

describe("decision thresholds", () => {
  test("implements promotion and push gates", () => {
    expect(shouldPromoteCandidate({ lowerBound: 0.5, uses: 3 })).toBe(true);
    expect(shouldPushToWorld({ lowerBound: 0.6, uses: 5, coverage: 0.5 })).toBe(true);
  });

  test("implements archive, habituation, trace, and run gates", () => {
    expect(shouldArchiveWorldSkill({ regressionVotes: 3, effectiveLowerBound: 0.39 })).toBe(true);
    expect(shouldHabituate({ uses: 30, lowerBound: 0.65, rankByUse: 5 })).toBe(true);
    expect(shouldPublishTrace({ runSucceeded: true, validateScore: 0.71, maxSurpriseMagnitude: 0.41 })).toBe(true);
    expect(shouldPublishRun({ runSucceeded: true, userOptedIn: true })).toBe(true);
  });
});
