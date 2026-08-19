# TaskFlow — Role-aware Task Management

A screening-round implementation demonstrating Django/DRF backend skills, React/TypeScript frontend, JWT authentication, and explicit role-based access control (RBAC). Every authorization rule is enforced server-side; the frontend reflects what the API permits.

---

## Features

- **Three-tier RBAC**: ADMIN → MANAGER → USER
- **JWT authentication**: Access + refresh token flow via SimpleJWT
- **Task lifecycle**: Create, assign, update status, edit details, delete
- **Team scoping**: Managers see their team; users see their own tasks
- **Inline task editing**: Title, description, and status
- **Organization view**: Clear visual representation of the Admin → Manager → User hierarchy
- **API documentation**: Swagger UI at `/api/docs/`
- **Security regression coverage** for privilege-escalation paths
- **Demo seed data** for local Django usage

---

## UI / Web Demo

The React frontend is a lightweight TaskFlow workspace designed to make the assessment easy to evaluate visually without changing the original API contract.

### Main screens

- **Overview** — task counts, recent work and role context
- **Tasks** — filterable task cards/list, status changes, edit overlay and deletion for permitted roles
- **Organization / Team** — role-aware team visibility
- **Create Task** — available to Admin and Manager with assignment controls
- **Edit Task** — users can edit title, description and status; protected fields remain unavailable

The UI deliberately uses a small React + TypeScript + Vite stack. There is no Redux, router or heavyweight component framework.

### Vercel demo mode

The frontend can run independently when no `VITE_API_URL` is configured. In that mode, a small browser-local demo adapter emulates the same REST endpoints using `localStorage`.

This makes the Vercel deployment immediately usable for screening/demo purposes without requiring the evaluator to configure Django, Render, Supabase, PostgreSQL or environment variables.

The demo is initialized with an Admin account and realistic users/tasks on first visit. Signing out exposes the demo login flow for the Admin, Manager and User roles.

**Important:** Demo mode is presentation/demo functionality only. The actual Django API remains the authoritative implementation of authentication, authorization and persistence.

---

## Architecture

### Backend

```text
Django + Django REST Framework
           │
      Django ORM
           │
        SQLite
```

### Web demo

```text
Vercel
  │
  └── React + TypeScript + Vite
          │
          └── browser-local demo adapter (when VITE_API_URL is absent)
```

When a real `VITE_API_URL` is supplied, the same frontend calls the Django API normally.

---

## Role Hierarchy

```text
ADMIN
  │  Organization-wide visibility
  │  Can create/update/delete users and tasks
  │  Can assign tasks broadly
  ▼
MANAGER
  │  Sees own team members and their tasks
  │  Can create and assign tasks within own team
  │  Cannot assign to another manager's team
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

The backend is intentionally authoritative. Frontend controls only improve UX; direct API requests are still subject to Django permissions/queryset filtering/serializer restrictions.

Important protected paths include:

- non-admin users cannot promote themselves to ADMIN or change their manager
- users cannot change task assignee through their permitted update fields
- users cannot delete tasks or users
- managers cannot assign tasks outside their own team
- unauthenticated API access is rejected

---

## Local Setup

### Backend

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

API: `http://127.0.0.1:8000/api/`

Swagger UI: `http://127.0.0.1:8000/api/docs/`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

For a real backend:

```bash
VITE_API_URL=http://127.0.0.1:8000/api npm run dev
```

Without `VITE_API_URL`, the frontend runs in browser-local demo mode.

---

## Demo Accounts

> Demo credentials are for local/demo use only.

| Username | Password | Role |
|----------|----------|------|
| `admin` | `Admin123!` | ADMIN |
| `manager1` | `Manager123!` | MANAGER |
| `manager2` | `Manager123!` | MANAGER |
| `user1` | `User123!` | USER |
| `user2` | `User123!` | USER |
| `user3` | `User123!` | USER |
| `user4` | `User123!` | USER |
| `user5` | `User123!` | USER |
| `user6` | `User123!` | USER |

The web demo automatically opens the Admin workspace on the first visit so the evaluator can immediately inspect the UI.

---

## Testing

### Backend

```bash
python manage.py test
```

### Frontend

```bash
cd frontend
npm run build
npm run typecheck
```

The Vercel demo should be tested for:

- first-load dashboard
- task filters
- create task
- edit task
- status update
- delete task
- organization/team visibility
- sign out/sign in
- Admin / Manager / User role behavior

---

## Deployment — Vercel

The current deployment strategy is intentionally simple:

```text
GitHub
  ↓
Vercel
  ↓
React + Vite static frontend
  ↓
Browser-local demo data when no API URL is configured
```

There is **no Django runtime, Python function, Supabase dependency or PostgreSQL dependency in the Vercel demo deployment**.

Vercel can deploy directly from this repository using the root `vercel.json` configuration:

```json
{
  "installCommand": "npm --prefix frontend install",
  "buildCommand": "npm --prefix frontend run build",
  "outputDirectory": "frontend/dist"
}
```

The frontend also contains its SPA rewrite configuration under `frontend/vercel.json`.

### Optional real API mode

When a real Django deployment is available, configure:

```text
VITE_API_URL=https://your-django-api.example.com/api
```

The frontend then uses the real API instead of the browser-local demo adapter.

---

## Design Decisions

### Why Django + DRF?

The screening assessment is fundamentally about REST APIs, authentication and role-based authorization. Keeping Django/DRF as the source of truth makes those decisions explicit and easy to evaluate.

### Why SQLite?

It requires no infrastructure for local development and keeps the assessment easy to run.

### Why React + TypeScript + Vite?

It adds a professional UI while keeping the frontend stack small enough to explain comfortably in an interview.

### Why no Redux / Zustand / React Router?

The current UI is small enough for local React state and three top-level views. Additional state/routing frameworks would add complexity without meaningful assessment value.

### Why browser-local demo mode?

A screening evaluator should be able to click **Visit** on Vercel and immediately see a working application. Demo mode removes external database/backend setup while leaving the real Django API implementation intact.

---

## Project Structure

```text
DJangoAMU/
├── manage.py
├── requirements.txt
├── .env.example
├── .gitignore
├── README.md
├── vercel.json
│
├── project_task/
├── users/
├── tasks/
├── utils/
│
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── index.html
    ├── vercel.json
    └── src/
        ├── main.tsx
        ├── demoApi.ts
        └── styles.css
```
