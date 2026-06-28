# Ho Ho Gia Bao— Driver Experience & Integration

**Owner:** TBD
**Branch:** `feature/driver-and-integration`

---

## Skill Overview

Member C owns the driver-facing mobile web view, the weight input flow after task completion, the re-optimisation trigger hook, JWT auth for both dispatcher and driver, and the demo seed script. Member C is also the integration glue — their trigger fires whenever weight thresholds are crossed, calling the routing engine so the dispatcher always sees up-to-date suggestions.

---

## Responsibilities

| Feature | Req IDs | Description |
|---------|---------|-------------|
| Driver Mobile View | F-DRIVER-01 / F-DRIVER-02 / F-DRIVER-03 | Token-authenticated mobile web; task card, map pin, Done / Unreachable; `PATCH /api/tasks/:id` |
| Weight Input Flow | F-WEIGHT-03 | Post-Done confirmation screen pre-filled with category default; override; increment `current_load_kg` |
| Re-optimisation Trigger | F-ROUTE-04 | Watch hotspot score ≥ 70, task Done, capacity threshold crossings; call routing engine; push updated suggestions via polling |
| Auth | NFR-07 / NFR-08 | JWT login for dispatcher and driver; token stored in `localStorage`; sent in `Authorization: Bearer` header |
| Demo Seed Script | — | 25 waste points, 2 routes, 2 trucks, scripted hotspot + weight scenario |

---

## Files Owned

```
frontend/src/pages/DriverPage.jsx            ← driver mobile view
frontend/src/pages/LoginPage.jsx             ← dispatcher + driver login
frontend/src/components/TaskCard.jsx         ← task details: location, type, photos, weight
frontend/src/components/WeightInput.jsx      ← post-Done weight confirmation
frontend/src/api/driver.js                   ← fetch wrappers for driver endpoints
backend/app/routes/tasks.py                  ← GET/PATCH /api/tasks (stub)
backend/app/routes/trucks.py                 ← PATCH /api/trucks/:id/load (stub)
backend/app/routes/auth.py                   ← POST /api/auth/login (stub)
backend/app/dependencies/auth.py             ← JWT auth dependency (done)
backend/scripts/seed.py                      ← demo seed (scaffolded)
```

---

## Driver Flow (step by step)

```
1. Driver opens DriverPage (mobile browser)
2. Logs in → receives JWT → stored in localStorage
3. Polls GET /api/tasks/:truckId every 30 s → shows assigned tasks
4. Taps task → sees map pin, issue type, photos, estimated weight
5. Arrives at bin → taps [Done]
6. WeightInput screen appears, pre-filled with bin category default
7. Driver adjusts weight if needed → taps [Confirm]
8. PATCH /api/tasks/:id  { status: 'done', weight_collected_kg: X }
9. Server increments truck.current_load_kg
10. If capacity_pct crosses 70% or 90% → re-optimisation trigger fires
11. Dispatcher dashboard updates within next 10 s poll
```

---

## Re-optimisation Trigger Logic

The trigger runs after any of these events:
- `PATCH /api/tasks/:id` with `status: 'done'` (task completed)
- `PATCH /api/trucks/:id/load` pushes `capacity_pct` past 70% or 90%
- (Member A side) New hotspot reaches `priority_score ≥ 70`

**Implementation:** call `run_routing_engine()` from `services/routing.py` (Member 1's service) after the relevant DB update. Store results in a lightweight `suggestions` table (or in-memory list for MVP). Dispatcher polls `/api/routing/suggest` every 10 s.

---

## API Endpoints Owned / Wired

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Return JWT given username + password |
| GET | `/api/tasks/:truckId` | Return assigned tasks for a truck |
| PATCH | `/api/tasks/:id` | Mark Done / Unreachable; trigger weight update + re-optimisation |
| PATCH | `/api/trucks/:id/load` | Increment `current_load_kg`; update truck status |

---

## Demo Seed Scenario

The seed script (`scripts/seed.py`) sets up a full end-to-end demo flow:

| Step | What happens |
|------|-------------|
| 1 | 25 waste points loaded with categories and H3 cells |
| 2 | 2 trucks at known positions, 0 kg loaded |
| 3 | Bến Thành Market Bin A has 3 overflow reports → hotspot score 85 |
| 4 | Routing engine runs → SC-02 suggestion: Truck Alpha, +8 min detour |
| 5 | Demo presenter approves → task assigned to Truck Alpha |
| 6 | Driver marks Done → enters 150 kg → truck load becomes 150 kg |
| 7 | Dashboard updates: green capacity bar, hotspot resolved |

---

## Progress Tracker

| Task | Status | Notes |
|------|--------|-------|
| `POST /api/auth/login` — bcrypt + JWT | ✅ Done | bcrypt + pyjwt; returns token/role/truck_id for driver+dispatcher+admin |
| JWT auth dependency (token verify) | ✅ Done | `dependencies/auth.py`: `require_roles()`, gated by `AUTH_REQUIRED` |
| `GET /api/tasks/:truckId` | ⬜ Not started | |
| `PATCH /api/tasks/:id` — status update | ⬜ Not started | |
| Weight increment on Done | ⬜ Not started | Call `PATCH /api/trucks/:id/load` |
| Re-optimisation trigger after task Done | ⬜ Not started | Call `run_routing_engine()` |
| Re-optimisation trigger on capacity threshold | ⬜ Not started | |
| `LoginPage.jsx` (dispatcher + driver + admin) | ✅ Done | Role-based redirect; RequireAuth guard in App.jsx |
| `DriverPage.jsx` — task list | ⬜ Not started | Mobile layout target |
| `TaskCard.jsx` — map pin, issue type, photos, weight | ⬜ Not started | |
| `WeightInput.jsx` — pre-filled, overrideable | ⬜ Not started | |
| Driver truck capacity display (top of view) | ✅ Done | F-DRIVER-03; header capacity bar |
| Shift tab — real metrics | ✅ Done | `/api/tasks/driver/{id}/shift` (stops, weight, time, avg) |
| Driver/Resident UI redesign — minimal, large tap targets | ✅ Done | Clean task list, big Done/weight buttons, photo display |
| Wire Done → weight confirm → PATCH task | ⬜ Not started | |
| Wire Unreachable → PATCH task | ⬜ Not started | |
| Seed script — 25 waste points | ✅ Scaffolded | Needs `alembic upgrade head` first |
| Seed script — 2 trucks | ✅ Scaffolded | |
| Seed script — demo hotspot (score 85) | ✅ Scaffolded | |
| Seed script — demo users with bcrypt | ⬜ Not started | Replace placeholder hash |
| End-to-end test: login → task → Done → dashboard updates | ⬜ Not started | |
| Mobile layout test (Chrome mobile / iOS Safari) | ⬜ Not started | NFR-10 |

**Legend:** ✅ Done / 🔄 In progress / ⬜ Not started / ❌ Blocked

---

## Integration Points

- **Member A:** depends on `waste_points` and `trucks` being seeded before seed script runs.
- **Member 1 (Routing):** calls `run_routing_engine()` after task completion or threshold crossing; must import from `services/routing.py`.
- **Member B:** capacity bar updates triggered by Member C's weight flow; B polls, C pushes the DB change.

---

## Key Decisions

- **Mobile web, not native app** — driver view is a React route at `/driver`, responsive via Tailwind. No React Native, no PWA install required for MVP.
- **Token in `localStorage`** — simple for hackathon; not production-grade but acceptable for demo scope.
- **Polling every 30 s for driver task list** — slower than dashboard (10 s) since task assignment is less frequent.
- **Bcrypt for passwords** — never store plaintext. Hash via `passlib[bcrypt]`. Seed script uses a placeholder hash; replace with real hash before demo.
- **Seed script is idempotent** — checks for existing rows (SQLModel `select` + insert-if-absent) so it can be re-run safely.
