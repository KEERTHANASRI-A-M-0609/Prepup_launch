import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'
import type { ResumeEvidence } from '../types'
import { computeResumeScore } from '../engine/roleCompanyEngine'

// Vite-compatible worker for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const ACTION_VERBS = [
  'built','developed','designed','implemented','created','led','managed','improved',
  'optimized','reduced','increased','deployed','automated','integrated','architected',
  'delivered','launched','engineered','streamlined','collaborated','achieved','solved',
  'analyzed','researched','published','presented','mentored','contributed','migrated',
  'scaled','refactored','debugged','tested','shipped','owned','drove','spearheaded',
]

const TECH_KEYWORDS = [
  'api','rest','graphql','sql','nosql','docker','kubernetes','ci/cd','aws','gcp','azure',
  'react','angular','vue','node','python','java','golang','typescript','machine learning',
  'deep learning','data structures','algorithms','system design','microservices',
]

const PDF_TYPES = new Set(['application/pdf', 'application/x-pdf'])
const DOCX_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
])

export class ResumeAnalysisError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ResumeAnalysisError'
  }
}

export function isResumeFile(file: File): boolean {
  const name = file.name.toLowerCase()
  if (PDF_TYPES.has(file.type) || name.endsWith('.pdf')) return true
  if (DOCX_TYPES.has(file.type) || name.endsWith('.docx') || name.endsWith('.doc')) return true
  return false
}

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const texts: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    texts.push(content.items.map(item => ('str' in item ? item.str : '')).join(' '))
  }
  return texts.join('\n')
}

async function extractDocxText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  const isPdf = PDF_TYPES.has(file.type) || name.endsWith('.pdf')
  const isDocx = DOCX_TYPES.has(file.type) || name.endsWith('.docx') || name.endsWith('.doc')

  if (isPdf) {
    try {
      return await extractPdfText(file)
    } catch {
      throw new ResumeAnalysisError('Could not read this PDF. Use a text-based PDF (not a scanned image), or try DOCX.')
    }
  }

  if (isDocx) {
    try {
      return await extractDocxText(file)
    } catch {
      throw new ResumeAnalysisError('Could not read this Word file. Try saving as PDF or DOCX and upload again.')
    }
  }

  throw new ResumeAnalysisError('Unsupported file type. Please upload PDF or DOCX.')
}

export async function analyzeResume(file: File, targetDomain = 'Software Engineering'): Promise<ResumeEvidence> {
  const start = Date.now()
  const text = await extractText(file)

  const lower = text.toLowerCase()
  const lines = text.split(/\n|\r/).map(l => l.trim()).filter(Boolean)
  const words = text.split(/\s+/).filter(Boolean)

  if (words.length < 30) {
    throw new ResumeAnalysisError(
      words.length === 0
        ? 'No readable text found. Your PDF may be a scanned image — export a text-based PDF or upload DOCX.'
        : `Only ${words.length} words detected — ensure your resume has selectable text (not just images).`
    )
  }

  const minMs = 1500 + Math.min(words.length * 5, 3000)
  await new Promise(r => setTimeout(r, Math.max(minMs - (Date.now() - start), 0)))

  const hasEducation  = lower.includes('education') || lower.includes('academic')
  const hasExperience = lower.includes('experience') || lower.includes('internship') || lower.includes('work history')
  const hasProjects   = lower.includes('project')
  const hasSkills     = lower.includes('skill') || lower.includes('technologies') || lower.includes('tech stack') || lower.includes('competencies')
  const hasEmail      = /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/.test(lower)
  const hasPhone      = /(\+91[\s-]?)?[6-9]\d{9}|(\d{3}[\s.-]\d{3}[\s.-]\d{4})/.test(text)
  const hasGithub     = lower.includes('github')
  const hasLinkedin   = lower.includes('linkedin')

  const quantifiedCount = lines.filter(l =>
    /\d+\s*(%|x\b|times\b|lakh|crore|\bk\b|ms\b|hrs?\b|users?\b|members?\b|stars?\b|downloads?\b)/.test(l.toLowerCase())
  ).length

  const actionVerbCount = ACTION_VERBS.filter(v =>
    new RegExp(`\\b${v}(d|ed|s|ing)?\\b`, 'i').test(lower)
  ).length

  const techCount = TECH_KEYWORDS.filter(k => lower.includes(k)).length
  const estimatedPages = Math.max(1, Math.round(words.length / 380))

  let score = 0

  if (words.length > 50)   score += 5
  if (words.length > 150)  score += 5
  if (words.length > 300)  score += 3

  if (hasEmail)    score += 5
  if (hasPhone)    score += 3
  if (hasGithub)   score += 8
  if (hasLinkedin) score += 4

  if (hasEducation)  score += 5
  if (hasExperience) score += 8
  if (hasProjects)   score += 8
  if (hasSkills)     score += 4

  score += Math.min(quantifiedCount * 4, 16)
  score += Math.min(actionVerbCount * 1.5, 9)
  score += Math.min(techCount * 2, 10)

  if (estimatedPages === 1)      score += 5
  else if (estimatedPages === 2) score += 2
  else if (estimatedPages > 2)   score -= 8

  if (!hasEmail && !hasPhone) score -= 10
  if (!hasProjects && !hasExperience) score -= 10
  if (quantifiedCount === 0) score -= 8
  if (actionVerbCount < 3) score -= 6

  const structuralScore = Math.min(Math.max(Math.round(score), 0), 100)
  const roleResult = computeResumeScore(structuralScore, text, targetDomain)

  const base: ResumeEvidence = {
    fileName: file.name,
    fileSize: file.size,
    wordCount: words.length,
    hasEmail, hasPhone, hasGithub, hasLinkedin,
    hasEducation, hasExperience, hasProjects, hasSkills,
    quantifiedCount, actionVerbCount,
    estimatedPages,
    rawScore: roleResult.finalScore,
    structuralScore: roleResult.structuralScore,
    roleAlignment: roleResult.alignmentScore,
    detectedFocus: roleResult.detectedFocus,
    targetDomain: roleResult.targetDomain,
    roleConflicts: roleResult.conflicts,
    roleWarnings: roleResult.warnings,
  }

  const ai = await enrichResumeWithAI(text, targetDomain, roleResult.structuralScore)
  if (ai) {
    base.aiTips = ai.ai_tips
    base.aiSummary = ai.ai_summary
    base.mlSimilarityPct = ai.similarity_pct
    base.aiSource = ai.source
    if (ai.similarity_pct > 0) {
      base.roleAlignment = Math.round((base.roleAlignment ?? 0) * 0.5 + ai.similarity_pct * 0.5)
    }
  }

  return base
}

export async function enrichResumeWithAI(
  text: string,
  targetDomain: string,
  structuralScore: number,
): Promise<{ ai_tips: string[]; similarity_pct: number; ai_summary: string; source: string } | null> {
  try {
    const { backendAPI } = await import('./api')
    return await backendAPI.aiResumeInsights(text.slice(0, 8000), targetDomain, structuralScore)
  } catch {
    return null
  }
}
