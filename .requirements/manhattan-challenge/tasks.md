# Manhattan Challenge: Implementation Tasks

Tasks are organized into two waves. All Wave 1 tasks are independent and can run in parallel. Wave 2 tasks unblock once their Wave 1 dependencies are complete.

## Wave 1 — Independent Foundations

### Task A: Content Collection Schema + Sample Data

- Define `src/content/manhattan-challenge/` Astro content collection with Zod schema
  - Fields: `title`, `date`, `slug`, `distance_miles`, `duration_minutes`, `neighborhoods`, `gpx_file`
- Create 2–3 sample `.mdx` stub walk files so downstream tasks have real data to bind against

**Blocks**: Task E, Task F

---

### Task B: Leaflet Map Component

- Install `leaflet` and `@types/leaflet`
- Build an interactive Leaflet island component (`client:load`) in `src/components/`
  - Renders GeoJSON polylines as walked route overlays
  - Handles click events on polylines
  - Shows a popover near the click point with walk date and a "View walk details →" link
- Accept GeoJSON features as props (decoupled from the data pipeline)

**Blocks**: Task E, Task F

---

### Task C: GPX Build-Time Pipeline Utility

- Install `togeojson` and `@types/togeojson`
- Write `src/lib/gpx.ts`: reads GPX files from `public/manhattan-challenge/gpx/` and returns typed GeoJSON features tagged with slug and date metadata
- Called at build time by the overview and detail pages (no runtime API calls)

**Blocks**: Task E

---

### Task D: Strava Sync Script

- Write `scripts/sync-strava.ts` as a standalone Node script
- OAuth 2.0 refresh-token flow using a `.env`-stored refresh token
- Fetches walk/hike activities from Strava API (`GET /v3/athlete/activities`)
- Downloads GPS streams per activity (`GET /v3/activities/{id}/streams?keys=latlng,time,altitude`)
- Writes GPX files to `public/manhattan-challenge/gpx/YYYY-MM-DD.gpx`
- Generates MDX stubs in `src/content/manhattan-challenge/` with pre-filled frontmatter (date, distance, duration)

**Blocks**: nothing (standalone dev tool)

---

## Wave 2 — Pages

### Task E: `/manhattan-challenge` Overview Page

**Depends on**: Task A, Task B, Task C

- Create `src/pages/manhattan-challenge/index.astro`
- At build time via `getCollection('walks')`:
  - Compute progress percentage: `sum(distance_miles) / 1300 * 100`
  - Compute all 8 aggregated stats (total distance, total time, total walks, project span, longest walk, average distance, neighborhoods visited, most recent walk)
- Invoke the GPX pipeline utility (Task C) to load all GeoJSON features
- Render: progress indicator, stats panel, and the Leaflet map component (Task B) with all routes

---

### Task F: `/manhattan-challenge/walks/[slug]` Detail Pages

**Depends on**: Task A, Task B

- Create `src/pages/manhattan-challenge/walks/[slug].astro`
- `getStaticPaths()` generates one page per walk entry in the content collection
- Each page renders:
  - Walk title, date, and stats (distance, duration, neighborhoods)
  - Leaflet map component (Task B) scoped to that walk's single GeoJSON route
  - Rendered MDX narrative body
  - Previous / next walk navigation links

---

## Dependency Graph

```
Task A ──┬──► Task E (overview page)
Task B ──┤
Task C ──┘

Task A ──┬──► Task F (detail pages)
Task B ──┘

Task D  (no downstream dependency — standalone script)
```
