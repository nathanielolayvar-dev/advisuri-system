from datetime import datetime

def calculate_buffer(forecast_date_str, deadline_date):
    """
    Goal: Calculate the 'Cushion' between predicted finish and the actual deadline.
    Returns: Days remaining (Positive = Safe, Negative = Overdue).
    """
    if not forecast_date_str or forecast_date_str in {"N/A", "Need more data", "Calculation Error", "Project Completed"}:
        return 0

    # Support both ISO and long date formats
    for fmt in ("%Y-%m-%d", "%b %d, %Y"):
        try:
            forecast_dt = datetime.strptime(forecast_date_str, fmt).date()
            break
        except ValueError:
            continue
    else:
        return 0

    # Calculate difference
    delta = (deadline_date - forecast_dt).days
    return delta