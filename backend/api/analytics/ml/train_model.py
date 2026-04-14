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

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import joblib


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

# SET TO FALSE IF YOU DON'T WANT TO CREATE NEW SAMPLE TASKS
INJECT_TEST_DATA = False

def train_and_sync_model():
    conn = psycopg2.connect(DB_URI)

    # PART 1. LOAD TRAINING DATA (25k Rows)
    print("📚 Fetching 25,000 training records from Supabase...")
    query_train = "SELECT inactivity_days, total_tasks, overdue_count, risk_level FROM \"Risk_Matrix_TrainSet\""
    df_train = pd.read_sql(query_train, conn)

    if df_train.empty:
        print("❌ Error: Training set is empty. Check your table name!")
        return

    # Feature set: [overdue_ratio, inactivity_days, total_tasks]
    X_train = df_train[['inactivity_days', 'total_tasks', 'overdue_count']]
    y_train = df_train['risk_level']

    # PART 2. TRAIN
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)

    model = SGDClassifier(loss='log_loss')
    model.fit(X_train_scaled, y_train)

    # Calculate local accuracy just for your own peace of mind
    y_pred = model.predict(X_train_scaled)
    print(f"🎯 Training Accuracy: {accuracy_score(y_train, y_pred) * 100:.2f}%")

    # TEST AGAINST LIVE TASKS
    # We pull the actual tasks to see how the model categorizes them
    print("🧪 Validating against live 'tasks' table...")
    # (Insert your logic to aggregate live tasks by group here)

    # UPLOAD BACK TO SUPABASE (SERIALIZE)
    buffer = io.BytesIO()
    joblib.dump({'model': model, 'scaler': scaler}, buffer)
    binary_data = buffer.getvalue()

    # --- PART 3: UPLOAD & DATA INJECTION ---
    cur = conn.cursor()

    try:
        # 1. Update the AI Model in a dedicated registry table
        print("💾 Saving model binary to Risk_Matrix_TrainSet...")

        # 1. Update the AI Model
        cur.execute("""
            INSERT INTO "Risk_Matrix_TrainSet" (model_name, model_binary) 
            VALUES ('risk_big_data_model', %s) 
            ON CONFLICT (model_name) 
            DO UPDATE SET model_binary = EXCLUDED.model_binary;
        """, (psycopg2.Binary(binary_data), ))

        # 2. Setup Variables
        print("🔍 Fetching valid group and users from the database...")
        
        # Try to find any existing group first, Fetch a real ID from the 'group_id' column
        cur.execute("SELECT group_id FROM groups LIMIT 1;")
        group_record = cur.fetchone()

        if group_record:
            # We store the value from the 'group_id' column into our Python variable
            test_group_id = group_record[0]
            print(f"✅ Found existing group: {test_group_id}")
        else:
            # NO GROUP FOUND: Create a dedicated Test Group
            # If no group exists, we create one
            import uuid
            test_group_id = str(uuid.uuid4())
            print(f"🔨 No group found. Creating 'AI Test Group' ({test_group_id})...")
            # Here, 'group_id' is the column name in the INSERT statement
            cur.execute("""
                INSERT INTO groups (group_id, name, course) 
                VALUES (%s, %s, %s)
            """, (test_group_id, "AI Test Group", "IS-DEBUG"))

        # Now get users (The injection still needs users to assign tasks to)
        cur.execute("SELECT user_id FROM users LIMIT 4;")
        user_records = cur.fetchall()
        users = [r[0] for r in user_records]

        if not users:
            print("❌ Error: No users found in the 'users' table. You must have users to create tasks!")
            return
            
        now = datetime.now()

        # --- NEW: CLEANUP (Prevents duplicate bloat) ---
        # Use that variable to delete from the 'group_id' column in both 'tasks' and 'chat_messages' tables
        if INJECT_TEST_DATA:
            print(f"🧹 Clearing and seeding data for gr oup: {test_group_id}...")
            
            # Delete old test data to keep things clean
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
    train_and_sync_model()