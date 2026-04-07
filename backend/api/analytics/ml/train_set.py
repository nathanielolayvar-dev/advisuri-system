import psycopg2
import joblib
import io
import os
import numpy as np
import random
from datetime import datetime, timedelta
from sklearn.linear_model import SGDClassifier
from sklearn.preprocessing import StandardScaler
from dotenv import load_dotenv


# Load environment variables from .env file
load_dotenv()

# --- Use environment variables for the full connection string ---
db_user = os.getenv("DB_USER")
password = os.getenv("DB_PWD")
db_host = os.getenv("DB_HOST")
db_port = os.getenv("DB_PORT")
db_name = os.getenv("DB_NAME")

if not all([db_user, password, db_host, db_port, db_name]):
    raise ValueError("One or more database environment variables are missing. Check your .env file.")

DB_URI = f"postgresql://{db_user}:{password}@{db_host}:{db_port}/{db_name}"

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
        cur.execute('INSERT INTO "Risk_Detection_TestSet" (model_name, model_binary, version) VALUES (%s, %s, %s) ON CONFLICT (model_name) DO UPDATE SET model_binary = EXCLUDED.model_binary;', 
                    ('risk_big_data_model', psycopg2.Binary(binary_data), '1.0.0'))

        # 2. Setup Variables
        print("🔍 Fetching valid group and users from the database...")
        
        # Get a real group UUID to attach data to
        try:
            cur.execute("SELECT group_id FROM groups LIMIT 1;")
            group_record = cur.fetchone()
            if not group_record:
                print("⚠️ No groups found in 'groups' table. Make sure you have a group created.")
                return
            test_group_id = group_record[0]
        except psycopg2.Error:
            conn.rollback()
            # Fallback if using Django table
            cur.execute("SELECT id FROM api_group LIMIT 1;")
            group_record = cur.fetchone()
            if not group_record:
                print("⚠️ No groups found in 'api_group'. Make sure you have a group created.")
                return
            test_group_id = group_record[0]

        # Get real user UUIDs
        try:
            cur.execute("SELECT user_id FROM users LIMIT 4;")
            user_records = cur.fetchall()
            users = [r[0] for r in user_records]
        except psycopg2.Error:
            conn.rollback()
            # Fallback if using Django table
            cur.execute("SELECT id FROM api_user LIMIT 4;")
            user_records = cur.fetchall()
            users = [r[0] for r in user_records]

        if not users:
            print("⚠️ No users found! Make sure you have at least one user.")
            return
            
        now = datetime.now()

        # --- NEW: CLEANUP (Prevents duplicate bloat) ---
        print(f"🧹 Clearing old test data for group {test_group_id}...")
        cur.execute("DELETE FROM tasks WHERE group_id = %s", (test_group_id,))
        cur.execute("DELETE FROM chat_messages WHERE group_id = %s", (test_group_id,))

        # 3. Generate 150 Tasks
        print("📝 Generating 150 tasks...")
        for i in range(150):
            assignee_id = random.choice(users)
            creator_id = random.choice(users)
            start_date = now - timedelta(days=random.randint(10, 45))
            
            if random.random() > 0.3:
                # COMPLETED TASK
                progress = 100
                due_date = start_date + timedelta(days=random.randint(1, 7))
                status = 'completed'
                completed_at = due_date
            else:
                # PENDING TASK
                progress = random.randint(0, 90)
                due_date = now + timedelta(days=random.randint(-5, 10))
                status = 'pending'
                completed_at = None

            # Insert required columns along with 'title' to satisfy NOT NULL constraints
            cur.execute("""
                INSERT INTO tasks (group_id, assigned_to, creator_id, progress_percentage, due_date, status, completed_at, title)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (test_group_id, assignee_id, creator_id, progress, due_date, status, completed_at, f"Task {i}"))

        # 4. Generate 50 Messages
        print("💬 Generating 50 messages...")
        for i in range(50):
            user_id = random.choice(users)
            msg_time = now - timedelta(hours=random.randint(0, 72))
            cur.execute("""
                INSERT INTO chat_messages (group_id, user_id, text, created_at)
                VALUES (%s, %s, %s, %s)
            """, (test_group_id, user_id, f"Sample project communication {i}", msg_time))

        conn.commit()
        print(f"✅ Success: Group {test_group_id} is ready for AI analysis!")

    except Exception as e:
        conn.rollback()
        print(f"❌ Error during injection: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    train_and_upload_to_supabase()