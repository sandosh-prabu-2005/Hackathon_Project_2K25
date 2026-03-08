from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from pathlib import Path
import pandas as pd
import logging
import json
import numpy as np

from scraper import RiverDataScraper
from model_inference import FloodPredictor
from utils import WeatherAPI

# --------------------------------------------------
# ROUTER INIT
# --------------------------------------------------
flood_router = APIRouter(prefix="/flood", tags=["Flood"])

logger = logging.getLogger("flood")

ROOT_DIR = Path(__file__).parent
STATIONS_FILE = ROOT_DIR / "stations.xlsx"

# --------------------------------------------------
# LOAD DATA + MODELS
# --------------------------------------------------
scraper = RiverDataScraper()
predictor = FloodPredictor()
weather_api = WeatherAPI()

predictor.load_model()

try:
    stations_df = pd.read_excel(STATIONS_FILE)
    stations_df["Basin Name"] = stations_df["Basin Name"].fillna("")
    stations_df["River Name"] = stations_df["River Name"].fillna("")
    logger.info(f"Loaded {len(stations_df)} stations")
except Exception as e:
    stations_df = None
    logger.error(f"Stations load failed: {e}")

# --------------------------------------------------
# SCHEMAS
# --------------------------------------------------
class PredictionRequest(BaseModel):
    state: str
    district: str
    basin: str
    river: str

# --------------------------------------------------
# ENDPOINTS
# --------------------------------------------------
@flood_router.get("/stations")
async def get_stations():
    if stations_df is None:
        raise HTTPException(500, "Stations data not loaded")

    stations = []
    for _, row in stations_df.iterrows():
        if pd.isna(row["Latitude"]) or pd.isna(row["longitude"]):
            continue

        stations.append({
            "station_name": row["Station Name"],
            "state": row["State name"],
            "district": row["District / Town"],
            "basin": row["Basin Name"],
            "river": row["River Name"],
            "latitude": float(row["Latitude"]),
            "longitude": float(row["longitude"]),
        })

    return stations


@flood_router.post("/predict")
async def predict_flood(req: PredictionRequest):
    if stations_df is None:
        raise HTTPException(500, "Stations data not loaded")

    match = stations_df[
        (stations_df["State name"] == req.state) &
        (stations_df["River Name"] == req.river)
    ]

    if match.empty:
        raise HTTPException(404, "Station not found")

    station = match.iloc[0]

    latitude = float(station["Latitude"])
    longitude = float(station["longitude"])

    rainfall = await weather_api.get_rainfall_data(latitude, longitude, days=7)

    water = await scraper.scrape_water_level(
        req.state, req.district, req.basin, req.river
    )

    return predictor.predict(
        rainfall,
        water["water_levels"],
        water["warning_level"],
        water["danger_level"]
    )