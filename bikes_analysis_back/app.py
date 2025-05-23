import logging
from flask import Flask, request, jsonify
import json
import os
from xgboost import XGBRegressor
import numpy as np
import uuid
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Разрешить все источники

# Настройка логирования
logging.basicConfig(filename='app.log', level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger()

# Инициализация файла database.json
DB_FILE = 'database.json'
if not os.path.exists(DB_FILE):
    with open(DB_FILE, 'w') as f:
        json.dump({"predictions": [], "actuals": []}, f)

# Загрузка модели
model = XGBRegressor()
model.load_model('model.json')

# Функции для работы с базой данных
def load_db():
    with open(DB_FILE, 'r') as f:
        return json.load(f)

def save_db(data):
    with open(DB_FILE, 'w') as f:
        json.dump(data, f)

# Функции нормализации
def normalize_temp(temp):
    return (temp - (-8)) / (41 - (-8))

def normalize_humidity(humidity):
    return humidity / 100.0

def normalize_windspeed(windspeed):
    return windspeed / 67.0

# Проверка обязательных параметров
def validate_input(data):
    required = ['season', 'mnth', 'hr', 'weekday', 'temp']
    for param in required:
        if param not in data or not data[param]:
            return False, f"Параметр {param} обязателен"
    return True, ""

# Эндпоинт /predict (POST)
@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    logger.info(f"Received prediction request: {data}")

    is_valid, error_msg = validate_input(data)
    if not is_valid:
        logger.error(f"Validation failed: {error_msg}")
        return jsonify({"error": error_msg}), 400

    season = float(data.get('season'))
    mnth = float(data.get('mnth'))
    hr = float(data.get('hr'))
    weekday = float(data.get('weekday'))
    temp = float(data.get('temp'))
    weathersit = float(data.get('weathersit', 2))
    hum = float(data.get('hum', 50.0))
    windspeed = float(data.get('windspeed', 0.0))
    holiday = data.get('holiday', 'false') == 'true'
    workingday = data.get('workingday', 'true') == 'true'
    
    temp_normalized = normalize_temp(temp)
    hum_normalized = normalize_humidity(hum)
    windspeed_normalized = normalize_windspeed(windspeed)
    
    temp_weathersit = temp_normalized * weathersit
    temp_hum = temp_normalized * hum_normalized
    
    yr = 1
    
    input_data = np.array([[season, yr, mnth, hr, weekday, weathersit, temp_normalized, hum_normalized, windspeed_normalized, 1 if holiday else 0, 1 if workingday else 0, temp_weathersit, temp_hum]])
    
    prediction_log = model.predict(input_data)[0]
    prediction = np.expm1(prediction_log)
    
    db = load_db()
    request_id = str(uuid.uuid4())
    db["predictions"].append({
        "request_id": request_id,
        "prediction": float(prediction),
        "season": season,
        "yr": yr,
        "mnth": mnth,
        "hr": hr,
        "weekday": weekday,
        "weathersit": weathersit,
        "temp": temp,
        "hum": hum,
        "windspeed": windspeed,
        "holiday": holiday,
        "workingday": workingday,
        "timestamp": "2025-05-23T17:49:00Z"
    })
    save_db(db)
    logger.info(f"Prediction {prediction} saved with request_id {request_id}")
    
    return jsonify({"prediction": float(prediction), "request_id": request_id})

# Эндпоинт /predict (GET)
@app.route('/predict', methods=['GET'])
def get_history():
    logger.info("Fetching history")
    db = load_db()
    history = db["predictions"]
    for p in history:
        actual = next((a["actual_rentals"] for a in db["actuals"] if a["request_id"] == p["request_id"]), None)
        p["actual"] = actual
    return jsonify({"history": history})

# Эндпоинт /update-actual (POST)
@app.route('/update-actual', methods=['POST'])
def update_actual():
    data = request.json
    request_id = data.get('request_id')
    actual_rentals = float(data.get('actual_rentals'))
    logger.info(f"Updating actual for request_id {request_id} with value {actual_rentals}")

    if not request_id or actual_rentals is None:
        logger.error("Missing request_id or actual_rentals")
        return jsonify({"error": "request_id и actual_rentals обязательны"}), 400

    db = load_db()
    existing_actual = None
    for i, actual in enumerate(db["actuals"]):
        if actual["request_id"] == request_id:
            existing_actual = i
            break
    
    new_actual = {
        "request_id": request_id,
        "actual_rentals": actual_rentals,
        "timestamp": "2025-05-23T17:49:00Z"
    }
    
    if existing_actual is not None:
        db["actuals"][existing_actual] = new_actual
        logger.info(f"Actual updated for request_id {request_id}")
    else:
        db["actuals"].append(new_actual)
        logger.info(f"New actual added for request_id {request_id}")
    
    save_db(db)
    return jsonify({"status": "updated"})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)