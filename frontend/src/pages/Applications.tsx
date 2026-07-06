import { useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import type { Application } from '../types'
import { useApp } from '../store/AppContext'
import { Plus, Calendar, StickyNote, X } from 'lucide-react'

const columns: Application['status'][] = [
  'Wishlist', 'Applied', 'Online Assessment', 'Technical Interview', 'HR Interview', 'Selected', 'Rejected'
]

const colAccent: Record<string, string> = {
  'Wishlist': '#6B7280', 'Applied': '#6366f1', 'Online Assessment': '#f59e0b',
  'Technical Interview': '#8b5cf6', 'HR Interview': '#06b6d4',
  'Selected': '#10b981', 'Rejected': '#ef4444',
}

const EMPTY: Omit<Application, 'id'> = {
  company: '', role: '', status: 'Wishlist', deadline: '', notes: '',
}

export default function Applications() {
  const { applications, setApplications, addApplication } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Omit<Application, 'id'>>(EMPTY)

  const onDragEnd = (r: DropResult) => {
    if (!r.destination) return
    setApplications(applications.map(a =>
      a.id === r.draggableId ? { ...a, status: r.destination!.droppableId as Application['status'] } : a
    ))
  }

  const getCol = (s: Application['status']) => applications.filter(a => a.status === s)

  const addApp = () => {
    if (!form.company || !form.role) return
    addApplication(form)
    setForm(EMPTY); setShowForm(false)
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-10 space-y-8">
      <header className="flex items-start justify-between flex-wrap gap-4">
        <div className="space-y-2">
          <p className="text-label">Application Pipeline</p>
          <h1 className="text-display font-display">Track your journey</h1>
          <p className="text-base" style={{ color: 'var(--text-2)' }}>
            {applications.length} total · {applications.filter(a => !['Rejected', 'Selected'].includes(a.status)).length} active · {applications.filter(a => a.status === 'Selected').length} offer{applications.filter(a => a.status === 'Selected').length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="btn-accent">
          {showForm ? <><X size={15} /> Cancel</> : <><Plus size={15} /> Add Application</>}
        </button>
      </header>

      {showForm && (
        <div className="surface-elevated p-6">
          <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>New Application</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {([
              { key: 'company', label: 'Company', placeholder: 'Google' },
              { key: 'role',    label: 'Role',    placeholder: 'SWE Intern' },
              { key: 'deadline', label: 'Deadline', placeholder: '', type: 'date' },
            ] as { key: string; label: string; placeholder: string; type?: string }[]).map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-2)' }}>{f.label}</label>
                <input type={f.type ?? 'text'} placeholder={f.placeholder}
                  className="w-full rounded-xl px-4 py-2.5 text-sm border outline-none focus:border-[#C26D3B] transition-colors"
                  style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  value={(form as Record<string, string>)[f.key] ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-2)' }}>Notes</label>
              <input placeholder="Applied via referral, OA scheduled..."
                className="w-full rounded-xl px-4 py-2.5 text-sm border outline-none focus:border-[#C26D3B] transition-colors"
                style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text)' }}
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-2)' }}>Status</label>
              <select
                className="w-full rounded-xl px-4 py-2.5 text-sm border outline-none focus:border-[#C26D3B] transition-colors"
                style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text)' }}
                value={form.status}
                onChange={e => setForm(prev => ({ ...prev, status: e.target.value as Application['status'] }))}>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <button onClick={addApp}
            className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90"
            style={{ background: 'var(--primary)' }}>
            Save Application
          </button>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-5 overflow-x-auto pb-6 -mx-2 px-2">
          {columns.map(col => (
            <div key={col} className="shrink-0 w-64">
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: colAccent[col] }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>
                    {col}
                  </span>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'var(--bg-muted)', color: 'var(--text-3)' }}>
                  {getCol(col).length}
                </span>
              </div>
              <Droppable droppableId={col}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}
                    className="min-h-[280px] p-3 space-y-3 transition-all"
                    style={{
                      borderRadius: 'var(--radius-xl)',
                      background: snapshot.isDraggingOver ? `${colAccent[col]}08` : 'var(--bg-muted)',
                      border: snapshot.isDraggingOver ? `2px dashed ${colAccent[col]}50` : '1px solid var(--border)',
                    }}>
                    {getCol(col).map((app, index) => (
                      <Draggable key={app.id} draggableId={app.id} index={index}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                            className="p-4 space-y-3 cursor-grab active:cursor-grabbing transition-all"
                            style={{
                              background: 'var(--bg-elevated)',
                              borderRadius: 'var(--radius)',
                              border: `1px solid ${snapshot.isDragging ? colAccent[col] + '60' : 'var(--border)'}`,
                              boxShadow: snapshot.isDragging ? 'var(--shadow-lg)' : 'var(--shadow-xs)',
                              transform: snapshot.isDragging ? 'rotate(1deg) scale(1.02)' : undefined,
                            }}>
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                                style={{ background: colAccent[col] }}>
                                {app.company[0]}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{app.company}</p>
                                <p className="text-xs truncate" style={{ color: 'var(--text-2)' }}>{app.role}</p>
                              </div>
                            </div>
                            {app.deadline && (
                              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-3)' }}>
                                <Calendar size={11} />
                                {new Date(app.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </div>
                            )}
                            {app.notes && (
                              <div className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--text-3)' }}>
                                <StickyNote size={11} className="mt-0.5 shrink-0" />
                                <span className="truncate">{app.notes}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  )
}
