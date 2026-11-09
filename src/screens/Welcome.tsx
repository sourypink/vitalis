// No real accounts in the prototype: both buttons let you straight in.
export function Welcome({ signedIn, onSignIn, onCreate }: { signedIn: boolean; onSignIn: () => void; onCreate: () => void }) {
  return (
    <main className="welcome">
      <div className="welcome-brand">
        <p className="kicker">Fall-risk coach</p>
        <h1 className="wordmark-big">Vitalis</h1>
        <p className="lead">Helps you stay steady, active and independent at home, and lets your family know early if something changes.</p>
      </div>

      <ul className="welcome-points">
        <li>Learns your normal walking from your watch</li>
        <li>Spots small changes in walking and balance early</li>
        <li>Gives you one clear step each day</li>
      </ul>

      <div className="welcome-actions">
        <button type="button" className="btn btn-block" onClick={onCreate}>
          Create account
        </button>
        <button type="button" className="btn btn-secondary btn-block" onClick={onSignIn}>
          {signedIn ? 'Continue' : 'Sign in'}
        </button>
        <p className="small muted center">Prototype: no password needed. Sign in opens a demo account (Margaret, 78).</p>
      </div>
    </main>
  )
}
