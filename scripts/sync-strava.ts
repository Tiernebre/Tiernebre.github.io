import "dotenv/config";
import crypto from "node:crypto";
import { exec } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {
  type WeatherSnapshot,
  wmoCodeToCondition,
  findHourIndex,
} from "../src/lib/weather.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

interface StravaActivity {
  id: number;
  name: string;
  sport_type: string;
  start_date: string;
  distance: number;
  moving_time: number;
  start_latlng?: [number, number];
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
// STRAVA_REFRESH_TOKEN is optional — obtained interactively if absent or invalid

// ---------------------------------------------------------------------------
// OAuth setup helpers
// ---------------------------------------------------------------------------

const OAUTH_PORT = 8000;
const OAUTH_REDIRECT_URI = `http://localhost:${OAUTH_PORT}/callback`;

function openBrowser(url: string): void {
  const cmd =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";
  exec(`${cmd} "${url}"`);
}

function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: OAUTH_REDIRECT_URI,
    response_type: "code",
    approval_prompt: "auto",
    scope: "activity:read_all",
    state,
  });
  return `https://www.strava.com/oauth/authorize?${params}`;
}

async function waitForOAuthCallback(expectedState: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error("OAuth callback timed out after 2 minutes."));
    }, 120_000);

    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost:${OAUTH_PORT}`);

      if (url.pathname !== "/callback") {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      if (error) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(
          `<html><body><h1>Authorization failed</h1><p>${error}</p></body></html>`,
        );
        clearTimeout(timeout);
        server.close();
        reject(new Error(`OAuth authorization error: ${error}`));
        return;
      }

      if (!code || state !== expectedState) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(`<html><body><h1>Invalid callback</h1></body></html>`);
        clearTimeout(timeout);
        server.close();
        reject(
          new Error("Invalid OAuth callback: missing code or state mismatch."),
        );
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        `<html><body><h1>Authorization successful!</h1><p>You can close this tab.</p></body></html>`,
      );
      clearTimeout(timeout);
      server.close();
      resolve(code);
    });

    server.listen(OAUTH_PORT);
  });
}

async function exchangeCodeForToken(code: string): Promise<string> {
  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as TokenResponse;
  return data.refresh_token;
}

function saveRefreshTokenToEnv(refreshToken: string): void {
  const envPath = path.resolve(process.cwd(), ".env");

  let content = "";
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, "utf-8");
  }

  const tokenLine = `STRAVA_REFRESH_TOKEN=${refreshToken}`;
  if (/^STRAVA_REFRESH_TOKEN=/m.test(content)) {
    content = content.replace(/^STRAVA_REFRESH_TOKEN=.*/m, tokenLine);
  } else {
    content = content.trimEnd() + (content ? "\n" : "") + tokenLine + "\n";
  }

  fs.writeFileSync(envPath, content, "utf-8");
  console.log("Refresh token saved to .env");
}

async function interactiveLogin(): Promise<string> {
  console.log("\nStrava authorization required.");
  console.log(
    `Ensure ${OAUTH_REDIRECT_URI} is registered as a redirect URI in your Strava app settings.`,
  );
  console.log("Opening browser for authorization...\n");

  const state = crypto.randomBytes(16).toString("hex");
  const authUrl = buildAuthUrl(state);

  openBrowser(authUrl);
  console.log("If the browser did not open automatically, visit:");
  console.log(`  ${authUrl}\n`);

  console.log(`Waiting for authorization callback on port ${OAUTH_PORT}...`);
  const code = await waitForOAuthCallback(state);

  console.log("Authorization received. Exchanging code for tokens...");
  const refreshToken = await exchangeCodeForToken(code);

  saveRefreshTokenToEnv(refreshToken);
  return refreshToken;
}

// ---------------------------------------------------------------------------
// Strava API helpers
// ---------------------------------------------------------------------------

async function refreshAccessToken(refreshToken: string): Promise<string> {
  console.log("Refreshing Strava access token...");

  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
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

const MANHATTAN_CHALLENGE_TAG = "#MC";

async function fetchActivities(accessToken: string): Promise<StravaActivity[]> {
  const WALK_HIKE_TYPES = new Set(["Walk", "Hike"]);
  const activities: StravaActivity[] = [];
  let page = 1;

  console.log(
    `Fetching activities from Strava (tagged "${MANHATTAN_CHALLENGE_TAG}")...`,
  );

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

    const filtered = page_activities.filter(
      (a) =>
        WALK_HIKE_TYPES.has(a.sport_type) &&
        a.name.includes(MANHATTAN_CHALLENGE_TAG),
    );
    activities.push(...filtered);
    page += 1;
  }

  console.log(`Found ${activities.length} tagged walk/hike activities.`);
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
// Weather
// ---------------------------------------------------------------------------

interface OpenMeteoResponse {
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
  };
}

async function fetchWeather(
  lat: number,
  lon: number,
  isoDateTime: string,
): Promise<WeatherSnapshot | null> {
  const date = isoDateTime.slice(0, 10);
  const url =
    `https://archive-api.open-meteo.com/v1/archive` +
    `?latitude=${lat}&longitude=${lon}` +
    `&start_date=${date}&end_date=${date}` +
    `&hourly=temperature_2m,weather_code` +
    `&temperature_unit=fahrenheit` +
    `&timezone=UTC`;

  const response = await fetch(url);
  if (!response.ok) {
    console.warn(
      `  [warn] Weather fetch failed (${response.status}) — skipping`,
    );
    return null;
  }

  const data = (await response.json()) as OpenMeteoResponse;
  const index = findHourIndex(data.hourly.time, isoDateTime);
  if (index === -1) {
    console.warn(`  [warn] No matching hour in weather data — skipping`);
    return null;
  }

  return {
    temp_f: Math.round(data.hourly.temperature_2m[index]!),
    condition: wmoCodeToCondition(data.hourly.weather_code[index]!),
  };
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
  weather?: WeatherSnapshot,
): string {
  const distanceMiles = (distanceMeters / 1609.344).toFixed(1);
  const durationMinutes = Math.round(movingTimeSeconds / 60);

  const weatherBlock = weather
    ? `weather:\n  temp_f: ${weather.temp_f}\n  condition: "${weather.condition}"\n`
    : "";

  return (
    `---\n` +
    `title: "${activityName.replace(/"/g, '\\"')}"\n` +
    `date: "${dateStr}"\n` +
    `slug: "${dateStr}"\n` +
    `distance_miles: ${distanceMiles}\n` +
    `duration_minutes: ${durationMinutes}\n` +
    `neighborhoods: []\n` +
    `gpx_file: "public/manhattan-challenge/gpx/${dateStr}.gpx"\n` +
    weatherBlock +
    `---\n`
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

  let refreshToken = process.env.STRAVA_REFRESH_TOKEN;

  if (!refreshToken) {
    console.log("No STRAVA_REFRESH_TOKEN found in .env.");
    refreshToken = await interactiveLogin();
  }

  let accessToken: string;
  try {
    accessToken = await refreshAccessToken(refreshToken);
  } catch {
    console.log(
      "Token refresh failed — the refresh token may be expired or invalid.",
    );
    refreshToken = await interactiveLogin();
    accessToken = await refreshAccessToken(refreshToken);
  }

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
      let weather: WeatherSnapshot | undefined;
      if (activity.start_latlng) {
        const [lat, lon] = activity.start_latlng;
        console.log(`  [weather] Fetching weather for ${dateStr}...`);
        weather =
          (await fetchWeather(lat, lon, activity.start_date)) ?? undefined;
      }
      const mdxContent = buildMdxStub(
        activity.name,
        dateStr,
        activity.distance,
        activity.moving_time,
        weather,
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
