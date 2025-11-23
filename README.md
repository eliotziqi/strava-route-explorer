# Strava Route Explorer (Hackathon)

A small dev demo that lets you authenticate with Strava and explore routes. This repository contains a FastAPI backend and a Vite + React frontend.

**Status:** Development / demo

**Quick overview**
- **Backend:** `backend/main.py` — FastAPI app exposing simple endpoints for Strava OAuth and basic profile access.
- **Frontend:** `frontend/` — Vite + React TypeScript app (development UI).

**Key backend endpoints**
- `GET /health` — simple health check returning `{ "status": "ok" }`.
- `GET /auth/strava/login` — redirect to Strava OAuth page (starts login flow).
 - `GET /auth/strava/callback` — Strava will redirect here; the backend exchanges the code for tokens and redirects to the frontend with `?access_token=...&refresh_token=...&expires_at=...`.
 - `GET /me?token=<access_token>` — proxy that fetches the authenticated athlete profile from Strava using the provided access token (the frontend automatically attaches the active access token when making requests).

Setup & Run (Windows PowerShell)

1) Backend

Open PowerShell and run:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
# install dependencies (if you have a requirements file, use it)
pip install fastapi uvicorn python-dotenv requests
# run development server
uvicorn main:app --reload
```

Create a `.env` file inside the `backend/` folder with at least:

```text
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
# optional, defaults to http://localhost:8000/auth/strava/callback
STRAVA_REDIRECT_URI=http://localhost:8000/auth/strava/callback
# optional frontend URL (used for redirect after auth)
FRONTEND_URL=http://localhost:5173
```

2) Frontend

Open a second terminal and run:

```powershell
cd frontend
npm install
npm run dev
```

The frontend likely runs at `http://localhost:5173` by Vite default.

How the demo works
- Click “Login with Strava” in the frontend. The frontend hits `GET /auth/strava/login` on the backend.
- Backend redirects to Strava's OAuth page. After you authorize, Strava redirects to `/auth/strava/callback` on the backend.
- Backend exchanges the auth code for `access_token`, `refresh_token`, and `expires_at`, then redirects back to the frontend with those values in the query string (for example: `/?access_token=...&refresh_token=...&expires_at=...`).
- The frontend stores the token bundle and attaches the active access token when calling backend endpoints like `/me`.

End-to-end workflow (what you can try now)

- Open the frontend at `http://localhost:5173`.
- Click **Login with Strava**.
- Complete Strava's authorization flow; Strava will redirect back to the frontend.
- Complete Strava's authorization flow; Strava will redirect back to the frontend with `access_token`, `refresh_token`, and `expires_at` in the query string.
- The frontend stores this bundle in `localStorage` under the key `strava_token_bundle` and will refresh the access token automatically when required.
- The frontend automatically calls `GET http://localhost:8000/activities` (the app attaches the active access token to requests) to fetch your recent activities.
- The page renders a simple list of your recent activities (date, type, distance, name).

This is the quick closed loop: open frontend → Login with Strava → authorize → frontend reads token → calls `/activities` → shows your activities.

Notes & Next steps
- Current demo returns the raw Strava access token back to the frontend for simplicity. For a production app you should store tokens server-side and issue your own session cookie or JWT instead of exposing raw tokens to the browser.
- Add unit/integration tests for the OAuth flow and API proxying.
- Add handling for token refresh and better error handling for Strava API failures.

Files of interest
- `backend/main.py` — OAuth and API proxy logic
- `frontend/` — Vite React app and UI