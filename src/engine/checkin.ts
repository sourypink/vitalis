import { NEGATIVE_SENTIMENT_MAX, POSITIVE_SENTIMENT_MIN } from './constants'

// Keyword list + lexicon sentiment. No LLM, no network. Weights are our own design choices.
// Warning words follow the poster's "pain, dizziness or fatigue words" plus new medicines.

export type Category =
  | 'pain'
  | 'tightness'
  | 'dizziness'
  | 'fatigue'
  | 'fall'
  | 'medication'
  | 'balance'
  | 'soreness'
  | 'body'
  | 'positive'

/** Categories that make a check-in worrying on their own. */
const WARNING_CATEGORIES: ReadonlySet<Category> = new Set([
  'pain',
  'tightness',
  'dizziness',
  'fatigue',
  'fall',
  'medication',
  'balance',
])

const WARNING_WEIGHT = -2 // a warning word outweighs one positive word
const MILD_WEIGHT = -1 // soreness, stiffness: normal after training, only counts towards sentiment
const POSITIVE_WEIGHT = 1
const NEGATION_WINDOW_WORDS = 2 // "no pain", "not really tired"

const LEXICON: Record<Category, string[]> = {
  pain: ['pain', 'painful', 'hurt', 'hurts', 'hurting', 'sharp', 'swollen', 'swelling', 'ache', 'aches', 'aching'],
  tightness: ['tight', 'tightness', 'pulled', 'strain', 'strained', 'twinge', 'cramp', 'cramping'],
  dizziness: ['dizzy', 'dizziness', 'lightheaded', 'light-headed', 'faint', 'fainted', 'vertigo'],
  fatigue: ['tired', 'exhausted', 'fatigue', 'fatigued', 'drained', 'weak', 'worn out'],
  fall: ['fell', 'fall', 'fallen', 'tripped', 'slipped'],
  medication: ['new medication', 'new medicine', 'new medicines', 'new pill', 'new pills', 'new meds', 'new prescription'],
  balance: ['unsteady', 'wobbly', 'off balance', 'lost my balance'],
  soreness: ['sore', 'soreness', 'stiff', 'stiffness', 'heavy', 'slept badly', 'slept poorly', 'stressed'],
  body: ['hamstring', 'knee', 'ankle', 'hip', 'back', 'calf', 'groin', 'quad', 'shoulder', 'legs', 'leg', 'head'],
  positive: ['good', 'great', 'fine', 'okay', 'ok', 'better', 'strong', 'ready', 'rested', 'fresh', 'happy', 'energized', 'well'],
}

const NEGATORS = /\b(no|not|never|without|don't|dont|didn't|didnt|isn't|isnt|wasn't|wasnt|zero)\b/i

function weightOf(category: Category): number {
  if (WARNING_CATEGORIES.has(category)) return WARNING_WEIGHT
  if (category === 'soreness') return MILD_WEIGHT
  if (category === 'positive') return POSITIVE_WEIGHT
  return 0
}

export type Hit = {
  start: number
  end: number
  word: string
  category: Category
  /** True when a negator ("no", "not") comes just before it. */
  negated: boolean
  /** True when this hit alone makes the check-in worrying. */
  warning: boolean
}

export type Sentiment = 'negative' | 'neutral' | 'positive'

export type CheckInResult = {
  hits: Hit[]
  score: number
  sentiment: Sentiment
  /** Warning words that were not negated. */
  warnings: Hit[]
  /** The tree's "Worrying check-in?" answer: a warning word, or negative sentiment. */
  worrying: boolean
}

const ENTRIES = (Object.entries(LEXICON) as [Category, string[]][])
  .flatMap(([category, words]) => words.map((phrase) => ({ phrase, category })))
  .sort((a, b) => b.phrase.length - a.phrase.length) // longest first, so "new medication" beats nothing shorter

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function isNegated(text: string, start: number): boolean {
  const preceding = text.slice(0, start).split(/\s+/).filter(Boolean).slice(-NEGATION_WINDOW_WORDS).join(' ')
  return NEGATORS.test(preceding)
}

export function checkInFlags(text: string): CheckInResult {
  const hits: Hit[] = []
  const taken = new Array<boolean>(text.length).fill(false)

  for (const { phrase, category } of ENTRIES) {
    const pattern = new RegExp(`(?<![\\w'-])${escapeRegExp(phrase)}(?![\\w'-])`, 'gi')
    for (const match of text.matchAll(pattern)) {
      const start = match.index
      const end = start + match[0].length
      if (taken.slice(start, end).some(Boolean)) continue
      taken.fill(true, start, end)
      const negated = isNegated(text, start)
      hits.push({
        start,
        end,
        word: match[0],
        category,
        negated,
        warning: WARNING_CATEGORIES.has(category) && !negated,
      })
    }
  }
  hits.sort((a, b) => a.start - b.start)

  // A negated negative word scores 0 ("no pain"); a negated positive word scores mildly negative ("not good").
  const score = hits.reduce((total, hit) => {
    const weight = weightOf(hit.category)
    if (!hit.negated) return total + weight
    return total + (weight > 0 ? MILD_WEIGHT : 0)
  }, 0)

  const sentiment: Sentiment =
    score <= NEGATIVE_SENTIMENT_MAX ? 'negative' : score >= POSITIVE_SENTIMENT_MIN ? 'positive' : 'neutral'
  const warnings = hits.filter((hit) => hit.warning)

  return { hits, score, sentiment, warnings, worrying: warnings.length > 0 || sentiment === 'negative' }
}
