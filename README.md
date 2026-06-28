# WasteHotspot

**Grab the Green Future Hackathon — Team ERAC**

*Fixed route is the baseline. Hotspot response is the intelligence layer.*

---

## Problem Statement

Urban waste collection in Ho Chi Minh City relies on fixed routes and schedules. Trucks follow the same path regardless of whether a bin is empty or overflowing. When a market bin overflows at 9 AM but the scheduled truck isn't due until 3 PM, residents have no fast channel to flag it and dispatchers have no way to know it's happening.

## Solution Overview

WasteHotspot turns citizen QR-scan reports into real-time dispatch intelligence. Residents scan a QR code on any bin to report overflow. The system clusters duplicate reports, computes a Priority Score (0-100) for each problem location, and suggests an optimised truck re-routing to a human dispatcher — who always approves or rejects before any truck moves.

## Features

- QR-scan reporting: residents open a mobile form by scanning the bin, no app install required
- Automatic clustering: multiple reports at the same location within 30 minutes merge into one hotspot
- Priority scoring: 5-factor engine outputs a 0-100 score (severity, report count, location type, truck distance, repeat-offender history)
- Routing suggestions: 9 scenarios (SC-01 to SC-09) covering cheap detours, truck reassignment, capacity warnings, zone-aware dispatch, and manual escalation
- Weight-aware feasibility: every suggestion checks remaining truck capacity before recommending a truck
- Dispatcher dashboard: live map with one-tap Approve / Reject on each suggestion
- Driver mobile view: task card with location, photos, issue type, Done / Unreachable buttons
- Shift KPIs: hotspots opened, resolved, average response time

## Team ERAC

| Member | Role |
|--------|------|
| Member 1 | Routing Engine (H3 spatial lookup, SC-01 to SC-09, weight feasibility) |
| Member A | Backend & Data Pipeline (DB schema, report API, clustering, priority scoring, QR generation) |
| Member B | Dispatcher Experience (live map, capacity UI, suggestion cards, KPI dashboard) |
| Member C | Driver Experience & Integration (driver mobile view, weight input, seed script) |

## Docs

- [Setup & Installation](SETUP.md)
- [Run Instructions](RUNNING.md)
- [Tech Stack & Architecture](TECHSTACK.md)

## AI / Generated Code Disclosure

Parts of this codebase were developed with AI assistance (Claude by Anthropic), including scaffolding of FastAPI route handlers, SQLModel schema definitions, and React component structure. All generated code was reviewed, tested, and modified by team members. The routing scenario logic, priority scoring formula, and clustering algorithm reflect the team's original design.

## Third-Party Attributions

| Library / Service | License |
|-------------------|---------|
| FastAPI | MIT |
| SQLModel | MIT |
| Alembic | MIT |
| React | MIT |
| Leaflet | BSD-2-Clause |
| OpenStreetMap | ODbL |
| OpenRouteService | CC BY 4.0 |
| Uber H3 | Apache-2.0 |
| Tailwind CSS | MIT |
| Supabase | Apache-2.0 |
| qrcode[pil] | MIT |
| python-jose | MIT |

Map data © OpenStreetMap contributors.
