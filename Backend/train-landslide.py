import os
import glob
import h5py
import numpy as np
import tensorflow as tf
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split

# -----------------------------
# 1) Dataset paths (EDIT THIS)
# -----------------------------
TRAIN_IMG_GLOB  = r"D:\CUCKS AITHON\Landslide\Dataset\Train Data\Train\*.h5"
TRAIN_MASK_GLOB = r"D:\CUCKS AITHON\Landslide\Dataset\Train Data\Validate\*.h5"

# OPTIONAL external validation set (only images)
VAL_IMG_GLOB = None
# Example:
# VAL_IMG_GLOB = r"D:\CUCKS AITHON\Landslide\Dataset\ValidData\*.h5"

# -----------------------------
# 2) Config
# -----------------------------
IMG_H = 128
IMG_W = 128
IN_CH = 6

EPOCHS = 100
BATCH_SIZE = 16
THRESHOLD = 0.5

MODEL_OUT = "best_resnet18_seg.keras"  # name kept, but it's UNet model

# -----------------------------
# 3) Fixed segmentation metrics
# -----------------------------
EPS = tf.keras.backend.epsilon()

def dice_coef(y_true, y_pred):
    y_true = tf.cast(y_true > 0.5, tf.float32)
    y_pred = tf.cast(y_pred > 0.5, tf.float32)
    intersection = tf.reduce_sum(y_true * y_pred)
    return (2.0 * intersection + EPS) / (tf.reduce_sum(y_true) + tf.reduce_sum(y_pred) + EPS)

def iou_m(y_true, y_pred):
    y_true = tf.cast(y_true > 0.5, tf.float32)
    y_pred = tf.cast(y_pred > 0.5, tf.float32)
    intersection = tf.reduce_sum(y_true * y_pred)
    union = tf.reduce_sum(y_true) + tf.reduce_sum(y_pred) - intersection
    return (intersection + EPS) / (union + EPS)

def precision_m(y_true, y_pred):
    y_true = tf.cast(y_true > 0.5, tf.float32)
    y_pred = tf.cast(y_pred > 0.5, tf.float32)
    tp = tf.reduce_sum(y_true * y_pred)
    fp = tf.reduce_sum((1 - y_true) * y_pred)
    return (tp + EPS) / (tp + fp + EPS)

def recall_m(y_true, y_pred):
    y_true = tf.cast(y_true > 0.5, tf.float32)
    y_pred = tf.cast(y_pred > 0.5, tf.float32)
    tp = tf.reduce_sum(y_true * y_pred)
    fn = tf.reduce_sum(y_true * (1 - y_pred))
    return (tp + EPS) / (tp + fn + EPS)

def f1_m(y_true, y_pred):
    p = precision_m(y_true, y_pred)
    r = recall_m(y_true, y_pred)
    return 2.0 * (p * r + EPS) / (p + r + EPS)

def dice_loss(y_true, y_pred):
    return 1.0 - dice_coef(y_true, y_pred)

def bce_dice_loss(y_true, y_pred):
    bce = tf.keras.losses.binary_crossentropy(y_true, y_pred)
    return bce + dice_loss(y_true, y_pred)

# -----------------------------
# 4) Load H5 dataset exactly like ipynb
# -----------------------------
def build_6ch_features(data):
    """
    data shape: (128,128,channels...) from h5['img']
    notebook uses:
      RGB => indices 1:4
      Red = data[:,:,3], Green = data[:,:,2], Blue=data[:,:,1]
      NDVI = (nir - red)/(nir+red) where nir=data[:,:,7], red=data[:,:,3]
      slope=data[:,:,12], elevation=data[:,:,13]
    """
    data = np.array(data, dtype=np.float32)
    data[np.isnan(data)] = 0.000001

    mid_rgb = data[:, :, 1:4].max() / 2.0
    mid_slope = data[:, :, 12].max() / 2.0
    mid_elev = data[:, :, 13].max() / 2.0

    data_red = data[:, :, 3]
    data_nir = data[:, :, 7]
    data_ndvi = np.divide(data_nir - data_red, np.add(data_nir, data_red) + 1e-6)

    x = np.zeros((IMG_H, IMG_W, 6), dtype=np.float32)
    x[:, :, 0] = 1 - data[:, :, 3] / (mid_rgb + 1e-6)   # RED
    x[:, :, 1] = 1 - data[:, :, 2] / (mid_rgb + 1e-6)   # GREEN
    x[:, :, 2] = 1 - data[:, :, 1] / (mid_rgb + 1e-6)   # BLUE
    x[:, :, 3] = data_ndvi                               # NDVI
    x[:, :, 4] = 1 - data[:, :, 12] / (mid_slope + 1e-6) # SLOPE
    x[:, :, 5] = 1 - data[:, :, 13] / (mid_elev + 1e-6)  # ELEVATION
    x[np.isnan(x)] = 0.000001
    return x

def load_train_data(img_glob, mask_glob, limit=None):
    all_img = sorted(glob.glob(img_glob))
    all_mask = sorted(glob.glob(mask_glob))

    if len(all_img) == 0:
        raise FileNotFoundError(f"No training images found at: {img_glob}")
    if len(all_mask) == 0:
        raise FileNotFoundError(f"No training masks found at: {mask_glob}")

    n = min(len(all_img), len(all_mask))
    if limit:
        n = min(n, limit)

    X = np.zeros((n, IMG_H, IMG_W, 6), dtype=np.float32)
    Y = np.zeros((n, IMG_H, IMG_W, 1), dtype=np.float32)

    for i in range(n):
        img_path = all_img[i]
        mask_path = all_mask[i]
        print(f"[{i+1}/{n}] IMG={os.path.basename(img_path)}  MASK={os.path.basename(mask_path)}")

        with h5py.File(img_path, "r") as hdf:
            data = np.array(hdf.get("img"))
            X[i] = build_6ch_features(data)

        with h5py.File(mask_path, "r") as hdf:
            mask = np.array(hdf.get("mask"))
            Y[i, :, :, 0] = mask

    return X, Y

# -----------------------------
# 5) UNet model exactly from notebook
# -----------------------------
def unet_model(img_h, img_w, img_channels):
    inputs = tf.keras.layers.Input((img_h, img_w, img_channels))

    c1 = tf.keras.layers.Conv2D(16, (3, 3), activation='relu', kernel_initializer='he_normal', padding='same')(inputs)
    c1 = tf.keras.layers.Dropout(0.1)(c1)
    c2 = tf.keras.layers.Conv2D(16, (3, 3), activation='relu', kernel_initializer='he_normal', padding='same')(c1)
    p2 = tf.keras.layers.MaxPooling2D((2, 2))(c2)

    c3 = tf.keras.layers.Conv2D(32, (3, 3), activation='relu', kernel_initializer='he_normal', padding='same')(p2)
    c3 = tf.keras.layers.Dropout(0.1)(c3)
    c4 = tf.keras.layers.Conv2D(32, (3, 3), activation='relu', kernel_initializer='he_normal', padding='same')(c3)
    p4 = tf.keras.layers.MaxPooling2D((2, 2))(c4)

    c5 = tf.keras.layers.Conv2D(64, (3, 3), activation='relu', kernel_initializer='he_normal', padding='same')(p4)
    c5 = tf.keras.layers.Dropout(0.2)(c5)
    c6 = tf.keras.layers.Conv2D(64, (3, 3), activation='relu', kernel_initializer='he_normal', padding='same')(c5)
    p6 = tf.keras.layers.MaxPooling2D((2, 2))(c6)

    c7 = tf.keras.layers.Conv2D(128, (3, 3), activation='relu', kernel_initializer='he_normal', padding='same')(p6)
    c7 = tf.keras.layers.Dropout(0.2)(c7)
    c8 = tf.keras.layers.Conv2D(128, (3, 3), activation='relu', kernel_initializer='he_normal', padding='same')(c7)
    p8 = tf.keras.layers.MaxPooling2D(pool_size=(2, 2))(c8)

    c9 = tf.keras.layers.Conv2D(256, (3, 3), activation='relu', kernel_initializer='he_normal', padding='same')(p8)
    c9 = tf.keras.layers.Dropout(0.3)(c9)
    c10 = tf.keras.layers.Conv2D(256, (3, 3), activation='relu', kernel_initializer='he_normal', padding='same')(c9)

    u11 = tf.keras.layers.Conv2DTranspose(128, (2, 2), strides=(2, 2), padding='same')(c10)
    u11 = tf.keras.layers.concatenate([u11, c8])
    c12 = tf.keras.layers.Conv2D(128, (3, 3), activation='relu', kernel_initializer='he_normal', padding='same')(u11)
    c12 = tf.keras.layers.Dropout(0.2)(c12)
    c12 = tf.keras.layers.Conv2D(128, (3, 3), activation='relu', kernel_initializer='he_normal', padding='same')(c12)

    u13 = tf.keras.layers.Conv2DTranspose(64, (2, 2), strides=(2, 2), padding='same')(c12)
    u13 = tf.keras.layers.concatenate([u13, c6])
    c14 = tf.keras.layers.Conv2D(64, (3, 3), activation='relu', kernel_initializer='he_normal', padding='same')(u13)
    c14 = tf.keras.layers.Dropout(0.2)(c14)
    c14 = tf.keras.layers.Conv2D(64, (3, 3), activation='relu', kernel_initializer='he_normal', padding='same')(c14)

    u15 = tf.keras.layers.Conv2DTranspose(32, (2, 2), strides=(2, 2), padding='same')(c14)
    u15 = tf.keras.layers.concatenate([u15, c4])
    c16 = tf.keras.layers.Conv2D(32, (3, 3), activation='relu', kernel_initializer='he_normal', padding='same')(u15)
    c16 = tf.keras.layers.Dropout(0.1)(c16)
    c16 = tf.keras.layers.Conv2D(32, (3, 3), activation='relu', kernel_initializer='he_normal', padding='same')(c16)

    u17 = tf.keras.layers.Conv2DTranspose(16, (2, 2), strides=(2, 2), padding='same')(c16)
    u17 = tf.keras.layers.concatenate([u17, c2], axis=3)
    c18 = tf.keras.layers.Conv2D(16, (3, 3), activation='relu', kernel_initializer='he_normal', padding='same')(u17)
    c18 = tf.keras.layers.Dropout(0.1)(c18)
    c18 = tf.keras.layers.Conv2D(16, (3, 3), activation='relu', kernel_initializer='he_normal', padding='same')(c18)

    outputs = tf.keras.layers.Conv2D(1, (1, 1), activation='sigmoid')(c18)

    model = tf.keras.Model(inputs=[inputs], outputs=[outputs])

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-4),
        loss=bce_dice_loss,
        metrics=[dice_coef, iou_m, f1_m, precision_m, recall_m]
    )
    return model

# -----------------------------
# 6) MAIN
# -----------------------------
def main():
    print("TensorFlow:", tf.__version__)
    print("GPU:", tf.config.list_physical_devices('GPU'))

    # Load
    X, Y = load_train_data(TRAIN_IMG_GLOB, TRAIN_MASK_GLOB)

    print("X shape:", X.shape, "Y shape:", Y.shape)
    print("X min/max:", np.min(X), np.max(X), "Y min/max:", np.min(Y), np.max(Y))

    # Split (Notebook used shuffle=False)
    x_train, x_valid, y_train, y_valid = train_test_split(
        X, Y, test_size=0.2, shuffle=False
    )

    # Build model
    model = unet_model(IMG_H, IMG_W, IN_CH)
    model.summary()

    # Callbacks
    checkpointer = tf.keras.callbacks.ModelCheckpoint(
        filepath=MODEL_OUT,
        monitor="val_dice_coef",
        mode="max",
        save_best_only=True,
        verbose=1
    )
    callbacks = [checkpointer]

    # Train
    history = model.fit(
        x_train, y_train,
        batch_size=BATCH_SIZE,
        epochs=EPOCHS,
        verbose=2,
        validation_data=(x_valid, y_valid),
        callbacks=callbacks
    )

    # Save final
    model.save("final_model.keras")
    print("Saved: final_model.keras")
    print("Saved best: ", MODEL_OUT)

    # Evaluate
    loss, dice, iou, f1, prec, rec = model.evaluate(x_train, y_train, verbose=0)
    print("Train Eval -> loss, dice, iou, f1, precision, recall:", loss, dice, iou, f1, prec, rec)

    # Plot training curves (loss + dice)
    plt.figure(figsize=(12,5))
    plt.plot(history.history['loss'], label="train_loss")
    plt.plot(history.history['val_loss'], label="val_loss")
    plt.legend(); plt.title("Loss"); plt.grid(True); plt.show()

    plt.figure(figsize=(12,5))
    plt.plot(history.history['dice_coef'], label="train_dice")
    plt.plot(history.history['val_dice_coef'], label="val_dice")
    plt.legend(); plt.title("Dice"); plt.grid(True); plt.show()

    # Predict sample validation
    pred = model.predict(x_valid)
    pred_bin = (pred > THRESHOLD).astype(np.uint8)

    idx = 0
    fig, (ax1, ax2, ax3) = plt.subplots(1, 3, figsize=(15,5))
    ax1.imshow(pred_bin[idx, :, :, 0]); ax1.set_title("Prediction")
    ax2.imshow(y_valid[idx, :, :, 0]); ax2.set_title("Mask True")
    ax3.imshow(x_valid[idx, :, :, 0:3]); ax3.set_title("RGB")
    plt.show()

if __name__ == "__main__":
    main()
