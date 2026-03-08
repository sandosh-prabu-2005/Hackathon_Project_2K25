"""FastAPI Application Entry Point"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import requests
from pathlib import Path
from dotenv import load_dotenv

from .routes import intensity, track
from fastapi import HTTPException

# Load environment variables from a single shared file: Backend/.env
ENV_FILE = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(ENV_FILE)

# Initialize FastAPI app
app = FastAPI(
    title="Cyclone Prediction API",
    description="API for cyclone intensity and track prediction",
    version="1.0.0"
)

# Configure CORS - Allow all localhost origins for development
# Default origins list
default_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

# Get from environment or use defaults
cors_origins_env = os.getenv("CORS_ORIGINS", "")
if cors_origins_env:
    # Try to parse as JSON first, then fall back to comma-separated
    try:
        import json
        origins = json.loads(cors_origins_env)
    except:
        # If not JSON, split by comma
        origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
else:
    origins = default_origins

print(f"CORS: Allowing origins: {origins}")

# For development: allow all origins (use specific origins in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=False,  # Must be False when using "*"
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(intensity.router)
app.include_router(track.router)

# Crowd reports router: prefer local app.routes, fallback to Backend.app.routes
try:
    from .routes import crowd_reports as crowd_reports_router  # type: ignore
    app.include_router(crowd_reports_router.router)
except Exception:
    try:
        from Backend.app.routes import crowd_reports as crowd_reports_router  # type: ignore
        app.include_router(crowd_reports_router.router)
    except Exception as crowd_exc:
        print(f"[WARNING] Crowd reports routes not loaded: {crowd_exc}")

VISUAL_CROSSING_KEY = os.getenv("VISUAL_CROSSING_API_KEY")
NEWS_API_KEY = os.getenv("NEWS_API_KEY")


@app.get("/api/weather")
async def get_weather(lat: float, lon: float):
    if not VISUAL_CROSSING_KEY:
        return JSONResponse(
            status_code=200,
            content={
                "latitude": lat,
                "longitude": lon,
                "resolvedAddress": "Local Mock Weather",
                "timezone": "UTC",
                "currentConditions": {
                    "temp": 28,
                    "humidity": 65,
                    "windspeed": 12,
                    "conditions": "Partly cloudy",
                    "icon": "partly-cloudy",
                },
                "days": [],
            },
        )

    try:
        response = requests.get(
            "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/"
            f"{lat},{lon}",
            params={
                "unitGroup": "metric",
                "include": "current,days,alerts",
                "key": VISUAL_CROSSING_KEY,
                "contentType": "json",
            },
            timeout=10,
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as exc:
        return JSONResponse(status_code=500, content={"error": str(exc), "message": "Weather API error"})


@app.get("/api/news")
async def get_news():
    if not NEWS_API_KEY:
        return JSONResponse(
            status_code=200,
            content={"articles": [], "totalResults": 0, "message": "NEWS_API_KEY not configured"},
        )

    try:
        response = requests.get(
            "https://newsapi.org/v2/everything",
            params={
                "q": "disaster OR flood OR cyclone OR earthquake OR landslide OR weather alert",
                "language": "en",
                "sortBy": "publishedAt",
                "pageSize": 10,
                "apiKey": NEWS_API_KEY,
            },
            timeout=10,
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as exc:
        return JSONResponse(status_code=500, content={"error": str(exc), "message": "News API error"})


@app.get("/api/reverse-geocode")
async def reverse_geocode(lat: float, lon: float):
    errors = []
    headers = {
        "Accept": "application/json",
        "User-Agent": "aws-ai-for-bharat/1.0 (local-dev)",
    }

    # Provider 1: OpenStreetMap Nominatim
    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={"format": "jsonv2", "lat": lat, "lon": lon, "addressdetails": 1},
            headers=headers,
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        address = data.get("address", {})
        display_name = data.get("display_name", "").strip()
        short_name = (
            address.get("suburb")
            or address.get("city")
            or address.get("town")
            or address.get("village")
            or address.get("county")
            or display_name
            or f"{lat:.5f}, {lon:.5f}"
        )
        if display_name:
            return {"display_name": display_name, "name": short_name, "address": address, "provider": "nominatim"}
    except requests.exceptions.RequestException as exc:
        errors.append(f"nominatim: {exc}")

    # Provider 2: BigDataCloud (no API key required for basic use)
    try:
        response = requests.get(
            "https://api.bigdatacloud.net/data/reverse-geocode-client",
            params={"latitude": lat, "longitude": lon, "localityLanguage": "en"},
            headers=headers,
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        locality = data.get("locality", "")
        city = data.get("city", "")
        principal = data.get("principalSubdivision", "")
        country = data.get("countryName", "")
        display_parts = [part for part in [locality or city, principal, country] if part]
        display_name = ", ".join(display_parts).strip()
        if display_name:
            return {
                "display_name": display_name,
                "name": locality or city or principal or country,
                "address": {
                    "city": city,
                    "town": locality,
                    "state": principal,
                    "country": country,
                },
                "provider": "bigdatacloud",
            }
    except requests.exceptions.RequestException as exc:
        errors.append(f"bigdatacloud: {exc}")

    # Final fallback: coordinates only
    coord_text = f"{lat:.5f}, {lon:.5f}"
    return JSONResponse(
        status_code=200,
        content={"display_name": coord_text, "name": coord_text, "address": {}, "error": "; ".join(errors)},
    )


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Cyclone Prediction API",
        "endpoints": {
            "intensity": "/api/intensity/predict",
            "track": "/api/track/predict",
            "docs": "/docs"
        }
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok", "service": "cyclone-prediction-api"}


# Prefer unified backend when available (flood + earthquake + cyclone + crowd routes).
try:
    from merged_app import app as unified_app  # type: ignore

    app = unified_app
    print("[INFO] app.main is using unified merged_app instance")
except Exception as merged_exc:
    print(f"[WARNING] merged_app not active in app.main: {merged_exc}")




if __name__ == "__main__":
    import uvicorn
    host = os.getenv("API_HOST", "127.0.0.1")
    port = int(os.getenv("API_PORT", "8080"))
    uvicorn.run(app, host=host, port=port)
