import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def setup_database():
    db_user = os.getenv("DB_USER")
    password = os.getenv("DB_PWD")
    db_host = os.getenv("DB_HOST")
    db_port = os.getenv("DB_PORT")
    db_name = os.getenv("DB_NAME")

    if not all([db_user, password, db_host, db_port, db_name]):
        raise ValueError("Database environment variables missing. Check your .env file.")

    db_uri = f"postgresql://{db_user}:{password}@{db_host}:{db_port}/{db_name}"

    print("🔌 Connecting to Supabase...")
    conn = psycopg2.connect(db_uri)
    cur = conn.cursor()

    try:
        print("🛠️ Creating/Updating 'Risk_Detection_TestSet' table...")
        
        # 1. Create table if it entirely doesn't exist
        cur.execute("""
            CREATE TABLE IF NOT EXISTS "Risk_Detection_TestSet" (
                model_name TEXT PRIMARY KEY,
                model_binary BYTEA NOT NULL,
                version TEXT,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL
            );
        """)
        
        # 2. In case the table existed but was missing columns, we add them safely
        cur.execute("ALTER TABLE \"Risk_Detection_TestSet\" ADD COLUMN IF NOT EXISTS model_binary BYTEA;")
        cur.execute("ALTER TABLE \"Risk_Detection_TestSet\" ADD COLUMN IF NOT EXISTS version TEXT;")
        
        conn.commit()
        print("✅ Table 'Risk_Detection_TestSet' is fully set up and ready!")
    except Exception as e:
        conn.rollback()
        print(f"❌ Error setting up table: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    setup_database()