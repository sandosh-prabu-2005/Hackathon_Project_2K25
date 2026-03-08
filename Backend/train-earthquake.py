import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

# Load dataset
df = pd.read_csv("./archive/Eartquakes-1990-2023.csv")

# Normalize column names
df.columns = df.columns.str.strip().str.lower()
print("Columns:", df.columns.tolist())

# Clean data
df = df.dropna()
df['time'] = pd.to_datetime(df['time'])

# Feature engineering
df['year'] = df['time'].dt.year
df['month'] = df['time'].dt.month

# 🔥 BINARY RISK LABELING
def risk_level(mag):
    if mag < 4.0:
        return 0   # Low Risk
    else:
        return 1   # Elevated Risk (Medium + High)

df['risk'] = df['magnitudo'].apply(risk_level)

# Features and target
X = df[['latitude', 'longitude', 'depth', 'year', 'month']]
y = df['risk']

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# XGBoost binary classifier
model = xgb.XGBClassifier(
    objective='binary:logistic',
    n_estimators=300,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    eval_metric='logloss',
    random_state=42
)

# Train
model.fit(X_train, y_train)

# Predict
preds = (model.predict_proba(X_test)[:, 1] >= 0.5).astype(int)

# Metrics
accuracy = accuracy_score(y_test, preds)
print(f"\nXGBoost Accuracy: {accuracy:.4f}\n")

print("Classification Report:")
print(classification_report(
    y_test,
    preds,
    target_names=["Low Risk", "Elevated Risk"]
))

print("Confusion Matrix:")
print(confusion_matrix(y_test, preds))

# Save model
model.save_model("xgb_model.json")
print("\nModel saved as xgb_model.json")