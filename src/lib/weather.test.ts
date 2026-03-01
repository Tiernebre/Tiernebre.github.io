import { describe, it, expect } from "vitest";
import { wmoCodeToCondition, findHourIndex } from "./weather";

describe("wmoCodeToCondition", () => {
  it("returns 'Clear' for code 0", () => {
    expect(wmoCodeToCondition(0)).toBe("Clear");
  });

  it("returns 'Mainly Clear' for code 1", () => {
    expect(wmoCodeToCondition(1)).toBe("Mainly Clear");
  });

  it("returns 'Partly Cloudy' for code 2", () => {
    expect(wmoCodeToCondition(2)).toBe("Partly Cloudy");
  });

  it("returns 'Overcast' for code 3", () => {
    expect(wmoCodeToCondition(3)).toBe("Overcast");
  });

  it("returns 'Foggy' for code 45", () => {
    expect(wmoCodeToCondition(45)).toBe("Foggy");
  });

  it("returns 'Rain' for code 63", () => {
    expect(wmoCodeToCondition(63)).toBe("Rain");
  });

  it("returns 'Snow' for code 73", () => {
    expect(wmoCodeToCondition(73)).toBe("Snow");
  });

  it("returns 'Thunderstorm' for code 95", () => {
    expect(wmoCodeToCondition(95)).toBe("Thunderstorm");
  });

  it("returns 'Unknown' for an unrecognized code", () => {
    expect(wmoCodeToCondition(999)).toBe("Unknown");
  });
});

describe("findHourIndex", () => {
  const times = [
    "2026-03-01T00:00",
    "2026-03-01T01:00",
    "2026-03-01T13:00",
    "2026-03-01T14:00",
    "2026-03-01T23:00",
  ];

  it("finds the index for an exact hour match in UTC", () => {
    expect(findHourIndex(times, "2026-03-01T14:00:00Z")).toBe(3);
  });

  it("finds the index when the activity starts mid-hour (truncates to the hour)", () => {
    expect(findHourIndex(times, "2026-03-01T13:47:00Z")).toBe(2);
  });

  it("returns -1 when no matching hour is found", () => {
    expect(findHourIndex(times, "2025-01-01T10:00:00Z")).toBe(-1);
  });

  it("finds the midnight hour (00:00)", () => {
    expect(findHourIndex(times, "2026-03-01T00:00:00Z")).toBe(0);
  });
});
