# TaskFlow — Role-aware Task Management

A screening-round implementation demonstrating Django/DRF backend skills, React/TypeScript frontend, JWT authentication, and explicit role-based access control (RBAC). Every authorization rule is enforced server-side; the frontend merely reflects what the API permits.

---

## Features

- **Three-tier RBAC**: ADMIN → MANAGER → USER with different visibility and mutation rights
- **JWT authentication**: Access + refresh token flow via SimpleJWT
- **Task lifecycle**: Create, assign, update status, edit details, delete (with role enforcement)
- **Team scoping**: Managers see only their own team; users see only their own tasks
- **Inline task editing**: Title, description, and status editable per role
- **API documentation**: Swagger UI at `/api/docs/`
- **Security tests**: Regression suite covering all privilege-escalation paths
- **Demo seed command**: One command to populate the database with realistic data

---

## Architecture

```
React + TypeScript + Vite
         │
         │  HTTPS (VITE_API_URL)
         ▼
  Django REST Framework
         │
         │  Django ORM
         ▼
       SQLite
```

**Frontend**: Single-page application — no React Router, no Redux. All state is local. All authorization logic lives in the backend.

**Backend**: Standard Django project with two apps (`users`, `tasks`). JWT is stateless. Role enforcement is in serializers, permission classes, and view-level queryset filtering.

---

## Role Hierarchy

```
ADMIN
  │  Organization-wide visibility
  │  Can create/update/delete users and tasks
  │  Can assign tasks to any user
  ▼
MANAGER
  │  Sees own team members and their tasks
  │  Can create and assign tasks within own team
  │  Cannot assign to another manager's team
  │  Cannot delete users
  ▼
USER
     Sees only own tasks
     Can edit title, description, and status
     Cannot change assignee, role, or manager
     Cannot create or delete tasks
```

---

## Authorization Model

| Action | ADMIN | MANAGER | USER |
|--------|:-----:|:-------:|:----:|
| List all users | ✅ | ❌ (own team only) | ❌ (self only) |
| Create user | ✅ | ❌ | ❌ |
| Update user role | ✅ | ❌ | ❌ |
| Delete user | ✅ | ❌ | ❌ |
| List all tasks | ✅ | ❌ (team only) | ❌ (own only) |
| Create task | ✅ | ✅ (own team) | ❌ |
| Assign task to any user | ✅ | ❌ | ❌ |
| Assign task to own team | ✅ | ✅ | ❌ |
| Edit task title/description | ✅ | ✅ | ✅ |
| Edit task status | ✅ | ✅ | ✅ |
| Change task assignee | ✅ | ✅ (own team only) | ❌ |
| Delete task | ✅ | ✅ (visible tasks) | ❌ |

---

## Security

The following privilege-escalation paths are explicitly blocked and covered by regression tests:

- **USER → ADMIN role promotion**: `role` field is `read_only` in `UserSerializer` for non-admins
- **USER changing own manager**: `manager` field is `read_only` for non-admins
- **USER changing task assignee**: `assigned_to` field is `read_only` in `TaskSerializer` for USER role
- **USER deleting tasks**: Checked in `TaskDetailView.destroy()`
- **USER deleting users**: `UserDeleteView` requires `IsAdmin` permission
- **MANAGER assigning outside team (create)**: Checked in `TaskListCreateView.perform_create()`
- **MANAGER assigning outside team (update/PATCH)**: Checked in `TaskDetailView.update()`
- **Unauthenticated access**: All endpoints require `IsAuthenticated` by default

---

## Local Setup

### Prerequisites

- Python 3.11+
- Node.js 18+

### Backend

```bash
# 1. Clone
git clone https://github.com/kara-india/DJangoAMU.git
cd DJangoAMU

# 2. Create virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run migrations
python manage.py migrate

# 5. Seed demo data (optional but recommended)
python manage.py seed_demo

# 6. Start the API server
python manage.py runserver
```

- API base: `http://127.0.0.1:8000/api/`
- Swagger UI: `http://127.0.0.1:8000/api/docs/`
- Django admin: `http://127.0.0.1:8000/admin/`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`. It proxies API calls through `VITE_API_URL` (defaults to `/api` — configure this env var to point at a separate backend).

```bash
# For a separate backend:
VITE_API_URL=http://127.0.0.1:8000/api npm run dev
```

---

## Demo Data

Run the seed command to create a full demo dataset:

```bash
python manage.py seed_demo
# To reset and re-seed:
python manage.py seed_demo --reset
```

### Demo Credentials

> ⚠️ **These are local development / demo credentials only. Never use in production.**

| Username | Password | Role | Team |
|----------|----------|------|------|
| `admin` | `Admin123!` | ADMIN | — |
| `manager1` | `Manager123!` | MANAGER | alice, bob, carol |
| `manager2` | `Manager123!` | MANAGER | dave, eve, frank |
| `alice` | `User123!` | USER | manager1's team |
| `bob` | `User123!` | USER | manager1's team |
| `carol` | `User123!` | USER | manager1's team |
| `dave` | `User123!` | USER | manager2's team |
| `eve` | `User123!` | USER | manager2's team |
| `frank` | `User123!` | USER | manager2's team |

The seed command also creates 15 tasks spread across all statuses (TODO / IN_PROGRESS / DONE), assigned to team members and managers.

---

## Testing

### Django backend tests

```bash
python manage.py test
```

The test suite covers:
- Admin can list all users and tasks
- Admin can delete users and tasks
- Admin can assign tasks to any user
- USER cannot promote self to ADMIN
- USER cannot change own manager
- USER cannot create tasks
- USER cannot delete tasks
- USER cannot delete users
- USER cannot view another user's task
- USER cannot change task assignee (field is ignored)
- USER can update title, description, and status
- MANAGER sees only own team users
- MANAGER sees only team tasks
- MANAGER cannot assign task to another team's user (create)
- MANAGER cannot assign task to another team's user (PATCH)
- MANAGER cannot delete users
- MANAGER can assign task to own team member
- MANAGER can assign task to self
- MANAGER can delete visible task
- Unauthenticated access is rejected

### Frontend build

```bash
cd frontend
npm run build        # TypeScript compile + Vite bundle
npm run typecheck    # TypeScript type-check only
```

---

## Deployment

### Frontend — Vercel

The frontend is a static Vite build. Deploy with these settings:

| Setting | Value |
|---------|-------|
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

**Required environment variable in Vercel:**

```
VITE_API_URL=https://your-taskflow-api.onrender.com/api
```

`vercel.json` (already committed) handles SPA routing:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Backend — Render.com

A `render.yaml` is provided in the repository root for one-click Render deployment.

**Manual setup:**

1. Create a new **Web Service** on Render
2. Connect the `kara-india/DJangoAMU` repository
3. Set runtime to **Python**
4. Build command: `pip install -r requirements.txt && python manage.py migrate --no-input && python manage.py collectstatic --no-input`
5. Start command: `gunicorn project_task.wsgi:application`

**Required environment variables on Render:**

| Variable | Value |
|----------|-------|
| `DJANGO_SECRET_KEY` | A long random string (use Render's "Generate" button) |
| `DJANGO_DEBUG` | `False` |
| `DJANGO_ALLOWED_HOSTS` | `your-service.onrender.com` |
| `CORS_ALLOWED_ORIGINS` | `https://your-taskflow.vercel.app` |

> **Note on SQLite on Render**: Render's free tier uses ephemeral storage — the SQLite database will reset on redeploy. This is acceptable for a screening assessment. For persistent storage, Render offers a persistent disk add-on or you can migrate to PostgreSQL. This project is intentionally kept on SQLite to stay simple and explainable.

---

## Environment Variables Reference

### Backend (`.env` — never commit this file)

```bash
DJANGO_SECRET_KEY=your-long-random-secret-key-here
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### Frontend (`frontend/.env` — never commit this file)

```bash
VITE_API_URL=http://127.0.0.1:8000/api
```

See `.env.example` (root) and `frontend/.env.example` for templates.

---

## Design Decisions

### Why Django + DRF?

Django gives a clear, conventional structure that interviewers can read and evaluate quickly. DRF's serializers, generic views, and permission classes are the industry-standard way to build REST APIs in Python.

### Why SQLite?

It requires zero infrastructure. The database is a single file. Migrations work identically to PostgreSQL. For a screening assessment the goal is demonstrating understanding of Django ORM, not infrastructure provisioning.

### Why a single `main.tsx`?

The entire frontend application is in one file. This is a deliberate choice: every line of code is immediately findable and explainable in an interview. There is no "where does X happen?" confusion. As the app grows, you would split into components and add routing — but for this scope, a single file is cleaner.

### Why no Redux / Zustand?

The app has three data types (user, tasks, team members) and one authenticated user. Local `useState` + a `load()` function is sufficient and far easier to explain than a state management library.

### Why no React Router?

There are three views (dashboard, tasks, people). They are controlled by a single `view` state variable. This is sufficient for the current scope. Adding React Router would introduce complexity (route guards, nested routes, navigation history) without adding any value for this assessment.

### Why no Supabase / PostgreSQL?

The assessment does not require production persistence. Introducing Supabase would hide the Django ORM behind an abstraction and make the backend harder to explain. SQLite + Django ORM is the honest, simple choice.

### Why Vercel for frontend + Render for backend?

Vercel serves static files (the built React app) optimally. Django + SQLite needs a persistent Python process — Render's web services provide this with zero configuration overhead. Keeping them separate is the correct architectural split.

---

## Project Structure

```
DJangoAMU/
├── manage.py
├── requirements.txt          # Django, DRF, JWT, CORS, gunicorn, whitenoise
├── Procfile                  # gunicorn startup for Render
├── render.yaml               # Render.com deployment config
├── .env.example              # Backend env template
├── .gitignore
├── README.md
│
├── project_task/             # Django project config
│   ├── settings.py           # All env-var driven
│   ├── urls.py               # Root URL conf
│   ├── wsgi.py
│   └── asgi.py
│
├── users/                    # Custom user app
│   ├── models.py             # User extends AbstractUser (role, manager)
│   ├── serializers.py        # Read-only role/manager for non-admins
│   ├── views.py              # Register, Me, UserList, UserDetail, UserDelete
│   ├── permissions.py        # IsAdmin
│   ├── urls.py
│   ├── tests.py              # 19 security regression tests
│   └── management/commands/
│       └── seed_demo.py      # Demo data command
│
├── tasks/                    # Task management app
│   ├── models.py             # Task (title, description, assigned_to, status)
│   ├── serializers.py        # Read-only assigned_to for USER role
│   ├── views.py              # TaskList+Create, TaskDetail (RBAC enforced)
│   ├── permissions.py        # IsAdminOrManager
│   └── urls.py
│
└── frontend/                 # React + TypeScript + Vite
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── index.html
    ├── vercel.json           # SPA rewrite rule for Vercel
    ├── .env.example          # Frontend env template
    └── src/
        ├── main.tsx          # Full application (App + components)
        └── styles.css        # Complete dark-theme design system
```
