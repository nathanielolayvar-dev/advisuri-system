import pandas as pd

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
        (tasks_df['assigned_to'] == user_id) & 
        (tasks_df['status'].str.lower() != 'completed')
    ]
    
    total_active = len(active_work)
    if total_active == 0:
        return 100.0

    # 2. Identify Overdue Tasks (Pressure Factor)
    # Assuming 'is_overdue' is a boolean column in your DataFrame
    overdue_count = len(active_work[active_work['is_overdue'] == True]) if 'is_overdue' in active_work.columns else 0

    # 3. Calculate Weighted Load
    # Each normal task counts as 1. Each overdue task counts as 2 units of 'stress'.
    weighted_load = (total_active - overdue_count) + (overdue_count * 2)

    # 4. Determine Percentage
    # Formula: 100 * (1 - (Weighted Load / Limit))
    bandwidth_score = 100 * (1 - (weighted_load / max_task_limit))
    
    # Ensure the score stays between 0 and 100
    return max(0.0, min(100.0, round(float(bandwidth_score), 1)))

def get_team_bandwidth_summary(tasks_df, users_list):
    """
    Maps bandwidth across the whole team to find who can take more work.
    """
    summary = {}
    for user in users_list:
        summary[user] = calculate_detailed_bandwidth(tasks_df, user)
    return summary