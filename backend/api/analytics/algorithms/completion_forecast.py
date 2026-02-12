import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.linear_model import LinearRegression

def get_forecast_date(tasks_df):
    """
    Goal: Use the Velocity trend to forecast the 100% completion date.
    Returns: A formatted date string or a status message.
    """
    # 1. Get completed tasks to establish the trend. Filter by progress_percentage and use end_date.
    completed = tasks_df[tasks_df['progress_percentage'] == 100].copy()
    completed = completed.dropna(subset=['end_date'])       # Safety: Remove any rows where completed_at might be missing
    completed = completed.sort_values(by='end_date')        #Sort by date first 
    
    total_tasks = len(tasks_df)                             # Count total tasks (including pending) for the target

    # Need at least 3 data points for a reliable linear trend
    # Safety: If already 100% done
    if len(completed) >= total_tasks and total_tasks > 0:
        return "Project Completed"
    
    if len(completed) < 3:
        return "Need more data" 

    # 2. Convert end_date to numeric 'ordinals'
    # Use pd.to_datetime to handle Supabase timestamp strings
    completed['date_ordinal'] = pd.to_datetime(completed['end_date']).apply(lambda x: x.toordinal())
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
        return finish_date.strftime('%b %d, %Y')
    except (ValueError, OverflowError):
        return "Calculation Error"