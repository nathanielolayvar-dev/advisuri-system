import psycopg2
import joblib
import io
import pandas as pd

# Import the logic from your other files
from .algorithms.activity_pulse import calculate_pulse
from .algorithms.task_velocity import calculate_velocity
from .algorithms.completion_forecast import get_forecast_date
from .algorithms.contribution_balance import calculate_balance_score
from .algorithms.workload_prediction import identify_bottlenecks
from .algorithms.milestone_buffer import calculate_buffer
from .algorithms.member_bandwidth import calculate_detailed_bandwidth
from .algorithms.risk_detection import predict_project_risk

class SupabaseAnalyticsEngine:
    def __init__(self, db_uri):
        self.db_uri = db_uri
        # Load the "Big Data" 1M row model for Risk Detection
        self.model, self.scaler = self._load_model_from_supabase()

    def _load_model_from_supabase(self):
        try:
            conn = psycopg2.connect(self.db_uri)
            cur = conn.cursor()
            cur.execute("SELECT model_binary FROM ai_models WHERE model_name = %s", ('risk_big_data_model',))
            record = cur.fetchone()
            cur.close()
            conn.close()

            if record:
                buffer = io.BytesIO(record[0])
                data = joblib.load(buffer)
                return data['model'], data['scaler']
        except Exception as e:
            print(f"Error loading model from Supabase: {e}")
        return None, None

    def run_comprehensive_analysis(self, tasks_df, messages_df, deadline_str, user_id):
        """
        Executes all algorithms and returns a unified project health report.
        """
        # 1. Activity Pulse
        pulse_score = calculate_pulse(messages_df)

        # 2. Task Velocity (Linear Regression)
        velocity_stats = calculate_velocity(tasks_df)
        velocity_value = velocity_stats.get('daily_velocity', 0)

        # 3. Completion Forecast
        forecast_date = get_forecast_date(tasks_df, velocity_value)

        # 4. At-Risk Detection (Using the 1M Row Model from DB)
        overdue_count = len(tasks_df[tasks_df['is_overdue'] == True])
        total_tasks = len(tasks_df)
        overdue_ratio = overdue_count / total_tasks if total_tasks > 0 else 0
        
        ai_risk = "Unknown"
        if self.model and self.scaler:
            # Features: [Ratio, Inactivity(assume 0 for now), Total Tasks]
            X = self.scaler.transform([[overdue_ratio, 0, total_tasks]])
            pred = self.model.predict(X)[0]
            ai_risk = {0: "Low", 1: "Medium", 2: "High"}[pred]

        # 5. Contribution Balance
        balance = calculate_balance_score(tasks_df)

        # 6. Workload & Bottlenecks
        bottlenecks = identify_bottlenecks(tasks_df)

        # 7. Milestone Buffer
        buffer_days = calculate_buffer(forecast_date, deadline_str)

        # 8. Member Bandwidth (Specific to the logged-in user)
        bandwidth = calculate_detailed_bandwidth(tasks_df, user_id)

        # 9. Burnout Detection
        burnout_status = predict_project_risk(tasks_df, user_id)

        # Combine everything into one "Health Snapshot"
        return {
            "project_id": tasks_df['project_id'].iloc[0] if not tasks_df.empty else "N/A",
            "metrics": {
                "pulse": pulse_score,
                "velocity": velocity_value,
                "forecast_end_date": forecast_date,
                "ai_risk_level": ai_risk,
                "team_balance_score": balance,
                "buffer_days": buffer_days,
            },
            "user_status": {
                "bandwidth_available": f"{bandwidth}%",
                "burnout_risk": burnout_status
            },
            "alerts": {
                "bottlenecks": bottlenecks
            }
        }