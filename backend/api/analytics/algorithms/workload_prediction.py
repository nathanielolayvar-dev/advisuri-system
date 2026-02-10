import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler

def analyze_workload_dynamics(tasks_df, user_id=None):
    """
    Dual-purpose algorithm:
    1. Identifies team Bottlenecks (Statistical Outliers)
    2. Predicts individual Burnout (Volume + Velocity Stress)
    """
    if tasks_df.empty:
        return {"bottlenecks": [], "burnout_risk": "Low"}

    # --- PART 1: BOTTLENECK DETECTION (Group Level) ---
    active_work = tasks_df[tasks_df['status'].str.lower() != 'completed']
    
    # Count tasks per user
    user_counts = active_work['assigned_to'].value_counts().reset_index()
    user_counts.columns = ['user', 'task_count']

    bottlenecks = []
    if len(user_counts) > 1:
        # Use StandardScaler to find people with disproportionate loads
        scaler = StandardScaler()
        counts_array = user_counts['task_count'].values.reshape(-1, 1)
        z_scores = scaler.fit_transform(counts_array)
        
        # Flagging members 1.5 standard deviations above the mean
        user_counts['is_bottleneck'] = z_scores > 1.5
        bottlenecks = user_counts[user_counts['is_bottleneck'] == True]['user'].tolist()

    # --- PART 2: BURNOUT PREDICTION (Individual Level) ---
    burnout_risk = "Low"
    if user_id:
        user_tasks = active_work[active_work['assigned_to'] == user_id]
        count = len(user_tasks)
        
        # We calculate burnout based on volume and overdue pressure
        # Assuming tasks_df has an 'is_overdue' boolean column
        overdue_count = len(user_tasks[user_tasks['is_overdue'] == True]) if 'is_overdue' in user_tasks.columns else 0
        
        if count > 15 or (count > 10 and overdue_count > 3):
            burnout_risk = "High"
        elif count > 8 or overdue_count > 1:
            burnout_risk = "Medium"

    return {
        "bottlenecks": bottlenecks, 
        "burnout_risk": burnout_risk
    }