import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { DOMParser } from "@xmldom/xmldom";
import { gpx } from "@tmcw/togeojson";

export interface WalkGeoJsonFeature {
  type: "Feature";
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
  properties: {
    slug: string;
    date: string; // ISO date string YYYY-MM-DD
    title: string;
  };
}

const GPX_DIR = join(process.cwd(), "public", "manhattan-challenge", "gpx");

function slugFromFilename(filename: string): string {
  return basename(filename, extname(filename));
}

export function dateFromSlug(slug: string): string {
  const match = slug.match(/^(\d{4}-\d{2}-\d{2})(-\d+)?$/);
  return match ? match[1] : slug;
}

export function getWalkGeoJsonFeature(slug: string): WalkGeoJsonFeature | null {
  const filePath = join(GPX_DIR, `${slug}.gpx`);
  if (!existsSync(filePath)) {
    return null;
  }

  const content = readFileSync(filePath, "utf-8");
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "text/xml");
  const collection = gpx(doc);

  for (const feature of collection.features) {
    if (feature.geometry && feature.geometry.type === "LineString") {
      const rawTitle =
        feature.properties &&
        typeof feature.properties["name"] === "string" &&
        feature.properties["name"].length > 0
          ? feature.properties["name"]
          : slug;

      return {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: feature.geometry.coordinates as [number, number][],
        },
        properties: {
          slug,
          date: dateFromSlug(slug),
          title: rawTitle,
        },
      };
    }
  }

  return null;
}

export function getWalkGeoJsonFeatures(): WalkGeoJsonFeature[] {
  if (!existsSync(GPX_DIR)) {
    return [];
  }

  let files: string[];
  try {
    files = readdirSync(GPX_DIR).filter((f) => f.endsWith(".gpx"));
  } catch {
    return [];
  }

  if (files.length === 0) {
    return [];
  }

  const parser = new DOMParser();
  const features: WalkGeoJsonFeature[] = [];

  for (const file of files) {
    const filePath = join(GPX_DIR, file);
    const content = readFileSync(filePath, "utf-8");
    const doc = parser.parseFromString(content, "text/xml");
    const collection = gpx(doc);

    const slug = slugFromFilename(file);
    const date = dateFromSlug(slug);

    for (const feature of collection.features) {
      if (feature.geometry && feature.geometry.type === "LineString") {
        const rawTitle =
          feature.properties &&
          typeof feature.properties["name"] === "string" &&
          feature.properties["name"].length > 0
            ? feature.properties["name"]
            : slug;

        features.push({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: feature.geometry.coordinates as [number, number][],
          },
          properties: {
            slug,
            date,
            title: rawTitle,
          },
        });
      }
    }
  }

  return features;
}
