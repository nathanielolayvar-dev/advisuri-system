from datetime import datetime, timedelta
from collections import defaultdict

from api.supabase_client import supabase


# Get raw weekly data from Supabase
def get_weekly_data():
    today = datetime.today()
    start_of_week = today - timedelta(days=6)

    response = (
        supabase
        .table("tasks")
        .select("*")
        .gte("created_at", start_of_week.isoformat())
        .execute()
    )

    return response.data if response.data else []

def get_daily_completion_chart(): # Daily Chart Data
    data = get_weekly_data()

    daily = defaultdict(lambda: {"completed": 0, "total": 0})

    for task in data:
        day = task["created_at"][:10]

        daily[day]["total"] += 1
        if task.get("status") == "completed":
            daily[day]["completed"] += 1

    chart = []

    for day, values in daily.items():
        rate = (
            (values["completed"] / values["total"]) * 100
            if values["total"] > 0 else 0
        )

        chart.append({
            "date": day,
            "completion_rate": round(rate, 2)
        })

    return sorted(chart, key=lambda x: x["date"])

def get_weekly_summary(): # Weekly Summary
    data = get_weekly_data()

    total_tasks = len(data)
    completed = sum(1 for t in data if t.get("status") == "completed")
    overdue = sum(1 for t in data if t.get("status") == "overdue")

    avg_completion = (
        (completed / total_tasks) * 100 if total_tasks else 0
    )

    return {
        "total_tasks": total_tasks,
        "completed": completed,
        "overdue": overdue,
        "avg_completion": round(avg_completion, 2)
    }

def get_weekly_analytics():
    return {
        "summary": get_weekly_summary(),
        "daily": get_daily_completion_chart()
    }