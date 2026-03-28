import matplotlib.pyplot as plt
from datetime import datetime
from io import BytesIO

from .services import (
    get_weekly_summary
)

def generate_forecast_chart(daily): #Completion Forecast

    dates = [datetime.fromisoformat(d["date"]) for d in daily]
    values = [d["completion_rate"] for d in daily]

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

def generate_velocity_chart(daily): #Task Velocity

    dates = [datetime.fromisoformat(d["date"]) for d in daily]
    values = [d["completion_rate"] for d in daily]

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

def generate_balance_chart(data): #Contribution Balance
    summary = get_weekly_summary(data)

    labels = ["Completed", "Overdue"]
    values = [
        summary.get("completed", 0),
        summary.get("overdue", 0)
    ]

    buffer = BytesIO()
    # handle empty data
    if sum(values) == 0:
        values = [1]  # dummy value
        labels = ["No Data"]

    plt.figure()
    plt.pie(values, labels=labels, autopct='%1.1f%%')

    plt.title("Task Distribution")

    plt.savefig(buffer, format='png')
    plt.close()

    buffer.seek(0)
    return buffer

def generate_prediction_chart(daily): #Workload Prediction

    dates = [datetime.fromisoformat(d["date"]) for d in daily]
    values = [d["completion_rate"] for d in daily]

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

def generate_buffer_chart(data): #Milestone Buffer
    summary = get_weekly_summary(data)

    buffer = BytesIO()

    plt.figure()
    plt.bar(["Buffer Days"], [summary["overdue"]])

    plt.title("Milestone Buffer")

    plt.savefig(buffer, format='png')
    plt.close()

    buffer.seek(0)
    return buffer

def generate_pulse_chart(data): #Activity Pulse
    summary = get_weekly_summary(data)

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

def generate_bandwidth_chart(data): #Member Bandwidth
    summary = get_weekly_summary(data)

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

def generate_risk_chart(data): #Risk Chart
    summary = get_weekly_summary(data)

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