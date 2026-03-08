import io
import os
import json
import logging
from pathlib import Path
from typing import List, Optional

# Silence oneDNN info logs (optional performance tradeoff)
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")

import numpy as np # type: ignore
import h5py # type: ignore
import pandas as pd
import tensorflow as tf # type: ignore
from fastapi import FastAPI, UploadFile, File, HTTPException # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse # type: ignore
from fastapi.staticfiles import StaticFiles # type: ignore
from pydantic import BaseModel # type: ignore
from PIL import Image # type: ignore
import xgboost as xgb # type: ignore
import base64
from threading import Thread
import uvicorn # type: ignore
import requests
from typing import Any, Optional
from importlib import import_module

try:
    from dotenv import load_dotenv # type: ignore
except ImportError:
    def load_dotenv(path=None):
        pass

try:
    from scraper import RiverDataScraper
    from model_inference import FloodPredictor
    from utils import WeatherAPI # type: ignore
    FLOOD_MODULES_AVAILABLE = True
except ImportError:
    FLOOD_MODULES_AVAILABLE = False
    RiverDataScraper = None
    FloodPredictor = None
    WeatherAPI = None

def _import_first(module_names: List[str]) -> Optional[Any]:
    for name in module_names:
        try:
            return import_module(name)
        except Exception:
            continue
    return None


intensity = _import_first(["app.routes.intensity", "Backend.app.routes.intensity", "Backend.Backend.app.routes.intensity"])
track = _import_first(["app.routes.track", "Backend.app.routes.track", "Backend.Backend.app.routes.track"])
crowd_reports = _import_first(["app.routes.crowd_reports", "Backend.app.routes.crowd_reports", "Backend.Backend.app.routes.crowd_reports"])

CYCLONE_ROUTES_AVAILABLE = intensity is not None and track is not None
CROWD_ROUTES_AVAILABLE = crowd_reports is not None

IMG_H, IMG_W = 128, 128
THRESHOLD = 0.5
MODEL_PATH_LANDSLIDE = "best_resnet18_seg.keras"
MODEL_PATH_EARTHQUAKE = "xgb_model.json"
ROOT_DIR = Path(__file__).parent

# Load environment variables
load_dotenv(ROOT_DIR / '.env')

# Configure logging
class EmojiLogFormatter(logging.Formatter):
    LEVEL_EMOJIS = {
        logging.DEBUG: "🐞",
        logging.INFO: "✅",
        logging.WARNING: "⚠️",
        logging.ERROR: "❌",
        logging.CRITICAL: "🔥",
    }

    def format(self, record):
        emoji = self.LEVEL_EMOJIS.get(record.levelno, "📝")
        original_levelname = record.levelname
        record.levelname = f"{emoji} {original_levelname}"
        try:
            return super().format(record)
        finally:
            record.levelname = original_levelname


_handler = logging.StreamHandler()
_handler.setFormatter(
    EmojiLogFormatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
)
logging.basicConfig(level=logging.INFO, handlers=[_handler])
logger = logging.getLogger(__name__)

# Custom JSON Encoder for handling NaN values
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, float) and (np.isnan(o) or np.isinf(o) or np.isneginf(o)):
            return None
        return super().default(o)

# Load models
try:
    model_landslide = tf.keras.models.load_model(MODEL_PATH_LANDSLIDE, compile=False) # type: ignore
    logger.info("Landslide model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load landslide model: {e}")
    model_landslide = None

try:
    model_earthquake = xgb.XGBClassifier()
    model_earthquake.load_model(MODEL_PATH_EARTHQUAKE)
    logger.info("Earthquake model loaded successfully")
except KeyboardInterrupt:
    logger.warning("Earthquake model loading interrupted")
    model_earthquake = None
except Exception as e:
    logger.error(f"Failed to load earthquake model: {e}")
    model_earthquake = None

# Initialize flood components if available
flood_scraper = None
flood_predictor = None
weather_api = None
stations_df = None

if FLOOD_MODULES_AVAILABLE:
    try:
        flood_scraper = RiverDataScraper() # type: ignore
        flood_predictor = FloodPredictor() # type: ignore
        weather_api = WeatherAPI() # type: ignore
        logger.info("Flood modules initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize flood modules: {e}")
        FLOOD_MODULES_AVAILABLE = False

    # Load stations data
    STATIONS_FILE = ROOT_DIR / "stations.xlsx"
    try:
        stations_df = pd.read_excel(STATIONS_FILE)
        # Clean NaN values in string columns
        stations_df['Basin Name'] = stations_df['Basin Name'].fillna('')
        stations_df['River Name'] = stations_df['River Name'].fillna('')
        logger.info(f"Loaded {len(stations_df)} stations from {STATIONS_FILE}")
    except Exception as e:
        logger.warning(f"Failed to load stations data: {e}")

    # Load flood model
    try:
        if flood_predictor:
            flood_predictor.load_model()
            logger.info("Flood prediction model loaded successfully")
    except Exception as e:
        logger.warning(f"Failed to load flood prediction model: {e}")

# Binary Risk mapping (OPTION 2)
risk_map = {
    0: "Low Risk",
    1: "Elevated Risk"
}

# -------------------------------
# Weather + News API keys (merged from weather.py)
# -------------------------------
VISUAL_CROSSING_KEY = os.getenv("VISUAL_CROSSING_API_KEY")
NEWS_API_KEY = os.getenv("NEWS_API_KEY") or "c9b634a256074d70b85fb4dfb6de2840"
CHATBOT_API_URL = os.getenv(
    "CHATBOT_API_URL",
    "https://qhat4z6lfd.execute-api.us-east-1.amazonaws.com/default/chat",
)
CHATBOT_API_TIMEOUT = float(os.getenv("CHATBOT_API_TIMEOUT", "20"))

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
def build_6ch_features(data):
    data = np.array(data, dtype=np.float32)
    data[np.isnan(data)] = 0.000001

    # Support inputs with fewer channels (e.g., RGB only)
    h, w, c = data.shape

    # Choose safe channel indices
    idx_b = 1 if c > 1 else 0
    idx_g = 2 if c > 2 else 0
    idx_r = 3 if c > 3 else 0
    idx_nir = 7 if c > 7 else None
    idx_slope = 12 if c > 12 else None
    idx_elev = 13 if c > 13 else None

    mid_rgb = data[:, :, [idx_b, idx_g, idx_r]].max() / 2.0

    data_red = data[:, :, idx_r]
    if idx_nir is not None:
        data_nir = data[:, :, idx_nir]
        data_ndvi = np.divide(data_nir - data_red, np.add(data_nir, data_red) + 1e-6)
    else:
        data_ndvi = np.zeros((h, w), dtype=np.float32)

    x = np.zeros((IMG_H, IMG_W, 6), dtype=np.float32)
    x[:, :, 0] = 1 - data[:, :, idx_r] / (mid_rgb + 1e-6)  # RED
    x[:, :, 1] = 1 - data[:, :, idx_g] / (mid_rgb + 1e-6)  # GREEN
    x[:, :, 2] = 1 - data[:, :, idx_b] / (mid_rgb + 1e-6)  # BLUE
    x[:, :, 3] = data_ndvi                                  # NDVI

    if idx_slope is not None:
        mid_slope = data[:, :, idx_slope].max() / 2.0
        x[:, :, 4] = 1 - data[:, :, idx_slope] / (mid_slope + 1e-6)  # SLOPE
    else:
        x[:, :, 4] = 0.0

    if idx_elev is not None:
        mid_elev = data[:, :, idx_elev].max() / 2.0
        x[:, :, 5] = 1 - data[:, :, idx_elev] / (mid_elev + 1e-6)     # ELEVATION
    else:
        x[:, :, 5] = 0.0

    x[np.isnan(x)] = 0.000001
    return x

def mask_to_png_bytes(mask_bin_01: np.ndarray) -> bytes:
    """mask_bin_01: (H,W) with 0/1"""
    img = Image.fromarray((mask_bin_01.astype(np.uint8) * 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

def rgb_to_png_bytes(rgb01: np.ndarray) -> bytes:
    """rgb01: (H,W,3) float in [0,1]"""
    arr = np.clip(rgb01 * 255.0, 0, 255).astype(np.uint8)
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

def overlay_to_png_bytes(rgb01: np.ndarray, mask_bin_01: np.ndarray, alpha=0.5) -> bytes:
    """
    Overlay mask on RGB: landslide pixels highlighted in red.
    """
    rgb = np.clip(rgb01, 0, 1).copy()
    mask = mask_bin_01.astype(bool)

    # red highlight
    overlay = rgb.copy()
    overlay[mask, 0] = 1.0  # R
    overlay[mask, 1] = 0.0  # G
    overlay[mask, 2] = 0.0  # B

    mixed = (1 - alpha) * rgb + alpha * overlay
    return rgb_to_png_bytes(mixed)

# ============================================================================
# PYDANTIC MODELS FOR FLOOD PREDICTION API
# ============================================================================

class StationInfo(BaseModel):
    station_name: str
    state: str
    district: str
    basin: str
    river: str
    latitude: float
    longitude: float
    type: str

class PredictionRequest(BaseModel):
    state: str
    district: str
    basin: str
    river: str
    station_name: Optional[str] = None

class PredictionResponse(BaseModel):
    prediction: str
    probability: float
    confidence: float
    status: str
    current_water_level: float
    warning_level: float
    danger_level: float
    rainfall_data: List[float]
    water_levels: List[float]
    station_info: dict

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str

# ============================================================================
# FASTAPI APP WITH COMBINED ROUTES
# ============================================================================

# FastAPI app
app = FastAPI(title="Disaster Prediction API", json_encoder=CustomJSONEncoder)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Disabled static files mount - causing issues
# app.mount("/static", StaticFiles(directory="."), name="static")

# Include cyclone routers if available (guard attribute access to satisfy static analysis)
if CYCLONE_ROUTES_AVAILABLE and intensity is not None and track is not None:
    try:
        if getattr(intensity, "router", None) is not None:
            app.include_router(intensity.router)
        if getattr(track, "router", None) is not None:
            app.include_router(track.router)
        logger.info("Cyclone intensity and track routers included")
    except Exception as e:
        logger.warning(f"Failed to include cyclone routers: {e}")
else:
    logger.info("Cyclone routers not available or failed to import")

if CROWD_ROUTES_AVAILABLE and crowd_reports is not None:
    try:
        if getattr(crowd_reports, "router", None) is not None:
            app.include_router(crowd_reports.router)
        logger.info("Crowd reports router included")
    except Exception as e:
        logger.warning(f"Failed to include crowd reports router: {e}")
else:
    logger.info("Crowd reports router not available or failed to import")

@app.get("/")
def home(): # type: ignore
    return {"message": "Disaster Prediction API", "docs": "/docs"}

@app.get("/landslide")
def landslide_home():
    return {"message": "Landslide Prediction Endpoint"}

def chat_with_external_api(user_message: str) -> Optional[str]:
    """Chat with external API gateway endpoint."""
    if not CHATBOT_API_URL:
        return None

    try:
        response = requests.post(
            CHATBOT_API_URL,
            json={"message": user_message},
            timeout=CHATBOT_API_TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()

        if isinstance(data, dict):
            for key in ("reply", "response", "message", "answer", "text", "output"):
                value = data.get(key)
                if value:
                    return str(value)
            return json.dumps(data)

        if isinstance(data, str):
            return data

        return str(data)
    except requests.exceptions.RequestException as e:
        logger.warning(f"External chatbot API request failed: {e}")
    except ValueError as e:
        logger.warning(f"External chatbot API returned non-JSON response: {e}")
    except Exception as e:
        logger.warning(f"External chatbot API failed: {e}")

    return None

@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    """Chatbot endpoint - merged from app.py"""
    reply = chat_with_external_api(request.message)
    if not reply:
        raise HTTPException(status_code=502, detail="External chatbot service unavailable")
    return ChatResponse(reply=reply)


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok", "service": "disaster-prediction-api"}


# -------------------------------
# Weather (Visual Crossing) and News endpoints (merged)
# -------------------------------
@app.get("/api/weather")
async def get_weather(lat: float, lon: float):
    """Return weather for given lat/lon. Uses Visual Crossing when key provided, otherwise mock data."""
    if not VISUAL_CROSSING_KEY:
        mock_data = MOCK_WEATHER_DATA.copy()
        mock_data["latitude"] = lat
        mock_data["longitude"] = lon
        return JSONResponse(status_code=200, content=mock_data)
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
            content={"error": str(e), "message": "Weather API error. Using mock data."}
        )


@app.get("/api/news")
async def get_news():
    if not NEWS_API_KEY:
        return JSONResponse(status_code=200, content={"articles": [], "totalResults": 0, "message": "News API key not configured"})
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
        return JSONResponse(status_code=500, content={"error": str(e), "message": "News API error"})


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

    # Provider 2: BigDataCloud
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

    coord_text = f"{lat:.5f}, {lon:.5f}"
    return JSONResponse(
        status_code=200,
        content={"display_name": coord_text, "name": coord_text, "address": {}, "error": "; ".join(errors)},
    )

@app.post("/predict")
async def predict(file: UploadFile = File(...)): # type: ignore
    """
    Upload a .h5 / .hdf5 file containing dataset key 'img'.
    Returns ONLY the predicted mask as PNG.
    """
    if model_landslide is None:
        return JSONResponse(status_code=500, content={"error": "Landslide model not loaded"})
    try:
        contents = await file.read()
        with h5py.File(io.BytesIO(contents), "r") as hdf:
            if "img" not in hdf.keys():
                return JSONResponse(status_code=400, content={
                    "error": f"H5 does not contain 'img'. Available keys: {list(hdf.keys())}"
                })
            data = np.array(hdf["img"])

        if data.shape[:2] != (IMG_H, IMG_W):
            return JSONResponse(status_code=400, content={
                "error": f"Image must be {IMG_H}x{IMG_W}, got {data.shape[:2]}"
            })

        x = build_6ch_features(data)
        if model_landslide is None:
            return JSONResponse(status_code=500, content={"error": "Landslide model not loaded"})
        pred = model_landslide.predict(x[None, ...], verbose=0)[0, :, :, 0]
        mask = (pred > THRESHOLD).astype(np.uint8)

        png = mask_to_png_bytes(mask)
        return StreamingResponse(io.BytesIO(png), media_type="image/png")

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/predict_all")
async def predict_all(file: UploadFile = File(...)):
    if model_landslide is None:
        return JSONResponse(status_code=500, content={"error": "Landslide model not loaded"})
    """
    Upload a .h5 / .hdf5 file containing dataset key 'img'.

    Returns a JSON with:
    - risk_percent (float)
    - mask_png (base64)
    - overlay_png (base64)
    - rgb_png (base64)

    Frontend can display 3 outputs.
    """
    try:
        contents = await file.read()
        with h5py.File(io.BytesIO(contents), "r") as hdf:
            if "img" not in hdf.keys():
                return JSONResponse(status_code=400, content={
                    "error": f"H5 does not contain 'img'. Available keys: {list(hdf.keys())}"
                })
            data = np.array(hdf["img"])

        if data.shape[:2] != (IMG_H, IMG_W):
            return JSONResponse(status_code=400, content={
                "error": f"Image must be {IMG_H}x{IMG_W}, got {data.shape[:2]}"
            })

        x = build_6ch_features(data)
        if model_landslide is None:
            return JSONResponse(status_code=500, content={"error": "Landslide model not loaded"})
        # RGB view from our normalized x: channels 0..2 are inverted normalized RGB
        # Convert to a display RGB in [0,1]
        rgb = 1.0 - np.clip(x[:, :, 0:3], 0, 1)
        pred = model_landslide.predict(x[None, ...], verbose=0)[0, :, :, 0]
        mask = (pred > THRESHOLD).astype(np.uint8)

        risk_percent = float(mask.mean() * 100.0)

        # Encode PNGs
        mask_png = mask_to_png_bytes(mask)
        overlay_png = overlay_to_png_bytes(rgb, mask, alpha=0.55)
        rgb_png = rgb_to_png_bytes(rgb)

        return {
            "risk_percent": round(risk_percent, 2),
            "risk_level": (
                "Low" if risk_percent < 5 else
                "Medium" if risk_percent < 20 else
                "High"
            ),
            "rgb_png": base64.b64encode(rgb_png).decode("utf-8"),
            "mask_png": base64.b64encode(mask_png).decode("utf-8"),
            "overlay_png": base64.b64encode(overlay_png).decode("utf-8"),
        }

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# ============================================================================
# EARTHQUAKE PREDICTION ROUTE
# ============================================================================

@app.post("/earthquake/predict")
async def predict_earthquake(request: dict):
    """
    Earthquake prediction endpoint
    """
    if model_earthquake is None:
        return JSONResponse(status_code=500, content={"error": "Earthquake model not loaded"})
    try:
        # Parse inputs
        latitude = float(request.get("latitude", 0))
        longitude = float(request.get("longitude", 0))
        depth = float(request.get("depth", 0))
        year = int(request.get("year", 2024))
        month = int(request.get("month", 1))

        # Model input
        features = np.array([[latitude, longitude, depth, year, month]])
        if model_earthquake is None:
            return JSONResponse(status_code=500, content={"error": "Earthquake model not loaded"})
        # Raw model prediction (0 or 1)
        raw_prediction = int(model_earthquake.predict(features)[0])

        # Domain-aware post-processing
        adjusted_prediction = raw_prediction

        # Stable Peninsular India â†’ Low Risk
        if raw_prediction == 1:
            if (
                8 <= latitude <= 20 and
                72 <= longitude <= 80 and
                depth <= 20
            ):
                adjusted_prediction = 0

        risk_label = risk_map[adjusted_prediction]

        return JSONResponse({
            "risk_code": adjusted_prediction,
            "risk_level": risk_label
        })

    except Exception as e:
        logger.error(f"Earthquake prediction error: {str(e)}")
        return JSONResponse(status_code=400, content={"error": str(e)})

# ============================================================================
# FLOOD PREDICTION ROUTES
# ============================================================================

@app.get("/flood/stations")
async def get_flood_stations():
    """
    Get all stations data with filter options
    """
    if stations_df is None:
        raise HTTPException(status_code=500, detail="Stations data not loaded")
    
    # Get unique values for dropdowns
    states = sorted(stations_df['State name'].unique().tolist())
    
    # Get all stations as list, filtering out invalid coordinates
    stations = []
    for _, row in stations_df.iterrows():
        # Skip stations with invalid coordinates
        if pd.isna(row['Latitude']) or pd.isna(row['longitude']):
            continue
            
        stations.append({
            "station_name": row['Station Name'],
            "state": row['State name'],
            "district": row['District / Town'],
            "basin": row['Basin Name'],
            "river": row['River Name'],
            "latitude": float(row['Latitude']),
            "longitude": float(row['longitude']),
            "type": row['Type Of Site']
        })
    
    return JSONResponse({
        "states": states,
        "stations": stations,
        "total": len(stations)
    })

@app.get("/flood/stations/filters")
async def get_flood_filter_options(state: Optional[str] = None, 
                                   district: Optional[str] = None,
                                   basin: Optional[str] = None):
    """
    Get cascading filter options based on selections
    """
    if stations_df is None:
        raise HTTPException(status_code=500, detail="Stations data not loaded")
    
    filtered_df = stations_df.copy()
    
    if state:
        filtered_df = filtered_df[filtered_df['State name'] == state]
    if district:
        filtered_df = filtered_df[filtered_df['District / Town'] == district]
    if basin:
        filtered_df = filtered_df[filtered_df['Basin Name'] == basin]
    
    return JSONResponse({
        "districts": sorted(filtered_df['District / Town'].unique().tolist()) if state else [],
        "basins": sorted(filtered_df['Basin Name'].unique().tolist()) if district else [],
        "rivers": sorted(filtered_df['River Name'].unique().tolist()) if basin else [],
        "stations": filtered_df['Station Name'].unique().tolist()
    })

@app.post("/flood/scrape-water-level")
async def scrape_flood_water_level(request: PredictionRequest):
    """
    Scrape water level data for a specific location
    """
    if not FLOOD_MODULES_AVAILABLE or flood_scraper is None:
        raise HTTPException(status_code=500, detail="Flood modules not available")
    
    try:
        logger.info(f"Scraping water level for {request.state}, {request.river}")
        
        if flood_scraper is None:
            raise HTTPException(status_code=500, detail="Flood scraper not available")
        data = await flood_scraper.scrape_water_level(
            request.state,
            request.district,
            request.basin,
            request.river
        )
        return JSONResponse(data)
        
    except Exception as e:
        logger.error(f"Scraping failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}")

@app.post("/flood/predict")
async def predict_flood(request: PredictionRequest):
    """
    Main flood prediction endpoint - combines rainfall, water level, and makes prediction
    """
    if not FLOOD_MODULES_AVAILABLE or flood_scraper is None or flood_predictor is None or weather_api is None:
        raise HTTPException(status_code=500, detail="Flood modules not available")
    
    try:
        # Get station info
        if stations_df is None:
            raise HTTPException(status_code=500, detail="Stations data not loaded")
        
        station_row = stations_df[
            (stations_df['State name'] == request.state) &
            (stations_df['River Name'] == request.river)
        ]
        
        if station_row.empty:
            raise HTTPException(status_code=404, detail="Station not found")
        
        station = station_row.iloc[0]
        latitude = float(station['Latitude'])
        longitude = float(station['longitude'])
        
        logger.info(
            f"Predicting flood for station: {station['Station Name']} | "
            f"Latitude: {latitude}, Longitude: {longitude}"
        )
        
        # Fetch rainfall data (last 7 days)
        logger.info("Fetching rainfall data...")
        rainfall_data = await weather_api.get_rainfall_data(latitude, longitude, days=7)
        logger.info(
            f"Rainfall data (last 7 days) for "
            f"{station['Station Name']} "
            f"[{latitude}, {longitude}]: {rainfall_data}"
        )
        
        # Scrape water level data
        logger.info("Scraping water level data...")
        water_data = await flood_scraper.scrape_water_level(
            request.state,
            request.district,
            request.basin,
            request.river
        )
        
        # Log scraped data
        logger.info("===== SCRAPED WATER LEVEL DATA =====")
        logger.info(f"Station Name   : {water_data.get('station_name')}")
        logger.info(f"Water Levels  : {water_data.get('water_levels')}")
        logger.info(f"Warning Level : {water_data.get('warning_level')}")
        logger.info(f"Danger Level  : {water_data.get('danger_level')}")
        logger.info(f"HFL           : {water_data.get('hfl')}")
        logger.info(f"Latitude      : {water_data.get('latitude')}")
        logger.info(f"Longitude     : {water_data.get('longitude')}")
        logger.info("===================================")
        
        water_levels = water_data.get('water_levels', [])
        warning_level = water_data.get('warning_level', 50.0)
        danger_level = water_data.get('danger_level', 52.0)
        
        # Make prediction
        logger.info("Making prediction...")
        if flood_predictor is None:
            raise HTTPException(status_code=500, detail="Flood predictor not available")
        prediction_result = flood_predictor.predict(
            rainfall_data,
            water_levels,
            warning_level,
            danger_level
        )

        # --- Visualization: Water Level Chart as base64 PNG ---
        import matplotlib.pyplot as plt
        import io, base64
        plt.switch_backend('Agg')
        fig, ax = plt.subplots(figsize=(5, 2.5))
        days = [f"Day {i+1}" for i in range(len(water_levels))]
        ax.plot(days, water_levels, marker='o', color='#0EA5E9', label='Current Level')
        ax.axhline(warning_level, color='#F59E0B', linestyle='--', label='Warning')
        ax.axhline(danger_level, color='#EF4444', linestyle='--', label='Danger')
        ax.set_ylabel('Water Level (m)')
        ax.set_xlabel('Day')
        ax.set_title('Water Level Trend')
        ax.legend(loc='upper right', fontsize=8)
        ax.grid(True, linestyle=':', alpha=0.4)
        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        water_level_chart_base64 = base64.b64encode(buf.read()).decode('utf-8')

        # Combine results
        response = {
            **prediction_result,
            "rainfall_data": rainfall_data,
            "water_levels": water_levels,
            "station_info": {
                "name": station['Station Name'],
                "state": station['State name'],
                "district": station['District / Town'],
                "basin": station['Basin Name'],
                "river": station['River Name'],
                "latitude": latitude,
                "longitude": longitude
            },
            "is_mock": water_data.get('is_mock', False),
            "chart_image": water_level_chart_base64
        }
        return JSONResponse(response)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Flood prediction failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn # type: ignore
    # Run the unified FastAPI app. Use env vars `API_HOST` and `API_PORT` if provided.
    # All endpoints available:
    # - Landslide: /predict, /predict_all
    # - Earthquake: /earthquake/predict
    # - Flood: /flood/stations, /flood/stations/filters, /flood/scrape-water-level, /flood/predict
    # - Cyclone (if available): routers from app.routes.intensity and app.routes.track
    # Default to localhost (127.0.0.1) on Windows to avoid permission errors
    host = os.getenv("API_HOST", "127.0.0.1")
    port = int(os.getenv("API_PORT", "8080"))
    log_level = os.getenv("API_LOG_LEVEL", "info")
    # Try to start server; on permission/bind errors, try localhost-only fallback
    try:
        logger.info(f"Starting server on {host}:{port} (log_level={log_level})")
        uvicorn.run(app, host=host, port=port, log_level=log_level)
    except PermissionError as pe:
        logger.warning(f"PermissionError binding to {host}:{port}: {pe}. Retrying on 127.0.0.1:{port}...")
        try:
            uvicorn.run(app, host="127.0.0.1", port=port, log_level=log_level)
        except Exception as e:
            logger.error(f"Failed to start server on 127.0.0.1:{port}: {e}")
            raise
    except OSError as oe:
        # Windows socket error 10013 maps to permission denied for binding to 0.0.0.0
        winerr = getattr(oe, 'winerror', None)
        if winerr == 10013 or oe.errno in (13,):
            logger.warning(f"OS error binding to {host}:{port} ({oe}). Trying localhost-only fallback on {port}...")
            try:
                uvicorn.run(app, host="127.0.0.1", port=port, log_level=log_level)
            except Exception as e:
                logger.error(f"Failed to start server on 127.0.0.1:{port}: {e}")
                raise
        else:
            logger.error(f"Unhandled OSError when starting server: {oe}")
            raise
    except Exception as e:
        logger.error(f"Unable to start server: {e}")
        raise

