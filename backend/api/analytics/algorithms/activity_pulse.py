import pandas as pd
from datetime import datetime, timedelta

def calculate_pulse(messages_df):
    """
    Goal: Return a 0-100 score based on recent activity.
    10+ messages in 24h = 100 pulse.
    """
    if messages_df is None or messages_df.empty:
        return 0.0

    if 'created_at' not in messages_df.columns:
        return 0.0

    # Ensure date format and convert to UTC to be safe
    try:
        messages_df['created_at'] = pd.to_datetime(messages_df['created_at']).dt.tz_localize(None)
    except Exception:
        return 0.0
    
    # Use a timezone-naive 'now' to match the localized column
    cutoff = datetime.now() - timedelta(hours=24)
    recent_count = len(messages_df[messages_df['created_at'] > cutoff])
    
    # Scale: 10 messages is the 'target' for 100%
    score = min((recent_count / 10) * 100, 100)
    return round(float(score), 1)