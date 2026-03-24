import matplotlib.pyplot as plt
from io import BytesIO

from .services import (
    get_daily_completion_chart,
    get_weekly_summary
)

def generate_forecast_chart(): #Completion Forecast
    data = get_daily_completion_chart()

    dates = [d["date"] for d in data]
    values = [d["completion_rate"] for d in data]

    buffer = BytesIO()

    plt.figure()
    plt.plot(dates, values, marker='o')
    plt.fill_between(dates, values, alpha=0.3)

    plt.title("Completion Forecast")
    plt.xlabel("Date")
    plt.ylabel("Completion (%)")
    plt.xticks(rotation=45)

    plt.tight_layout()
    plt.savefig(buffer, format='png')
    plt.close()

    buffer.seek(0)
    return buffer

def generate_velocity_chart(): #Task Velocity
    data = get_daily_completion_chart()

    dates = [d["date"] for d in data]
    values = [d["completion_rate"] for d in data]

    buffer = BytesIO()

    plt.figure()
    plt.bar(dates, values)
    plt.plot(dates, values)

    plt.title("Task Velocity Trend")
    plt.xlabel("Date")
    plt.ylabel("Tasks")

    plt.xticks(rotation=45)

    plt.tight_layout()
    plt.savefig(buffer, format='png')
    plt.close()

    buffer.seek(0)
    return buffer

def generate_balance_chart(): #Contribution Balance
    summary = get_weekly_summary()

    labels = ["Completed", "Overdue"]
    values = [summary["completed"], summary["overdue"]]

    buffer = BytesIO()

    plt.figure()
    plt.pie(values, labels=labels, autopct='%1.1f%%')

    plt.title("Task Distribution")

    plt.savefig(buffer, format='png')
    plt.close()

    buffer.seek(0)
    return buffer

def generate_prediction_chart(): #Workload Prediction
    data = get_daily_completion_chart()

    dates = [d["date"] for d in data]
    values = [d["completion_rate"] for d in data]

    buffer = BytesIO()

    plt.figure()
    plt.stackplot(dates, values)

    plt.title("Workload Prediction")
    plt.xlabel("Date")

    plt.xticks(rotation=45)

    plt.tight_layout()
    plt.savefig(buffer, format='png')
    plt.close()

    buffer.seek(0)
    return buffer

def generate_buffer_chart(): #Milestone Buffer
    summary = get_weekly_summary()

    buffer = BytesIO()

    plt.figure()
    plt.bar(["Buffer Days"], [summary["overdue"]])

    plt.title("Milestone Buffer")

    plt.savefig(buffer, format='png')
    plt.close()

    buffer.seek(0)
    return buffer

def generate_pulse_chart(): #Activity Pulse
    summary = get_weekly_summary()

    value = summary["avg_completion"]

    buffer = BytesIO()

    plt.figure()
    plt.barh(["Pulse"], [value])

    plt.xlim(0, 100)
    plt.title("Activity Pulse (%)")

    plt.savefig(buffer, format='png')
    plt.close()

    buffer.seek(0)
    return buffer

def generate_bandwidth_chart(): #Member Bandwidth
    summary = get_weekly_summary()

    labels = ["Tasks"]
    values = [summary["total_tasks"]]

    buffer = BytesIO()

    plt.figure()
    plt.barh(labels, values)

    plt.title("Team Workload")

    plt.savefig(buffer, format='png')
    plt.close()

    buffer.seek(0)
    return buffer

def generate_risk_chart(): #Risk Chart
    summary = get_weekly_summary()

    labels = ["Low", "Medium", "High"]
    values = [1, 2, summary["overdue"]]

    buffer = BytesIO()

    plt.figure()
    plt.bar(labels, values)

    plt.title("Risk Overview")

    plt.savefig(buffer, format='png')
    plt.close()

    buffer.seek(0)
    return buffer