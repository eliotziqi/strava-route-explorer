# backend/main.py

import os
from urllib.parse import urlencode

import requests
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi import Query
import polyline

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
def get_activities(token: str = None, per_page: int = 30, page: int = 1, all: bool = False):
    """Fetch activities from Strava and return a cleaned list.

    Query params:
    - `token` (required): access token
    - `per_page` (optional): items per page (default 30)
    - `page` (optional): page number (default 1)
    - `all` (optional): if true, fetch all pages (uses per_page=200 internally)
    """
    if not token:
        return JSONResponse(
            status_code=400,
            content={"error": "token query parameter is required"},
        )

    headers = {"Authorization": f"Bearer {token}"}

    def _clean_list(raw_list):
        cleaned = []
        for a in raw_list:
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

    if all:
        # fetch all pages using a large per_page (200) and iterate until no results
        results = []
        cur_page = 1
        while True:
            params = {"per_page": 200, "page": cur_page}
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
            if not raw:
                break

            results.extend(raw)
            cur_page += 1

        return _clean_list(results)

    # single page
    params = {"per_page": per_page, "page": page}
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
    return _clean_list(raw)


@app.get("/activity_lines")
def activity_lines(token: str = None, ids: list[int] = Query(None)):
    """Return decoded polyline coords for requested activities.

    - `token` (query) required.
    - `ids` (query list) optional: if provided, filter to these activity ids.
    The endpoint fetches recent activities (per_page=30), decodes `map.summary_polyline`,
    and returns coords in `[lat, lng]` pairs suitable for mapping libraries.
    """
    if not token:
        return JSONResponse(
            status_code=400,
            content={"error": "token query parameter is required"},
        )

    headers = {"Authorization": f"Bearer {token}"}

    raw = []

    # 如果传了 ids，就翻页拉完整历史活动（per_page=200，直到没有更多数据）
    if ids:
        page = 1
        while True:
            params = {"per_page": 200, "page": page}
            resp = requests.get(
                "https://www.strava.com/api/v3/athlete/activities",
                headers=headers,
                params=params,
            )

            if resp.status_code != 200:
                return JSONResponse(
                    status_code=resp.status_code,
                    content={
                        "error": "failed to fetch activities",
                        "detail": resp.text,
                    },
                )

            page_data = resp.json()
            if not page_data:
                break  # 没数据就结束（不要依赖找齐所有 ids）

            raw.extend(page_data)
            page += 1

    else:
        # 没传 ids，就默认拉最近 30 条
        params = {"per_page": 30}
        resp = requests.get(
            "https://www.strava.com/api/v3/athlete/activities",
            headers=headers,
            params=params,
        )

        if resp.status_code != 200:
            return JSONResponse(
                status_code=resp.status_code,
                content={
                    "error": "failed to fetch activities",
                    "detail": resp.text,
                },
            )

        raw = resp.json()

    # ========= 把 polyline 解出来 =========
    results = []
    found = 0

    for a in raw:
        act_id = a.get("id")

        # 如果传了 ids，只挑用户选中的那些
        if ids and act_id not in ids:
            continue

        mp = a.get("map") or {}
        poly = mp.get("summary_polyline") or mp.get("polyline")

        if not poly:
            continue

        try:
            latlngs = polyline.decode(poly)
            coords = [[lat, lng] for (lat, lng) in latlngs]
            results.append({
                "id": act_id,
                "coords": coords
            })
            found += 1
        except Exception:
            continue

    print("activity_lines debug:")
    print("  requested ids:", len(ids) if ids else 0)
    print("  raw activities scanned:", len(raw))
    print("  lines returned:", len(results))

    return results

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


@app.post("/auth/strava/revoke")
def strava_revoke(token: str = None):
    """Revoke (deauthorize) an access token with Strava.

    Accepts `token` as a query parameter. This calls Strava's deauthorize
    endpoint which revokes the token so future requests with it will fail.
    """
    if not token:
        return JSONResponse(
            status_code=400,
            content={"error": "token query parameter is required"},
        )

    headers = {
        "Authorization": f"Bearer {token}",
    }

    # Strava deauthorize endpoint
    resp = requests.post("https://www.strava.com/oauth/deauthorize", headers=headers)

    if resp.status_code == 200:
        return {"revoked": True}

    return JSONResponse(
        status_code=resp.status_code,
        content={"error": "failed_to_revoke", "detail": resp.text},
    )
