import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TokenResponse {
  access_token: string;
}

interface StravaActivity {
  id: number;
  name: string;
  sport_type: string;
  start_date: string;
  distance: number;
  moving_time: number;
}

interface StreamSet {
  latlng?: {
    data: [number, number][];
  };
  time?: {
    data: number[];
  };
  altitude?: {
    data: number[];
  };
}

// ---------------------------------------------------------------------------
// Environment validation
// ---------------------------------------------------------------------------

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(
      `Error: Missing required environment variable ${name}. ` +
        "Please ensure your .env file is present and contains all required variables.",
    );
    process.exit(1);
  }
  return value;
}

const STRAVA_CLIENT_ID = getRequiredEnv("STRAVA_CLIENT_ID");
const STRAVA_CLIENT_SECRET = getRequiredEnv("STRAVA_CLIENT_SECRET");
const STRAVA_REFRESH_TOKEN = getRequiredEnv("STRAVA_REFRESH_TOKEN");

// ---------------------------------------------------------------------------
// Strava API helpers
// ---------------------------------------------------------------------------

async function refreshAccessToken(): Promise<string> {
  console.log("Refreshing Strava access token...");

  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: STRAVA_REFRESH_TOKEN,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as TokenResponse;
  console.log("Access token refreshed.");
  return data.access_token;
}

async function fetchActivities(accessToken: string): Promise<StravaActivity[]> {
  const WALK_HIKE_TYPES = new Set(["Walk", "Hike"]);
  const activities: StravaActivity[] = [];
  let page = 1;

  console.log("Fetching activities from Strava...");

  while (true) {
    const url =
      `https://www.strava.com/api/v3/athlete/activities` +
      `?per_page=200&page=${page}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Failed to fetch activities (${response.status}): ${body}`,
      );
    }

    const page_activities = (await response.json()) as StravaActivity[];

    if (page_activities.length === 0) {
      break;
    }

    const filtered = page_activities.filter((a) =>
      WALK_HIKE_TYPES.has(a.sport_type),
    );
    activities.push(...filtered);
    page += 1;
  }

  console.log(`Found ${activities.length} walk/hike activities.`);
  return activities;
}

async function fetchStreams(
  accessToken: string,
  activityId: number,
): Promise<StreamSet> {
  const url =
    `https://www.strava.com/api/v3/activities/${activityId}/streams` +
    `?keys=latlng,time,altitude`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to fetch streams for activity ${activityId} (${response.status}): ${body}`,
    );
  }

  const rawStreams = (await response.json()) as Array<{
    type: string;
    data: unknown;
  }>;

  const result: StreamSet = {};
  for (const stream of rawStreams) {
    if (stream.type === "latlng") {
      result.latlng = { data: stream.data as [number, number][] };
    } else if (stream.type === "time") {
      result.time = { data: stream.data as number[] };
    } else if (stream.type === "altitude") {
      result.altitude = { data: stream.data as number[] };
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// File generation
// ---------------------------------------------------------------------------

function formatDate(isoDate: string): string {
  return isoDate.slice(0, 10);
}

function buildGpx(
  activityName: string,
  startDate: string,
  streams: StreamSet,
): string {
  const latlng = streams.latlng?.data ?? [];
  const times = streams.time?.data ?? [];
  const altitudes = streams.altitude?.data ?? [];

  const startMs = new Date(startDate).getTime();

  const trackPoints = latlng
    .map((coord, i) => {
      const [lat, lon] = coord;
      const altEle =
        altitudes[i] !== undefined
          ? `\n        <ele>${altitudes[i]}</ele>`
          : "";
      const timeOffsetMs = (times[i] ?? 0) * 1000;
      const pointDate = new Date(startMs + timeOffsetMs).toISOString();
      return (
        `      <trkpt lat="${lat}" lon="${lon}">` +
        altEle +
        `\n        <time>${pointDate}</time>` +
        `\n      </trkpt>`
      );
    })
    .join("\n");

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<gpx version="1.1" creator="sync-strava">\n` +
    `  <trk>\n` +
    `    <name>${escapeXml(activityName)}</name>\n` +
    `    <trkseg>\n` +
    trackPoints +
    `\n    </trkseg>\n` +
    `  </trk>\n` +
    `</gpx>\n`
  );
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildMdxStub(
  activityName: string,
  dateStr: string,
  distanceMeters: number,
  movingTimeSeconds: number,
): string {
  const distanceMiles = (distanceMeters / 1609.344).toFixed(1);
  const durationMinutes = Math.round(movingTimeSeconds / 60);

  return (
    `---\n` +
    `title: "${activityName.replace(/"/g, '\\"')}"\n` +
    `date: "${dateStr}"\n` +
    `slug: "${dateStr}"\n` +
    `distance_miles: ${distanceMiles}\n` +
    `duration_minutes: ${durationMinutes}\n` +
    `neighborhoods: []\n` +
    `gpx_file: "public/manhattan-challenge/gpx/${dateStr}.gpx"\n` +
    `---\n\n` +
    `Walk notes go here.\n`
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const worktreeRoot = new URL("..", import.meta.url).pathname;

  const gpxDir = path.join(
    worktreeRoot,
    "public",
    "manhattan-challenge",
    "gpx",
  );
  const mdxDir = path.join(
    worktreeRoot,
    "src",
    "content",
    "manhattan-challenge",
  );

  fs.mkdirSync(gpxDir, { recursive: true });
  fs.mkdirSync(mdxDir, { recursive: true });

  const accessToken = await refreshAccessToken();
  const activities = await fetchActivities(accessToken);

  let gpxWritten = 0;
  let mdxCreated = 0;
  let gpxSkipped = 0;
  let mdxSkipped = 0;

  for (const activity of activities) {
    const dateStr = formatDate(activity.start_date);
    const gpxPath = path.join(gpxDir, `${dateStr}.gpx`);
    const mdxPath = path.join(mdxDir, `${dateStr}.mdx`);

    // Write GPX file if not already present
    if (fs.existsSync(gpxPath)) {
      console.log(`  [skip] GPX already exists: ${dateStr}.gpx`);
      gpxSkipped += 1;
    } else {
      console.log(
        `  [fetch] Downloading streams for "${activity.name}" (${dateStr})...`,
      );
      const streams = await fetchStreams(accessToken, activity.id);
      const gpxContent = buildGpx(activity.name, activity.start_date, streams);
      fs.writeFileSync(gpxPath, gpxContent, "utf-8");
      console.log(`  [write] GPX: ${dateStr}.gpx`);
      gpxWritten += 1;
    }

    // Create MDX stub if not already present
    if (fs.existsSync(mdxPath)) {
      console.log(`  [skip] MDX already exists: ${dateStr}.mdx`);
      mdxSkipped += 1;
    } else {
      const mdxContent = buildMdxStub(
        activity.name,
        dateStr,
        activity.distance,
        activity.moving_time,
      );
      fs.writeFileSync(mdxPath, mdxContent, "utf-8");
      console.log(`  [write] MDX stub: ${dateStr}.mdx`);
      mdxCreated += 1;
    }
  }

  console.log("\nSync complete.");
  console.log(`  GPX files written : ${gpxWritten}`);
  console.log(`  GPX files skipped : ${gpxSkipped}`);
  console.log(`  MDX stubs created : ${mdxCreated}`);
  console.log(`  MDX stubs skipped : ${mdxSkipped}`);
}

main().catch((err: unknown) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
