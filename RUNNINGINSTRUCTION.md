# Run Instructions

## Run Locally

### Backend

```bash
cd backend
source .venv/bin/activate    # Windows: .venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

API running at http://localhost:8000  
Swagger docs at http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm run dev
```

App running at http://localhost:5173

---

## Run in the Cloud

| Service | What it hosts | How |
|---------|--------------|-----|
| Vercel | React frontend | Connect GitHub repo; set `VITE_API_BASE_URL` to your backend URL |
| Render / Railway | FastAPI backend | Start command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Supabase | PostgreSQL + storage | Already hosted; no extra deploy step |

Copy all variables from `.env.example` into your hosting dashboard's environment settings.
