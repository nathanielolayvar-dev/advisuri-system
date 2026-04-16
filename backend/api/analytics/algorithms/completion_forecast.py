import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.linear_model import LinearRegression

def get_forecast_date(tasks_df, velocity):
    """
    Goal: Use the Velocity trend to forecast the 100% completion date.
    Returns: A formatted date string or a status message.
    """
    # 1. Get completed tasks to establish the trend.
    completed = tasks_df[(tasks_df['progress_percentage'] == 100)].copy()

    # Prefer actual completion timestamp if it exists, otherwise fall back to planned end date.
    if 'completed_at' in completed.columns:
        completed['completion_date'] = pd.to_datetime(completed['completed_at'], errors='coerce')
    else:
        completed['completion_date'] = pd.NaT

    if 'end_date' in completed.columns:
        completed['planned_end_date'] = pd.to_datetime(completed['end_date'], errors='coerce')
    else:
        completed['planned_end_date'] = pd.NaT

    completed['completion_date'] = completed['completion_date'].fillna(completed['planned_end_date'])
    completed = completed.dropna(subset=['completion_date'])
    completed = completed.sort_values(by='completion_date')

    total_tasks = len(tasks_df)

    # Need at least 3 data points for a reliable linear trend
    if total_tasks > 0 and len(completed) >= total_tasks:
        return "Project Completed"

    if len(completed) < 3:
        return "Need more data"

    # 2. Convert completion_date to numeric ordinals
    completed['date_ordinal'] = completed['completion_date'].apply(lambda x: x.toordinal())
    start_date = completed['date_ordinal'].min()
    
    # X = Days since first completion, y = Total count of tasks finished
    X = (completed['date_ordinal'] - start_date).values.reshape(-1, 1)
    y = np.arange(1, len(completed) + 1, dtype=float)

    # 3. Fit the Model
    model = LinearRegression().fit(X, y)
    
    if model.coef_[0] <= 0:
        return "Stagnant"
    
    # 4. Solve for X where y = total_tasks
    days_to_finish = (total_tasks - model.intercept_) / model.coef_[0]
    
    # 5. Convert back to Date
    finish_date_ordinal = int(start_date + days_to_finish)
    
    try:
        # Prevent forecasting 100 years into the future if velocity is tiny
        if days_to_finish > 3650: 
            return "Off Track (Over 10 years)"
            
        finish_date = datetime.fromordinal(finish_date_ordinal)
        # Return ISO format so the buffer calculator can parse it reliably
        return finish_date.strftime('%Y-%m-%d')
    except (ValueError, OverflowError):
        return "Calculation Error"