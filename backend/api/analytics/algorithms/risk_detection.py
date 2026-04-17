import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier

def predict_project_risk(tasks_df, overdue_count, inactivity_days, model_payload=None):
    total_tasks = len(tasks_df)
    
    # 1. DERIVE IMPACT (Calculated from workload)
    # We look at task complexity if it exists, otherwise use volume.
    # If tasks_df has a 'complexity' column (1-5), we average it.
    if 'complexity' in tasks_df.columns:
        avg_complexity = tasks_df['complexity'].mean()
    elif 'priority' in tasks_df.columns:
        # Map priority to numerical values (scaled up to 5)
        priority_map = {'low': 2.0, 'medium': 3.0, 'high': 5.0}
        
        # Consider the priority of active tasks to accurately determine risk impact
        active_tasks = tasks_df[tasks_df['status'] != 'completed']
        target_df = active_tasks if not active_tasks.empty else tasks_df
        
        priorities = target_df['priority'].fillna('medium').astype(str).str.lower()
        mapped_priorities = priorities.map(priority_map).fillna(3.0)
        
        # Use max to ensure a critical/high-priority task accurately flags the project impact as high
        avg_complexity = mapped_priorities.max() if not mapped_priorities.empty else 1
    else:
        # Fallback: Higher task volume = Higher Impact on the project
        avg_complexity = min(5, max(1, (total_tasks / 10))) 

    # 2. Prediction using the passed model payload
    risk_label = "Low"
    if model_payload:
        try:
            model = model_payload['model']
            scaler = model_payload['scaler']

            # Prepare the exact 3 features used in training
            features = np.array([[inactivity_days, total_tasks, overdue_count]])
            features_scaled = scaler.transform(features)

            # Ensure features match your .pkl training (Overdue, Inactivity, Total)
            prediction = model.predict(features_scaled)[0]
            risk_label = {0: "Low", 1: "Medium", 2: "High"}.get(prediction, "Low")
        except Exception as e:
            print(f"Prediction Error: {e}")

    # 3. MAP TO MATRIX (1-5 Scales)
    # Likelihood is based on overdue ratio, while Impact is based on complexity/volume.
    overdue_ratio = overdue_count / total_tasks if total_tasks > 0 else 0
    likelihood_score = min(5, max(1, int(overdue_ratio * 5) + 1))
    
    # Impact = how much this failure matters (based on task weight/volume)
    impact_score = min(5, max(1, round(avg_complexity)))

    return {
        "status": risk_label,
        "likelihood": likelihood_score, # X-axis
        "impact": impact_score,         # Y-axis
        "score": likelihood_score * impact_score # For ApexCharts heatmap color
    }