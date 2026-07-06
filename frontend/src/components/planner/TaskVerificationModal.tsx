import { useState, useEffect } from 'react'

import { motion } from 'framer-motion'

import { X, ShieldCheck, Link2, FileText, BookOpen, ExternalLink } from 'lucide-react'

import { getProofRequirement, canVerifyTask } from '../../engine/taskVerificationEngine'



export interface TaskVerifyPayload {

  reflection: string

  proofUrl: string

}



interface TaskInfo {

  id: string

  text: string

  category: string

  estimatedMins: number

  resourceUrl?: string

  guidelines?: string

}



interface Props {

  task: TaskInfo | null

  onClose: () => void

  onVerify: (taskId: string, payload: TaskVerifyPayload) => void

}



export default function TaskVerificationModal({ task, onClose, onVerify }: Props) {

  const [reflection, setReflection] = useState('')

  const [proofUrl, setProofUrl] = useState('')

  const [error, setError] = useState('')



  useEffect(() => {

    if (!task) return

    setReflection('')

    setProofUrl('')

    setError('')

  }, [task?.id])



  if (!task) return null



  const requirement = getProofRequirement(task.category)



  const submit = () => {

    const check = canVerifyTask({ requirement, reflection, proofUrl })

    if (!check.ok) {

      setError(check.error ?? 'Cannot verify yet')

      return

    }

    onVerify(task.id, { reflection: reflection.trim(), proofUrl: proofUrl.trim() })

  }



  const resourceHref = task.resourceUrl

    ? (task.resourceUrl.startsWith('http') ? task.resourceUrl : task.resourceUrl)

    : null



  return (

    <>

      <motion.div

        initial={{ opacity: 0 }}

        animate={{ opacity: 1 }}

        exit={{ opacity: 0 }}

        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"

        onClick={onClose}

      />

      <motion.div

        initial={{ opacity: 0, scale: 0.96, y: 12 }}

        animate={{ opacity: 1, scale: 1, y: 0 }}

        className="fixed left-1/2 top-1/2 z-[70] w-[min(100%,32rem)] max-h-[90vh] overflow-y-auto -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white shadow-xl p-6"

      >

        <div className="flex items-start justify-between gap-3 mb-4">

          <div>

            <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600 mb-1 flex items-center gap-1">

              <ShieldCheck size={12} /> Verify completion

            </p>

            <h3 className="font-bold text-slate-900 text-sm leading-snug">{task.text}</h3>

          </div>

          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">

            <X size={18} />

          </button>

        </div>



        <p className="text-xs text-slate-500 mb-4">

          Verified tasks count toward momentum and streaks. Share what you did and proof — no waiting required.

        </p>



        {task.guidelines && (

          <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50/60 p-3">

            <p className="text-xs font-semibold text-blue-800 flex items-center gap-1 mb-2">

              <BookOpen size={12} /> How to complete this task

            </p>

            <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{task.guidelines}</pre>

            {resourceHref && (

              <a

                href={resourceHref}

                target={resourceHref.startsWith('http') ? '_blank' : undefined}

                rel={resourceHref.startsWith('http') ? 'noopener noreferrer' : undefined}

                className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-blue-600 hover:underline"

              >

                <ExternalLink size={11} /> Open resource

              </a>

            )}

          </div>

        )}



        <label className="block mb-3">

          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1">

            <FileText size={12} /> What did you complete?

          </span>

          <textarea

            value={reflection}

            onChange={e => setReflection(e.target.value)}

            placeholder="e.g. Solved 2 graph BFS problems on LeetCode and reviewed solutions"

            rows={3}

            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"

          />

        </label>



        <label className="block mb-4">

          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1">

            <Link2 size={12} /> {requirement.proofLabel}

            {requirement.proofRequired && <span className="text-red-500">*</span>}

          </span>

          <input

            value={proofUrl}

            onChange={e => setProofUrl(e.target.value)}

            placeholder={requirement.proofPlaceholder}

            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"

          />

        </label>



        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}



        <div className="flex gap-2">

          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600">

            Cancel

          </button>

          <button type="button" onClick={submit} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-teal-600">

            Verify & complete

          </button>

        </div>

      </motion.div>

    </>

  )

}


