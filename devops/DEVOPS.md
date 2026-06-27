# DevOps Engineer — Infrastructure, Docker & Deployment

**Role:** DevOps Engineer  
**Scope:** Docker Compose · Nginx reverse proxy · environment wiring · deploy scripts · local dev setup  
**Stack:** Docker · Docker Compose · Nginx · PostgreSQL 15 + PostGIS · bash

---

## Your Files

```
devops/
├── docker/
│   ├── Dockerfile.backend        ← Python / FastAPI image
│   └── Dockerfile.frontend       ← React / Vite build + static serve
├── nginx/
│   └── nginx.conf                ← reverse proxy config
├── scripts/
│   ├── init_db.sh                ← run migrations + seed on first start
│   └── start.sh                  ← convenience wrapper for docker compose up
└── DEVOPS.md                     ← this file

# Root-level files you own:
docker-compose.yml                ← top-level, lives at repo root
.env.docker                       ← docker-specific env vars (not committed)
```

---

## What You Are Building

### 1. `docker-compose.yml` — All Services

Define four services that together make the full app:

```yaml
version: "3.9"

services:

  postgres:
    image: postgis/postgis:15-3.4
    environment:
      POSTGRES_DB:       wasteflow
      POSTGRES_USER:     wasteflow
      POSTGRES_PASSWORD: wasteflow
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/src/db/001_init.sql:/docker-entrypoint-initdb.d/001_init.sql
      - ./backend/src/db/seed.sql:/docker-entrypoint-initdb.d/002_seed.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U wasteflow"]
      interval: 5s
      timeout: 5s
      retries: 10

  backend:
    build:
      context: ./backend
      dockerfile: ../devops/docker/Dockerfile.backend
    environment:
      DATABASE_URL: postgresql://wasteflow:wasteflow@postgres:5432/wasteflow
      JWT_SECRET:   ${JWT_SECRET}
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "4000:4000"
    volumes:
      - ./backend:/app          # live reload in dev
    command: uvicorn src.main:app --host 0.0.0.0 --port 4000 --reload

  frontend:
    build:
      context: ./frontend
      dockerfile: ../devops/docker/Dockerfile.frontend
    environment:
      VITE_API_URL: http://localhost/api/v1
    depends_on:
      - backend
    ports:
      - "3000:3000"

  nginx:
    image: nginx:1.25-alpine
    ports:
      - "80:80"
    volumes:
      - ./devops/nginx/nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - backend
      - frontend

volumes:
  postgres_data:
```

**Key decisions:**
- `postgis/postgis:15-3.4` — official image that includes the PostGIS extension pre-installed, so no manual `CREATE EXTENSION` needed at runtime (it's in `001_init.sql` anyway as a safety net)
- SQL files mounted into `/docker-entrypoint-initdb.d/` — Postgres runs them in alphabetical order on first startup (only when `postgres_data` volume is empty)
- Backend uses `--reload` in dev so code changes are picked up without rebuilding

---

### 2. `devops/docker/Dockerfile.backend`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies needed by asyncpg
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 4000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "4000"]
```

---

### 3. `devops/docker/Dockerfile.frontend`

For the prototype, serve Vite's dev server directly (faster iteration):

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
```

> **Note:** For a production build you would instead run `npm run build` and serve `dist/` via Nginx. For the 24-hour prototype, the dev server is fine.

---

### 4. `devops/nginx/nginx.conf` — Reverse Proxy

Nginx sits in front of both services and routes by path prefix:

```nginx
server {
    listen 80;

    # API requests → backend (FastAPI)
    location /api/ {
        proxy_pass         http://backend:4000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Health check passthrough
    location /health {
        proxy_pass http://backend:4000;
    }

    # Everything else → frontend (React)
    location / {
        proxy_pass         http://frontend:3000;
        proxy_set_header   Host $host;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";  # needed for Vite HMR WebSocket
    }
}
```

This means the entire app is accessible on `http://localhost` (port 80):
- `http://localhost/` → React app
- `http://localhost/api/v1/...` → FastAPI
- `http://localhost/docs` → FastAPI Swagger UI (via proxy)

---

### 5. `devops/scripts/init_db.sh` — DB Initialization Helper

Useful if the team needs to reset and reseed the database manually:

```bash
#!/bin/bash
set -e

echo "Dropping and recreating wasteflow database..."
docker compose exec postgres psql -U wasteflow -c "DROP DATABASE IF EXISTS wasteflow;"
docker compose exec postgres psql -U wasteflow -c "CREATE DATABASE wasteflow;"
docker compose exec postgres psql -U wasteflow -d wasteflow -f /docker-entrypoint-initdb.d/001_init.sql
docker compose exec postgres psql -U wasteflow -d wasteflow -f /docker-entrypoint-initdb.d/002_seed.sql
echo "Database reset complete."
```

---

### 6. `devops/scripts/start.sh` — Dev Start Wrapper

```bash
#!/bin/bash
set -e

if [ ! -f .env.docker ]; then
  echo "Missing .env.docker — copy .env.docker.example and fill in JWT_SECRET"
  exit 1
fi

docker compose --env-file .env.docker up --build "$@"
```

Usage:
```bash
bash devops/scripts/start.sh          # foreground
bash devops/scripts/start.sh -d       # detached (background)
```

---

## Environment File (`.env.docker`)

Create this at the repo root (not committed — add to `.gitignore`):

```env
JWT_SECRET=change_me_for_demo
```

All other env vars are hardcoded in `docker-compose.yml` for simplicity during the prototype.

---

## Full Start-to-Demo Workflow

```bash
# 1. Clone and enter repo
cd grabthefuture_teamN

# 2. Create env file
echo "JWT_SECRET=wasteflow_demo_2026" > .env.docker

# 3. Start everything (first run builds images + inits DB)
bash devops/scripts/start.sh

# 4. Verify services are up
curl http://localhost/health           # → {"status": "ok"}
curl http://localhost/api/v1/health    # → {"status": "ok"}

# 5. Open the app
# Citizen report form  → http://localhost/report
# Crew app             → http://localhost/crew
# Manager dashboard    → http://localhost/dashboard
# API docs             → http://localhost/docs
```

---

## Common Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `postgres` container exits immediately | Volume already exists with old schema | `docker compose down -v` then restart |
| Backend can't connect to DB | Postgres not healthy yet | Check `depends_on` condition; add retry logic |
| Nginx 502 Bad Gateway | Backend or frontend not up yet | Wait 10s then refresh; check `docker compose logs backend` |
| Vite HMR not working | Missing Upgrade header in Nginx | Already handled in `nginx.conf` above |
| `PostGIS extension not found` | Wrong Postgres image | Must use `postgis/postgis`, not plain `postgres` |

---

## What You Do NOT Own

- Application code in `backend/` or `frontend/` — that belongs to the dev team
- The `.env.example` files inside `backend/` and `frontend/` — owned by BE/FE devs
- Database schema SQL — owned by BE Dev 2 (you just mount and run it)

---

## Progress Tracker

| Task | Status | Notes |
|------|--------|-------|
| `docker-compose.yml` — all 4 services | 🔲 Not started | |
| `Dockerfile.backend` | 🔲 Not started | |
| `Dockerfile.frontend` | 🔲 Not started | |
| `nginx/nginx.conf` — proxy config | 🔲 Not started | |
| `scripts/start.sh` | 🔲 Not started | |
| `scripts/init_db.sh` | 🔲 Not started | |
| `.env.docker.example` | 🔲 Not started | |
| Add `.env.docker` to `.gitignore` | 🔲 Not started | |
| Verify `postgres` starts with PostGIS | 🔲 Not started | |
| Verify `001_init.sql` runs on first boot | 🔲 Not started | Needs BE Dev 2's SQL file |
| Verify `002_seed.sql` runs on first boot | 🔲 Not started | Needs BE Dev 2's seed file |
| End-to-end smoke test: submit report → visible on dashboard | 🔲 Not started | Needs both BE devs + FE dev done |
| Demo URL confirmed working on `http://localhost` | 🔲 Not started | |

Legend: ✅ Done · 🔄 In progress · 🔲 Not started · ⏸ Blocked
