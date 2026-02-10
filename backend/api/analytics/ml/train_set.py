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
    # --- PART 1: AI MODEL TRAINING ---
    print("🚜 Generating 1M rows for AI training...")
    # (Keeping your existing 1M row logic here...)
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

    # --- PART 2: MASSIVE MOCK DATA INJECTION ---
    print("🧪 Injecting 150+ rows of realistic project data...")
    conn = psycopg2.connect(DB_URI)
    cur = conn.cursor()

    try:
        # 1. Update the AI Model
        cur.execute("INSERT INTO ai_models (model_name, model_binary, version) VALUES (%s, %s, %s) ON CONFLICT (model_name) DO UPDATE SET model_binary = EXCLUDED.model_binary;", 
                    ('risk_big_data_model', psycopg2.Binary(binary_data), '1.0.0'))

        # 2. Setup Variables for Randomization
        users = ['user_alpha', 'user_beta', 'user_gamma', 'user_delta']
        project_id = 'proj_01'
        now = datetime.now()

        # 3. Generate 150 Tasks
        print("📝 Generating 150 tasks...")
        for i in range(150):
            user_id = random.choice(users)
            created_at = now - timedelta(days=random.randint(10, 30))
            
            # 60% are completed, 40% are pending
            if random.random() > 0.4:
                status = 'completed'
                completed_at = created_at + timedelta(days=random.randint(1, 7))
                due_date = created_at + timedelta(days=5)
            else:
                status = 'pending'
                completed_at = None
                # Make some of these overdue
                due_date = now - timedelta(days=random.randint(-5, 5))

            cur.execute("""
                INSERT INTO tasks (project_id, user_id, status, created_at, completed_at, due_date)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (project_id, user_id, status, created_at, completed_at, due_date))

        # 4. Generate 50 Messages (for Activity Pulse)
        print("💬 Generating 50 messages...")
        for i in range(50):
            user_id = random.choice(users)
            msg_time = now - timedelta(hours=random.randint(0, 72)) # Active in last 3 days
            cur.execute("""
                INSERT INTO messages (project_id, user_id, content, created_at)
                VALUES (%s, %s, %s, %s)
            """, (project_id, user_id, "Sample project communication", msg_time))

        conn.commit()
        print("✅ Success: Database is now packed with realistic testing data!")

    except Exception as e:
        conn.rollback()
        print(f"❌ Error during injection: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    train_and_upload_to_supabase()