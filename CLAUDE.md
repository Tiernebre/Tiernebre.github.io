# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio/website built with Astro 5. Hosted via GitHub Pages (Tiernebre.github.io).

## Commands

- `npm run dev` — Start dev server at localhost:4321
- `npm run build` — Production build to `./dist/`
- `npm run preview` — Preview production build locally

No linting or testing frameworks are configured.

## Architecture

- **Framework**: Astro 5 with TypeScript (strict mode, extends `astro/tsconfigs/strict`)
- **Styling**: Scoped CSS in Astro components (no CSS framework)
- **Routing**: File-based routing via `src/pages/`
- **Layouts**: `src/layouts/Layout.astro` wraps pages using `<slot />`
- **Components**: Reusable `.astro` components in `src/components/`
- **Static assets**: `public/` for files served as-is, `src/assets/` for processed assets
