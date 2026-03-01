# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio/website built with Astro 5. Hosted via GitHub Pages (Tiernebre.github.io).

## Commands

- `npm run dev` — Start dev server at localhost:4321
- `npm run build` — Production build to `./dist/`
- `npm run preview` — Preview production build locally
- `npm run lint` — Run ESLint
- `npm run lint:fix` — Run ESLint with auto-fix
- `npm run format` — Format files with Prettier
- `npm run format:check` — Check formatting with Prettier
- `npm run test` — Runs tests

## Architecture

- **Framework**: Astro 5 with TypeScript (strict mode, extends `astro/tsconfigs/strict`)
- **Styling**: Scoped CSS in Astro components, using [Open Props](https://open-props.style/) for styling rules.
- **Routing**: File-based routing via `src/pages/`
- **Layouts**: `src/layouts/Layout.astro` wraps pages using `<slot />`
- **Components**: Reusable `.astro` components in `src/components/`
- **Static assets**: `public/` for files served as-is, `src/assets/` for processed assets

## Writing code

- Follow red-green / test-driven development when writing new code. Write failing tests and specs, then implement code such that the tests will then pass. Ensure near-100% code coverage at all costs.
- Respect the formatting for all files types (markdown, astro, TS/JS, HTML/CSS, etc..). Leverage `npm run format` and `npm run format:check` to format your code per the project's spec.

## Git / GitHub

- When creating pull requests, don't write a `Test plan` section.
- Before committing and opening a pull request, always run the following checks in order and fix any failures before proceeding:
  1. `npm run test` — all tests must pass
  2. `npm run lint` — no lint errors
  3. `npm run format:check` — code must be formatted correctly (run `npm run format` to fix)
