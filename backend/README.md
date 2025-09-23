# Sleep Backend (Vercel Functions)

## Env variables (Project Settings → Environment Variables)
- `SUPABASE_URL` — e.g. https://xxxx.supabase.co
- `SUPABASE_ANON_KEY` — anon public key
- `ALLOW_ORIGIN` — (optional) e.g. https://your-frontend.vercel.app

## Route
- `POST /api/ingest`  
  Body:
  ```json
  {"mode":"csv","text":"start_time,end_time\n2025-09-01 23:00,2025-09-02 07:00"}
