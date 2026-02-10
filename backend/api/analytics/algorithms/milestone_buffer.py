from datetime import datetime

def calculate_buffer(forecast_date_str, deadline_str):
    """
    Goal: Calculate the 'Cushion' between predicted finish and the actual deadline.
    Returns: Days remaining (Positive = Safe, Negative = Overdue).
    """
    if "Data" in forecast_date_str or "Stagnant" in forecast_date_str:
        return 0

    try:
        # Convert strings back to datetime objects
        forecast_dt = datetime.strptime(forecast_date_str, '%b %d, %Y')
        deadline_dt = datetime.strptime(deadline_str, '%Y-%m-%d')

        # Calculate the delta in days
        buffer_days = (deadline_dt - forecast_dt).days
        return buffer_days
    except Exception:
        return 0