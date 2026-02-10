import pandas as pd

def calculate_contribution_balance(tasks_df):
    """
    Calculates how evenly tasks are distributed among members.
    Returns: A score from 0 (poor balance) to 100 (perfect balance).
    """
    if tasks_df.empty:
        return 100.0

    # Count tasks per user
    counts = tasks_df['assigned_to'].value_counts()
    
    if len(counts) <= 1:
        # If only one person is in the group, balance is technically 100% 
        # (or 0% depending on your preference, but 100% usually looks better)
        return 100.0

    # Math: Standard Deviation / Mean (Coefficient of Variation)
    # A high variation means low balance.
    variation = (counts.std() / counts.mean()) * 10 
    
    # Invert it so high numbers = good balance
    balance_score = max(0, round(100 - variation, 1))
    return float(balance_score)