from fastapi import FastAPI, Query # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from fastapi.responses import JSONResponse # type: ignore
import requests
import os

app = FastAPI(title="Disaster Intelligence Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

VISUAL_CROSSING_KEY = os.getenv("VISUAL_CROSSING_API_KEY")
NEWS_API_KEY = os.getenv("NEWS_API_KEY") or "c9b634a256074d70b85fb4dfb6de2840"

# Mock weather data for demonstration if API key is missing
MOCK_WEATHER_DATA = {
    "latitude": 0,
    "longitude": 0,
    "resolvedAddress": "Demo Location",
    "timezone": "UTC",
    "currentConditions": {
        "datetime": "2024-01-30T12:00:00",
        "temp": 28,
        "humidity": 65,
        "windspeed": 15,
        "conditions": "Partly cloudy",
        "icon": "partly-cloudy"
    },
    "days": []
}

# -------------------------------
# WEATHER (Visual Crossing)
# -------------------------------
@app.get("/api/weather")
def get_weather(
    lat: float = Query(...),
    lon: float = Query(...)
):
    # If no API key, return mock data
    if not VISUAL_CROSSING_KEY:
        mock_data = MOCK_WEATHER_DATA.copy()
        mock_data["latitude"] = lat
        mock_data["longitude"] = lon
        return JSONResponse(
            status_code=200,
            content=mock_data,
            headers={"Access-Control-Allow-Origin": "*"}
        )
    
    try:
        url = (
            f"https://weather.visualcrossing.com/"
            f"VisualCrossingWebServices/rest/services/timeline/"
            f"{lat},{lon}"
        )

        params = {
            "unitGroup": "metric",
            "include": "current,days,alerts",
            "key": VISUAL_CROSSING_KEY,
            "contentType": "json"
        }

        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()

        return response.json()
    except requests.exceptions.RequestException as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "message": "Weather API error. Using mock data."},
            headers={"Access-Control-Allow-Origin": "*"}
        )


# -------------------------------
# WEATHER + DISASTER NEWS
# -------------------------------
@app.get("/api/news")
def get_news():
    if not NEWS_API_KEY:
        return JSONResponse(
            status_code=200,
            content={"articles": [], "totalResults": 0, "message": "News API key not configured"},
            headers={"Access-Control-Allow-Origin": "*"}
        )
    
    try:
        url = "https://newsapi.org/v2/everything"

        params = {
            "q": "weather OR disaster OR flood OR cyclone OR earthquake OR landslide",
            "language": "en",
            "sortBy": "publishedAt",
            "pageSize": 10,
            "apiKey": NEWS_API_KEY,
        }

        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()

        return response.json()
    except requests.exceptions.RequestException as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "message": "News API error"},
            headers={"Access-Control-Allow-Origin": "*"}
        )