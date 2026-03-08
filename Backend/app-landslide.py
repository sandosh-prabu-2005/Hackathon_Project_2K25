
import io
import os

# Silence oneDNN info logs (optional performance tradeoff)
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")
import numpy as np
import h5py
import tensorflow as tf
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse # type: ignore
from fastapi.staticfiles import StaticFiles # type: ignore
from PIL import Image

IMG_H, IMG_W = 128, 128
THRESHOLD = 0.5
MODEL_PATH = "best_resnet18_seg.keras"

app = FastAPI(title="Landslide Segmentation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "Frontend")
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="frontend")

model = None

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

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    if not os.path.exists(MODEL_PATH):
        print(f"❌ Model file not found: {MODEL_PATH}")
    model = tf.keras.models.load_model(MODEL_PATH, compile=False) # type: ignore
    print("✅ Model loaded:", MODEL_PATH)
    yield

app.router.lifespan_context = lifespan

@app.get("/")
def home():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """
    Upload a .h5 / .hdf5 file containing dataset key 'img'.
    Returns ONLY the predicted mask as PNG.
    """
    try:
        contents = await file.read()
        with h5py.File(io.BytesIO(contents), "r") as hdf:
            if "img" not in hdf.keys():
                return JSONResponse(status_code=400, content={
                    "error": f"H5 does not contain 'img'. Available keys: {list(hdf.keys())}"
                })
            data = np.array(hdf["img"])

        x = build_6ch_features(data)
        pred = model.predict(x[None, ...], verbose=0)[0, :, :, 0] # type: ignore
        mask = (pred > THRESHOLD).astype(np.uint8)

        png = mask_to_png_bytes(mask)
        return StreamingResponse(io.BytesIO(png), media_type="image/png")

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/predict_all")
async def predict_all(file: UploadFile = File(...)):
    """
    Upload a .h5 / .hdf5 file containing dataset key 'img'.

    Returns a JSON with:
    - risk_percent (float)
    - mask_png (base64)
    - overlay_png (base64)
    - rgb_png (base64)

    Frontend can display 3 outputs.
    """
    import base64
    try:
        contents = await file.read()
        with h5py.File(io.BytesIO(contents), "r") as hdf:
            if "img" not in hdf.keys():
                return JSONResponse(status_code=400, content={
                    "error": f"H5 does not contain 'img'. Available keys: {list(hdf.keys())}"
                })
            data = np.array(hdf["img"])

        x = build_6ch_features(data)

        # RGB view from our normalized x: channels 0..2 are inverted normalized RGB
        # Convert to a display RGB in [0,1]
        rgb = 1.0 - np.clip(x[:, :, 0:3], 0, 1)

        pred = model.predict(x[None, ...], verbose=0)[0, :, :, 0] # type: ignore
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
