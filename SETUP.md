# Setup & Installation

## Prerequisites

- Python >= 3.11
- Node.js >= 18
- A free [Supabase](https://supabase.com) project
- A free [OpenRouteService](https://openrouteservice.org/dev/#/signup) API key

## Steps

### 1. Clone the repository

```bash
git clone <repo-url>
cd grabthefuture_teamN
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in:

| Variable | Where to get it |
|----------|----------------|
| `SUPABASE_URL` | Supabase dashboard > Project Settings > API |
| `SUPABASE_KEY` | Supabase dashboard > Project Settings > API (service role key) |
| `DATABASE_URL` | Supabase dashboard > Project Settings > Database > Connection string |
| `ORS_API_KEY` | openrouteservice.org > Developer > Tokens |
| `JWT_SECRET` | Any long random string |

### 3. Install backend dependencies

```bash
cd backend
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Install frontend dependencies

```bash
cd frontend
npm install
```

### 5. Run database migrations

```bash
cd backend
alembic upgrade head
```

### 6. Seed demo data

```bash
python scripts/seed.py
```

Seeds 25 waste points, 2 fixed routes, 2 trucks, and a demo hotspot scenario.
