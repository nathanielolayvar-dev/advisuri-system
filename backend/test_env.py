import os
from dotenv import load_dotenv

# Try to load the .env file
load_dotenv()

# Print the values (hiding the sensitive parts)
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_ANON_KEY")

print(f"--- Environment Test ---")
print(f"SUPABASE_URL: {url if url else '❌ NOT FOUND'}")
print(f"SUPABASE_KEY: {key[:10]}... (exists)" if key else "SUPABASE_KEY: ❌ NOT FOUND")
print(f"------------------------")

if not url or not key:
    print("TIP: Make sure your .env file is in this folder and the names match exactly.")