import pandas as pd
from datetime import datetime, timedelta

def generate_chart_history(tasks_df):
    """
    Processes task data to build the time-series arrays needed for the 
    React ApexCharts (Forecast, Velocity, and Upcoming Workload).
    """
    today = datetime.now()
    
    # 1. Fallback if no tasks exist
    if tasks_df is None or tasks_df.empty:
        return {
            "dates": [(today - timedelta(days=i)).strftime('%b %d') for i in range(6, -1, -1)],
            "completed_counts": [0] * 7,
            "total_counts": [0] * 7,
            "velocity_trend": [0] * 7,
            "daily_completed": [0] * 7,
            "prediction_dates": [(today + timedelta(days=i)).strftime('%b %d') for i in range(1, 8)],
            "backlog_prediction": [0] * 7,
            "incoming_prediction": [0] * 7
        }

    # 2. Prepare DataFrame dates - ensure all datetime columns are properly converted
    if 'created_at' in tasks_df.columns:
        tasks_df['created_at'] = pd.to_datetime(tasks_df['created_at'], errors='coerce')
    if 'completed_at' in tasks_df.columns:
        tasks_df['completed_at'] = pd.to_datetime(tasks_df['completed_at'], errors='coerce')
    
    # Ensure progress_percentage is numeric
    if 'progress_percentage' in tasks_df.columns:
        tasks_df['progress_percentage'] = pd.to_numeric(tasks_df['progress_percentage'], errors='coerce')

    dates = []
    completed_counts = []
    total_counts = []
    daily_completed = []

    # 3. Calculate Past 7 Days (Forecast & Velocity)
    for i in range(6, -1, -1):
        target_date = (today - timedelta(days=i)).date()
        dates.append(target_date.strftime('%b %d'))

        # Cumulative Total Tasks based on creation date
        if 'created_at' in tasks_df.columns:
            total_to_date = len(tasks_df[tasks_df['created_at'].dt.date <= target_date])
        else:
            total_to_date = len(tasks_df) # Fallback to flat line
        total_counts.append(total_to_date)

        # Cumulative Completed Tasks (progress_percentage == 100)
        completed_df = tasks_df[tasks_df['progress_percentage'] == 100]
        
        # Debug logging on first iteration
        if i == 6:
            pass
        
        completed_to_date = 0
        completed_on_day = 0
        
        if not completed_df.empty:
            if 'completed_at' in completed_df.columns:
                # Use completed_at if available and not all null
                non_null_completed = completed_df[completed_df['completed_at'].notna()]
                if len(non_null_completed) > 0:
                    completed_mask = non_null_completed['completed_at'].dt.date <= target_date
                    completed_to_date = len(non_null_completed[completed_mask])
                    
                    completed_on_day_mask = non_null_completed['completed_at'].dt.date == target_date
                    completed_on_day = len(non_null_completed[completed_on_day_mask])
                else:
                    # All completed_at are null, use created_at as fallback
                    if 'created_at' in completed_df.columns:
                        completed_mask = completed_df['created_at'].dt.date <= target_date
                        completed_to_date = len(completed_df[completed_mask])
                        
                        completed_on_day_mask = completed_df['created_at'].dt.date == target_date
                        completed_on_day = len(completed_df[completed_on_day_mask])
            elif 'created_at' in completed_df.columns:
                # Use created_at as fallback
                completed_mask = completed_df['created_at'].dt.date <= target_date
                completed_to_date = len(completed_df[completed_mask])
                
                completed_on_day_mask = completed_df['created_at'].dt.date == target_date
                completed_on_day = len(completed_df[completed_on_day_mask])

        completed_counts.append(completed_to_date)
        daily_completed.append(completed_on_day)

    # Calculate 3-day moving average for velocity trend line
    s = pd.Series(daily_completed)
    velocity_trend = s.rolling(window=3, min_periods=1).mean().fillna(0).tolist()

    # 4. Calculate Future 7 Days (Workload Prediction)
    prediction_dates = []
    backlog_prediction = []
    incoming_prediction = []

    current_backlog = len(tasks_df[tasks_df['progress_percentage'] < 100])

    # Simple predictive heuristics based on past 7 days
    avg_incoming_per_day = max(1.0, total_counts[-1] / 7.0 if total_counts[-1] > 0 else 1.0)
    avg_completion_per_day = max(0.5, sum(velocity_trend) / 7.0 if sum(velocity_trend) > 0 else 0.5)

    for i in range(1, 8):
        future_date = today + timedelta(days=i)
        prediction_dates.append(future_date.strftime('%b %d'))

        # Predict incoming tasks with a little variation
        daily_incoming = max(0, int(avg_incoming_per_day + (1 if i % 2 == 0 else 0)))
        incoming_prediction.append(daily_incoming)

        # Predict backlog size
        current_backlog = max(0, current_backlog + daily_incoming - int(avg_completion_per_day))
        backlog_prediction.append(current_backlog)

    return {
        "dates": dates,
        "completed_counts": completed_counts,
        "total_counts": total_counts,
        "daily_completed": daily_completed,
        "velocity_trend": velocity_trend,
        "prediction_dates": prediction_dates,
        "backlog_prediction": backlog_prediction,
        "incoming_prediction": incoming_prediction
    }