# Show Scanner

Part of [JARVIS](https://github.com/shenien/jarvis). Tracks your favorite bands and checks every morning for tour dates within 50 miles of Venice, CA, using the Ticketmaster Discovery API.

## How it works

- **Daily scan**: a GitHub Actions workflow (`.github/workflows/daily-scan.yml`) runs every morning, queries Ticketmaster for each band in `data/bands.json`, filters to shows within 50 miles of Venice, CA, and commits the results to `data/shows.json`. Pushing that commit triggers Render to redeploy automatically, same as JARVIS.
- **Band list**: managed from the app itself (add/remove bands in the "Your bands" section). Changes are written to `data/bands.json` and committed straight to this repo via the GitHub API, so they're durable and show up in the next morning's scan.
- **Manual scan**: the "Scan now" button in the header runs a scan on demand (rate-limited to once every 5 minutes).
- **Tickets**: every show card links to a StubHub search for that band + city. Ticketmaster doesn't guarantee a StubHub-specific link per event, so this is a search rather than a precise deep link.
- **Bands not found**: some smaller/local acts aren't in Ticketmaster's database. Those bands still appear in "Your bands" with a "not found" flag instead of silently vanishing.

## Environment variables (set in Render)

| Variable | Purpose |
|---|---|
| `TICKETMASTER_API_KEY` | Consumer key from [developer.ticketmaster.com](https://developer.ticketmaster.com/) |
| `GITHUB_TOKEN` | Fine-grained PAT, scoped to this repo only, with **Contents: Read and write** — lets the server commit band-list changes |
| `GITHUB_REPO` | `shenien/show-scanner` |

## Environment variables (set as a GitHub Actions secret)

| Variable | Purpose |
|---|---|
| `TICKETMASTER_API_KEY` | Same key as above — used by the daily scan workflow |

## Local development

```bash
npm install
TICKETMASTER_API_KEY=your_key npm start
```

Then open http://localhost:3000. Without `GITHUB_TOKEN`/`GITHUB_REPO` set, band-list changes still work locally (written to `data/bands.json`) but aren't committed back to GitHub.

## Changing the search radius or location

Edit `ORIGIN` and `RADIUS_MILES` at the top of `lib/scan.js`.
