import pandas as pd
import numpy as np
from datetime import datetime
import logging
import random
import os

logger = logging.getLogger(__name__)

class MockDataProvider:
    def __init__(self):
        self.csv_path = os.path.join(os.path.dirname(__file__), 'mock_water_levels.csv')
        self.data = None
        self.load_data()

    def load_data(self):
        """Load mock water level data from CSV"""
        try:
            self.data = pd.read_csv(self.csv_path)
            logger.info(f"Loaded {len(self.data)} stations from mock data CSV")
        except Exception as e:
            logger.error(f"Failed to load mock data CSV: {e}")
            self.data = None

    async def get_water_level_data(self, state: str, district: str, basin: str, river: str):
        """
        Get mock water level data for the specified station
        """
        if self.data is None:
            return self._get_fallback_mock_data()

        # Find matching station
        station = self._find_station(state, district, basin, river)

        if station is None:
            logger.warning(f"No matching station found for {state}, {district}, {basin}, {river}")
            return self._get_fallback_mock_data()

        # Generate realistic water levels with some variation
        water_levels = self._generate_water_levels(station)

        result = {
            "station_name": station['station_name'],
            "water_levels": water_levels,
            "warning_level": station['warning_level'],
            "danger_level": station['danger_level'],
            "hfl": station['hfl_level'],
            "latitude": station['latitude'],
            "longitude": station['longitude'],
            "timestamp": datetime.now().isoformat(),
            "is_mock": True
        }

        # Log the data
        logger.info("===== MOCK WATER LEVEL DATA =====")
        logger.info(f"Station Name   : {result.get('station_name')}")
        logger.info(f"Water Levels  : {result.get('water_levels')}")
        logger.info(f"Warning Level : {result.get('warning_level')}")
        logger.info(f"Danger Level  : {result.get('danger_level')}")
        logger.info(f"HFL           : {result.get('hfl')}")
        logger.info(f"Latitude      : {result.get('latitude')}")
        logger.info(f"Longitude     : {result.get('longitude')}")
        logger.info("===============================")

        return result

    def _find_station(self, state: str, district: str, basin: str, river: str):
        """Find the best matching station in the CSV data"""
        if self.data is None:
            return None

        # Try exact matches first
        exact_matches = self.data[
            (self.data['state'].str.lower() == state.lower()) &
            (self.data['district'].str.lower() == district.lower()) &
            (self.data['basin'].str.lower() == basin.lower()) &
            (self.data['river'].str.lower() == river.lower())
        ]

        if not exact_matches.empty:
            return exact_matches.iloc[0].to_dict()

        # Try partial matches
        river_matches = self.data[
            self.data['river'].str.lower().str.contains(river.lower(), na=False)
        ]

        if not river_matches.empty:
            return river_matches.iloc[0].to_dict()

        # Return first station as fallback
        return self.data.iloc[0].to_dict() if not self.data.empty else None

    def _generate_water_levels(self, station):
        """Generate realistic water levels with some variation"""
        # Get the base levels from CSV
        base_levels = [
            station['water_level_4'],
            station['water_level_3'],
            station['water_level_2'],
            station['water_level_1']
        ]

        # Add some random variation (±0.1m) to simulate real-time changes
        water_levels = []
        for level in base_levels:
            variation = random.uniform(-0.1, 0.1)
            new_level = round(level + variation, 2)
            water_levels.append(new_level)

        # Ensure levels are in ascending order (simulate rising water)
        water_levels.sort()

        return water_levels

    def _get_fallback_mock_data(self):
        """Fallback mock data when CSV is not available"""
        return {
            "station_name": "Fallback Station",
            "water_levels": [45.2, 45.8, 46.1, 46.5],
            "warning_level": 50.0,
            "danger_level": 52.0,
            "hfl": 55.0,
            "latitude": 11.0,
            "longitude": 78.0,
            "timestamp": datetime.now().isoformat(),
            "is_mock": True
        }

# Backward compatibility - create an instance that mimics the old scraper
class RiverDataScraper:
    def __init__(self):
        self.provider = MockDataProvider()

    async def scrape_water_level(self, state: str, district: str, basin: str, river: str):
        return await self.provider.get_water_level_data(state, district, basin, river)
