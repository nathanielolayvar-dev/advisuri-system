import os
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, '..', 'risk_model.pkl')

def predict_project_risk(tasks_df, overdue_count, inactivity_days):
    total_tasks = len(tasks_df)
    overdue_ratio = overdue_count / total_tasks if total_tasks > 0 else 0
    
    # 1. DERIVE IMPACT (Calculated from workload)
    # We look at task complexity if it exists, otherwise use volume.
    # If tasks_df has a 'complexity' column (1-5), we average it.
    if 'complexity' in tasks_df.columns:
        avg_complexity = tasks_df['complexity'].mean()
    else:
        # Fallback: Higher task volume = Higher Impact on the project
        avg_complexity = min(5, (total_tasks / 2)) 

    # 2. ML PREDICTION (Your existing logic)
    risk_label = "Low"
    if os.path.exists(MODEL_PATH):
        try:
            model = joblib.load(MODEL_PATH)
            # Ensure features match your .pkl training (Overdue, Inactivity, Total)
            prediction = model.predict([[overdue_ratio, inactivity_days, total_tasks]])[0]
            risk_label = {0: "Low", 1: "Medium", 2: "High"}.get(prediction, "Low")
        except:
            pass

    # 3. MAP TO MATRIX (1-5 Scales)
    # Likelihood = How likely they are to fail (based on past behavior)
    likelihood_score = min(5, max(1, int(overdue_ratio * 5) + 1))
    
    # Impact = how much this failure matters (based on task weight/volume)
    impact_score = min(5, max(1, int(avg_complexity)))

    return {
        "status": risk_label,
        "likelihood": likelihood_score, # X-axis
        "impact": impact_score,         # Y-axis
        "score": likelihood_score * impact_score # For ApexCharts heatmap color
    }