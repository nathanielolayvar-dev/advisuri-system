import psycopg2
import joblib
import io
import pandas as pd
import os
from datetime import datetime

# Absolute imports - Match actual filenames in the /algorithms folder
from api.analytics.algorithms.activity_pulse import calculate_pulse
from api.analytics.algorithms.task_velocity import calculate_velocity
from api.analytics.algorithms.completion_forecast import get_forecast_date
from api.analytics.algorithms.contribution_balance import calculate_balance_score
from api.analytics.algorithms.workload_prediction import analyze_workload_dynamics
from api.analytics.algorithms.milestone_buffer import calculate_buffer
from api.analytics.algorithms.member_bandwidth import calculate_detailed_bandwidth
from api.analytics.algorithms.risk_detection import predict_project_risk

class AnalyticsEngine:
    def __init__(self, tasks_df=None, messages_df=None):
        # Store the dataframes passed from the View
        self.tasks_df = tasks_df
        self.messages_df = messages_df

        # Build DB_URI from environment variables for consistency
        db_user = os.getenv("DB_USER")
        password = os.getenv("DB_PWD")
        db_host = os.getenv("DB_HOST")
        db_port = os.getenv("DB_PORT")
        db_name = os.getenv("DB_NAME")
        
        if not all([db_user, password, db_host, db_port, db_name]):
            raise ValueError("Database connection variables are missing from environment.")
        self.db_uri = f"postgresql://{db_user}:{password}@{db_host}:{db_port}/{db_name}"
        
        # Load the "Big Data" 1M row model for Risk Detection
        self.model, self.scaler = self._load_model_from_supabase()

    def _load_model_from_supabase(self):
        try:
            conn = psycopg2.connect(self.db_uri)
            cur = conn.cursor()
            cur.execute('SELECT model_binary FROM "Risk_Detection_TestSet" WHERE model_name = %s', ('risk_big_data_model',))
            record = cur.fetchone()
            cur.close()
            conn.close()

            if record:
                buffer = io.BytesIO(record[0])
                data = joblib.load(buffer)
                return data['model'], data['scaler']
        except Exception as e:
            print(f"⚠️ Warning: AI Model could not be loaded. Risk detection will be 'Unknown'. Error: {e}")
        return None, None

    def run_comprehensive_analysis(self, deadline_str, user_id):
        """
        Executes all algorithms using synced DB column names.
        """
        if self.tasks_df is None or self.tasks_df.empty:
            return {"error": "No task data available"}

        # 1. Activity Pulse (Messages)
        pulse_score = calculate_pulse(self.messages_df) # Inside, it uses messages_df['user_id']

        # 2. Task Velocity
        # Note: Internally, task_velocity should now look for tasks_df['progress_percentage'] == 100
        velocity_stats = calculate_velocity(self.tasks_df)

        velocity_value = (
            velocity_stats.get('daily_velocity', 0)
            if isinstance(velocity_stats, dict)
            else velocity_stats
        )

        # 3. Completion Forecast
        forecast_date = get_forecast_date(self.tasks_df, velocity_value)
        # Validate forecast_date
        if forecast_date == "Need more data" or forecast_date is None:
            buffer_days = 0
        else:
            # Convert 'Apr 15, 2026' (or similar) to 'YYYY-MM-DD' for calculate_buffer
            try:
                formatted_date = datetime.strptime(forecast_date, "%b %d, %Y").strftime("%Y-%m-%d")
            except ValueError:
                # Fallback just in case the date is already formatted or in an unexpected format
                formatted_date = forecast_date
                
            # Convert deadline string to a date object since calculate_buffer expects it
            if isinstance(deadline_str, str):
                deadline_date = datetime.strptime(deadline_str, "%Y-%m-%d").date()
            else:
                deadline_date = deadline_str
                
            buffer_days = calculate_buffer(formatted_date, deadline_date)

        # 4. At-Risk Detection (Using 1M Row Model)
        # Using the column 'is_overdue' which we added to your DB
        overdue_count = len(self.tasks_df[self.tasks_df['is_overdue'] == True])
        total_tasks = len(self.tasks_df)
        overdue_ratio = overdue_count / total_tasks if total_tasks > 0 else 0
        
        ai_risk = "Low"
        if self.model and self.scaler:
            X = self.scaler.transform([[overdue_ratio, 0, total_tasks]])
            pred = self.model.predict(X)[0]
            ai_risk = {0: "Low", 1: "Medium", 2: "High"}[pred]

        # 5. Contribution Balance (Using 'assignee_id')
        balance = calculate_balance_score(self.tasks_df)

        # 6. Workload & Bottlenecks
        bottlenecks = analyze_workload_dynamics(self.tasks_df)

        # 7. Milestone Buffer (Compare forecast to your manual deadline)

        # 8. Member Bandwidth (Specific to logged-in user)
        bandwidth = calculate_detailed_bandwidth(self.tasks_df, user_id)

        # 9. Burnout Detection
        # Calculate inactivity_days (days since last message activity)
        inactivity_days = 0
        if self.messages_df is not None and not self.messages_df.empty:
            try:
                latest_message = pd.to_datetime(self.messages_df['created_at']).max()
                inactivity_days = (datetime.now() - latest_message).days
            except:
                inactivity_days = 0
        
        burnout_status = predict_project_risk(self.tasks_df, overdue_count, inactivity_days)

        # Combine into "Health Snapshot"
        # Using 'group_id' instead of 'project_id' to match your DB
        return {
            "group_id": self.tasks_df['group_id'].iloc[0] if not self.tasks_df.empty else "N/A",
            "metrics": {
                "pulse": pulse_score,
                "velocity": velocity_value,
                "forecast_end_date": forecast_date,
                "ai_risk_level": ai_risk,
                "team_balance_score": balance,
                "buffer_days": buffer_days,
            },
            "user_status": {
                "user_id": user_id,
                "bandwidth_available": f"{bandwidth}%",
                "burnout_risk": burnout_status
            },
            "alerts": {
                "bottlenecks": bottlenecks
            }
        }