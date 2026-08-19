import { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

// ── Types ────────────────────────────────────────────────────────────────────
type Me = { id: number; username: string; name: string; email: string; role: 'ADMIN' | 'MANAGER' | 'USER'; manager: string | null }
type Task = { id: number; title: string; description: string; assigned_to: number; assigned_to_name: string; status: 'TODO' | 'IN_PROGRESS' | 'DONE'; created_at: string; updated_at: string }
type AppUser = { id: number; name: string; username: string; email: string; role: string; manager: number | null }

// ── API helper ───────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || '/api'

async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('access')
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const r = await fetch(`${API}${path}`, { ...options, headers })
  if (!r.ok) {
    const body = await r.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(body.detail || 'Request failed')
  }
  return (r.status === 204 ? null : r.json()) as Promise<T>
}

// ── Status helpers ───────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
}
const STATUS_CLASS: Record<string, string> = {
  TODO: 'todo',
  IN_PROGRESS: 'in-progress',
  DONE: 'done',
}

// ── Main App ─────────────────────────────────────────────────────────────────
function App() {
  const [me, setMe] = useState<Me | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [usersById, setUsersById] = useState<Record<number, AppUser>>({})
  const [login, setLogin] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [view, setView] = useState<'dashboard' | 'tasks' | 'people'>('dashboard')

  // New task modal state
  const [showNew, setShowNew] = useState(false)
  const [draft, setDraft] = useState({ title: '', description: '', assigned_to: '', status: 'TODO' })
  const [draftError, setDraftError] = useState('')

  // Edit task modal state
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [editDraft, setEditDraft] = useState({ title: '', description: '', status: 'TODO' as Task['status'] })
  const [editError, setEditError] = useState('')

  const load = async () => {
    try {
      const [m, t] = await Promise.all([api<Me>('/me/'), api<Task[]>('/tasks/')])
      setMe(m)
      setTasks(t)
      if (m.role !== 'USER') {
        const u = await api<AppUser[]>('/users/')
        setUsers(u)
        setUsersById(Object.fromEntries(u.map((x) => [x.id, x])))
      }
    } catch {
      localStorage.removeItem('access')
      setMe(null)
      setError('Session expired. Please sign in again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (localStorage.getItem('access')) load()
    else setLoading(false)
  }, [])

  const stats = useMemo(
    () => ({
      todo: tasks.filter((t) => t.status === 'TODO').length,
      progress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      done: tasks.filter((t) => t.status === 'DONE').length,
    }),
    [tasks]
  )

  const filtered = tasks.filter((t) => filter === 'ALL' || t.status === filter)

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const r = await api<{ access: string; refresh: string }>('/token/', {
        method: 'POST',
        body: JSON.stringify(login),
      })
      localStorage.setItem('access', r.access)
      localStorage.setItem('refresh', r.refresh)
      await load()
    } catch {
      setError('Invalid username or password.')
    }
  }

  const signOut = () => {
    localStorage.clear()
    setMe(null)
    setTasks([])
    setUsers([])
  }

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault()
    setDraftError('')
    try {
      await api('/tasks/', {
        method: 'POST',
        body: JSON.stringify({ ...draft, assigned_to: Number(draft.assigned_to) }),
      })
      setDraft({ title: '', description: '', assigned_to: '', status: 'TODO' })
      setShowNew(false)
      await load()
    } catch (e) {
      setDraftError((e as Error).message)
    }
  }

  const openEdit = (task: Task) => {
    setEditTask(task)
    setEditDraft({ title: task.title, description: task.description, status: task.status })
    setEditError('')
  }

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTask) return
    setEditError('')
    try {
      await api(`/tasks/${editTask.id}/`, { method: 'PATCH', body: JSON.stringify(editDraft) })
      setEditTask(null)
      await load()
    } catch (e) {
      setEditError((e as Error).message)
    }
  }

  const updateStatus = async (t: Task, status: string) => {
    try {
      await api(`/tasks/${t.id}/`, { method: 'PATCH', body: JSON.stringify({ status }) })
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const remove = async (t: Task) => {
    if (!confirm(`Delete "${t.title}"?`)) return
    try {
      await api(`/tasks/${t.id}/`, { method: 'DELETE' })
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  // ── Loading spinner ─────────────────────────────────────────────────────────
  if (loading)
    return (
      <div className="center">
        <div className="spinner" />
      </div>
    )

  // ── Login page ──────────────────────────────────────────────────────────────
  if (!me)
    return (
      <div className="auth-shell">
        <form className="login-card" onSubmit={signIn} id="login-form">
          <div className="brand-mark" aria-hidden="true">TF</div>
          <p className="eyebrow">TASKFLOW</p>
          <h1>Work, with clarity.</h1>
          <p className="muted">Role-aware task management for focused teams.</p>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            value={login.username}
            onChange={(e) => setLogin({ ...login, username: e.target.value })}
            autoFocus
            autoComplete="username"
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={login.password}
            onChange={(e) => setLogin({ ...login, password: e.target.value })}
            autoComplete="current-password"
          />
          {error && <div className="alert" role="alert">{error}</div>}
          <button className="primary wide" type="submit" id="sign-in-btn">Sign in</button>
          <p className="hint">Use the demo accounts listed in the README.</p>
        </form>
      </div>
    )

  // ── Authenticated layout ─────────────────────────────────────────────────────
  const navItems: [string, string][] = [
    ['dashboard', 'Overview'],
    ['tasks', 'Tasks'],
    ...(me.role !== 'USER' ? [['people', me.role === 'ADMIN' ? 'Organization' : 'Team'] as [string, string]] : []),
  ]

  return (
    <div className="app">
      {/* Sidebar */}
      <aside aria-label="Sidebar navigation">
        <div className="side-brand">
          <span className="brand-mark small" aria-hidden="true">TF</span>
          <div>
            <strong>TaskFlow</strong>
            <small>Role-aware workspace</small>
          </div>
        </div>
        <nav aria-label="Main navigation">
          {navItems.map(([k, l]) => (
            <button
              key={k}
              id={`nav-${k}`}
              className={view === k ? 'nav active' : 'nav'}
              onClick={() => setView(k as typeof view)}
              aria-current={view === k ? 'page' : undefined}
            >
              {l}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <div className={`role-dot ${me.role.toLowerCase()}`} title={me.role} />
          <div>
            <strong>{me.name || me.username}</strong>
            <small>
              <span className={`role-badge-sm ${me.role.toLowerCase()}`}>{me.role}</span>
            </small>
          </div>
          <button className="ghost" onClick={signOut} id="sign-out-btn" title="Sign out">↪</button>
        </div>
      </aside>

      {/* Main content */}
      <main>
        <header>
          <div>
            <p className="eyebrow">{me.role}</p>
            <h2>
              {view === 'dashboard' ? 'Overview' : view === 'tasks' ? 'Tasks' : me.role === 'ADMIN' ? 'Organization' : 'Team'}
            </h2>
          </div>
          <div className="header-actions">
            {(me.role === 'ADMIN' || me.role === 'MANAGER') && (
              <button className="primary" id="new-task-btn" onClick={() => { setShowNew(true); setDraftError('') }}>
                + New task
              </button>
            )}
          </div>
        </header>

        {error && (
          <div className="alert top" role="alert">
            {error}
            <button onClick={() => setError('')} aria-label="Dismiss error">×</button>
          </div>
        )}

        {/* Dashboard view */}
        {view === 'dashboard' && (
          <>
            <section className="stats" aria-label="Task statistics">
              {([
                ['To Do', stats.todo, 'todo'],
                ['In Progress', stats.progress, 'in-progress'],
                ['Completed', stats.done, 'done'],
              ] as [string, number, string][]).map(([label, num, cls]) => (
                <div className="stat" key={label}>
                  <span className={`role-pill ${cls}`}>{label}</span>
                  <strong>{num}</strong>
                  <small>Visible in your scope</small>
                </div>
              ))}
            </section>
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h3>Recent work</h3>
                  <p className="muted">Latest tasks you can access.</p>
                </div>
                <button className="link" onClick={() => setView('tasks')}>View all →</button>
              </div>
              <TaskRows tasks={tasks.slice(0, 6)} me={me} onStatus={updateStatus} onDelete={remove} onEdit={openEdit} />
              {tasks.length === 0 && <Empty message="No tasks yet. Create one to get started." />}
            </section>
          </>
        )}

        {/* Tasks view */}
        {view === 'tasks' && (
          <section className="panel">
            <div className="toolbar">
              <div className="segmented" role="group" aria-label="Filter by status">
                {['ALL', 'TODO', 'IN_PROGRESS', 'DONE'].map((s) => (
                  <button
                    key={s}
                    id={`filter-${s.toLowerCase()}`}
                    className={filter === s ? 'selected' : ''}
                    onClick={() => setFilter(s)}
                  >
                    {s === 'ALL' ? 'All' : STATUS_LABELS[s] || s}
                  </button>
                ))}
              </div>
              <span className="muted">{filtered.length} task{filtered.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="task-grid">
              {filtered.map((t) => (
                <TaskCard key={t.id} task={t} me={me} onStatus={updateStatus} onDelete={remove} onEdit={openEdit} />
              ))}
            </div>
            {filtered.length === 0 && <Empty message="No tasks match this filter." />}
          </section>
        )}

        {/* People view */}
        {view === 'people' && (
          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>{me.role === 'ADMIN' ? 'Organization' : 'Your team'}</h3>
                <p className="muted">Authorization is enforced by the API — this reflects your visible scope.</p>
              </div>
            </div>
            {users.length === 0 ? (
              <Empty message="No team members visible in your scope." />
            ) : (
              <div className="people-grid">
                {users.map((u) => {
                  const managerUser = u.manager ? usersById[u.manager] : null
                  return (
                    <div className="person" key={u.id}>
                      <div className={`avatar ${u.role.toLowerCase()}`} aria-label={u.role}>
                        {(u.name || u.username).slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <strong>{u.name || u.username}</strong>
                        <small>
                          {u.username} ·{' '}
                          <span className={`role-badge-sm ${u.role.toLowerCase()}`}>{u.role}</span>
                        </small>
                      </div>
                      <span className="muted manager-label">
                        {managerUser ? managerUser.name || managerUser.username : u.manager ? `Manager #${u.manager}` : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </main>

      {/* New task modal */}
      {showNew && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="new-task-title">
          <form className="modal" onSubmit={createTask}>
            <div className="panel-head">
              <div>
                <h3 id="new-task-title">Create task</h3>
                <p className="muted">Assignment scope is checked server-side.</p>
              </div>
              <button type="button" className="ghost" onClick={() => setShowNew(false)} aria-label="Close">×</button>
            </div>
            <label htmlFor="new-title">Title</label>
            <input id="new-title" required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <label htmlFor="new-description">Description</label>
            <textarea id="new-description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            <label htmlFor="new-assignee">Assignee</label>
            <select id="new-assignee" required value={draft.assigned_to} onChange={(e) => setDraft({ ...draft, assigned_to: e.target.value })}>
              <option value="">Select a user…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.username} ({u.role})
                </option>
              ))}
            </select>
            <label htmlFor="new-status">Status</label>
            <select id="new-status" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            {draftError && <div className="alert" role="alert">{draftError}</div>}
            <div className="row">
              <button type="button" className="secondary" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="primary" type="submit">Create task</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit task modal */}
      {editTask && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="edit-task-title">
          <form className="modal" onSubmit={saveEdit}>
            <div className="panel-head">
              <div>
                <h3 id="edit-task-title">Edit task</h3>
                <p className="muted">
                  {me.role === 'USER' ? 'You can edit title, description and status.' : 'Edit task details.'}
                </p>
              </div>
              <button type="button" className="ghost" onClick={() => setEditTask(null)} aria-label="Close">×</button>
            </div>
            <label htmlFor="edit-title">Title</label>
            <input
              id="edit-title"
              required
              value={editDraft.title}
              onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
            />
            <label htmlFor="edit-description">Description</label>
            <textarea
              id="edit-description"
              value={editDraft.description}
              onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })}
            />
            <label htmlFor="edit-status">Status</label>
            <select
              id="edit-status"
              value={editDraft.status}
              onChange={(e) => setEditDraft({ ...editDraft, status: e.target.value as Task['status'] })}
            >
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            {editError && <div className="alert" role="alert">{editError}</div>}
            <div className="row">
              <button type="button" className="secondary" onClick={() => setEditTask(null)}>Cancel</button>
              <button className="primary" type="submit">Save changes</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

// ── TaskRows component (dashboard recent work list) ───────────────────────────
function TaskRows({
  tasks,
  me,
  onStatus,
  onDelete,
  onEdit,
}: {
  tasks: Task[]
  me: Me
  onStatus: (t: Task, s: string) => void
  onDelete: (t: Task) => void
  onEdit: (t: Task) => void
}) {
  return (
    <div>
      {tasks.map((t) => (
        <div className="task-row" key={t.id}>
          <div>
            <strong>{t.title}</strong>
            <small>
              {t.assigned_to_name || 'Unassigned'} · updated {new Date(t.updated_at).toLocaleDateString()}
            </small>
          </div>
          <span className={`role-pill ${STATUS_CLASS[t.status] || t.status.toLowerCase()}`}>
            {STATUS_LABELS[t.status] || t.status}
          </span>
          <div className="task-row-actions">
            <button className="ghost compact" onClick={() => onEdit(t)} title="Edit task">✎</button>
            <select
              value={t.status}
              onChange={(e) => onStatus(t, e.target.value)}
              aria-label="Change status"
            >
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            {me.role !== 'USER' && (
              <button className="ghost danger" onClick={() => onDelete(t)} title="Delete task">×</button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── TaskCard component (tasks view grid) ─────────────────────────────────────
function TaskCard({
  task,
  me,
  onStatus,
  onDelete,
  onEdit,
}: {
  task: Task
  me: Me
  onStatus: (t: Task, s: string) => void
  onDelete: (t: Task) => void
  onEdit: (t: Task) => void
}) {
  return (
    <article className="task-card">
      <div className="task-card-top">
        <span className={`role-pill ${STATUS_CLASS[task.status] || task.status.toLowerCase()}`}>
          {STATUS_LABELS[task.status] || task.status}
        </span>
        <span className="muted">#{task.id}</span>
      </div>
      <h3>{task.title}</h3>
      <p>{task.description || 'No description added.'}</p>
      <div className="task-card-bottom">
        <span className="assignee-label">{task.assigned_to_name || '—'}</span>
        <div className="task-card-actions">
          <button className="ghost compact" onClick={() => onEdit(task)} title="Edit task">✎</button>
          <select
            value={task.status}
            onChange={(e) => onStatus(task, e.target.value)}
            aria-label="Change status"
          >
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {me.role !== 'USER' && (
            <button className="ghost danger" onClick={() => onDelete(task)} title="Delete task">×</button>
          )}
        </div>
      </div>
    </article>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function Empty({ message }: { message: string }) {
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden="true">✓</div>
      <h3>Nothing here yet</h3>
      <p className="muted">{message}</p>
    </div>
  )
}

// ── Mount ─────────────────────────────────────────────────────────────────────
createRoot(document.getElementById('root')!).render(<App />)
