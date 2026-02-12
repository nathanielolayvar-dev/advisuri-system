import sys
import os

# 1. Force the parent directory (backend) into Python's path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

try:
    # 2. Use an absolute import now that the path is set
    from api.analytics.analytics_engine import AnalyticsEngine
    print("✅ Success: Analytics Engine and all Algorithms are linked.")
except ImportError as e:
    print(f"❌ Import failed: {e}")
except Exception as e:
    print(f"⚠️ Logic error: {e}")