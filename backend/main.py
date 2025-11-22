# backend/main.py

import os
from urllib.parse import urlencode

import requests
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse

# ============ 读取 .env ============

# 会自动去当前目录的 .env 里读配置
load_dotenv()

# 必填：在 backend/.env 里配置这两个
CLIENT_ID = os.getenv("STRAVA_CLIENT_ID")
CLIENT_SECRET = os.getenv("STRAVA_CLIENT_SECRET")

# 本地开发用的回调地址（要和你代码里传给 Strava 的完全一致）
REDIRECT_URI = os.getenv(
    "STRAVA_REDIRECT_URI",
    "http://localhost:8000/auth/strava/callback",
)

# 前端地址（Vite 默认是 5173）
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize"
STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token"

# ============ FastAPI app ============

app = FastAPI(title="Route Explorer (Hackathon)")

# 跨域：允许前端访问后端
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/me")
def get_profile(token: str):
    headers = {
        "Authorization": f"Bearer {token}"
    }

    resp = requests.get("https://www.strava.com/api/v3/athlete", headers=headers)

    if resp.status_code != 200:
        return JSONResponse(
            status_code=resp.status_code,
            content={"error": "failed to fetch profile", "detail": resp.text}
        )

    return resp.json()


@app.get("/activities")
def get_activities(token: str = None):
    """Fetch recent activities from Strava and return a cleaned list.

    Accepts `token` as a query parameter. If not provided, returns 400.
    """
    if not token:
        return JSONResponse(
            status_code=400,
            content={"error": "token query parameter is required"},
        )

    headers = {"Authorization": f"Bearer {token}"}
    params = {"per_page": 30}

    resp = requests.get(
        "https://www.strava.com/api/v3/athlete/activities",
        headers=headers,
        params=params,
    )

    if resp.status_code != 200:
        return JSONResponse(
            status_code=resp.status_code,
            content={"error": "failed to fetch activities", "detail": resp.text},
        )

    raw = resp.json()

    # Normalize / clean fields for the frontend
    cleaned = []
    for a in raw:
        cleaned.append(
            {
                "id": a.get("id"),
                "name": a.get("name"),
                "type": a.get("type"),
                "distance": a.get("distance"),
                "moving_time": a.get("moving_time"),
                "start_date": a.get("start_date"),
            }
        )

    return cleaned

# 1️⃣ 前端点“Login with Strava”会访问这里
@app.get("/auth/strava/login")
def strava_login():
    if not CLIENT_ID or not CLIENT_SECRET:
        # 如果 .env 没配置好，直接报错提示
        return JSONResponse(
            status_code=500,
            content={"error": "STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET not set"},
        )

    params = {
        "client_id": CLIENT_ID,
        "response_type": "code",
        "redirect_uri": REDIRECT_URI,
        # scope 先用基础的，activity:read_all 为了后面拉活动数据
        "scope": "read,activity:read_all",
        "approval_prompt": "auto",
    }

    url = f"{STRAVA_AUTH_URL}?{urlencode(params)}"
    return RedirectResponse(url)


# 2️⃣ 用户在 Strava 授权后，会被跳回这个地址
@app.get("/auth/strava/callback")
def strava_callback(code: str):
    # 用 code 换取 access_token
    data = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
    }

    resp = requests.post(STRAVA_TOKEN_URL, data=data)
    if resp.status_code != 200:
        return JSONResponse(
            status_code=resp.status_code,
            content={
                "error": "failed_to_exchange_token",
                "detail": resp.text,
            },
        )

    token_data = resp.json()
    access_token = token_data.get("access_token")
    athlete = token_data.get("athlete")

    # 为了 demo 简单：把 access_token 带回前端
    # 真正产品应该存数据库或签个自己的 JWT
    redirect_url = f"{FRONTEND_URL}/?token={access_token}"

    # 也可以顺便带上 athlete id：
    # redirect_url += f"&athlete_id={athlete.get('id')}"

    return RedirectResponse(redirect_url)
