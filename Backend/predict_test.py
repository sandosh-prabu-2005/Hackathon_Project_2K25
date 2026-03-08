import os, glob
import numpy as np
import h5py
import tensorflow as tf
import matplotlib.pyplot as plt

IMG_H, IMG_W = 128, 128
THRESHOLD = 0.5

# CHANGE THIS PATH
TEST_IMG_GLOB = r"D:\CUCKS AITHON\Landslide\Dataset\Test Data\*.h5"

MODEL_PATH = "best_resnet18_seg.keras"
OUT_DIR = "predictions"
os.makedirs(OUT_DIR, exist_ok=True)

def build_6ch_features(data):
    data = np.array(data, dtype=np.float32)
    data[np.isnan(data)] = 0.000001

    mid_rgb = data[:, :, 1:4].max() / 2.0
    mid_slope = data[:, :, 12].max() / 2.0
    mid_elev = data[:, :, 13].max() / 2.0

    data_red = data[:, :, 3]
    data_nir = data[:, :, 7]
    data_ndvi = np.divide(data_nir - data_red, np.add(data_nir, data_red) + 1e-6)

    x = np.zeros((IMG_H, IMG_W, 6), dtype=np.float32)
    x[:, :, 0] = 1 - data[:, :, 3] / (mid_rgb + 1e-6)
    x[:, :, 1] = 1 - data[:, :, 2] / (mid_rgb + 1e-6)
    x[:, :, 2] = 1 - data[:, :, 1] / (mid_rgb + 1e-6)
    x[:, :, 3] = data_ndvi
    x[:, :, 4] = 1 - data[:, :, 12] / (mid_slope + 1e-6)
    x[:, :, 5] = 1 - data[:, :, 13] / (mid_elev + 1e-6)

    x[np.isnan(x)] = 0.000001
    return x

def main():
    model = tf.keras.models.load_model(MODEL_PATH, compile=False)
    files = sorted(glob.glob(TEST_IMG_GLOB))

    if len(files) == 0:
        print("No test files found. Check path:", TEST_IMG_GLOB)
        return

    print("Loaded model:", MODEL_PATH)
    print("Test files:", len(files))

    for i, fp in enumerate(files):
        with h5py.File(fp, "r") as hdf:
            data = np.array(hdf.get("img"))
            x = build_6ch_features(data)

        pred = model.predict(x[None, ...], verbose=0)[0, :, :, 0]
        pred_bin = (pred > THRESHOLD).astype(np.uint8)

        # Save predicted mask
        out_path = os.path.join(OUT_DIR, f"pred_{i+1:04d}.png")
        plt.imsave(out_path, pred_bin, cmap="gray")

        if i < 3:
            # show first 3 predictions
            plt.figure(figsize=(12,4))
            plt.subplot(1,3,1); plt.imshow(x[:,:,0:3]); plt.title("RGB"); plt.axis("off")
            plt.subplot(1,3,2); plt.imshow(pred, cmap="gray"); plt.title("Pred Prob"); plt.axis("off")
            plt.subplot(1,3,3); plt.imshow(pred_bin, cmap="gray"); plt.title("Pred Mask"); plt.axis("off")
            plt.show()

        print(f"[{i+1}/{len(files)}] saved: {out_path}")

    print("All predictions saved to:", OUT_DIR)

if __name__ == "__main__":
    main()
