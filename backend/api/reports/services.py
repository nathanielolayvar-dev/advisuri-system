from datetime import datetime, timedelta
from collections import defaultdict

from api.supabase_client import supabase

def get_teachers():
    response = (
        supabase
        .table("users")
        .select("email, role")
        .eq("role", "teacher")
        .execute()
    )

    return response.data or []

# Get raw weekly data per group from Supabase
def get_weekly_data(group_id):
    today = datetime.today()
    start_of_week = today - timedelta(days=6)

    response = (
        supabase
        .table("tasks")
        .select("*")
        .eq("group_id", group_id) 
        .gte("created_at", start_of_week.isoformat())
        .execute()
    )

    return response.data or []

def get_daily_completion_chart(data):  # pass data
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

def get_weekly_summary(data):  # pass data
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

def get_weekly_analytics(group_id):
    data = get_weekly_data(group_id)

    return {
        "summary": get_weekly_summary(data),
        "daily": get_daily_completion_chart(data)
    }