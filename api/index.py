"""
Vercel Python serverless entry point.

Vercel auto-detects 'api/index.py' and deploys it as a serverless function.
All requests to /api/* and /admin/* are routed here via vercel.json rewrites.
"""
import os
import sys

# Ensure the repo root is on sys.path so Django can find project_task, users, tasks
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project_task.settings')

from project_task.wsgi import application as _app  # noqa: E402

# Vercel's Python runtime looks for a variable named 'handler' that is WSGI-compatible.
handler = _app
