import os
import pandas as pd
import psycopg2
from analytics_engine import AnalyticsEngine

def analyze_specific_group(group_id, user_id):
    # 1. Database Connection
    # Ensure your DB_PWD is set in your environment variables
    password = os.getenv("DB_PWD")
    DB_URI = f"postgresql://postgres.behbluflerhbslixhywa:{password}@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
    
    conn = psycopg2.connect(DB_URI)
    
    try:
        # 2. FILTERING BY GROUP_ID
        # We fetch ONLY the tasks and messages belonging to your specific group
        print(f"📡 Fetching data for Group: {group_id}...")
        
        tasks_query = "SELECT * FROM tasks WHERE group_id = %s"
        tasks_df = pd.read_sql(tasks_query, conn, params=(group_id,))
        
        msg_query = "SELECT * FROM messages WHERE project_id = %s"
        msg_df = pd.read_sql(msg_query, conn, params=(group_id,))

        if tasks_df.empty:
            print(f"⚠️ No tasks found for {group_id}. Check your Supabase table!")
            return

        # 3. INITIALIZE ENGINE
        # This calls your analytics_engine.py and all the /algorithms scripts
        engine = AnalyticsEngine()
        
        # 4. RUN ANALYSIS
        # We pass the dataframes we just filtered by group_id
        report = engine.run_comprehensive_analysis(
            tasks_df=tasks_df,
            messages_df=msg_df,
            deadline_str="2026-05-01", # Set your project deadline here
            user_id=user_id
        )

        # 5. DISPLAY RESULTS
        print("\n--- AI PROJECT REPORT ---")
        print(f"Group ID: {group_id}")
        print(f"Forecast Finish: {report['metrics']['forecast_end_date']}")
        print(f"Team Balance:    {report['metrics']['team_balance_score']}/100")
        print(f"Activity Pulse:  {report['metrics']['pulse']}/100")
        print("--------------------------")

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    # CHANGE THESE to match your actual database values
    MY_GROUP = "group_777" 
    MY_USER  = "user_alpha"
    
    analyze_specific_group(MY_GROUP, MY_USER)