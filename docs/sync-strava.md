# sync-strava

`scripts/sync-strava.ts` syncs your Strava walk/hike activities to the local project.

## What it does

For each `Walk` or `Hike` activity in your Strava account it:

1. Downloads GPS streams (lat/lng, time, altitude) for new activities
2. Writes a GPX track file to `public/manhattan-challenge/gpx/<YYYY-MM-DD>.gpx`
3. Creates an MDX content stub at `src/content/manhattan-challenge/<YYYY-MM-DD>.mdx`

The script is idempotent — existing GPX and MDX files are skipped on subsequent runs.

## Prerequisites

Create a `.env` file in the project root:

```env
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
STRAVA_REFRESH_TOKEN=your_refresh_token
```

To obtain these values:

1. Create a Strava API application at https://www.strava.com/settings/api
2. Use the Strava OAuth flow to obtain a refresh token with the `activity:read_all` scope

## Usage

```sh
npm run strava:sync
```

## Output

### GPX files

`public/manhattan-challenge/gpx/<YYYY-MM-DD>.gpx` — one file per activity, containing a full GPS track.

### MDX stubs

`src/content/manhattan-challenge/<YYYY-MM-DD>.mdx` — one file per activity with frontmatter pre-filled:

```mdx
---
title: "Activity Name"
date: "YYYY-MM-DD"
slug: "YYYY-MM-DD"
distance_miles: 3.2
duration_minutes: 72
neighborhoods: []
gpx_file: "public/manhattan-challenge/gpx/YYYY-MM-DD.gpx"
---
```

After running the sync, edit each stub to:

- Add entries to `neighborhoods: []`
