#!/usr/bin/env bash
set -euo pipefail

# 1. Run the Strava sync
echo "==> Syncing activities from Strava..."
npm run strava:sync

# 2. Detect newly generated files
NEW_GPX=$(git status --porcelain -- public/manhattan-challenge/gpx/ | grep -c '^\?\?' || true)
NEW_MDX=$(git status --porcelain -- src/content/manhattan-challenge/ | grep -c '^\?\?' || true)

if [ "$NEW_GPX" -eq 0 ] && [ "$NEW_MDX" -eq 0 ]; then
  echo "No new activities to commit. Exiting."
  exit 0
fi

echo "==> Found ${NEW_GPX} new GPX file(s) and ${NEW_MDX} new MDX stub(s)."

# 3. Stage only sync output — never .env or other sensitive files
git add public/manhattan-challenge/gpx/ src/content/manhattan-challenge/

# 4. Build a conventional commit message
if [ "$NEW_MDX" -eq 1 ]; then
  COMMIT_MSG="content: add ${NEW_MDX} manhattan challenge walk from strava"
else
  COMMIT_MSG="content: add ${NEW_MDX} manhattan challenge walks from strava"
fi

git commit -m "$COMMIT_MSG"

# 5. Push to main
echo "==> Pushing to main..."
git push origin main

echo "==> Done!"
