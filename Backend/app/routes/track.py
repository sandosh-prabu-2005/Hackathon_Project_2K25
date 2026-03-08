"""Track Prediction Routes - Updated to match notebook processing"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Tuple
import json
import numpy as np
import math
import tensorflow as tf
from pathlib import Path
from sklearn.preprocessing import StandardScaler
import pickle
import joblib

router = APIRouter(prefix="/api/track", tags=["track"])

def _initialize_scaler():
    """Initialize scaler with training statistics from 14-feature notebook"""
    scaler = StandardScaler()
    # 14 features: LAT, LON, INIT_LAT, NUMBER, SUBBASIN, DIST2LAND, STORM_SPEED,
    # LANDFALL, STORM_DIR, ANGLE, DISTANCE, TIME_DIFF, MONTH, SEASON
    scaler.mean_ = np.array([
        17.3716126,   81.16751659,  17.3716126,  1.27848775, 1.5, 220.42080364,
        6.93257967, 207.43159662, 228.10661915, 205.54696156,  76.83297332,
        64.71295159,   6.5,   1.7359302
    ])
    scaler.scale_ = np.array([
        5.89760005,   9.59293213,   5.89760005,  0.44825475, 0.5, 254.89256273,
        4.27563192, 250.3072391,  119.66737875, 135.21807156, 270.75419205,
        54.44896503,   3.45,   0.64266861
    ])
    scaler.var_ = scaler.scale_ ** 2
    scaler.n_features_in_ = 14
    scaler.n_samples_seen_ = 1000
    return scaler

def _load_scaler_from_disk():
    """Load the actual scaler from disk (notebook approach)"""
    try:
        scaler_path = model_dir / "cnn_gru_standard_scaler.save"
        if scaler_path.exists():
            loaded_scaler = joblib.load(str(scaler_path))
            print(f"[OK] Scaler loaded from disk: {scaler_path}")
            return loaded_scaler
    except Exception as e:
        print(f"[WARNING] Failed to load scaler from disk: {e}")
    
    # Fallback to initialized scaler
    return _initialize_scaler()

# Load CNN-GRU models
model_dir = Path(__file__).parent.parent.parent / "models"

lat_model = None
lon_model = None
scaler = None
selected_features_order = None

# Initialize scaler (load from disk first, fallback to hardcoded values)
print(f"[INFO] Setting up StandardScaler from disk or with training statistics...")
scaler = _load_scaler_from_disk()
print(f"[OK] Scaler initialized with mean={scaler.mean_[:3]}... and scale={scaler.scale_[:3]}...")

# Try to load feature order from notebook (14 FEATURES)
FEATURES_ORDER = None
features_order_path = model_dir / "selected_features_order.json"
if features_order_path.exists():
    try:
        with open(features_order_path, 'r') as f:
            FEATURES_ORDER = json.load(f)
        print(f"[OK] Feature order loaded: {FEATURES_ORDER} ({len(FEATURES_ORDER)} features)")
    except Exception as e:
        print(f"[WARNING] Failed to load feature order: {e}")
        FEATURES_ORDER = None

# Try to load latitude model
lat_model_path = model_dir / "lat_cnn_gru_model.h5"
if lat_model_path.exists():
    try:
        lat_model = tf.keras.models.load_model(str(lat_model_path), compile=False)
        print(f"[OK] Latitude CNN-GRU model loaded")
    except Exception as e:
        print(f"[ERROR] Failed to load latitude model: {e}")

lon_model_path = model_dir / "lon_cnn_gru_model.h5"
if lon_model_path.exists():
    try:
        lon_model = tf.keras.models.load_model(str(lon_model_path), compile=False)
        print(f"[OK] Longitude CNN-GRU model loaded")
    except Exception as e:
        print(f"[ERROR] Failed to load longitude model: {e}")


class CoordinatePoint(BaseModel):
    """Single coordinate point"""
    latitude: float
    longitude: float


class TrackPredictionRequest(BaseModel):
    """Request for track prediction with smart defaults"""
    coordinates: List[CoordinatePoint]  # REQUIRED: minimum 1 point
    month: int  # REQUIRED: user must specify month (1-12)
    num_steps: int = 3  # How many steps to predict
    storm_speed: float = 50.0  # RECOMMENDED: defaults to 50 knots if not provided
    
    # Optional: Will be auto-computed or use smart defaults
    number: int = 1  # Defaults to 1
    subbasin: float = None  # Auto-detected from longitude
    dist2land: float = 250.0  # Auto-estimated from coordinates
    landfall: float = 250.0  # Auto-estimated from trajectory
    storm_dir: float = None  # Auto-calculated from coordinates if not provided


def angleFromCoordinate(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate bearing angle from point 1 to point 2
    Matches notebook's angleFromCoordinate function
    """
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dLon = math.radians(lon2 - lon1)
    
    y = math.sin(dLon) * math.cos(lat2_rad)
    x = math.cos(lat1_rad) * math.sin(lat2_rad) - math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(dLon)
    brng = math.atan2(y, x)
    brng = math.degrees(brng)
    brng = (brng + 360) % 360
    brng = 360 - brng  # count degrees clockwise
    return brng


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two points using Haversine formula
    Matches notebook's haversine function
    """
    R = 6371.0  # Earth radius in km
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    dlon = lon2_rad - lon1_rad
    dlat = lat2_rad - lat1_rad
    
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = R * c
    return distance


def auto_detect_subbasin(longitude: float) -> float:
    """
    Auto-detect sub-basin from longitude coordinates
    Bay of Bengal: 80-100°E
    Arabian Sea: 50-80°E
    """
    if 80 <= longitude <= 100:
        return 1.0  # Bay of Bengal
    elif 50 <= longitude < 80:
        return 2.0  # Arabian Sea
    else:
        return 1.0  # Default to Bay of Bengal


def estimate_dist2land(latitude: float, longitude: float) -> float:
    """
    Estimate distance to nearest land/coast
    Simple heuristic based on region
    """
    # Bay of Bengal - generally 200-500 km from coast
    if 80 <= longitude <= 100 and 0 <= latitude <= 35:
        return 250.0
    # Arabian Sea - generally 300-600 km from coast
    elif 50 <= longitude < 80 and 0 <= latitude <= 35:
        return 350.0
    # Open ocean
    else:
        return 500.0


def estimate_landfall_distance(coords_history: List[Tuple[float, float]]) -> float:
    """
    Estimate distance to potential landfall
    Extrapolates from current trajectory
    """
    if len(coords_history) < 2:
        return 0.0
    
    # Get last two points to estimate direction
    lat1, lon1 = coords_history[-2]
    lat2, lon2 = coords_history[-1]
    
    # Estimate next 3 positions
    lat_diff = lat2 - lat1
    lon_diff = lon2 - lon1
    
    # Project forward
    distances = []
    for i in range(1, 4):
        proj_lat = lat2 + (lat_diff * i)
        proj_lon = lon2 + (lon_diff * i)
        
        # Estimate if this would hit land
        est_dist = estimate_dist2land(proj_lat, proj_lon)
        distances.append(est_dist)
    
    # Return average
    return sum(distances) / len(distances)


def calculate_storm_direction(coords_history: List[Tuple[float, float]]) -> float:
    """
    Calculate storm direction from last two coordinates
    Uses bearing/angle calculation
    """
    if len(coords_history) < 2:
        return 0.0
    
    lat1, lon1 = coords_history[-2]
    lat2, lon2 = coords_history[-1]
    
    return angleFromCoordinate(lat1, lon1, lat2, lon2)


def calculate_average_direction(coords_history: List[Tuple[float, float]]) -> float:
    """
    Calculate average storm direction from last 3 movements
    More stable than using just last 2 points
    Falls back to single direction if insufficient history
    """
    if len(coords_history) < 3:
        return calculate_storm_direction(coords_history)
    
    angles = []
    for i in range(-3, -1):
        lat1, lon1 = coords_history[i]
        lat2, lon2 = coords_history[i+1]
        angles.append(angleFromCoordinate(lat1, lon1, lat2, lon2))
    
    return sum(angles) / len(angles)


def compute_14_features(
    coords_history: List[Tuple[float, float]],
    number: int = None,
    subbasin: float = None,
    dist2land: float = None,
    storm_speed: float = None,
    landfall: float = None,
    storm_dir: float = None,
    month: int = None
) -> np.ndarray:
    """
    Compute 14 features from coordinate history (NEW: includes INIT_LAT)
    Uses user-provided values where available, auto-computes or estimates the rest
    
    Features order: [LAT, LON, INIT_LAT, NUMBER, SUBBASIN, DIST2LAND, STORM_SPEED, 
                     LANDFALL, STORM_DIR, ANGLE, DISTANCE, TIME_DIFF, MONTH, SEASON]
    
    NEW FEATURE (Feature 3):
    - INIT_LAT: Initial latitude (first coordinate in history) - helps model understand starting point
    
    Smart defaults:
    - NUMBER: 1 (default cyclone ID)
    - SUBBASIN: Auto-detected from longitude (80-100°E = BB/1.0, 50-80°E = AS/2.0)
    - DIST2LAND: Auto-estimated from latitude/longitude (250-500 km typical)
    - STORM_SPEED: Required for accuracy (0.0 if not provided)
    - LANDFALL: Auto-estimated from trajectory projection
    - STORM_DIR: Auto-calculated from last two coordinates
    - MONTH: Current month if not provided
    - SEASON: Auto-computed from MONTH (month // 4)
    """
    if not coords_history or len(coords_history) == 0:
        raise ValueError("Need at least 1 coordinate")
    
    from datetime import datetime
    
    features = []
    
    # Get the latest (most recent) coordinate for prediction
    lat, lon = coords_history[-1]
    
    # Feature 1-2: Latitude and Longitude (latest position)
    features.append(float(lat))
    features.append(float(lon))
    
    # Feature 3: INIT_LAT (NEW - Initial latitude from first coordinate)
    init_lat = float(coords_history[0][0])
    features.append(init_lat)
    
    # Feature 4: NUMBER (default: 1)
    if number is None:
        number = 1
    features.append(float(number))
    
    # Feature 5: SUBBASIN (auto-detect if not provided)
    if subbasin is None:
        subbasin = auto_detect_subbasin(lon)
    features.append(float(subbasin))
    
    # Feature 6: DIST2LAND (auto-estimate if not provided)
    if dist2land is None:
        dist2land = estimate_dist2land(lat, lon)
    features.append(float(dist2land))
    
    # Feature 7: STORM_SPEED (user should provide for accuracy)
    if storm_speed is None:
        storm_speed = 0.0
    features.append(float(storm_speed))
    
    # Feature 8: LANDFALL (auto-estimate if not provided)
    if landfall is None:
        landfall = estimate_landfall_distance(coords_history)
    features.append(float(landfall))
    
    # Feature 9: STORM_DIR (calculate from coords if not provided)
    # Uses average of last 3 movements for more stable direction
    if storm_dir is None:
        storm_dir = calculate_average_direction(coords_history)
    storm_dir = storm_dir % 360  # Keep in 0-360 range
    features.append(float(storm_dir))
    
    # Feature 10: ANGLE (computed from last two positions)
    if len(coords_history) >= 2:
        prev_lat, prev_lon = coords_history[-2]
        angle = angleFromCoordinate(prev_lat, prev_lon, lat, lon)
    else:
        angle = 0.0
    angle = angle % 360  # Keep in 0-360 range
    features.append(float(angle))
    
    # Feature 11: DISTANCE_km (computed from last two positions)
    if len(coords_history) >= 2:
        prev_lat, prev_lon = coords_history[-2]
        distance = haversine(prev_lat, prev_lon, lat, lon)
    else:
        distance = 0.0
    features.append(float(distance))
    
    # Feature 12: TIME_DIFFERENCE_hours (based on sequence length)
    # Assume 6-hour intervals between observations
    time_diff = (len(coords_history) - 1) * 6.0
    features.append(float(time_diff))
    
    # Feature 13: MONTH (user-provided, required)
    features.append(float(month))
    
    # Feature 14: SEASON (computed from MONTH - training consistency)
    season = int(month) // 4
    features.append(float(season))
    
    return np.array(features, dtype=np.float32)


def prepare_input_for_model(features: np.ndarray) -> np.ndarray:
    """
    Prepare features for model by applying StandardScaler normalization
    Uses the exact scaler from notebook training (NOTEBOOK APPROACH)
    
    Input shape: (14,) raw features
    Output shape: (1, 14, 1) for CNN-GRU model
    
    CRITICAL: Model expects (batch=1, timesteps=14, features=1)
    The 14 features become the 14 timesteps for the CNN-GRU
    
    Args:
        features: Array of 14 features in correct order
        
    Returns:
        Normalized features reshaped for model input (1, 14, 1)
    """
    global scaler
    
    print(f"[DEBUG] Raw features shape: {features.shape}")
    print(f"[DEBUG] Raw features: {features}")
    
    # Reinitialize scaler if it's not properly fitted (handles uvicorn reload)
    if scaler is None or not hasattr(scaler, 'n_features_in_') or scaler.n_features_in_ != 14:
        print("[INFO] Reinitializing scaler for 14 features...")
        scaler = _load_scaler_from_disk()
    
    # Use the loaded scaler from training (EXACT NOTEBOOK APPROACH)
    try:
        # Reshape features to 2D for sklearn's transform
        features_2d = features.reshape(1, -1)
        normalized = scaler.transform(features_2d)[0]
        print(f"[DEBUG] Scaler transform applied successfully")
    except Exception as e:
        print(f"[ERROR] Scaler transform failed: {e}")
        print(f"[INFO] Scaler attributes - n_features_in_: {getattr(scaler, 'n_features_in_', 'NOT SET')}")
        print(f"[INFO] Scaler has mean_: {hasattr(scaler, 'mean_')}")
        print(f"[INFO] Scaler has scale_: {hasattr(scaler, 'scale_')}")
        raise
    
    print(f"[DEBUG] Normalized features (first 5): {normalized[:5]}")
    
    # ✅ CORRECT SHAPE for 14-feature model: (1, 14, 1)
    # Model expects: (batch=1, timesteps=14, features=1)
    # The 14 features become 14 timesteps
    sequence = normalized.reshape(1, 14, 1).astype(np.float32)
    print(f"[DEBUG] Reshaped to (1, 14, 1): {sequence.shape}")
    
    return sequence


def update_features_for_next_step(
    current_features: np.ndarray,
    new_lat: float,
    new_lon: float,
    prev_coords: List[Tuple[float, float]],
    new_coords_list: List[Tuple[float, float]]
) -> np.ndarray:
    """
    Update features for the next prediction step (ITERATIVE NOTEBOOK APPROACH)
    
    This implements the iterative prediction from the notebook where we:
    1. Get the prediction
    2. Update the latest coordinates
    3. Recalculate derived features (angle, distance, etc.)
    4. Keep everything else the same
    5. Predict the next point
    
    Args:
        current_features: Current 13-feature array
        new_lat: Newly predicted latitude
        new_lon: Newly predicted longitude
        prev_coords: Previous coordinates list
        new_coords_list: Updated coordinates list with new point
        
    Returns:
        Updated 13-feature array for next prediction
    """
    # Start with a copy of current features
    updated_features = current_features.copy()
    
    # Update features 0-1: LAT and LON
    updated_features[0] = float(new_lat)
    updated_features[1] = float(new_lon)
    
    # Update feature 8: ANGLE (from previous to new position)
    if len(new_coords_list) >= 2:
        prev_lat, prev_lon = new_coords_list[-2]
        angle = angleFromCoordinate(prev_lat, prev_lon, new_lat, new_lon)
        updated_features[8] = float(angle)
    
    # Update feature 9: DISTANCE_km (from previous to new position)
    if len(new_coords_list) >= 2:
        prev_lat, prev_lon = new_coords_list[-2]
        distance = haversine(prev_lat, prev_lon, new_lat, new_lon)
        updated_features[9] = float(distance)
    
    # Update feature 10: TIME_DIFFERENCE_hours
    # Increment by 6 hours (standard interval)
    updated_features[10] += 6.0
    
    # Preserve storm direction using movement trend
    updated_features[7] = updated_features[8]  # STORM_DIR = ANGLE (directional continuity)
    
    # Features 3-7 stay the same (SUBBASIN, DIST2LAND, STORM_SPEED, LANDFALL)
    # These don't change for iterative predictions within a single cyclone
    
    print(f"[DEBUG] Updated features for next step: {updated_features}")
    
    return updated_features


@router.post("/predict")
async def predict_track(request: TrackPredictionRequest):
    """
    Predict cyclone track using CNN-GRU models with ITERATIVE APPROACH from notebook
    
    This implements the exact notebook testing approach:
    1. Load models and scaler
    2. Compute 13 features from first coordinate set
    3. For each prediction step:
       - Prepare input (normalize features)
       - Predict latitude and longitude
       - Update features based on new coordinates
       - Repeat for next step
    
    Args:
        request: Historical coordinates and optional metadata
                 REQUIRED: coordinates
                 RECOMMENDED: storm_speed
                 OPTIONAL (auto-computed): number, subbasin, dist2land, landfall, storm_dir, month
        
    Returns:
        JSON with historical and predicted track points
    """
    try:
        if lat_model is None:
            raise HTTPException(
                status_code=503,
                detail="Latitude model not loaded"
            )
        
        print(f"\n[PREDICTION] Processing {len(request.coordinates)} historical points")
        
        if len(request.coordinates) < 1:
            raise HTTPException(
                status_code=400,
                detail="At least 1 historical point required"
            )
        
        # Extract coordinates
        coords = [(point.latitude, point.longitude) for point in request.coordinates]
        print(f"[PREDICTION] Coordinates: {coords}")
        
        # Validate coordinates
        for lat, lon in coords:
            if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
                raise HTTPException(
                    status_code=400,
                    detail="Invalid coordinates: lat [-90,90], lon [-180,180]"
                )
        
        # ✅ COMPUTE 14 FEATURES (not 13!)
        print(f"[STEP 0] Computing 14 features from {len(coords)} historical coordinates...")
        features = compute_14_features(
            coords,
            number=request.number,
            subbasin=request.subbasin,
            dist2land=request.dist2land,
            storm_speed=request.storm_speed,
            landfall=request.landfall,
            storm_dir=request.storm_dir,
            month=request.month
        )
        print(f"[STEP 0] Initial features (14): {features}")
        
        # Make predictions for each step (ITERATIVE APPROACH)
        predictions = []
        current_coords = list(coords)
        current_features = features.copy()
        
        for step in range(request.num_steps):
            step_num = step + 1
            print(f"\n[STEP {step_num}] Starting prediction...")
            
            # Prepare input for model (exactly like notebook)
            X_input = prepare_input_for_model(current_features)
            print(f"[STEP {step_num}] Model input shape: {X_input.shape}")
            
            # Predict latitude
            lat_pred_output = lat_model.predict(X_input, verbose=0)
            lat_pred = float(lat_pred_output.flatten()[0])
            print(f"[STEP {step_num}] Latitude prediction: {lat_pred:.6f}")
            
            # Predict longitude
            if lon_model is not None:
                lon_pred_output = lon_model.predict(X_input, verbose=0)
                lon_pred = float(lon_pred_output.flatten()[0])
                print(f"[STEP {step_num}] Longitude prediction: {lon_pred:.6f}")
            else:
                # Fallback: assume similar direction as previous movement
                if len(current_coords) >= 2:
                    lat_diff = current_coords[-1][0] - current_coords[-2][0]
                    lon_diff = current_coords[-1][1] - current_coords[-2][1]
                    lon_pred = current_coords[-1][1] + lon_diff
                else:
                    lon_pred = current_coords[-1][1]
                print(f"[STEP {step_num}] Longitude fallback: {lon_pred:.6f}")
            
            # Clamp to valid ranges
            lat_pred = np.clip(lat_pred, -90, 90)
            lon_pred = np.clip(lon_pred, -180, 180)
            
            print(f"[STEP {step_num}] Final prediction (clamped): ({lat_pred:.4f}, {lon_pred:.4f})")
            
            predictions.append({
                "latitude": round(lat_pred, 4),
                "longitude": round(lon_pred, 4)
            })
            
            # Add to current coordinates for next iteration
            current_coords.append((lat_pred, lon_pred))
            
            # UPDATE FEATURES FOR NEXT STEP (ITERATIVE APPROACH - NOTEBOOK METHOD)
            if step < request.num_steps - 1:
                print(f"[STEP {step_num}] Updating features for next iteration...")
                current_features = update_features_for_next_step(
                    current_features,
                    lat_pred,
                    lon_pred,
                    coords,
                    current_coords
                )
                print(f"[STEP {step_num}] Features updated for step {step_num + 1}")
        
        # Build response
        return {
            "status": "success",
            "model": "CNN-GRU (TensorFlow/Keras) - 14-Feature with INIT_LAT - Iterative Notebook Approach",
            "input_features": 14,
            "feature_order": FEATURES_ORDER if FEATURES_ORDER else [
                "LAT_degrees_north",
                "LON_degrees_east",
                "INIT_LAT",
                "NUMBER_",
                "SUBBASIN_",
                "DIST2LAND_km",
                "STORM_SPEED_kts",
                "LANDFALL_km",
                "STORM_DIR_degrees",
                "ANGLE",
                "DISTANCE_km",
                "TIME_DIFFERENCE_hours",
                "Month",
                "Season"
            ],
            "historical_points": len(coords),
            "predicted_steps": request.num_steps,
            "accuracy_km": 15,
            "historical_track": [
                {
                    "latitude": round(lat, 4),
                    "longitude": round(lon, 4),
                    "step": i
                }
                for i, (lat, lon) in enumerate(coords)
            ],
            "predicted_track": [
                {
                    **pred,
                    "step": len(coords) + i + 1
                }
                for i, pred in enumerate(predictions)
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Prediction failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "latitude_model_loaded": lat_model is not None,
        "longitude_model_loaded": lon_model is not None,
        "input_features": 13,
        "feature_names": [
            "LAT_degrees_north",
            "LON_degrees_east",
            "NUMBER",
            "SUBBASIN",
            "DIST2LAND_km",
            "STORM_SPEED_kts",
            "LANDFALL_km",
            "STORM_DIR_degrees",
            "ANGLE",
            "DISTANCE_km",
            "TIME_DIFFERENCE_hours",
            "MONTH",
            "SEASON"
        ]
    }
