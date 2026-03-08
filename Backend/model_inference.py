import numpy as np
import pickle
from tensorflow import keras
import logging
from pathlib import Path
from sklearn.preprocessing import MinMaxScaler

logger = logging.getLogger(__name__)

class FloodPredictor:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.model_path = Path(__file__).parent / "flood_lstm_binary_model.keras"
        #BASE_DIR = Path(__file__).resolve().parent.parent
        #self.model_path = BASE_DIR / "flood_lstm_binary_model.keras"
        # Load the pre-fitted scaler
        self.load_scaler()
        
    def load_scaler(self):
        """Load the pre-fitted MinMaxScaler"""
        try:
            scaler_path = Path(__file__).parent / "flood_scaler.pkl"
            if scaler_path.exists():
                import joblib
                self.scaler = joblib.load(str(scaler_path))
                logger.info("Scaler loaded successfully from flood_scaler.pkl")
            else:
                logger.warning("Scaler file not found, using default MinMaxScaler")
                self.scaler = MinMaxScaler()
        except Exception as e:
            logger.error(f"Failed to load scaler: {str(e)}, using default")
            self.scaler = MinMaxScaler()
        
    def load_model(self):
        """Load the trained LSTM model"""
        try:
            logger.info(f"Loading model from {self.model_path}")
            self.model = keras.models.load_model(str(self.model_path))
            
            logger.info("Model loaded successfully. Using built-in preprocessing pipeline.")
            return True
        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}")
            return False
    
    def prepare_features(self, rainfall_data: list, water_levels: list, 
                        warning_level: float, danger_level: float):
        """
        Prepare features for LSTM model using the same preprocessing as training
        
        Expected features (last 7 days):
        - Rain_3day_sum (scaled)
        - Rain_7day_sum (scaled)
        - Rain_3day_avg (scaled)
        - Max_Normalized_River_Level (already normalized 0-1)
        - Avg_Normalized_River_Level (already normalized 0-1)
        - Max_River_Rise (scaled, cleaned)
        """
        try:
            # Ensure we have 7 days of rainfall data
            if len(rainfall_data) < 7:
                # Pad with zeros if needed
                rainfall_data = [0] * (7 - len(rainfall_data)) + rainfall_data
            
            rainfall_data = rainfall_data[-7:]  # Take last 7 days
            
            # Ensure we have water level data
            if len(water_levels) < 4:
                water_levels = water_levels + [water_levels[-1]] * (4 - len(water_levels))
            
            # Pad water levels to 7 days
            water_levels = water_levels + [water_levels[-1]] * (7 - len(water_levels))
            water_levels = water_levels[-7:]
            
            # Calculate features for each of the 7 days
            features = []
            
            for i in range(7):
                # Rain_3day_sum: sum of last 3 days rainfall up to day i
                rain_3day_sum = sum(rainfall_data[max(0, i-2):i+1])
                
                # Rain_7day_sum: sum of all rainfall up to day i
                rain_7day_sum = sum(rainfall_data[:i+1])
                
                # Rain_3day_avg: average of last 3 days
                rain_3day_avg = rain_3day_sum / min(3, i+1)
                # Normalize water levels using banded approach (prevents sigmoid saturation)
                normalized_level = self._normalize_water_level_banded(water_levels[i], warning_level, danger_level)
                
                # Max normalized river level (up to day i) - with banding and reduced dominance
                max_normalized = self._normalize_water_level_banded(max(water_levels[:i+1]), warning_level, danger_level) * 0.9
                
                # Avg normalized river level (up to day i) - with banding and reduced dominance
                avg_normalized = self._normalize_water_level_banded(np.mean(water_levels[:i+1]), warning_level, danger_level) * 0.9
                
                # Max river rise (maximum change in consecutive days up to day i)
                if i > 0:
                    rises = [water_levels[j] - water_levels[j-1] for j in range(1, i+1)]
                    max_rise = max(rises) if rises else 0
                else:
                    max_rise = 0
                
                # Clean Max_River_Rise (same as preprocessing)
                max_rise = max(0, max_rise)  # Remove negative values
                max_rise = min(max_rise, 10.0)  # Cap extreme spikes (using reasonable upper bound)
                
                features.append([
                    rain_3day_sum,
                    rain_7day_sum,
                    rain_3day_avg,
                    max_normalized,
                    avg_normalized,
                    max_rise
                ])
            
            features = np.array(features)
            
            # Apply MinMax scaling to the same columns as training
            # Scale ONLY: Rain_3day_sum, Rain_7day_sum, Rain_3day_avg, Max_River_Rise
            scale_cols = ["Rain_3day_sum", "Rain_7day_sum", "Rain_3day_avg", "Max_River_Rise"]
            scale_indices = [0, 1, 2, 5]  # Corresponding indices in features array
            
            # Extract columns to scale
            features_to_scale = features[:, scale_indices]
            
            # Create DataFrame with proper column names to match scaler's training
            import pandas as pd
            df_to_scale = pd.DataFrame(features_to_scale, columns=scale_cols)
            
            # Transform using the pre-fitted scaler
            scaled_values = self.scaler.transform(df_to_scale)
            
            # Put scaled values back into features array
            scaled_features = features.copy()
            scaled_features[:, scale_indices] = scaled_values
            
            # Leave Max/Avg_Normalized_River_Level as-is (already 0-1 normalized)
            
            return scaled_features
            
        except Exception as e:
            logger.error(f"Feature preparation failed: {str(e)}")
            raise
    
    def predict(self, rainfall_data: list, water_levels: list,
               warning_level: float, danger_level: float):
        """
        Make flood prediction using LSTM model with rate-of-rise and rainfall rate overrides

        Returns:
            dict with prediction, probability, and status
        """
        try:
            if self.model is None or self.scaler is None:
                if not self.load_model():
                    raise Exception("Model not loaded")

            # Prepare features (already scaled)
            features_scaled = self.prepare_features(rainfall_data, water_levels,
                                           warning_level, danger_level)

            # Reshape for LSTM: (1, 7, 6) - 1 sample, 7 timesteps, 6 features
            features_reshaped = features_scaled.reshape(1, 7, 6)

            # Make prediction
            prediction = self.model.predict(features_reshaped, verbose=0)
            flood_probability = float(prediction[0][0])
            print(f"Raw flood probability: {flood_probability:.3f}")
            # Calculate rate of water rise (last 4 readings)
            water_rise_rate = self._calculate_water_rise_rate(water_levels)

            # Calculate rainfall rate (mm/day for last 3 days)
            rainfall_rate = self._calculate_rainfall_rate(rainfall_data)

            # Get current water level
            current_level = water_levels[-1] if water_levels else 0

            # Apply rate-of-rise override logic
            rate_of_rise_status = self._get_rate_of_rise_status(water_rise_rate, current_level, warning_level, danger_level)

            # Apply rainfall rate override logic
            rainfall_status = self._get_rainfall_status(rainfall_rate)

            # Apply water level override logic
            water_level_status = self._get_water_level_status(current_level, warning_level, danger_level)

            # Determine final status based on overrides (consensus-based)
            final_status = self._combine_statuses(rate_of_rise_status, rainfall_status, water_level_status)

            # Soft probability adjustment based on status (preserves ML signal)
            flood_probability = self._adjust_probability(flood_probability, final_status)

            # Final decision logic
            if flood_probability >= 0.6 and final_status != "Safe":
                prediction_label = "Flood"
            elif flood_probability >= 0.75:
                prediction_label = "Flood"
            else:
                prediction_label = "No Flood"

            return {
                "prediction": prediction_label,
                "probability": round(flood_probability, 3),
                "confidence": round(abs(flood_probability - 0.5) * 2, 3),
                "status": final_status,
                "current_water_level": current_level,
                "warning_level": warning_level,
                "danger_level": danger_level,
                "water_rise_rate": round(water_rise_rate, 3),
                "rainfall_rate": round(rainfall_rate, 3),
                "rate_of_rise_status": rate_of_rise_status,
                "rainfall_status": rainfall_status,
                "water_level_status": water_level_status
            }

        except Exception as e:
            logger.error(f"Prediction failed: {str(e)}")
            raise

    def _normalize_water_level_banded(self, level: float, warning_level: float, danger_level: float) -> float:
        """
        Banded normalization to prevent sigmoid saturation.
        Maps water levels to 0-1 range with safe/warning/danger zones.
        """
        if level <= warning_level:
            # Safe to warning zone: 0.0 to 0.7
            if warning_level <= 0:
                return 0.0
            normalized = (level / warning_level) * 0.7
        else:
            # Warning to danger zone: 0.7 to 1.0
            danger_range = danger_level - warning_level
            if danger_range <= 0:
                return 0.7
            warning_to_danger_ratio = (level - warning_level) / danger_range
            normalized = 0.7 + (warning_to_danger_ratio * 0.3)
        
        # Cap at 0.95 to prevent sigmoid saturation
        return min(normalized, 0.95)

    def _calculate_water_rise_rate(self, water_levels: list) -> float:
        """Calculate the rate of water rise in m/hour"""
        if len(water_levels) < 2:
            return 0.0

        # Use last 4 readings to calculate average rise rate
        recent_levels = water_levels[-4:] if len(water_levels) >= 4 else water_levels

        if len(recent_levels) < 2:
            return 0.0

        # Calculate rises between consecutive readings
        rises = []
        for i in range(1, len(recent_levels)):
            rise = recent_levels[i] - recent_levels[i-1]
            if rise > 0:  # Only count increases
                rises.append(rise)

        if not rises:
            return 0.0

        # Average rise rate (assuming readings are hourly)
        avg_rise = sum(rises) / len(rises)
        return avg_rise

    def _calculate_rainfall_rate(self, rainfall_data: list) -> float:
        """Calculate rainfall rate in mm/day for last 3 days"""
        if not rainfall_data:
            return 0.0

        # Use last 3 days of rainfall data
        recent_rainfall = rainfall_data[-3:] if len(rainfall_data) >= 3 else rainfall_data

        # Calculate total rainfall over the period
        total_rainfall = sum(recent_rainfall)

        # Convert to mm/day (assuming daily readings)
        days = len(recent_rainfall)
        rainfall_rate = total_rainfall / days if days > 0 else 0.0

        return rainfall_rate

    def _get_rate_of_rise_status(self, rise_rate: float, current_level: float,
                                warning_level: float, danger_level: float) -> str:
        """Determine status based on rate of water rise with realistic thresholds"""
        # Realistic river flood thresholds (not normal fluctuations)
        if rise_rate >= 1.0:  # 1.0m/hour = extreme flood rise
            return "Danger"
        elif rise_rate >= 0.5:  # 0.5m/hour = significant flood rise
            return "Warning"
        else:
            return "Safe"

    def _get_rainfall_status(self, rainfall_rate: float) -> str:
        """Determine status based on rainfall rate with India-realistic thresholds"""
        # Heavy rainfall thresholds for Indian conditions
        if rainfall_rate >= 120:  # 120mm/day = extreme rainfall
            return "Danger"
        elif rainfall_rate >= 70:  # 70mm/day = heavy rainfall
            return "Warning"
        else:
            return "Safe"

    def _get_water_level_status(self, current_level: float,
                               warning_level: float, danger_level: float) -> str:
        """Determine status based on current water level"""
        if current_level >= danger_level:
            return "Danger"
        elif current_level >= warning_level:
            return "Warning"
        else:
            return "Safe"

    def _adjust_probability(self, base_prob: float, status: str) -> float:
        """Soft probability adjustment that preserves ML signal"""
        if status == "Danger":
            # Boost probability for danger status
            adjusted = base_prob + (1 - base_prob) * 0.4
        elif status == "Warning":
            # Moderate boost for warning status
            adjusted = base_prob + (1 - base_prob) * 0.2
        else:
            # Reduce probability for safe status
            adjusted = base_prob * 0.7

        # Ensure probability stays within valid range
        return min(max(adjusted, 0.01), 0.99)

    def _combine_statuses(self, rate_status: str, rainfall_status: str, water_status: str) -> str:
        """Combine multiple status indicators using consensus-based approach"""
        statuses = [rate_status, rainfall_status, water_status]

        danger_count = statuses.count("Danger")
        warning_count = statuses.count("Warning")

        # Require consensus for danger/warning (2+ signals)
        if danger_count >= 2:
            return "Danger"
        elif warning_count >= 2:
            return "Warning"
        else:
            return "Safe"
