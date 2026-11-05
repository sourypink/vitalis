import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { CheckInResult, Hit } from '../engine/checkin'
import type { Demo } from '../demo'

type Recognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
  start: () => void
  stop: () => void
}
type RecognitionWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }

function speechRecognition(): (new () => Recognition) | undefined {
  const speechWindow = window as RecognitionWindow
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
}

function markClass(hit: Hit): string {
  if (hit.negated) return 'negated'
  if (hit.warning) return 'warning'
  if (hit.category === 'soreness') return 'mild'
  if (hit.category === 'positive') return 'positive'
  return 'body'
}

function Highlighted({ text, result }: { text: string; result: CheckInResult }) {
  if (!text.trim()) return <span className="muted">Nothing typed yet.</span>
  const parts: ReactNode[] = []
  let cursor = 0
  for (const hit of result.hits) {
    if (hit.start > cursor) parts.push(text.slice(cursor, hit.start))
    parts.push(
      <mark key={hit.start} className={markClass(hit)} title={hit.negated ? `${hit.category} (negated)` : hit.category}>
        {text.slice(hit.start, hit.end)}
      </mark>,
    )
    cursor = hit.end
  }
  parts.push(text.slice(cursor))
  return <>{parts}</>
}

const SENTIMENT_CLASS = { negative: 'risk-HIGH', neutral: 'risk-MEDIUM', positive: 'risk-LOW' } as const

export function CheckIn({ demo }: { demo: Demo }) {
  const Speech = speechRecognition()
  const [listening, setListening] = useState(false)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const recognition = useRef<Recognition | null>(null)
  const result = demo.assessment.checkIn

  useEffect(() => () => recognition.current?.stop(), [])

  const toggleMic = () => {
    if (!Speech) return
    if (listening) {
      recognition.current?.stop()
      return
    }
    setSpeechError(null)
    const session = new Speech()
    session.lang = 'en-US'
    session.interimResults = false
    session.continuous = false
    const before = demo.checkIn.trim()
    session.onresult = (event) => {
      const spoken = Array.from(event.results, (alternatives) => alternatives[0].transcript).join(' ')
      demo.setCheckIn([before, spoken].filter(Boolean).join(' '))
    }
    session.onerror = (event) => setSpeechError(event.error)
    session.onend = () => setListening(false)
    recognition.current = session
    session.start()
    setListening(true)
  }

  const prompt = demo.mode === 'athlete' ? 'How does your body feel today?' : 'How are you feeling today, Margaret?'

  return (
    <main>
      <section className="card">
        <div className="card-head">
          <h2>Daily check-in</h2>
          <span className="tag">NLP + sentiment</span>
        </div>
        <label htmlFor="checkin" className="lead">
          {prompt}
        </label>
        <textarea id="checkin" value={demo.checkIn} onChange={(event) => demo.setCheckIn(event.target.value)} placeholder="Type in your own words" />
        <div className="btn-row">
          {Speech && (
            <button type="button" className="btn btn-secondary mic" aria-pressed={listening} onClick={toggleMic} style={listening ? { color: '#fff' } : undefined}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <rect x="9" y="3" width="6" height="12" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
              {listening ? 'Listening… tap to stop' : 'Speak instead'}
            </button>
          )}
          <button type="button" className="btn" onClick={demo.submitCheckIn}>
            Submit check-in
          </button>
        </div>
        {Speech && <p className="source">Speech is turned into text by your browser’s own speech service, which may process audio online.</p>}
        {speechError && (
          <p className="small" role="alert">
            Microphone problem: {speechError}
          </p>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h3>What the engine heard</h3>
          <span className={`badge ${SENTIMENT_CLASS[result.sentiment]}`}>
            <span className="dot" aria-hidden="true" />
            {result.sentiment} sentiment
          </span>
        </div>
        <div className="highlighted" aria-live="polite">
          <Highlighted text={demo.checkIn} result={result} />
        </div>
        <div className="legend">
          <span>
            <mark className="warning">word</mark> warning
          </span>
          <span>
            <mark className="mild">word</mark> mild
          </span>
          <span>
            <mark className="body">word</mark> body part
          </span>
          <span>
            <mark className="positive">word</mark> positive
          </span>
          <span>
            <mark className="negated">word</mark> negated
          </span>
        </div>
        <p>
          <b>Worrying check-in?</b> {result.worrying ? 'Yes' : 'No'}
          {result.warnings.length > 0
            ? `: warning words ${result.warnings.map((hit) => `‘${hit.word.toLowerCase()}’`).join(', ')}.`
            : result.sentiment === 'negative'
              ? ': the overall tone is negative.'
              : '.'}{' '}
          <span className="muted small">Lexicon score {result.score}. A keyword list and word scores, on this device: no AI model, no network.</span>
        </p>
        <p className="small muted">Try: “knee hurts”, “felt dizzy”, “so tired”, “started a new medication”, or “no pain”.</p>
      </section>

      <button type="button" className="btn next" onClick={() => demo.go('risk')}>
        Next: see the risk →
      </button>
    </main>
  )
}
