"""Intensity Prediction Routes"""
from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import cv2
import numpy as np
from ..models import IntensityPredictor

router = APIRouter(prefix="/api/intensity", tags=["intensity"])

# Initialize predictor with explicit model path
from pathlib import Path

# Get the correct intensity model path
intensity_model_path = Path(__file__).parent.parent.parent / "models" / "saved_modelcyclone"

predictor = IntensityPredictor(
    model_path=str(intensity_model_path) if intensity_model_path.exists() else None,
    device="cpu"
)


class IntensityMetadata(BaseModel):
    """Optional metadata for intensity prediction"""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timestamp: Optional[str] = None


@router.post("/predict")
async def predict_intensity(
    file: UploadFile = File(...),
    latitude: Optional[float] = None,
    longitude: Optional[float] = None
):
    """
    Predict cyclone intensity from satellite image
    
    Args:
        file: INSAT-3D satellite image (PNG, JPG)
        latitude: Optional latitude coordinate
        longitude: Optional longitude coordinate
        
    Returns:
        Intensity prediction in knots, category, risk level, and metadata
    """
    try:
        # Validate file type
        if file.content_type not in ["image/png", "image/jpeg", "image/jpg"]:
            raise HTTPException(status_code=400, detail="Only PNG and JPEG images accepted")
        
        # Read image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Could not decode image")
        
        # Get prediction
        result = predictor.predict(image)
        
        # Add metadata if provided
        if latitude is not None and longitude is not None:
            result["location"] = {
                "latitude": latitude,
                "longitude": longitude
            }
        
        return JSONResponse({
            "status": "success",
            "data": result,
            "metadata": {
                "filename": file.filename,
                "content_type": file.content_type,
                "image_size": {
                    "height": image.shape[0],
                    "width": image.shape[1]
                }
            }
        })
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model": "IntensityCNN",
        "device": str(predictor.device)
    }
