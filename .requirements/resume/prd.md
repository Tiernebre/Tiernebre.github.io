# PRD: Resume Page

## Overview

Build a `/resume` page on tiernebre.com as a single MDX file — content is written in plain Markdown, contact info lives in frontmatter, and a layout component handles the header and print styles. The page also provides a way to get a clean PDF copy for job applications and emails.

---

## Goals

1. **Live resume page** at `/resume` — always reflects the current state of the MDX file
2. **Version-controlled source of truth** — editing `resume.mdx` is all that's needed to update the resume
3. **PDF output** — a clean, professional PDF that can be downloaded directly from the page

---

## Data Source

### Temporary Reference File

`.requirements/resume/resume.json` is a **temporary export from [Reactive Resume](https://docs.rxresu.me/)** used as a reference for the initial content only. It is **not** the long-term data source and should not be imported by the Astro build.

### Permanent Data File

**`src/pages/resume.mdx`** is the canonical, maintained source of truth.

- **Frontmatter** holds structured contact info (name, email, phone, website)
- **Body** is plain Markdown — headings, bullet points, and links — for all resume sections
- No TypeScript interfaces, no JSON parsing, no HTML strings to maintain

Example structure:

```mdx
---
layout: ../layouts/ResumeLayout.astro
name: Brendan Tierney
email: tiernebre@gmail.com
phone: (208) 244-4083
website: https://tiernebre.com/
---

## Experience

### Meta · Software Engineer (E5; Senior)
*June 2025 – Present*

- Full-stack senior software engineer on Conversions Experience...

### Reddit · Senior Software Engineer
*February 2022 – June 2025*

- Lead Senior Web Front End Engineer on New Ad Formats...

## Education

### Boise State University · B.S. Computer Science
*August 2014 – May 2018*

- Graduated on the College of Engineering Dean's List...
```

Translate the content from `.requirements/resume/resume.json` into this format. Once `resume.mdx` is complete and the page is working, `.requirements/resume/resume.json` may be deleted.

---

## Page

**URL:** `/resume`
**File:** `src/pages/resume.mdx`

### Layout

The page uses `ResumeLayout.astro` (assigned via the `layout` frontmatter field). The layout:

- Renders the header (name, contact line, PDF download button) using frontmatter props
- Wraps the MDX body in a centered, max-width container
- Owns the `@media print` styles

Reading order:

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
│  Reddit · Senior Software Engineer          │
│  Feb 2022 – June 2025                       │
│  • bullet points...                         │
├─────────────────────────────────────────────┤
│  EDUCATION                                  │
│  ─────────────────────────────────────────  │
│  Boise State University · B.S. Comp Sci     │
│  Aug 2014 – May 2018                        │
│  • bullet points...                         │
└─────────────────────────────────────────────┘
```

### Files to create

| File                          | Purpose                                                       |
| ----------------------------- | ------------------------------------------------------------- |
| `src/pages/resume.mdx`        | Resume content (frontmatter + markdown body)                  |
| `src/layouts/ResumeLayout.astro` | Header, download button, print styles, content wrapper     |

No separate item components needed — Markdown headings and bullets handle the structure.

### Styling

- Styles live in `ResumeLayout.astro` (scoped + `@media print`)
- Use Open Props variables: `var(--gray-9)` for name/headings, `var(--gray-7)` for section labels, `var(--gray-6)` for metadata (period, location)
- Clean, minimal — no decorative elements that won't survive print
- Max content width: ~800px, centered
- Font: `var(--font-sans)`

---

## PDF Strategy

Use **print CSS** as the primary mechanism. This means:

1. A "Download PDF" button in `ResumeLayout.astro` that triggers `window.print()`
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
  .resume-download-btn {
    display: none;
  }

  /* Avoid page breaks inside job entries */
  h3 {
    break-after: avoid;
  }

  /* Remove decorative shadows, borders */
  * {
    box-shadow: none !important;
  }

  /* Suppress auto URL expansion next to links */
  a[href]::after {
    content: none;
  }
}
```

A brief "Print to PDF" UX note on the page for first-time users.

---

## Implementation Steps

1. Create `src/layouts/ResumeLayout.astro` — accepts `name`, `email`, `phone`, `website` as props; renders header with download button; applies print styles; yields `<slot />` for MDX body
2. Create `src/pages/resume.mdx` — frontmatter pointing to the layout, body content translated from `.requirements/resume/resume.json`
3. Wire up the "Download PDF" button to `window.print()`
4. Run `npm run build`, `npm run lint`, `npm run format:check` — fix any issues
5. Open PR
6. Delete `.requirements/resume/resume.json` (no longer needed once the page is live)

---

## Out of Scope

- Automated build-time PDF generation (Puppeteer, Playwright, wkhtmltopdf) — not needed given print CSS approach
- Syncing with LinkedIn or any external service
- A resume editor UI
- Multiple resume variants
- Sidebar layout — single column is cleaner for both screen and print
