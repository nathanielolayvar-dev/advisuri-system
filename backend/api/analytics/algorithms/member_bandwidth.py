import pandas as pd
from datetime import datetime

def calculate_detailed_bandwidth(tasks_df, user_id, max_task_limit=15):
    """
    Calculates the 'Available Energy' of a team member.
    Logic:
    - High task count reduces bandwidth.
    - Overdue tasks reduce bandwidth 2x faster (Penalty).
    - Returns a percentage 0-100%.
    """
    # 1. Filter for active tasks for this specific user
    active_work = tasks_df[
        (tasks_df['user_id'] == user_id) & 
        (tasks_df['status'].str.lower() != 'completed')
    ]
    
    total_active = len(active_work)
    if total_active == 0:
        return 100.0

    # NEW: Calculate 'is_overdue' on the fly if it doesn't exist
    # This ensures your Penalty logic actually works with the train_set.py data
    if 'is_overdue' not in active_work.columns:
        now = datetime.now()
        active_work['is_overdue'] = pd.to_datetime(active_work['due_date']).apply(lambda x: x < now if x else False)

    overdue_count = len(active_work[active_work['is_overdue'] == True])

    # 3. Calculate Weighted Load
    weighted_load = (total_active - overdue_count) + (overdue_count * 2)

    # 4. Determine Percentage
    bandwidth_score = 100 * (1 - (weighted_load / max_task_limit))
    
    return max(0.0, min(100.0, round(float(bandwidth_score), 1)))

def get_team_bandwidth_summary(tasks_df, users_list):
    """
    Maps bandwidth across the whole team to find who can take more work.
    """
    summary = {}
    for user in users_list:
        summary[user] = calculate_detailed_bandwidth(tasks_df, user)
    return summary