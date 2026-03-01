# PRD: Walk Every Street in Manhattan

## Overview

A dedicated section of the personal website that tracks and visualizes the goal of walking every street in Manhattan. Visitors can explore an interactive map showing all walked routes aggregated over time, see how much of Manhattan has been covered, and dive into individual walk details via linked blog posts.

---

## Goals

- Publicly document and share the "every street" project in an engaging, visual format.
- Give visitors a sense of progress and scale.
- Make individual walks discoverable and linkable (shareable walk posts).

---

## User Stories

| As a...    | I want to...                                             | So that...                                                      |
| ---------- | -------------------------------------------------------- | --------------------------------------------------------------- |
| Visitor    | See all walked routes on a map                           | I can understand the scope of the project                       |
| Visitor    | See how much of Manhattan has been covered               | I get a sense of progress                                       |
| Visitor    | See aggregated stats (total distance, time, walks, span) | I can appreciate the full effort behind the project at a glance |
| Visitor    | Click a walked segment                                   | I can find out when that area was walked                        |
| Visitor    | Click through to a walk's detail page                    | I can read the full story of that day's walk                    |
| Site owner | Add a new walk                                           | The map and progress automatically update                       |

---

## Pages & Routes

### `/manhattan-challenge` — Map Overview Page

The main feature page. Contains:

- **Interactive map** centered on Manhattan
- All walked GPS routes rendered as colored polylines, layered/aggregated on a single map
- **Progress indicator**: e.g., "127 of ~1,300 miles walked (9.7%)" displayed on or near the map
- **Popover on segment click**: clicking any walked path segment opens a popover/tooltip showing:
  - Walk date (e.g., "February 28, 2026")
  - A hyperlink: "View walk details →" linking to `/manhattan-challenge/walks/[slug]`

### `/manhattan-challenge/walks/[slug]` — Individual Walk Detail Page

A blog-post-style page for a single walk. Contains:

- Walk title and date
- Small embedded map showing only that day's route
- Written narrative / notes about the walk (author-authored content)
- Walk stats (distance, duration, neighborhood(s) covered — sourced from GPS data)
- Navigation to previous/next walk

---

## Functional Requirements

### Map

- **FR-1**: Display a base map of Manhattan (OpenStreetMap tiles or similar).
- **FR-2**: Render all walks as polylines overlaid on the map. Each polyline represents one walk's GPS track.
- **FR-3**: Walked segments are visually distinct from unwalked streets (e.g., a specific color, e.g. green or brand color, on the neutral map).
- **FR-4**: Clicking a polyline segment opens a popover anchored near the click point.
- **FR-5**: The popover shows the walk date and a link to `/manhattan-challenge/walks/[slug]`.
- **FR-6**: The map is responsive and works on mobile (pinch-to-zoom, tap-to-select).

### Progress Tracking

- **FR-7**: A progress indicator is shown on the `/manhattan-challenge` page.
- **FR-8**: Progress is expressed as a percentage of total Manhattan street length covered.
- **FR-9**: Progress updates automatically when new walks are added.

### Walk Posts

- **FR-10**: Each walk has a detail page at `/manhattan-challenge/walks/[slug]`.
- **FR-11**: Walk posts support authored markdown content (narrative text).
- **FR-12**: Walk posts display: date, distance, duration, a route map, and the narrative.
- **FR-13**: Walk posts are listed/navigable (previous / next).

### Data

- **FR-14**: GPS route data is stored as GPX or GeoJSON files checked into the repository.
- **FR-15**: Walk metadata (date, title, slug, stats) is defined in Astro content collection frontmatter.
- **FR-16**: The map page loads all route geometries at build time (static generation); no runtime API calls required for rendering.

---

## Data Model

### Astro Content Collection: `walks`

Location: `src/content/manhattan-challenge/`

Each walk is a `.mdx` file with the following frontmatter:

```yaml
---
title: "Lower East Side to Midtown"
date: 2026-02-28
slug: "2026-02-28-lower-east-side-midtown"
distance_miles: 6.2
duration_minutes: 105
neighborhoods:
  - Lower East Side
  - NoMad
  - Midtown South
gpx_file: "/manhattan-challenge/gpx/2026-02-28.gpx"
---
```

The `.mdx` body contains the authored narrative content.

### GPX / GeoJSON Files

Location: `public/manhattan-challenge/gpx/` (served statically)

- One GPX file per walk, exported from a GPS source (e.g., Strava, Garmin, Apple Fitness).
- At build time, GPX files are parsed and converted to GeoJSON for map rendering.
- GeoJSON is embedded in the built page or loaded as static JSON assets.

---

## Technical Architecture

### Map Library

**Recommended: [Leaflet.js](https://leafletjs.com/)**

- Lightweight, well-documented, no API key required.
- Works with free OpenStreetMap tiles.
- Strong GeoJSON polyline support with click event handlers.
- Alternative: MapLibre GL JS (more powerful, better for large datasets, requires slightly more setup).

### GPS Data Pipeline

GPS data is sourced from **Strava** via its API. A local script (`scripts/sync-strava.ts`) handles ingestion:

1. Call `GET /v3/athlete/activities` to list all activities; filter for walk/hike types.
2. For each new activity, call `GET /v3/activities/{id}/streams?keys=latlng,time,altitude` to retrieve raw GPS data.
3. Convert streams → GPX and write to `public/manhattan-challenge/gpx/YYYY-MM-DD.gpx`.
4. Generate a stub `.mdx` file in `src/content/manhattan-challenge/` with frontmatter pre-filled from activity metadata (date, distance, duration).
5. Author fills in the narrative body of the `.mdx`, then commits both files.
6. At build time, GPX files are parsed and converted to GeoJSON using `togeojson` for map rendering.
7. GeoJSON features are passed as props to the map component.

**Authentication**: Strava uses OAuth 2.0. The sync script stores a refresh token in a local `.env` file (never committed) and exchanges it for an access token at runtime.

### Progress Calculation

Progress is computed at build time as cumulative mileage:

```
coverage % = sum(distance_miles across all walks) / 1300 * 100
```

- `1300` is the estimated total miles of Manhattan streets.
- No street network data or spatial libraries required.
- Slightly overstates true coverage if streets are re-walked, which is acceptable for v1.
- Spatial deduplication via `@turf/turf` is a v2 stretch goal.

### Astro Integration

- `/manhattan-challenge` page: static page, all data loaded at build time via `getCollection('walks')`.
- `/manhattan-challenge/walks/[slug]` pages: static paths generated via `getStaticPaths()`.
- Map component: a client-side interactive island (`client:load`) wrapping Leaflet.

---

## Aggregated Statistics

The `/manhattan-challenge` page displays a statistics panel summarizing all walks to date. All values are computed at build time from the content collection and GPS data.

### Stats to Display

| Stat                      | Description                                                              | Example                     |
| ------------------------- | ------------------------------------------------------------------------ | --------------------------- |
| **Total distance**        | Sum of `distance_miles` across all walks                                 | "47.3 miles walked"         |
| **Total time**            | Sum of `duration_minutes` across all walks, formatted as hours + minutes | "14 hrs 22 min"             |
| **Total walks**           | Count of walk entries                                                    | "8 walks"                   |
| **Project span**          | Date range from first walk to most recent walk                           | "Jan 5 – Mar 1, 2026"       |
| **Longest walk**          | Walk with the highest `distance_miles`, linked to its detail page        | "9.1 mi — Feb 28, 2026"     |
| **Average distance**      | Mean `distance_miles` across all walks                                   | "5.9 mi per walk"           |
| **Neighborhoods visited** | Deduplicated count of all neighborhoods across all walks                 | "18 neighborhoods"          |
| **Most recent walk**      | Date and title of the latest walk entry, linked to its detail page       | "Mar 1, 2026 — Harlem Loop" |

### Functional Requirements

- **FR-17**: All aggregated stats are computed at build time from `getCollection('walks')`; no client-side calculation required.
- **FR-18**: The stats panel is displayed on the `/manhattan-challenge` overview page, positioned near the progress indicator.
- **FR-19**: Stats automatically update when a new walk entry is added.
- **FR-20**: "Longest walk" and "Most recent walk" entries are hyperlinked to their respective `/manhattan-challenge/walks/[slug]` pages.

---

## Out of Scope (v1)

- Real-time Strava sync (walks are added manually via GPX export + commit).
- Deduplication of overlapping segments walked on multiple days (v1 renders all tracks; visual overlap is acceptable).
- User accounts or comments.
- Street-level completion scoring per neighborhood (stretch goal for v2).
- 3D or satellite map modes.

---

## Open Questions

| #   | Question                                                                      | Notes                                                                                                                                       |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | ~~What is the primary GPS source?~~                                           | **Resolved**: Strava via API. A `scripts/sync-strava.ts` script fetches activity streams and generates GPX files + MDX stubs automatically. |
| 2   | ~~Leaflet or MapLibre?~~                                                      | **Resolved**: Leaflet.js. Simpler setup, sufficient for the expected scale.                                                                 |
| 3   | ~~Should progress be spatial (turf.js deduplication) or cumulative mileage?~~ | **Resolved**: Cumulative mileage. Sum of `distance_miles` ÷ ~1,300 miles. Simple and fast; spatial deduplication is a v2 stretch goal.      |
| 4   | ~~MDX or plain Markdown for walk posts?~~                                     | **Resolved**: MDX. Enables embedding the route map component directly in the post body.                                                     |
| 5   | ~~Is there a desired URL structure?~~                                         | **Resolved**: `/manhattan-challenge` for the overview, `/manhattan-challenge/walks/[slug]` for individual walk pages.                       |
