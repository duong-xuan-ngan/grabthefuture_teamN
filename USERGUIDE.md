# User Guide

## Resident

1. Scan the QR code on any bin with a smartphone camera.
2. Select the issue type: Overflow / Near Full / Bulky Waste / Bad Smell.
3. Optionally add a photo and note, then tap Submit.

No app install required. A confirmation screen appears immediately after submitting.

## Dispatcher

1. Log in at `/login` with dispatcher credentials.
2. The operations map shows all waste points, truck positions, and active hotspot pins colour-coded by Priority Score.
3. Click a hotspot pin to open the detail panel — report count, photos, severity, and the routing suggestion card.
4. The suggestion card shows the scenario label, assigned truck, extra minutes, and capacity bar.
5. Tap Approve to assign the task to the driver, or Reject to handle it manually.
6. The KPI strip at the top tracks today's totals: hotspots opened, resolved, average response time.

## Driver

1. Log in at `/login` with driver credentials. The app opens in mobile view.
2. The task list shows all assigned stops with issue type and location.
3. Tap a task to see the map pin, resident photos, and estimated waste weight.
4. After collecting, tap Done. A weight input screen appears pre-filled with the bin category default — adjust if needed and confirm.
5. The dispatcher dashboard updates immediately.
6. If the location is inaccessible, tap Unreachable instead.

## Admin

- Set each truck's maximum capacity at shift start via the Admin page.
- Generate QR codes for new bins by running `python scripts/generate_qr.py` and placing the printed codes on the physical bins.
- Export historical hotspot data (location, severity, response time, weight collected) as CSV from the Dashboard.
