import httpx
import asyncio
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class WeatherAPI:
    """
    Fetch rainfall data from Open-Meteo API
    """
    def __init__(self):
        self.base_url = "https://api.open-meteo.com/v1/forecast"
    
    async def get_rainfall_data(self, latitude: float, longitude: float, days: int = 7):
        """
        Get last N days rainfall data for a location
        
        Args:
            latitude: Latitude of location
            longitude: Longitude of location
            days: Number of past days to fetch (default 7)
        
        Returns:
            List of daily rainfall amounts in mm
        """
        try:
            # Calculate date range
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            params = {
                "latitude": latitude,
                "longitude": longitude,
                "start_date": start_date.strftime("%Y-%m-%d"),
                "end_date": end_date.strftime("%Y-%m-%d"),
                "daily": "precipitation_sum",
                "timezone": "Asia/Kolkata"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(self.base_url, params=params, timeout=10.0)
                response.raise_for_status()
                
                data = response.json()
                
                if "daily" in data and "precipitation_sum" in data["daily"]:
                    rainfall = data["daily"]["precipitation_sum"]
                    # Return last 'days' values
                    return rainfall[-days:] if len(rainfall) >= days else rainfall
                else:
                    logger.warning("No rainfall data in API response")
                    return [0.0] * days
                    
        except Exception as e:
            logger.error(f"Failed to fetch rainfall data: {str(e)}")
            # Return mock data as fallback
            return [2.5, 5.0, 8.3, 12.1, 6.7, 3.2, 1.8][-days:]
    
    async def get_current_weather(self, latitude: float, longitude: float):
        """
        Get current weather conditions
        """
        try:
            params = {
                "latitude": latitude,
                "longitude": longitude,
                "current": "temperature_2m,precipitation,weathercode",
                "timezone": "Asia/Kolkata"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(self.base_url, params=params, timeout=10.0)
                response.raise_for_status()
                
                data = response.json()
                return data.get("current", {})
                
        except Exception as e:
            logger.error(f"Failed to fetch current weather: {str(e)}")
            return {}
