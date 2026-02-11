import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.linear_model import LinearRegression

def get_forecast_date(tasks_df):
    """
    Goal: Use the Velocity trend to forecast the 100% completion date.
    Returns: A formatted date string or a status message.
    """
    # 1. Get completed tasks to establish the trend
    completed = tasks_df[tasks_df['status'].str.lower() == 'completed'].copy()
    completed = completed.dropna(subset=['completed_at'])       # Safety: Remove any rows where completed_at might be missing
    completed = completed.sort_values(by='completed_at')        #Sort by date first 
    total_tasks = len(tasks_df)                                 # Count total tasks (including pending) for the target

    # Need at least 3 data points for a reliable linear trend
    if len(completed) < 3:
        return "Need more data" 

    # 2. Convert dates to numeric 'ordinals' for the ML model
    completed['date_ordinal'] = pd.to_datetime(completed['completed_at']).apply(lambda x: x.toordinal())
    start_date = completed['date_ordinal'].min()
    
    # X = Days since start, y = Cumulative tasks completed
    X = (completed['date_ordinal'] - start_date).values.reshape(-1, 1)
    y = np.arange(1, len(completed) + 1, dtype=float)

    # 3. Fit the Linear Regression model
    model = LinearRegression().fit(X, y)
    
    # If the slope (coef_) is 0 or negative, the project is stalled
    if model.coef_[0] <= 0:
        return "Stagnant (No progress)"
    
    # 4. Solve for X (date) when y = total_tasks
    # Equation: y = mx + b  ->  x = (y - b) / m
    days_to_finish = (total_tasks - model.intercept_) / model.coef_[0]
    
    # 5. Convert the resulting ordinal back into a human-readable date
    finish_date_ordinal = int(start_date + days_to_finish)
    
    # Safety check: ensure the date is within a reasonable range
    try:
        finish_date = datetime.fromordinal(finish_date_ordinal)
        return finish_date.strftime('%b %d, %Y')
    except (ValueError, OverflowError):
        return "Calculation Error"