import psycopg2
import joblib
import io
import os
import numpy as np
import random
from datetime import datetime, timedelta
from sklearn.linear_model import SGDClassifier
from sklearn.preprocessing import StandardScaler

# Load environment variable
password = os.getenv("DB_PWD")
DB_URI = f"postgresql://postgres.behbluflerhbslixhywa:{password}@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"

def train_and_upload_to_supabase():
    # --- PART 1: AI MODEL TRAINING (Remains Same) ---
    print("🚜 Generating 1M rows for AI training...")
    overdue_ratios = np.linspace(0, 1, 1000000)
    inactivity = np.linspace(0, 30, 1000000)
    total_tasks = np.linspace(1, 100, 1000000)
    X = np.column_stack([overdue_ratios, inactivity, total_tasks])
    score = (overdue_ratios * 0.7) + (inactivity / 30 * 0.3)
    y = np.where(score > 0.6, 2, np.where(score > 0.3, 1, 0))
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    model = SGDClassifier(loss='log_loss')
    model.fit(X_scaled, y)
    buffer = io.BytesIO()
    joblib.dump({'model': model, 'scaler': scaler}, buffer)
    binary_data = buffer.getvalue()

    # --- PART 2: UPDATED DATA INJECTION ---
    print("🧪 Injecting 150+ rows of realistic project data...")
    conn = psycopg2.connect(DB_URI)
    cur = conn.cursor()

    try:
        # 1. Update the AI Model
        cur.execute("INSERT INTO ai_models (model_name, model_binary, version) VALUES (%s, %s, %s) ON CONFLICT (model_name) DO UPDATE SET model_binary = EXCLUDED.model_binary;", 
                    ('risk_big_data_model', psycopg2.Binary(binary_data), '1.0.0'))

        # 2. Setup Variables
        users = ['user_alpha', 'user_beta', 'user_gamma', 'user_delta']
        test_group_id = 'group_777' # Our testing group ID
        now = datetime.now()

        # --- NEW: CLEANUP (Prevents duplicate bloat) ---
        print(f"🧹 Clearing old test data for {test_group_id}...")
        cur.execute("DELETE FROM tasks WHERE group_id = %s", (test_group_id,))
        cur.execute("DELETE FROM messages WHERE project_id = %s", (test_group_id,))

        # 3. Generate 150 Tasks
        print("📝 Generating 150 tasks...")
        for i in range(150):
            assignee_id = random.choice(users)
            start_date = now - timedelta(days=random.randint(10, 45))
            
            if random.random() > 0.3:
                # COMPLETED TASK
                progress = 100
                end_date = start_date + timedelta(days=random.randint(1, 7))
                is_overdue = False
            else:
                # PENDING TASK
                progress = random.randint(0, 90)
                end_date = now + timedelta(days=random.randint(-5, 10))
                # Logic: If progress < 100 and end_date is past, it's overdue
                is_overdue = end_date < now

            cur.execute("""
                INSERT INTO tasks (group_id, assignee_id, progress_percentage, start_date, end_date, is_overdue, task_name)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (test_group_id, assignee_id, progress, start_date, end_date, is_overdue, f"Task {i}"))

        # 4. Generate 50 Messages
        print("💬 Generating 50 messages...")
        for i in range(50):
            user_id = random.choice(users)
            msg_time = now - timedelta(hours=random.randint(0, 72))
            cur.execute("""
                INSERT INTO messages (project_id, user_id, content, created_at)
                VALUES (%s, %s, %s, %s)
            """, (test_group_id, user_id, "Sample project communication", msg_time))

        conn.commit()
        print(f"✅ Success: {test_group_id} is ready for AI analysis!")

    except Exception as e:
        conn.rollback()
        print(f"❌ Error during injection: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    train_and_upload_to_supabase()