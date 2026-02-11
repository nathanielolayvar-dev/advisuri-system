import os
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, '..', 'risk_model.pkl')

def predict_project_risk(tasks_df, overdue_count, inactivity_days):
    total_tasks = len(tasks_df)
    overdue_ratio = overdue_count / total_tasks if total_tasks > 0 else 0

    # OPTION 1: Try to use the Scikit-Learn .pkl file
    if os.path.exists(MODEL_PATH):
        try:
            model = joblib.load(MODEL_PATH)
            prediction = model.predict([[overdue_ratio, inactivity_days, total_tasks]])[0]
            return {0: "Low", 1: "Medium", 2: "High"}.get(prediction, "Low")
        except:
            pass # If loading fails, move to fallback

    # OPTION 2: The "Heuristic" Fallback (No Scikit-Learn needed)
    # This acts as a 'safety net' so your UI still shows data
    if overdue_ratio > 0.5 or inactivity_days > 7:
        return "High"
    elif overdue_ratio > 0.2 or inactivity_days > 3:
        return "Medium"
    
    return "Low"