import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:fs");

import { readFileSync, readdirSync, existsSync } from "node:fs";

const mockExistsSync = vi.mocked(existsSync);
const mockReaddirSync = vi.mocked(readdirSync);
const mockReadFileSync = vi.mocked(readFileSync);

const SAMPLE_GPX_WITH_NAME = `<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1">
  <trk>
    <name>Central Park Walk</name>
    <trkseg>
      <trkpt lat="40.7829" lon="-73.9654"><ele>10</ele></trkpt>
      <trkpt lat="40.7850" lon="-73.9580"><ele>12</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

const SAMPLE_GPX_WITHOUT_NAME = `<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="40.7829" lon="-73.9654"><ele>10</ele></trkpt>
      <trkpt lat="40.7850" lon="-73.9580"><ele>12</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

describe("gpx", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe("getWalkGeoJsonFeature", () => {
    it("returns null when the GPX file does not exist", async () => {
      mockExistsSync.mockReturnValue(false);

      const { getWalkGeoJsonFeature } = await import("./gpx");
      const result = getWalkGeoJsonFeature("2024-09-15");

      expect(result).toBeNull();
    });

    it("returns null when the GPX file has no LineString geometry", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        `<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1">
</gpx>`,
      );

      const { getWalkGeoJsonFeature } = await import("./gpx");
      const result = getWalkGeoJsonFeature("2024-09-15");

      expect(result).toBeNull();
    });

    it("returns a feature with the slug and date from the slug", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(SAMPLE_GPX_WITH_NAME);

      const { getWalkGeoJsonFeature } = await import("./gpx");
      const result = getWalkGeoJsonFeature("2024-09-15");

      expect(result?.properties.slug).toBe("2024-09-15");
      expect(result?.properties.date).toBe("2024-09-15");
    });

    it("uses the GPX track name as the title when available", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(SAMPLE_GPX_WITH_NAME);

      const { getWalkGeoJsonFeature } = await import("./gpx");
      const result = getWalkGeoJsonFeature("2024-09-15");

      expect(result?.properties.title).toBe("Central Park Walk");
    });

    it("falls back to slug as the title when no track name is available", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(SAMPLE_GPX_WITHOUT_NAME);

      const { getWalkGeoJsonFeature } = await import("./gpx");
      const result = getWalkGeoJsonFeature("2024-09-15");

      expect(result?.properties.title).toBe("2024-09-15");
    });

    it("returns a valid WalkGeoJsonFeature shape with coordinates", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(SAMPLE_GPX_WITH_NAME);

      const { getWalkGeoJsonFeature } = await import("./gpx");
      const result = getWalkGeoJsonFeature("2024-09-15");

      expect(result?.type).toBe("Feature");
      expect(result?.geometry.type).toBe("LineString");
      expect(Array.isArray(result?.geometry.coordinates)).toBe(true);
      expect(result?.geometry.coordinates.length).toBeGreaterThan(0);
    });
  });

  describe("getWalkGeoJsonFeatures", () => {
    it("returns an empty array when the GPX directory does not exist", async () => {
      mockExistsSync.mockReturnValue(false);

      const { getWalkGeoJsonFeatures } = await import("./gpx");
      const result = getWalkGeoJsonFeatures();

      expect(result).toEqual([]);
    });

    it("returns an empty array when the GPX directory has no .gpx files", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([".gitkeep"] as unknown as ReturnType<
        typeof readdirSync
      >);

      const { getWalkGeoJsonFeatures } = await import("./gpx");
      const result = getWalkGeoJsonFeatures();

      expect(result).toEqual([]);
    });

    it("extracts slug from filename", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([
        "2024-09-15.gpx",
      ] as unknown as ReturnType<typeof readdirSync>);
      mockReadFileSync.mockReturnValue(SAMPLE_GPX_WITH_NAME);

      const { getWalkGeoJsonFeatures } = await import("./gpx");
      const result = getWalkGeoJsonFeatures();

      expect(result).toHaveLength(1);
      expect(result[0]?.properties.slug).toBe("2024-09-15");
    });

    it("extracts date from filename in YYYY-MM-DD format", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([
        "2024-09-15.gpx",
      ] as unknown as ReturnType<typeof readdirSync>);
      mockReadFileSync.mockReturnValue(SAMPLE_GPX_WITH_NAME);

      const { getWalkGeoJsonFeatures } = await import("./gpx");
      const result = getWalkGeoJsonFeatures();

      expect(result).toHaveLength(1);
      expect(result[0]?.properties.date).toBe("2024-09-15");
    });

    it("uses the GPX track name as the title when available", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([
        "2024-09-15.gpx",
      ] as unknown as ReturnType<typeof readdirSync>);
      mockReadFileSync.mockReturnValue(SAMPLE_GPX_WITH_NAME);

      const { getWalkGeoJsonFeatures } = await import("./gpx");
      const result = getWalkGeoJsonFeatures();

      expect(result).toHaveLength(1);
      expect(result[0]?.properties.title).toBe("Central Park Walk");
    });

    it("falls back to slug as the title when no track name is available", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([
        "2024-09-15.gpx",
      ] as unknown as ReturnType<typeof readdirSync>);
      mockReadFileSync.mockReturnValue(SAMPLE_GPX_WITHOUT_NAME);

      const { getWalkGeoJsonFeatures } = await import("./gpx");
      const result = getWalkGeoJsonFeatures();

      expect(result).toHaveLength(1);
      expect(result[0]?.properties.title).toBe("2024-09-15");
    });

    it("returns a valid WalkGeoJsonFeature shape", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([
        "2024-09-15.gpx",
      ] as unknown as ReturnType<typeof readdirSync>);
      mockReadFileSync.mockReturnValue(SAMPLE_GPX_WITH_NAME);

      const { getWalkGeoJsonFeatures } = await import("./gpx");
      const result = getWalkGeoJsonFeatures();

      expect(result).toHaveLength(1);
      const feature = result[0]!;
      expect(feature.type).toBe("Feature");
      expect(feature.geometry.type).toBe("LineString");
      expect(Array.isArray(feature.geometry.coordinates)).toBe(true);
      expect(feature.geometry.coordinates.length).toBeGreaterThan(0);
    });
  });
});
