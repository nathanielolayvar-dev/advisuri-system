import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

def calculate_velocity(tasks_df):
    """
    Goal: Use ML to find the trend of tasks completed per day.
    """
    completed = tasks_df[tasks_df['status'].str.lower() == 'completed'].copy()
    
    if len(completed) < 2:
        return 0.0

    # Feature Engineering
    completed['date_ordinal'] = pd.to_datetime(completed['completed_at']).apply(lambda x: x.toordinal())
    start_date = completed['date_ordinal'].min()
    
    X = (completed['date_ordinal'] - start_date).values.reshape(-1, 1)
    y = np.arange(1, len(completed) + 1)

    # ML Model
    model = LinearRegression().fit(X, y)
    
    # The slope (coef_) is the daily speed
    return round(float(model.coef_[0]), 2)