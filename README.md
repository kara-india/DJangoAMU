# TaskFlow — Role-aware Task Management

A focused screening-round implementation that keeps the original Django/DRF assignment intact while adding a polished React UI, explicit authorization, tests, and clean developer setup.

## Architecture

React + TypeScript + Vite → Django REST Framework → Django ORM → SQLite

The backend remains the source of truth for authentication, role-based visibility, task assignment, and mutation permissions.

## Roles

**ADMIN** — organization-wide visibility and management.

**MANAGER** — sees their own tasks and direct-team tasks; can assign within their team.

**USER** — sees only their own tasks and can update title, description, and status.

## Security fixes

The implementation explicitly prevents several easy privilege-escalation paths:

- DRF fields use `read_only=True` correctly for protected role/manager and assignee fields.
- User deletion is restricted to the admin-only endpoint.
- Manager task reassignment is checked on both create and update.
- Task querysets are filtered by role on the server.

## Run locally

### Backend

```bash
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

API: `http://127.0.0.1:8000/api/`
Swagger: `http://127.0.0.1:8000/api/docs/`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

For a separate backend, set `VITE_API_URL=http://127.0.0.1:8000/api` before starting Vite.

## Demo users

Create users through Django admin or a small seed command as needed. Example roles:

- `admin` — ADMIN
- `manager` — MANAGER
- `user` — USER

Use strong local-only passwords when creating them.

## Tests

Run:

```bash
python manage.py test
```

## Design choices

The project intentionally avoids Redux, Supabase, GraphQL, Celery, Redis, and other infrastructure that is not required for the assessment. The goal is an application a candidate can explain deeply in an interview: Python/Django on the backend and TypeScript/React on the frontend.

## Deployment

The frontend is a standard Vite application and can be deployed on Vercel. Django should be deployed on a Python-compatible host; keep the database configuration simple for the assessment unless production persistence is explicitly required.
