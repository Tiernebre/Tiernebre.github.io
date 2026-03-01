# PRD: Resume Page

## Overview

Build a `/resume` page on tiernebre.com that renders `resume.json` as a live, styled web page — the JSON file is the single source of truth for all resume content, committed to version control. The page also provides a way to get a clean PDF copy for job applications and emails.

---

## Goals

1. **Live resume page** at `/resume` — always reflects the current state of `resume.json`
2. **Version-controlled source of truth** — editing `resume.json` is all that's needed to update the resume
3. **PDF output** — a clean, professional PDF that can be downloaded directly from the page

---

## Data Source

`resume.json` uses the [Reactive Resume](https://docs.rxresu.me/) schema. The file lives at `.requirements/resume/resume.json`. For the Astro build to import it cleanly, **move it to `src/data/resume.json`** so it's importable via a static `import`.

The JSON structure maps to these rendered sections:

| JSON key | Resume section |
|---|---|
| `basics` | Header (name, headline, contact info) |
| `summary` | Summary paragraph |
| `sections.experience` | Work Experience |
| `sections.education` | Education |
| `sections.projects` | Projects (hidden if `items` is empty) |
| `sections.skills` | Skills (hidden if `items` is empty) |
| Remaining sections | Hidden when `items` is empty |

Sections with `"hidden": true` or an empty `items` array are not rendered.

---

## Page

**URL:** `/resume`
**File:** `src/pages/resume/index.astro`

### Layout

The page uses a single-column layout (no sidebar — keep it simple for both screen and print). Reading order:

```
┌─────────────────────────────────────────────┐
│  BRENDAN TIERNEY                            │
│  tiernebre@gmail.com · (208) 244-4083       │
│  tiernebre.com          [Download PDF ↓]   │
├─────────────────────────────────────────────┤
│  EXPERIENCE                                 │
│  ─────────────────────────────────────────  │
│  Meta · Software Engineer (E5; Senior)      │
│  June 2025 – Present                        │
│  • bullet points...                         │
│                                             │
│  Reddit · Senior Software Engineer         │
│  Feb 2022 – June 2025                       │
│  • bullet points...                         │
├─────────────────────────────────────────────┤
│  EDUCATION                                  │
│  ─────────────────────────────────────────  │
│  Boise State University · B.S. Comp Sci    │
│  Aug 2014 – May 2018                        │
│  • bullet points...                         │
└─────────────────────────────────────────────┘
```

### Components to build

| Component | Purpose |
|---|---|
| `ResumeHeader.astro` | Name, contact line, PDF download button |
| `ResumeSection.astro` | Titled section wrapper (Experience, Education, etc.) |
| `ResumeExperienceItem.astro` | Company, position, period, HTML description |
| `ResumeEducationItem.astro` | School, degree, area, grade, period, HTML description |

The `description` field in `resume.json` is HTML (rich text with `<ul>`, `<li>`, `<a>`, `<strong>`, `<p>`). Render it with `<Fragment set:html={description} />` — **do not sanitize** since this is a trusted, self-authored file.

### Styling

- Use existing Open Props variables (see MEMORY.md for the variable map)
- `var(--gray-9)` for name/headings, `var(--gray-7)` for section labels, `var(--gray-6)` for metadata (period, location)
- Clean, minimal — no decorative elements that won't survive print
- Max content width: ~800px, centered
- Font: `var(--font-sans)`

---

## PDF Strategy

Use **print CSS** as the primary mechanism. This means:

1. A "Download PDF" button on the page that triggers `window.print()`
2. A `@media print` stylesheet that hides the button, removes margins/padding, and produces a clean single-column document when the user prints to PDF

**Why this approach:**
- Zero build-time dependencies (no Puppeteer, no CI complexity)
- Always reflects the current rendered page — no stale PDF artifact
- Works on any browser on any OS
- GitHub Pages is a static host — no server-side rendering available

### Print CSS rules

```css
@media print {
  /* Hide the download button */
  .resume-download-btn { display: none; }

  /* Avoid page breaks inside job entries */
  .resume-experience-item,
  .resume-education-item { break-inside: avoid; }

  /* Remove decorative shadows, borders */
  * { box-shadow: none !important; }

  /* Ensure links show their URLs in print */
  a[href]::after { content: none; } /* suppress auto URL expansion */
}
```

A brief "Print to PDF" UX note on the page for first-time users.

---

## Implementation Steps

1. Move `resume.json` from `.requirements/resume/resume.json` → `src/data/resume.json`
2. Create the component files listed above
3. Create `src/pages/resume/index.astro` — import and parse the JSON, pass data to components
4. Add print CSS (scoped in the page + `@media print` block)
5. Wire up the "Download PDF" button to `window.print()`
6. Run `npm run build`, `npm run lint`, `npm run format:check` — fix any issues
7. Open PR

---

## Out of Scope

- Automated build-time PDF generation (Puppeteer, Playwright, wkhtmltopdf) — not needed given print CSS approach
- Syncing with LinkedIn or any external service
- A resume editor UI
- Multiple resume variants
- Sidebar layout (the JSON's `metadata.layout` sidebar configuration is ignored — single column is cleaner)
