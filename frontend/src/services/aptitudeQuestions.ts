export interface AptQuestion {
  id: number
  category: 'quant' | 'logical' | 'verbal'
  question: string
  options: string[]
  answer: number  // index
}

export const APTITUDE_QUESTIONS: AptQuestion[] = [
  // Quantitative (5)
  {
    id: 1, category: 'quant',
    question: 'A train 150m long passes a pole in 15 seconds. What is its speed in km/h?',
    options: ['30', '36', '40', '45'],
    answer: 1,
  },
  {
    id: 2, category: 'quant',
    question: 'If 20% of a number is 80, what is 35% of that number?',
    options: ['120', '140', '150', '160'],
    answer: 1,
  },
  {
    id: 3, category: 'quant',
    question: 'A can do a work in 12 days, B in 18 days. Together they finish in how many days?',
    options: ['6.5', '7', '7.2', '8'],
    answer: 2,
  },
  {
    id: 4, category: 'quant',
    question: 'Simple interest on ₹5000 at 8% per annum for 3 years is:',
    options: ['₹1000', '₹1200', '₹1500', '₹2000'],
    answer: 1,
  },
  {
    id: 5, category: 'quant',
    question: 'What is the next number in the series: 2, 6, 12, 20, 30, ?',
    options: ['40', '42', '44', '48'],
    answer: 1,
  },
  // Logical (5)
  {
    id: 6, category: 'logical',
    question: 'All cats are animals. Some animals are wild. Which conclusion is valid?',
    options: [
      'All cats are wild',
      'Some cats may be wild',
      'No cat is wild',
      'All wild animals are cats',
    ],
    answer: 1,
  },
  {
    id: 7, category: 'logical',
    question: 'If MANGO = 13+1+14+7+15 = 50, then GRAPE = ?',
    options: ['48', '49', '50', '51'],
    answer: 0,
  },
  {
    id: 8, category: 'logical',
    question: 'Find the odd one out: 2, 5, 10, 17, 26, 37, 50, 64',
    options: ['37', '50', '64', '26'],
    answer: 2,
  },
  {
    id: 9, category: 'logical',
    question: 'A is B\'s sister. C is B\'s mother. D is C\'s father. How is A related to D?',
    options: ['Granddaughter', 'Daughter', 'Grandmother', 'Sister'],
    answer: 0,
  },
  {
    id: 10, category: 'logical',
    question: 'If in a certain code PAINT is written as RCKPV, how is BRUSH coded?',
    options: ['DTWUJ', 'DTVUJ', 'DTWUJ', 'ETWUJ'],
    answer: 0,
  },
  // Verbal (5)
  {
    id: 11, category: 'verbal',
    question: 'Choose the word most similar to BENEVOLENT:',
    options: ['Cruel', 'Generous', 'Strict', 'Timid'],
    answer: 1,
  },
  {
    id: 12, category: 'verbal',
    question: 'Select the correctly spelled word:',
    options: ['Accomodate', 'Accommodate', 'Acommodate', 'Acomodate'],
    answer: 1,
  },
  {
    id: 13, category: 'verbal',
    question: 'He _____ working here since 2019.',
    options: ['is', 'was', 'has been', 'had'],
    answer: 2,
  },
  {
    id: 14, category: 'verbal',
    question: 'Choose the antonym of VERBOSE:',
    options: ['Talkative', 'Concise', 'Elaborate', 'Lengthy'],
    answer: 1,
  },
  {
    id: 15, category: 'verbal',
    question: 'The manager along with his team _____ present at the meeting.',
    options: ['were', 'are', 'was', 'have been'],
    answer: 2,
  },
]

export function scoreAptitude(answers: Record<number, number>) {
  let correct = 0
  let quant = 0, logical = 0, verbal = 0
  const quantTotal = 5, logicalTotal = 5, verbalTotal = 5

  APTITUDE_QUESTIONS.forEach(q => {
    const isCorrect = answers[q.id] === q.answer
    if (isCorrect) {
      correct++
      if (q.category === 'quant')   quant++
      if (q.category === 'logical') logical++
      if (q.category === 'verbal')  verbal++
    }
  })

  return {
    totalQuestions: APTITUDE_QUESTIONS.length,
    correct,
    score: Math.round((correct / APTITUDE_QUESTIONS.length) * 100),
    categoryScores: {
      quant:   Math.round((quant   / quantTotal)   * 100),
      logical: Math.round((logical / logicalTotal) * 100),
      verbal:  Math.round((verbal  / verbalTotal)  * 100),
    },
  }
}
