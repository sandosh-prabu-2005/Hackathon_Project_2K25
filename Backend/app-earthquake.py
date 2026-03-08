from flask import Flask, request, jsonify, render_template
import xgboost as xgb
import numpy as np

app = Flask(__name__)

# Load trained XGBoost model (binary)
model = xgb.XGBClassifier()
model.load_model("xgb_model.json")

# Binary Risk mapping (OPTION 2)
risk_map = {
    0: "Low Risk",
    1: "Elevated Risk"
}

@app.route("/")
def home():
    return render_template("index.html")


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json

        # Parse inputs
        latitude = float(data["latitude"])# type: ignore
        longitude = float(data["longitude"])# type: ignore
        depth = float(data["depth"])# type: ignore
        year = int(data["year"]) # type: ignore
        month = int(data["month"])# type: ignore

        # Model input
        features = np.array([[latitude, longitude, depth, year, month]])

        # Raw model prediction (0 or 1)
        raw_prediction = int(model.predict(features)[0])

        # 🔥 Domain-aware post-processing
        adjusted_prediction = raw_prediction

        # Stable Peninsular India → Low Risk
        if raw_prediction == 1:
            if (
                8 <= latitude <= 20 and
                72 <= longitude <= 80 and
                depth <= 20
            ):
                adjusted_prediction = 0

        risk_label = risk_map[adjusted_prediction]

        return jsonify({
            "risk_code": adjusted_prediction,
            "risk_level": risk_label
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 400


if __name__ == "__main__":
    app.run(debug=True)
