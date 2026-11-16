# Sankranthi Chit Fund Manager

A standalone, single-file HTML and React web application for tracking and managing a 20-round monthly chit fund pool (₹50,000/month), synced directly with Google Sheets.

## Key Features
- **Standalone Single-HTML Support:** Bundles all assets into a self-contained HTML file (`vite-plugin-singlefile`) that runs directly in any browser (`file://`) without a backend server.
- **Live Google Sheets Sync:** Fetches real-time round winners, prize amounts, and running pool balances directly from the `Sankranthi Chit` spreadsheet via Google Visualization (GViz) JSONP.
- **Manager Unlock & Apps Script Bridge:** Authorized organizers unlock Manager Mode using the manager passcode and submit monthly draws directly to Google Sheets via a Google Apps Script Web App bridge.
- **Second Chit Intelligence:** Automatically alerts managers when the running pool balance is within ₹10,000 of the ₹50,000 monthly pool to trigger a second chit draw.
- **Member Status Lookup:** Searchable 20-member directory showing claimed rounds, prize amounts, and remaining eligibility.

## Tech Stack
- **Frontend:** React, TypeScript, Vite, Tailwind CSS (`vite-plugin-singlefile`)
- **Data & Write Bridge:** Google Sheets GViz API, Google Apps Script Web App (`doPost`)

## Local Build
```bash
bun install
bun run build
```
The standalone single-file output is generated at `dist/index.html`.
