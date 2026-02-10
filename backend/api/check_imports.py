import sys
import os

# Add the current directory to sys.path so Python treats 'analytics' as a package
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from analytics.analytics_engine import SupabaseAnalyticsEngine
    print("✅ Success: Analytics Engine and all Algorithms are linked.")
except ImportError as e:
    print(f"❌ Import failed: {e}")
except Exception as e:
    print(f"⚠️ Logic error: {e}")