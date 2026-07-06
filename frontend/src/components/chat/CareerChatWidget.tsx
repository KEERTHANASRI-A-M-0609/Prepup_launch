import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Sparkles, ChevronRight } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import {
  type ChatMessage,
  type ChatContext,
  type ChatAction,
  processChatMessageWithAI,
  createUserMessage,
  getChatStarters,
  buildWelcomeMessage,
} from '../../engine/careerChatEngine'

function renderMarkdownLite(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part.split('\n').map((line, j, arr) => (
      <span key={`${i}-${j}`}>
        {line}
        {j < arr.length - 1 && <br />}
      </span>
    ))
  })
}

function ActionButton({ action, onNavigate, onPrompt }: {
  action: ChatAction
  onNavigate: (path: string) => void
  onPrompt: (msg: string) => void
}) {
  const handle = () => {
    if (action.type === 'navigate') onNavigate(action.path)
    else onPrompt(action.message)
  }
  return (
    <button
      type="button"
      onClick={handle}
      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors hover:opacity-90"
      style={{ borderColor: 'var(--border)', background: 'var(--primary-l)', color: 'var(--primary)' }}
    >
      {action.label}
      <ChevronRight size={12} />
    </button>
  )
}

export default function CareerChatWidget({ guest = false }: { guest?: boolean }) {
  const navigate = useNavigate()
  const {
    user, assessment, applications, activityLog, platformData, failures, setView,
  } = useApp()

  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [welcomed, setWelcomed] = useState(false)
  const [thinking, setThinking] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const ctxRef = useRef<ChatContext>({ user: null, assessment: null, applications: [], activityLog: [], platformData: null, failures: [], loggedIn: false })

  const ctx: ChatContext = useMemo(() => ({
    user: guest ? null : user,
    assessment: guest ? null : assessment,
    applications: guest ? [] : applications,
    activityLog: guest ? [] : activityLog,
    platformData: guest ? null : platformData,
    failures: guest ? [] : failures,
    loggedIn: !guest && Boolean(user),
  }), [guest, user, assessment, applications, activityLog, platformData, failures])

  ctxRef.current = ctx

  const starters = useMemo(() => getChatStarters(ctx.loggedIn), [ctx.loggedIn])

  useEffect(() => {
    if (open && !welcomed) {
      setMessages([buildWelcomeMessage(ctx)])
      setWelcomed(true)
    }
  }, [open, welcomed, ctx])

  useEffect(() => {
    if (!open) return
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open])

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || thinking) return
    const userMsg = createUserMessage(trimmed)
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setThinking(true)
    try {
      const reply = await processChatMessageWithAI(trimmed, ctxRef.current)
      setMessages(prev => [...prev, reply])
    } finally {
      setThinking(false)
    }
  }, [thinking])

  const handleNavigate = (path: string) => {
    if (guest) {
      setView('login')
      setOpen(false)
      return
    }
    setView('app')
    navigate(path)
    setOpen(false)
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="career-chat-panel fixed z-[70] flex flex-col shadow-2xl border overflow-hidden"
            style={{
              background: 'var(--bg-elevated, #fff)',
              borderColor: 'var(--border)',
              bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
              right: '1rem',
              width: 'min(400px, calc(100vw - 2rem))',
              height: 'min(520px, calc(100vh - 8rem))',
              borderRadius: '1rem',
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ background: 'linear-gradient(135deg, #1E56C0, #0D9488)' }}
            >
              <div className="flex items-center gap-2 text-white">
                <Sparkles size={18} />
                <div>
                  <p className="text-sm font-bold leading-none">PrepUp Assistant</p>
                  <p className="text-[10px] text-white/80 mt-0.5">
                    {ctx.loggedIn ? 'Gemini + ML career coach' : 'AI platform guide'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/15 text-white"
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {messages.map(m => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      m.role === 'user' ? 'rounded-br-md text-white' : 'rounded-bl-md'
                    }`}
                    style={
                      m.role === 'user'
                        ? { background: 'var(--primary, #1E56C0)' }
                        : { background: 'var(--bg-muted)', color: 'var(--text)' }
                    }
                  >
                    {renderMarkdownLite(m.text)}
                    {m.actions && m.actions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {m.actions.map((a, i) => (
                          <ActionButton
                            key={`${m.id}-a-${i}`}
                            action={a}
                            onNavigate={handleNavigate}
                            onPrompt={send}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm dash-subtext" style={{ background: 'var(--bg-muted)' }}>
                    Thinking…
                  </div>
                </div>
              )}
            </div>

            {messages.length <= 2 && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
                {starters.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="text-xs px-2.5 py-1 rounded-full border font-medium transition-colors hover:border-[var(--primary)]"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-2)', background: 'var(--bg-muted)' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <form
              className="p-3 border-t flex gap-2 shrink-0"
              style={{ borderColor: 'var(--border)' }}
              onSubmit={e => { e.preventDefault(); send(input) }}
            >
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={ctx.loggedIn ? 'Ask anything…' : 'Ask about PrepUp…'}
                className="flex-1 rounded-xl px-3 py-2.5 text-sm border outline-none focus:border-[#1E56C0]"
                style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2.5 rounded-xl text-white disabled:opacity-40 shrink-0"
                style={{ background: 'var(--primary, #1E56C0)' }}
                aria-label="Send"
              >
                <Send size={18} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="career-chat-fab fixed z-[70] flex items-center justify-center rounded-full shadow-lg text-white transition-transform hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, #1E56C0, #0D9488)',
          width: '3.5rem',
          height: '3.5rem',
          bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
          right: '1rem',
          display: open ? 'none' : 'flex',
        }}
        aria-label="Open PrepUp assistant"
      >
        <MessageCircle size={22} />
      </button>
    </>
  )
}
