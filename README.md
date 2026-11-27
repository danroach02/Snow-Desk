# Snow Desk

Personal snow-forecast dashboard for Utah resorts and Jackson Hole.

- Model forecasts (GFS, ECMWF, ICON, GEM via Open-Meteo) at mid-mountain elevation
- NWS point forecasts and forecaster discussions (api.weather.gov)
- SNOTEL snowpack vs. median (USDA NRCS)
- Radar loops, UDOT road info (optional API key)
- "Where to ski" pick scored on overnight snow, wind, rain risk, roads and drive time

Single file: `index.html`, served with GitHub Pages.

## Checks
- `npm install && npm test` runs a smoke test with mocked data feeds.
- In the app, Settings → Data check shows which live sources loaded.

## Data notes
Snow totals are forecasts. Depth-sensor numbers are estimates; resort reports are the official measurements.
Ski runs come from OpenStreetMap via the public Overpass API (cached 30 days per resort). Imagery and topo are USGS.

## Resort reports
`.github/workflows/reports.yml` runs `scripts/fetch-reports.mjs` hourly. It reads each resort's published mountain report
(one request per resort), writes `data/reports.json`, and logs afternoon forecasts against next-morning reports in
`data/accuracy.json`. Personal use only.
