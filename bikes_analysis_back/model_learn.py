import pandas as pd
import numpy as np
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.metrics import mean_absolute_error, root_mean_squared_error
import os

# Загрузка датасета
print("Загрузка датасета...")
data = pd.read_csv('hour.csv')

# Создание новых признаков (взаимодействия)
data['temp_weathersit'] = data['temp'] * data['weathersit']
data['temp_hum'] = data['temp'] * data['hum']

# Выбор признаков и целевой переменной
features = ['season', 'yr', 'mnth', 'hr', 'weekday', 'weathersit', 'temp', 'hum', 'windspeed', 'holiday', 'workingday', 'temp_weathersit', 'temp_hum']
target = 'cnt'

# Логарифмическое преобразование целевой переменной (добавляем 1, чтобы избежать log(0))
data['log_cnt'] = np.log1p(data[target])

X = data[features]
y = data['log_cnt']

# Разделение на тренировочную и тестовую выборки (80/20)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Инициализация модели XGBoost
base_model = XGBRegressor(random_state=42)

# Расширенная настройка гиперпараметров
param_grid = {
    'n_estimators': [200, 300],
    'max_depth': [5, 7],
    'learning_rate': [0.01, 0.05],
    'reg_lambda': [0.1, 1.0],  # L2 регуляризация
    'reg_alpha': [0.0, 0.1]    # L1 регуляризация
}

print("Поиск оптимальных гиперпараметров...")
grid_search = GridSearchCV(
    estimator=base_model,
    param_grid=param_grid,
    scoring='neg_mean_absolute_error',
    cv=5,
    n_jobs=-1,
    verbose=1
)
grid_search.fit(X_train, y_train)

# Лучшая модель
model = grid_search.best_estimator_
print("Лучшие гиперпараметры:", grid_search.best_params_)

# Оценка модели
y_pred_log = model.predict(X_test)
y_pred = np.expm1(y_pred_log)  # Обратное преобразование из log
y_test_original = np.expm1(y_test)

mae = mean_absolute_error(y_test_original, y_pred)
rmse = root_mean_squared_error(y_test_original, y_pred)
print(f"MAE: {mae:.2f}")
print(f"RMSE: {rmse:.2f}")

# Сохранение модели
print("Сохранение модели...")
model.save_model('model.json')
print("Модель сохранена как 'model.json'")