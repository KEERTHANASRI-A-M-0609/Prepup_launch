import type { AptQuestion } from './aptitudeQuestions'
import { APTITUDE_QUESTIONS } from './aptitudeQuestions'
import type { AptitudeEvidence } from '../types'

export type AptDifficulty = 'easy' | 'medium' | 'hard'

const POOL: Record<AptQuestion['category'], AptQuestion[]> = {
  quant: APTITUDE_QUESTIONS.filter(q => q.category === 'quant'),
  logical: APTITUDE_QUESTIONS.filter(q => q.category === 'logical'),
  verbal: APTITUDE_QUESTIONS.filter(q => q.category === 'verbal'),
}

export function buildAdaptiveSession(): AptQuestion[] {
  const session: AptQuestion[] = []
  const cats: AptQuestion['category'][] = ['quant', 'logical', 'verbal']
  for (const cat of cats) {
    const pool = [...POOL[cat]]
    for (let i = 0; i < 5 && pool.length; i++) {
      const idx = Math.floor(Math.random() * pool.length)
      session.push(pool.splice(idx, 1)[0])
    }
  }
  return session.sort(() => Math.random() - 0.5)
}

export function getNextAdaptiveQuestion(
  session: AptQuestion[],
  answers: Record<number, number>,
  currentIdx: number,
): number {
  if (currentIdx >= session.length - 1) return currentIdx
  const recent = session.slice(Math.max(0, currentIdx - 2), currentIdx + 1)
  const recentCorrect = recent.filter(q => answers[q.id] === q.answer).length
  const skip = recentCorrect >= 2 ? 0 : 1
  return Math.min(currentIdx + 1 + skip, session.length - 1)
}

export function scoreAdaptiveAptitude(
  session: AptQuestion[],
  answers: Record<number, number>,
): AptitudeEvidence {
  let correct = 0
  const catCorrect: Record<string, number> = { quant: 0, logical: 0, verbal: 0 }
  const catTotal: Record<string, number> = { quant: 0, logical: 0, verbal: 0 }

  for (const q of session) {
    catTotal[q.category]++
    if (answers[q.id] === q.answer) {
      correct++
      catCorrect[q.category]++
    }
  }

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0)

  return {
    totalQuestions: session.length,
    correct,
    score: pct(correct, session.length),
    categoryScores: {
      quant: pct(catCorrect.quant, catTotal.quant),
      logical: pct(catCorrect.logical, catTotal.logical),
      verbal: pct(catCorrect.verbal, catTotal.verbal),
    },
  }
}

export function getAptitudeRecommendations(evidence: AptitudeEvidence): string[] {
  const recs: string[] = []
  const { categoryScores } = evidence
  if (categoryScores.quant < 70) recs.push('Practice 20 IndiaBix quant questions daily — focus on Time & Work, Percentages')
  if (categoryScores.logical < 70) recs.push('Complete logical reasoning sets on IndiaBix — syllogisms & seating arrangements')
  if (categoryScores.verbal < 70) recs.push('Read editorial summaries and practice synonyms/antonyms for verbal ability')
  if (recs.length === 0) recs.push('Strong aptitude — maintain with 10 mixed questions every 2 days before OAs')
  return recs
}

export function getAptitudeWeakAreas(evidence: AptitudeEvidence): string[] {
  const weak: string[] = []
  if (evidence.categoryScores.quant < 70) weak.push('Quantitative')
  if (evidence.categoryScores.logical < 70) weak.push('Logical Reasoning')
  if (evidence.categoryScores.verbal < 70) weak.push('Verbal Ability')
  return weak
}
