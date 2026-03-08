"""Cyclone Track Prediction Model"""
import torch
import torch.nn as nn
import numpy as np
from pathlib import Path
from typing import List, Tuple


class TrackLSTM(nn.Module):
    """LSTM model for cyclone path/track prediction"""
    
    def __init__(self, input_size: int = 6, hidden_size: int = 128, num_layers: int = 2, output_size: int = 2):
        """
        Args:
            input_size: Feature size (latitude, longitude, and other features - default 6 to match trained model)
            hidden_size: LSTM hidden state size (default 128 to match trained model)
            num_layers: Number of LSTM layers
            output_size: Output size (next lat, lon)
        """
        super(TrackLSTM, self).__init__()
        
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, dropout=0.2)
        self.fc = nn.Linear(hidden_size, output_size)
    
    def forward(self, x, h=None):
        """
        Args:
            x: Input sequence (batch_size, seq_len, input_size)
            h: Hidden state (optional)
            
        Returns:
            Output predictions (batch_size, output_size)
        """
        lstm_out, h = self.lstm(x, h)
        # Take last timestep output
        last_output = lstm_out[:, -1, :]
        predictions = self.fc(last_output)
        return predictions


class TrackPredictor:
    """Wrapper for track prediction with coordinate preprocessing"""
    
    def __init__(self, model_path: str = None, device: str = "cpu", config_path: str = None):
        self.device = torch.device(device)
        self.model = TrackLSTM().to(self.device)
        self.model.eval()
        
        # Default normalization parameters
        self.mean_lat = 0
        self.mean_lon = 0
        self.std_lat = 1
        self.std_lon = 1
        
        # Load normalization parameters from config if available
        if config_path is None:
            config_path = Path(__file__).parent.parent.parent / "models" / "position_bounds.json"
        
        self.load_normalization_params(config_path)
        
        # Explicitly exclude intensity model files (define before use)
        intensity_model_files = ["saved_modelcyclone", "intensity_best_model.pth", "intensity_checkpoint.pth"]
        
        # Default model path - try track_model.pth first, then best_model.pth
        # IMPORTANT: Never load saved_modelcyclone (that's the intensity model)
        if model_path is None:
            models_dir = Path(__file__).parent.parent.parent / "models"
            track_model_path = models_dir / "track_model.pth"
            best_model_path = models_dir / "best_model.pth"
            
            if track_model_path.exists():
                model_path = str(track_model_path)
                print(f"TrackPredictor: Using track_model.pth")
            elif best_model_path.exists():
                # Verify it's not an intensity model by checking file size/structure
                model_path = str(best_model_path)
                print(f"TrackPredictor: Using best_model.pth as fallback")
            else:
                print(f"TrackPredictor: No track model file found. Using untrained model.")
        
        # Validate that we're not accidentally loading the intensity model
        if model_path:
            model_file = Path(model_path).name
            if model_file in intensity_model_files or "intensity" in model_file.lower():
                print(f"ERROR: TrackPredictor attempted to load intensity model file: {model_path}")
                print("TrackPredictor: Skipping load. Using untrained model.")
                model_path = None
        
        if model_path and Path(model_path).exists():
            print(f"TrackPredictor: Loading weights from {model_path}")
            self.load_weights(model_path)
        else:
            print(f"TrackPredictor: Using untrained model. Track predictions may not be accurate.")
    
    def load_normalization_params(self, config_path: Path):
        """Load normalization parameters from config file"""
        try:
            import json
            if config_path.exists():
                with open(config_path, 'r') as f:
                    config = json.load(f)
                    # Extract normalization params if available
                    if 'mean_lat' in config:
                        self.mean_lat = config['mean_lat']
                    if 'mean_lon' in config:
                        self.mean_lon = config['mean_lon']
                    if 'std_lat' in config:
                        self.std_lat = config['std_lat']
                    if 'std_lon' in config:
                        self.std_lon = config['std_lon']
                    # Or calculate from bounds
                    elif 'lat_min' in config and 'lat_max' in config:
                        self.mean_lat = (config['lat_max'] + config['lat_min']) / 2
                        self.std_lat = (config['lat_max'] - config['lat_min']) / 4
                    if 'lon_min' in config and 'lon_max' in config:
                        self.mean_lon = (config['lon_max'] + config['lon_min']) / 2
                        self.std_lon = (config['lon_max'] - config['lon_min']) / 4
        except Exception as e:
            print(f"Warning: Could not load normalization params: {e}")
    
    def load_weights(self, model_path: str):
        """Load pre-trained weights for TrackLSTM model only"""
        try:
            # Double-check we're not loading an intensity model
            model_file = Path(model_path).name
            if "intensity" in model_file.lower() or model_file == "saved_modelcyclone":
                print(f"ERROR: Attempted to load intensity model in TrackPredictor: {model_path}")
                print("TrackPredictor: Aborting load. Using untrained model.")
                return
            
            checkpoint = torch.load(model_path, map_location=self.device)
            
            # Handle different checkpoint formats
            if isinstance(checkpoint, dict):
                # Check if it's a full checkpoint with model_state
                if "model_state_dict" in checkpoint:
                    state_dict = checkpoint["model_state_dict"]
                elif "model_state" in checkpoint:
                    state_dict = checkpoint["model_state"]
                else:
                    # Try to load directly, but filter out incompatible keys
                    state_dict = checkpoint
            else:
                state_dict = checkpoint
            
            # Check if this looks like a track model (should have LSTM layers)
            state_dict_keys = list(state_dict.keys())
            has_lstm = any("lstm" in k.lower() for k in state_dict_keys)
            has_cnn = any("cnn" in k.lower() or "conv" in k.lower() for k in state_dict_keys)
            
            # If it has CNN layers but no LSTM, it's probably the intensity model
            if has_cnn and not has_lstm:
                print(f"ERROR: File {model_path} appears to be an intensity (CNN) model, not a track (LSTM) model")
                print("TrackPredictor: Aborting load. Using untrained model.")
                return
            
            # Filter state_dict to only include keys that exist in current model
            model_keys = set(self.model.state_dict().keys())
            filtered_state_dict = {}
            
            for k, v in state_dict.items():
                if k in model_keys:
                    # Check if shapes match
                    if v.shape == self.model.state_dict()[k].shape:
                        filtered_state_dict[k] = v
                    else:
                        print(f"TrackPredictor: Shape mismatch for {k}: checkpoint {v.shape} vs model {self.model.state_dict()[k].shape}")
            
            if len(filtered_state_dict) == 0:
                print(f"TrackPredictor: No compatible weights found in {model_path}. Using untrained model.")
                return
            
            # Load only the compatible weights
            self.model.load_state_dict(filtered_state_dict, strict=False)
            
            loaded_keys = len(filtered_state_dict)
            total_keys = len(model_keys)
            print(f"TrackPredictor: Successfully loaded {loaded_keys}/{total_keys} layers from {model_path}")
            
        except Exception as e:
            print(f"TrackPredictor: Error loading weights: {e}")
            print("TrackPredictor: Using untrained model. Predictions may not be accurate.")
    
    def preprocess_coordinates(self, coordinates: List[Tuple[float, float]]) -> torch.Tensor:
        """
        Preprocess coordinate sequence for model input
        
        Args:
            coordinates: List of (latitude, longitude) tuples
            
        Returns:
            Normalized tensor (1, seq_len, 6) - padded to match model input_size=6
        """
        coords_array = np.array(coordinates, dtype=np.float32)
        
        # Normalize coordinates (lat, lon)
        coords_normalized = np.zeros((coords_array.shape[0], 2), dtype=np.float32)
        coords_normalized[:, 0] = (coords_array[:, 0] - self.mean_lat) / (self.std_lat + 1e-8)
        coords_normalized[:, 1] = (coords_array[:, 1] - self.mean_lon) / (self.std_lon + 1e-8)
        
        # Pad to 6 features (model expects input_size=6)
        # Add zeros for missing features (pressure, speed, etc.)
        if coords_normalized.shape[1] < 6:
            padding = np.zeros((coords_normalized.shape[0], 6 - coords_normalized.shape[1]), dtype=np.float32)
            coords_normalized = np.concatenate([coords_normalized, padding], axis=1)
        
        tensor = torch.from_numpy(coords_normalized).unsqueeze(0).to(self.device)
        return tensor
    
    def predict_next_position(self, coordinates: List[Tuple[float, float]], 
                            num_steps: int = 3) -> dict:
        """
        Predict next positions in cyclone track using hybrid approach:
        - LSTM for model-based predictions
        - Velocity-based extrapolation for trend continuity
        - Combined prediction for better accuracy
        
        Args:
            coordinates: Historical coordinates as list of (lat, lon) tuples
            num_steps: Number of future steps to predict
            
        Returns:
            Dictionary with predicted track points and metadata
        """
        if len(coordinates) < 3:
            return {
                "error": "At least 3 historical points required",
                "predicted_track": [],
                "last_known_position": {
                    "latitude": coordinates[-1][0] if coordinates else 0,
                    "longitude": coordinates[-1][1] if coordinates else 0
                }
            }
        
        # Calculate velocity from last 2-3 points for extrapolation
        coords_array = np.array(coordinates, dtype=np.float32)
        
        # Use last 3 points to estimate velocity
        if len(coordinates) >= 3:
            lat_velocity = (coords_array[-1, 0] - coords_array[-3, 0]) / 2.0
            lon_velocity = (coords_array[-1, 1] - coords_array[-3, 1]) / 2.0
        else:
            lat_velocity = coords_array[-1, 0] - coords_array[0, 0]
            lon_velocity = coords_array[-1, 1] - coords_array[0, 1]
        
        predictions = []
        current_input = self.preprocess_coordinates(coordinates)
        last_lat = coordinates[-1][0]
        last_lon = coordinates[-1][1]
        
        with torch.no_grad():
            for step in range(num_steps):
                # Get LSTM prediction
                lstm_output = self.model(current_input)
                
                # Denormalize LSTM output
                pred_lat_lstm = (lstm_output[0, 0].item() * self.std_lat) + self.mean_lat
                pred_lon_lstm = (lstm_output[0, 1].item() * self.std_lon) + self.mean_lon
                
                # Extrapolate based on observed velocity (drift)
                # Weight the predictions: 40% LSTM + 60% velocity-based for better continuity
                pred_lat = 0.4 * pred_lat_lstm + 0.6 * (last_lat + lat_velocity)
                pred_lon = 0.4 * pred_lon_lstm + 0.6 * (last_lon + lon_velocity)
                
                # Add slight decay to velocity over time (cyclones tend to slow/stabilize)
                lat_velocity *= 0.95
                lon_velocity *= 0.95
                
                # Ensure valid coordinate ranges
                pred_lat = max(-90, min(90, pred_lat))
                pred_lon = max(-180, min(180, pred_lon))
                
                predictions.append({
                    "latitude": round(pred_lat, 4),
                    "longitude": round(pred_lon, 4),
                    "step": step + 1
                })
                
                # Update for next iteration
                last_lat = pred_lat
                last_lon = pred_lon
                
                # Prepare input for next LSTM prediction
                pred_normalized = torch.tensor([[
                    (pred_lat - self.mean_lat) / (self.std_lat + 1e-8),
                    (pred_lon - self.mean_lon) / (self.std_lon + 1e-8),
                    0.0, 0.0, 0.0, 0.0  # Padding for missing features
                ]], dtype=torch.float32).unsqueeze(0).to(self.device)
                
                # Update sequence - keep last 5 points for context
                if current_input.shape[1] >= 5:
                    current_input = torch.cat([current_input[:, 1:, :], pred_normalized], dim=1)
                else:
                    current_input = torch.cat([current_input, pred_normalized], dim=1)
        
        # Calculate trajectory features
        trajectory_features = self.predict_trajectory_features(coordinates)
        
        return {
            "last_known_position": {
                "latitude": coordinates[-1][0],
                "longitude": coordinates[-1][1]
            },
            "predicted_track": predictions,
            "trajectory_stats": trajectory_features
        }
    
    def predict_trajectory_features(self, coordinates: List[Tuple[float, float]]) -> dict:
        """
        Calculate trajectory features (angle, speed, etc.)
        
        Args:
            coordinates: Historical coordinates
            
        Returns:
            Dictionary with trajectory analysis
        """
        if len(coordinates) < 2:
            return {
                "average_speed": 0.0,
                "total_distance": 0.0,
                "avg_direction": 0.0,
                "num_points": len(coordinates)
            }
        
        coords_array = np.array(coordinates)
        
        # Calculate differences
        diffs = np.diff(coords_array, axis=0)
        
        # Calculate distances using Haversine formula (more accurate for lat/lon)
        def haversine_distance(lat1, lon1, lat2, lon2):
            """Calculate distance between two points in km"""
            R = 6371  # Earth radius in km
            dlat = np.radians(lat2 - lat1)
            dlon = np.radians(lon2 - lon1)
            a = np.sin(dlat/2)**2 + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon/2)**2
            c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))
            return R * c
        
        distances = []
        for i in range(len(coords_array) - 1):
            dist = haversine_distance(
                coords_array[i, 0], coords_array[i, 1],
                coords_array[i+1, 0], coords_array[i+1, 1]
            )
            distances.append(dist)
        
        distances = np.array(distances)
        
        # Calculate angles (bearing from north)
        angles = []
        for i in range(len(coords_array) - 1):
            lat1, lon1 = np.radians(coords_array[i])
            lat2, lon2 = np.radians(coords_array[i+1])
            dlon = lon2 - lon1
            y = np.sin(dlon) * np.cos(lat2)
            x = np.cos(lat1) * np.sin(lat2) - np.sin(lat1) * np.cos(lat2) * np.cos(dlon)
            bearing = np.arctan2(y, x)
            bearing = np.degrees(bearing)
            bearing = (bearing + 360) % 360  # Normalize to 0-360
            angles.append(bearing)
        
        angles = np.array(angles)
        
        return {
            "average_speed": float(np.mean(distances)) if len(distances) > 0 else 0.0,
            "total_distance": float(np.sum(distances)),
            "avg_direction": float(np.mean(angles)) if len(angles) > 0 else 0.0,
            "direction_std": float(np.std(angles)) if len(angles) > 0 else 0.0,
            "max_speed": float(np.max(distances)) if len(distances) > 0 else 0.0,
            "num_points": len(coordinates)
        }
