"""Cyclone Intensity Prediction Model"""
import torch
import torch.nn as nn
import torchvision.transforms as transforms
import cv2
import numpy as np
from pathlib import Path
from PIL import Image


class IntensityCNN(nn.Module):
    """CNN model for cyclone intensity prediction from satellite images
    Exact architecture matching CrossKnotHacks-Cyclonet"""
    
    def __init__(self):
        super(IntensityCNN, self).__init__()
        
        # Match EXACT architecture from CrossKnotHacks-Cyclonet
        self.model = nn.Sequential(
            nn.Conv2d(3, 256, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(),
            nn.Conv2d(256, 256, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(256, 128, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.Conv2d(128, 128, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(128, 64, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.Conv2d(64, 64, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(64, 32, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.Conv2d(32, 32, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(32, 16, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(16),
            nn.ReLU(),
            nn.Conv2d(16, 16, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(16),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Flatten(),
            nn.Linear(784, 1)
        )
    
    def forward(self, x):
        return self.model(x)


class IntensityPredictor:
    """Wrapper for intensity prediction with image preprocessing"""
    
    def __init__(self, model_path: str = None, device: str = "cpu"):
        self.device = torch.device(device)
        self.model = IntensityCNN().to(self.device)
        self.model.eval()
        
        # Default model path
        if model_path is None:
            # Try to find model in models directory
            default_path = Path(__file__).parent.parent.parent / "models" / "saved_modelcyclone"
            if default_path.exists():
                model_path = str(default_path)
        
        if model_path and Path(model_path).exists():
            self.load_weights(model_path)
        else:
            print(f"Warning: Model file not found at {model_path}. Using untrained model.")
    
    def load_weights(self, model_path: str):
        """Load pre-trained weights"""
        try:
            checkpoint = torch.load(model_path, map_location=self.device)
            self.model.load_state_dict(checkpoint)
            print(f"Model weights loaded from {model_path}")
        except Exception as e:
            print(f"Warning: Could not load model weights: {e}")
            print(f"Error details: {type(e).__name__}: {str(e)}")
    
    def preprocess_image(self, image_array: np.ndarray) -> torch.Tensor:
        """
        Preprocess satellite image for model input
        Match EXACT training preprocessing - NO normalization, NO RGB conversion
        
        This matches the original Flask code exactly:
        image = cv2.imread(image_path)  # BGR format
        image = np.array(image)         # Keep as BGR numpy array
        transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Resize((250, 250))
        ])
        image = transform(image).unsqueeze(0)
        
        Training code also shows:
        img = cv2.imread(path)  # BGR
        img = np.array(img)     # BGR numpy
        totensor = transforms.ToTensor()
        img = totensor(img)     # Direct numpy to tensor
        
        Args:
            image_array: Input image as numpy array (BGR from cv2)
            
        Returns:
            Preprocessed tensor (1, 3, 250, 250)
        """
        # Match EXACT training preprocessing from original Flask code
        # NO normalization, NO RGB conversion
        
        # Ensure it's a numpy array and uint8 (matching cv2.imread output)
        if isinstance(image_array, np.ndarray):
            if image_array.dtype != np.uint8:
                image_array = image_array.astype(np.uint8)
        else:
            image_array = np.array(image_array, dtype=np.uint8)
        
        # Match EXACT original Flask code preprocessing
        # The original code does: transform(image) where image is numpy array
        # transforms.ToTensor() can accept numpy arrays in some PyTorch versions
        # But to be safe and match exactly, we convert to PIL first
        # PIL.fromarray() expects RGB, but we pass BGR - this causes channel swap
        # This channel swap is what the model was trained on (BGR interpreted as RGB)
        image = Image.fromarray(image_array)
        
        # Match EXACT training preprocessing - NO normalization, NO RGB conversion
        # Order: ToTensor first (converts PIL to tensor [0,1] and CHW), then Resize
        # This matches: transforms.Compose([transforms.ToTensor(), transforms.Resize((250, 250))])
        transform = transforms.Compose([
            transforms.ToTensor(),      # Converts PIL Image to tensor [0,1] and CHW format
            transforms.Resize((250, 250))  # Resize to 250x250
        ])
        
        tensor = transform(image).unsqueeze(0).to(self.device)
        return tensor
    
    def predict(self, image_array: np.ndarray) -> dict:
        """
        Predict cyclone intensity from satellite image
        
        Args:
            image_array: Input satellite image (numpy array from cv2)
            
        Returns:
            Dictionary with intensity prediction in knots and metadata
        """
        with torch.no_grad():
            tensor = self.preprocess_image(image_array)
            output = self.model(tensor)
            
            # Get raw prediction
            intensity_knots = float(output.item())
            
            # Clip to valid range (0-150 knots)
            intensity_knots = max(0, min(150, intensity_knots))
        
        category = self._categorize_intensity(intensity_knots)
        risk_level = self._get_risk_level(intensity_knots)
        
        return {
            "intensity_knots": round(intensity_knots, 2),
            "intensity_category": category,
            "risk_level": risk_level,
            "category_code": self._get_category_code(intensity_knots)
        }
    
    @staticmethod
    def _get_risk_level(knots: float) -> str:
        """Get risk level based on intensity"""
        if knots < 34:
            return "Low"
        elif knots < 64:
            return "Moderate"
        elif knots < 96:
            return "High"
        elif knots < 135:
            return "Very High"
        else:
            return "Extreme"
    
    @staticmethod
    def _get_category_code(knots: float) -> str:
        """Get category code (TD, TS, Cat-1, etc.)"""
        if knots < 34:
            return "TD"
        elif knots < 64:
            return "TS"
        elif knots < 96:
            return "Cat-1"
        elif knots < 112:
            return "Cat-2"
        elif knots < 135:
            return "Cat-3"
        else:
            return "Cat-4"
    
    @staticmethod
    def _categorize_intensity(knots: float) -> str:
        """Categorize intensity based on knots"""
        if knots < 34:
            return "Tropical Depression"
        elif knots < 64:
            return "Tropical Storm"
        elif knots < 96:
            return "Category 1 (Severe Cyclonic Storm)"
        elif knots < 112:
            return "Category 2 (Very Severe Cyclonic Storm)"
        elif knots < 135:
            return "Category 3 (Extremely Severe Cyclonic Storm)"
        else:
            return "Category 4 (Super Cyclone)"
