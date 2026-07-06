import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen, FileText, BookMarked, Building2, Bookmark, Users,
  Plus, Trash2, Save, Search,
} from 'lucide-react'
import { useApp } from '../store/AppContext'
import type { PersonalNote, WikiPage, JournalEntry, CompanyResearch, Bookmark as Bm, ReferralEntry } from '../types'

const TABS = [
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'wiki', label: 'Wiki', icon: BookOpen },
  { id: 'journal', label: 'Journal', icon: BookMarked },
  { id: 'research', label: 'Company Research', icon: Building2 },
  { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
  { id: 'referrals', label: 'Referrals', icon: Users },
] as const

type TabId = typeof TABS[number]['id']

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export default function KnowledgeHub() {
  const { knowledge, setKnowledge, user } = useApp()
  const [tab, setTab] = useState<TabId>('notes')
  const [search, setSearch] = useState('')
  const [selectedWiki, setSelectedWiki] = useState<string | null>(knowledge.wikiPages[0]?.id ?? null)
  const [selectedNote, setSelectedNote] = useState<string | null>(null)

  const wiki = useMemo(() => {
    const q = search.toLowerCase()
    return knowledge.wikiPages.filter(w =>
      !q || w.title.toLowerCase().includes(q) || w.body.toLowerCase().includes(q),
    )
  }, [knowledge.wikiPages, search])

  const activeWiki = knowledge.wikiPages.find(w => w.id === selectedWiki)
  const activeNote = knowledge.notes.find(n => n.id === selectedNote)

  const saveNote = (patch: Partial<PersonalNote>) => {
    if (!activeNote) return
    setKnowledge({
      ...knowledge,
      notes: knowledge.notes.map(n => n.id === activeNote.id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n),
    })
  }

  const addNote = () => {
    const n: PersonalNote = {
      id: uid(), title: 'Untitled note', body: '', tags: [], category: 'general', updatedAt: new Date().toISOString(),
    }
    setKnowledge({ ...knowledge, notes: [n, ...knowledge.notes] })
    setSelectedNote(n.id)
    setTab('notes')
  }

  const addJournal = () => {
    const e: JournalEntry = {
      id: uid(), date: new Date().toISOString().slice(0, 10), mood: 'ok', wins: '', struggles: '', lessons: '',
    }
    setKnowledge({ ...knowledge, journal: [e, ...knowledge.journal] })
  }

  const addResearch = () => {
    const c = user?.targetCompanies?.[0] ?? 'Company'
    const r: CompanyResearch = {
      id: uid(), company: c, roleNotes: '', interviewTips: '', cultureNotes: '', salaryNotes: '', updatedAt: new Date().toISOString(),
    }
    setKnowledge({ ...knowledge, companyResearch: [r, ...knowledge.companyResearch] })
  }

  const addBookmark = () => {
    const b: Bm = { id: uid(), title: 'Resource', url: 'https://', tags: [], createdAt: new Date().toISOString() }
    setKnowledge({ ...knowledge, bookmarks: [b, ...knowledge.bookmarks] })
  }

  const addReferral = () => {
    const r: ReferralEntry = {
      id: uid(), company: user?.targetCompanies?.[0] ?? '', contactName: '', status: 'Requested', notes: '', updatedAt: new Date().toISOString(),
    }
    setKnowledge({ ...knowledge, referrals: [r, ...knowledge.referrals] })
  }

  return (
    <div className="page-container py-6 sm:py-8 max-w-[1100px] space-y-6">
      <div>
        <p className="text-label mb-1">Knowledge</p>
        <h1 className="text-display">Knowledge Hub</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>
          Notes, wiki playbooks, journal, company research, bookmarks, and referrals — your placement workspace.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                tab === t.id ? 'text-white border-transparent' : ''
              }`}
              style={tab === t.id
                ? { background: 'var(--accent)' }
                : { borderColor: 'var(--border)', color: 'var(--text-2)', background: 'var(--bg-elevated)' }}
            >
              <Icon size={14} /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'notes' && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-2">
            <button type="button" onClick={addNote} className="btn-primary w-full py-2 text-sm flex items-center justify-center gap-1">
              <Plus size={14} /> New note
            </button>
            {knowledge.notes.map(n => (
              <button
                key={n.id}
                type="button"
                onClick={() => setSelectedNote(n.id)}
                className="w-full text-left p-3 rounded-xl border text-sm"
                style={{
                  borderColor: selectedNote === n.id ? 'var(--accent)' : 'var(--border)',
                  background: selectedNote === n.id ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                }}
              >
                <p className="font-semibold truncate">{n.title}</p>
                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-3)' }}>{n.category}</p>
              </button>
            ))}
            {knowledge.notes.length === 0 && (
              <p className="text-xs p-3" style={{ color: 'var(--text-3)' }}>No notes yet. Create DSA patterns, interview prep, or general notes.</p>
            )}
          </div>
          <div className="lg:col-span-2 glass-card p-4 space-y-3">
            {activeNote ? (
              <>
                <input
                  value={activeNote.title}
                  onChange={e => saveNote({ title: e.target.value })}
                  className="w-full text-lg font-semibold bg-transparent border-b pb-2 outline-none"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                />
                <select
                  value={activeNote.category}
                  onChange={e => saveNote({ category: e.target.value as PersonalNote['category'] })}
                  className="text-sm rounded-lg px-2 py-1 border"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}
                >
                  <option value="general">General</option>
                  <option value="dsa">DSA</option>
                  <option value="interview">Interview</option>
                  <option value="company">Company</option>
                </select>
                <textarea
                  value={activeNote.body}
                  onChange={e => saveNote({ body: e.target.value })}
                  rows={14}
                  placeholder="Write your note…"
                  className="w-full rounded-xl p-3 text-sm border resize-y outline-none"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)', color: 'var(--text)' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setKnowledge({ ...knowledge, notes: knowledge.notes.filter(n => n.id !== activeNote.id) })
                    setSelectedNote(null)
                  }}
                  className="text-xs text-red-500 flex items-center gap-1"
                >
                  <Trash2 size={12} /> Delete note
                </button>
              </>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>Select a note or create a new one.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'wiki' && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search wiki…"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}
              />
            </div>
            {wiki.map(w => (
              <button
                key={w.id}
                type="button"
                onClick={() => setSelectedWiki(w.id)}
                className="w-full text-left p-3 rounded-xl border text-sm"
                style={{
                  borderColor: selectedWiki === w.id ? 'var(--accent)' : 'var(--border)',
                  background: selectedWiki === w.id ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                }}
              >
                <p className="font-semibold">{w.title}</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>{w.category}{w.builtIn ? ' · Guide' : ''}</p>
              </button>
            ))}
          </div>
          <div className="lg:col-span-2 glass-card p-5">
            {activeWiki ? (
              <>
                <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text)' }}>{activeWiki.title}</h2>
                <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed" style={{ color: 'var(--text-2)' }}>{activeWiki.body}</pre>
              </>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>Select a wiki page.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'journal' && (
        <div className="space-y-3">
          <button type="button" onClick={addJournal} className="btn-primary py-2 px-4 text-sm inline-flex items-center gap-1">
            <Plus size={14} /> New entry
          </button>
          {knowledge.journal.map(j => (
            <motion.div key={j.id} className="glass-card p-4 space-y-2">
              <div className="flex flex-wrap gap-2 items-center">
                <input type="date" value={j.date} onChange={e => setKnowledge({
                  ...knowledge,
                  journal: knowledge.journal.map(x => x.id === j.id ? { ...x, date: e.target.value } : x),
                })} className="text-sm rounded-lg px-2 py-1 border" style={{ borderColor: 'var(--border)' }} />
                <select value={j.mood} onChange={e => setKnowledge({
                  ...knowledge,
                  journal: knowledge.journal.map(x => x.id === j.id ? { ...x, mood: e.target.value as JournalEntry['mood'] } : x),
                })} className="text-sm rounded-lg px-2 py-1 border" style={{ borderColor: 'var(--border)' }}>
                  <option value="great">Great day</option>
                  <option value="ok">Okay</option>
                  <option value="tough">Tough day</option>
                </select>
                <button type="button" onClick={() => setKnowledge({ ...knowledge, journal: knowledge.journal.filter(x => x.id !== j.id) })}
                  className="ml-auto text-xs text-red-500"><Trash2 size={12} /></button>
              </div>
              {(['wins', 'struggles', 'lessons'] as const).map(field => (
                <div key={field}>
                  <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-3)' }}>{field}</label>
                  <textarea
                    value={j[field]}
                    onChange={e => setKnowledge({
                      ...knowledge,
                      journal: knowledge.journal.map(x => x.id === j.id ? { ...x, [field]: e.target.value } : x),
                    })}
                    rows={2}
                    className="w-full mt-1 rounded-lg p-2 text-sm border"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}
                  />
                </div>
              ))}
            </motion.div>
          ))}
          {knowledge.journal.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>Log daily wins, struggles, and lessons — your placement journal.</p>
          )}
        </div>
      )}

      {tab === 'research' && (
        <div className="space-y-3">
          <button type="button" onClick={addResearch} className="btn-primary py-2 px-4 text-sm inline-flex items-center gap-1">
            <Plus size={14} /> Add company
          </button>
          {knowledge.companyResearch.map(r => (
            <div key={r.id} className="glass-card p-4 space-y-2">
              <div className="flex gap-2">
                <input value={r.company} onChange={e => setKnowledge({
                  ...knowledge,
                  companyResearch: knowledge.companyResearch.map(x => x.id === r.id ? { ...x, company: e.target.value } : x),
                })} className="font-semibold flex-1 bg-transparent border-b" style={{ borderColor: 'var(--border)' }} />
                <button type="button" onClick={() => setKnowledge({ ...knowledge, companyResearch: knowledge.companyResearch.filter(x => x.id !== r.id) })}
                  className="text-red-500"><Trash2 size={14} /></button>
              </div>
              {(['roleNotes', 'interviewTips', 'cultureNotes', 'salaryNotes'] as const).map(field => (
                <div key={field}>
                  <label className="text-xs capitalize" style={{ color: 'var(--text-3)' }}>{field.replace(/([A-Z])/g, ' $1')}</label>
                  <textarea value={r[field]} onChange={e => setKnowledge({
                    ...knowledge,
                    companyResearch: knowledge.companyResearch.map(x => x.id === r.id ? { ...x, [field]: e.target.value } : x),
                  })} rows={2} className="w-full mt-1 rounded-lg p-2 text-sm border" style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === 'bookmarks' && (
        <div className="space-y-3">
          <button type="button" onClick={addBookmark} className="btn-primary py-2 px-4 text-sm inline-flex items-center gap-1">
            <Plus size={14} /> Add bookmark
          </button>
          {knowledge.bookmarks.map(b => (
            <div key={b.id} className="glass-card p-4 flex flex-wrap gap-2 items-center">
              <input value={b.title} onChange={e => setKnowledge({
                ...knowledge,
                bookmarks: knowledge.bookmarks.map(x => x.id === b.id ? { ...x, title: e.target.value } : x),
              })} className="font-semibold flex-1 min-w-[120px] rounded-lg px-2 py-1 border text-sm" style={{ borderColor: 'var(--border)' }} />
              <input value={b.url} onChange={e => setKnowledge({
                ...knowledge,
                bookmarks: knowledge.bookmarks.map(x => x.id === b.id ? { ...x, url: e.target.value } : x),
              })} className="flex-[2] min-w-[200px] rounded-lg px-2 py-1 border text-sm" style={{ borderColor: 'var(--border)' }} />
              <a href={b.url} target="_blank" rel="noreferrer" className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Open</a>
              <button type="button" onClick={() => setKnowledge({ ...knowledge, bookmarks: knowledge.bookmarks.filter(x => x.id !== b.id) })}
                className="text-red-500"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {tab === 'referrals' && (
        <div className="space-y-3">
          <button type="button" onClick={addReferral} className="btn-primary py-2 px-4 text-sm inline-flex items-center gap-1">
            <Plus size={14} /> Track referral
          </button>
          {knowledge.referrals.map(r => (
            <div key={r.id} className="glass-card p-4 grid sm:grid-cols-2 gap-2">
              <input placeholder="Company" value={r.company} onChange={e => setKnowledge({
                ...knowledge,
                referrals: knowledge.referrals.map(x => x.id === r.id ? { ...x, company: e.target.value } : x),
              })} className="rounded-lg px-2 py-1.5 text-sm border" style={{ borderColor: 'var(--border)' }} />
              <input placeholder="Contact name" value={r.contactName} onChange={e => setKnowledge({
                ...knowledge,
                referrals: knowledge.referrals.map(x => x.id === r.id ? { ...x, contactName: e.target.value } : x),
              })} className="rounded-lg px-2 py-1.5 text-sm border" style={{ borderColor: 'var(--border)' }} />
              <select value={r.status} onChange={e => setKnowledge({
                ...knowledge,
                referrals: knowledge.referrals.map(x => x.id === r.id ? { ...x, status: e.target.value as ReferralEntry['status'] } : x),
              })} className="rounded-lg px-2 py-1.5 text-sm border" style={{ borderColor: 'var(--border)' }}>
                <option value="Requested">Requested</option>
                <option value="Submitted">Submitted</option>
                <option value="Interview">Interview</option>
                <option value="Closed">Closed</option>
              </select>
              <input placeholder="Notes" value={r.notes} onChange={e => setKnowledge({
                ...knowledge,
                referrals: knowledge.referrals.map(x => x.id === r.id ? { ...x, notes: e.target.value } : x),
              })} className="rounded-lg px-2 py-1.5 text-sm border sm:col-span-2" style={{ borderColor: 'var(--border)' }} />
              <button type="button" onClick={() => setKnowledge({ ...knowledge, referrals: knowledge.referrals.filter(x => x.id !== r.id) })}
                className="text-xs text-red-500 sm:col-span-2 text-left"><Trash2 size={12} className="inline" /> Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
